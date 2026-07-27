"""
FacilityBrain — Deviation Engine
Implements the exact formulas from FacilityBrain_Deviation_Engine_PRD.docx.

Input:  the 5 raw datasets (CSV)
Output: a normalized deviation value D (0-1+) for every metric, per asset,
        ready to feed the Health Score Engine.

Scope: deviation logic only. No health score math here.
"""
import pandas as pd
import numpy as np
from datetime import datetime
from paths import DATA_DIR, OUTPUTS_DIR

TODAY = datetime(2026, 7, 25)

# Asset-class benchmarks — these are the "Business Rule Required" placeholders
# flagged in the PRD (target MTTF, expected incidents/yr, rated sustainable hours,
# critical deviation thresholds). Swap these for real OEM/fleet values in production.
CRITICAL_THRESHOLD_PCT = {   # "at or beyond this % gap = D reaches 1.0"
    "Temperature": 0.30, "Humidity": 0.30, "Current": 0.30,
}
TARGET_MTTF_HOURS        = {"Chiller": 15000, "UPS": 20000, "Generator": 3000, "PDU": 25000}
EXPECTED_INCIDENTS_YR     = {"Chiller": 2,     "UPS": 1,     "Generator": 3,    "PDU": 0.5}
RATED_SUSTAINABLE_HRS_YR  = {"Chiller": 8000,  "UPS": 8760,  "Generator": 120,  "PDU": 8760}


def load_data(data_dir=DATA_DIR):
    return dict(
        asset_master=pd.read_csv(f"{data_dir}/asset_master.csv", parse_dates=["Install Date"]),
        sensors=pd.read_csv(f"{data_dir}/sensor_telemetry.csv", parse_dates=["Timestamp"]),
        maintenance=pd.read_csv(f"{data_dir}/maintenance_records.csv",
                                 parse_dates=["Scheduled Date", "Completion Date"]),
        incidents=pd.read_csv(f"{data_dir}/incident_records.csv", parse_dates=["Incident Date/Time"]),
        usage=pd.read_csv(f"{data_dir}/asset_usage.csv"),
    )


# ---------------------------------------------------------------------------
# Dataset 1 — Live Sensor Data (Temperature / Humidity / Power-Current)
# Deviation (%) = |Actual - Expected| / Expected * 100 ; D = min(dev% / critical%, 1)
# ---------------------------------------------------------------------------
def sensor_deviation(sensors_df, asset_id, window_days=30):
    asset_sensors = sensors_df[sensors_df["Asset ID (FK)"] == asset_id]
    out = {}
    for stype, g in asset_sensors.groupby("Sensor Type"):
        g = g.sort_values("Timestamp")
        baseline = g["Baseline Value"].iloc[0]
        recent = g.iloc[-window_days:]["Reading Value"].mean()
        gap = recent - baseline
        dev_pct = abs(gap) / baseline
        crit = CRITICAL_THRESHOLD_PCT.get(stype, 0.30)
        D = min(dev_pct / crit, 1.0)
        out[stype] = dict(actual=round(recent, 2), expected=baseline,
                           deviation_pct=round(dev_pct * 100, 1), D=round(D, 3))
    return out


# ---------------------------------------------------------------------------
# Dataset 2 — Maintenance Compliance
# Compliance Deviation (%) = 100 - (on-time / total * 100) ; D = Compliance Deviation / 100
# ---------------------------------------------------------------------------
def maintenance_deviation(maintenance_df, asset_id):
    m = maintenance_df[maintenance_df["Asset ID (FK)"] == asset_id]
    scored = m[m["Maintenance Compliance Score (Trailing %)"].notna()]
    if scored.empty:
        return dict(compliance_pct=None, D=0.0, note="insufficient maintenance history")
    compliance_pct = scored["Maintenance Compliance Score (Trailing %)"].iloc[-1]
    D = (100 - compliance_pct) / 100
    return dict(compliance_pct=round(compliance_pct, 1), D=round(D, 3))


# ---------------------------------------------------------------------------
# Dataset 3 — Asset Age
# Life Consumed (%) = Actual Age / Design Life * 100 ; D = min(that, 1)
# ---------------------------------------------------------------------------
def age_deviation(asset_master_df, asset_id):
    row = asset_master_df[asset_master_df["Asset ID"] == asset_id].iloc[0]
    age_years = (TODAY - row["Install Date"]).days / 365.25
    design_life = row["Design Lifespan (Years)"]
    D = min(age_years / design_life, 1.0)
    return dict(age_years=round(age_years, 2), design_life_years=design_life, D=round(D, 3))


# ---------------------------------------------------------------------------
# Dataset 4a — MTTF Deviation
# Actual MTTF = Total Operating Hours / Number of Failures
# Elapsed-vs-target ratio used as D_mttf input to the exponential HS formula (see health_score_engine)
# ---------------------------------------------------------------------------
def mttf_deviation(usage_df, incidents_df, asset_master_df, asset_id):
    atype = asset_master_df.loc[asset_master_df["Asset ID"] == asset_id, "Asset Type"].iloc[0]
    total_hours = usage_df[usage_df["Asset ID (FK)"] == asset_id]["Operating Hours (Cumulative)"].iloc[-1]
    n_failures = incidents_df[incidents_df["Asset ID (FK)"] == asset_id].shape[0]
    actual_mttf = total_hours / max(n_failures, 1)
    target_mttf = TARGET_MTTF_HOURS[atype]
    mttf_deviation_pct = ((target_mttf - actual_mttf) / target_mttf) * 100
    # D_mttf for the exponential HS formula = elapsed-time-ratio proxy (normalized, capped)
    D_mttf = min((target_mttf / max(actual_mttf, 1)) / 3, 1.0)
    return dict(actual_mttf_hours=round(actual_mttf, 0), target_mttf_hours=target_mttf,
                mttf_deviation_pct=round(mttf_deviation_pct, 1), D=round(D_mttf, 3))


# ---------------------------------------------------------------------------
# Dataset 4b — Incident Frequency Deviation
# D = min(actual_incidents_12mo / expected_incidents_12mo, 1)
# ---------------------------------------------------------------------------
def incident_deviation(incidents_df, asset_master_df, asset_id):
    atype = asset_master_df.loc[asset_master_df["Asset ID"] == asset_id, "Asset Type"].iloc[0]
    inc = incidents_df[incidents_df["Asset ID (FK)"] == asset_id]
    n_12mo = inc[inc["Incident Date/Time"] >= TODAY - pd.Timedelta(days=365)].shape[0]
    expected = EXPECTED_INCIDENTS_YR[atype]
    D = min(n_12mo / max(expected, 0.1), 1.0)
    return dict(actual_incidents_12mo=n_12mo, expected_incidents_yr=expected, D=round(D, 3))


# ---------------------------------------------------------------------------
# Dataset 4c — Runtime / Utilization Deviation
# D = min(annualized_actual_hours / rated_sustainable_hours, 1)
# ---------------------------------------------------------------------------
def runtime_deviation(usage_df, asset_master_df, asset_id):
    atype = asset_master_df.loc[asset_master_df["Asset ID"] == asset_id, "Asset Type"].iloc[0]
    u = usage_df[usage_df["Asset ID (FK)"] == asset_id]
    monthly_hours = u["Operating Hours (Cumulative)"].diff().mean()
    annualized_hours = (monthly_hours or 0) * 12
    rated = RATED_SUSTAINABLE_HRS_YR[atype]
    D = min(annualized_hours / rated, 1.0)
    return dict(annualized_hours=round(annualized_hours, 0), rated_sustainable_hrs=rated, D=round(D, 3))


def run_deviation_engine(data_dir=DATA_DIR):
    d = load_data(data_dir)
    results = []
    for asset_id in d["asset_master"]["Asset ID"]:
        sensors = sensor_deviation(d["sensors"], asset_id)
        maint = maintenance_deviation(d["maintenance"], asset_id)
        age = age_deviation(d["asset_master"], asset_id)
        mttf = mttf_deviation(d["usage"], d["incidents"], d["asset_master"], asset_id)
        incident = incident_deviation(d["incidents"], d["asset_master"], asset_id)
        runtime = runtime_deviation(d["usage"], d["asset_master"], asset_id)
        results.append(dict(asset_id=asset_id, sensors=sensors, maintenance=maint,
                             age=age, mttf=mttf, incident=incident, runtime=runtime))
    return results


if __name__ == "__main__":
    import json
    import os
    res = run_deviation_engine()
    with open(os.path.join(OUTPUTS_DIR, "deviation_results.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2, default=str)
    for r in res:
        print(r["asset_id"], "-> sensors:", {k: v["D"] for k, v in r["sensors"].items()},
              "| maint D:", r["maintenance"]["D"], "| age D:", r["age"]["D"],
              "| mttf D:", r["mttf"]["D"], "| incident D:", r["incident"]["D"],
              "| runtime D:", r["runtime"]["D"])
