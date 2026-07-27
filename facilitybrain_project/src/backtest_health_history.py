"""
FacilityBrain — Health Score History (backtest)

The live API only ever computed ONE snapshot (today) per asset — fine for
"what's the current health score", useless for "show me a trend line", since
a single point can't be a trend. This script fixes that properly: it
re-runs the deviation engine + health score engine at ~30 points spread
across the last 90 days (using only the sensor/maintenance/incident data
that would have been available as of each historical date — no lookahead),
and caches the result to JSON.

This is the "precompute + cache" approach: run this once (or whenever the
underlying data changes), and outputs/health_score_history.json serves fast,
accurate trend data with zero per-request recomputation cost.

Run: python src/backtest_health_history.py
"""
import json
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from paths import DATA_DIR, OUTPUTS_DIR
from deviation_engine import CRITICAL_THRESHOLD_PCT, TARGET_MTTF_HOURS, EXPECTED_INCIDENTS_YR, RATED_SUSTAINABLE_HRS_YR
from health_score_engine import linear_hs, mttf_hs, risk_category, WEIGHTS

TODAY = datetime(2026, 7, 25)
BACKTEST_DAYS = 90
STEP_DAYS = 3  # ~30 points across 90 days — enough for a real trend, cheap to compute


def deviation_as_of(as_of, asset_row, sensors_df, maintenance_df, incidents_df, usage_df):
    """Same math as deviation_engine.py's per-metric functions, but windowed
    to only use data available as of `as_of` — no peeking at the future."""
    aid, atype = asset_row["Asset ID"], asset_row["Asset Type"]
    install_date = asset_row["Install Date"]
    design_life_years = asset_row["Design Lifespan (Years)"]

    # ---- sensors ----
    asset_sensors = sensors_df[(sensors_df["Asset ID (FK)"] == aid) & (sensors_df["Timestamp"] <= as_of)]
    sensor_D = {}
    for stype, g in asset_sensors.groupby("Sensor Type"):
        g = g.sort_values("Timestamp")
        window = g[g["Timestamp"] > as_of - timedelta(days=30)]
        if window.empty:
            continue
        baseline = window["Baseline Value"].iloc[0]
        dev_pct = abs(window["Reading Value"].mean() - baseline) / baseline
        crit = CRITICAL_THRESHOLD_PCT.get(stype, 0.30)
        sensor_D[stype] = min(dev_pct / crit, 1.0)
    if not sensor_D:
        return None

    # ---- maintenance ----
    m = maintenance_df[(maintenance_df["Asset ID (FK)"] == aid) & (maintenance_df["Scheduled Date"] <= as_of) &
                        (maintenance_df["Maintenance Compliance Score (Trailing %)"].notna())]
    maint_D = (100 - m["Maintenance Compliance Score (Trailing %)"].iloc[-1]) / 100 if len(m) else 0.0

    # ---- age ----
    age_years = (as_of - install_date).days / 365.25
    age_D = min(max(age_years, 0) / design_life_years, 1.0)

    # ---- operational (mttf / incident / runtime) ----
    inc = incidents_df[(incidents_df["Asset ID (FK)"] == aid) & (incidents_df["Incident Date/Time"] <= as_of)]
    inc_12mo = inc[inc["Incident Date/Time"] > as_of - timedelta(days=365)].shape[0]
    u = usage_df[usage_df["Asset ID (FK)"] == aid].reset_index(drop=True)
    # usage is monthly snapshots — use the row closest to (but not after) as_of
    u["_month"] = pd.to_datetime(u["Snapshot Month"])
    u_past = u[u["_month"] <= as_of]
    total_hours = u_past["Operating Hours (Cumulative)"].iloc[-1] if len(u_past) else 0.0
    n_failures_total = inc.shape[0]
    actual_mttf = total_hours / max(n_failures_total, 1)
    d_mttf = min((TARGET_MTTF_HOURS[atype] / max(actual_mttf, 1)) / 3, 1.0)

    expected_inc = EXPECTED_INCIDENTS_YR[atype]
    d_incident = min(inc_12mo / max(expected_inc, 0.1), 1.0)

    monthly_hours = u_past["Operating Hours (Cumulative)"].diff().mean() if len(u_past) > 1 else 0.0
    annualized_hours = (monthly_hours or 0) * 12
    d_runtime = min(annualized_hours / RATED_SUSTAINABLE_HRS_YR[atype], 1.0)

    return dict(sensor_D=sensor_D, maint_D=maint_D, age_D=age_D,
                d_mttf=d_mttf, d_incident=d_incident, d_runtime=d_runtime)


def health_score_from_deviation(dev):
    ds1 = float(np.mean([linear_hs(d) for d in dev["sensor_D"].values()]))
    ds2 = linear_hs(dev["maint_D"])
    ds3 = linear_hs(dev["age_D"])
    ds4 = float(np.mean([mttf_hs(dev["d_mttf"]), linear_hs(dev["d_incident"]), linear_hs(dev["d_runtime"])]))
    final = WEIGHTS["ds1"]*ds1 + WEIGHTS["ds2"]*ds2 + WEIGHTS["ds3"]*ds3 + WEIGHTS["ds4"]*ds4
    return round(final, 1)


def build_history():
    asset_master = pd.read_csv(f"{DATA_DIR}/asset_master.csv", parse_dates=["Install Date"])
    sensors_df = pd.read_csv(f"{DATA_DIR}/sensor_telemetry.csv", parse_dates=["Timestamp"])
    maintenance_df = pd.read_csv(f"{DATA_DIR}/maintenance_records.csv", parse_dates=["Scheduled Date", "Completion Date"])
    incidents_df = pd.read_csv(f"{DATA_DIR}/incident_records.csv", parse_dates=["Incident Date/Time"])
    usage_df = pd.read_csv(f"{DATA_DIR}/asset_usage.csv")

    snapshot_dates = [TODAY - timedelta(days=d) for d in range(BACKTEST_DAYS, -1, -STEP_DAYS)]

    history = {}
    for _, row in asset_master.iterrows():
        aid = row["Asset ID"]
        series = []
        for as_of in snapshot_dates:
            dev = deviation_as_of(as_of, row, sensors_df, maintenance_df, incidents_df, usage_df)
            if dev is None:
                continue
            score = health_score_from_deviation(dev)
            series.append({"date": as_of.strftime("%Y-%m-%d"), "final_health_score": score,
                           "risk_category": risk_category(score)})
        history[aid] = series

    # fleet-wide average per date (same dates for every asset, so this is a simple zip+average)
    fleet_series = []
    for i, as_of in enumerate(snapshot_dates):
        scores = [history[aid][i]["final_health_score"] for aid in history if i < len(history[aid])]
        if not scores:
            continue
        avg = round(float(np.mean(scores)), 1)
        fleet_series.append({"date": as_of.strftime("%Y-%m-%d"), "final_health_score": avg,
                             "risk_category": risk_category(avg)})
    history["FLEET"] = fleet_series
    return history


if __name__ == "__main__":
    history = build_history()
    out_path = f"{OUTPUTS_DIR}/health_score_history.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
    for aid, series in history.items():
        vals = [p["final_health_score"] for p in series]
        print(f"{aid:10s} {len(series):3d} points  range: {min(vals):.1f} - {max(vals):.1f}  "
              f"(first: {vals[0]:.1f}, last: {vals[-1]:.1f})")
    print(f"\nWritten {out_path}")
