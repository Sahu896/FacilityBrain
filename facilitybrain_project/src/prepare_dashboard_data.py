"""
FacilityBrain — Dashboard data preparation
Takes outputs/combined_asset_state.json (from run_pipeline.py) and the raw
sensor telemetry, trims it down and adds multi-resolution temperature time
series, producing outputs/dashboard_data_v2.json — the file build_dashboard_v3.py
embeds into the HTML.

This used to be done with ad hoc one-off commands during development; folding
it into a real script closes that gap so `run_pipeline.py` -> this ->
`build_dashboard_v3.py` is a complete, reproducible chain with no hidden steps.
"""
import json
import os
from datetime import datetime, timedelta

import pandas as pd

from paths import DATA_DIR, OUTPUTS_DIR

TODAY = datetime(2026, 7, 25)


def build_temp_series(sensors_df, asset_ids):
    def resample_series(df, freq_days, n_points):
        df = df.sort_values("Timestamp")
        out = []
        for i in range(n_points):
            end = TODAY - timedelta(days=i * freq_days)
            start = end - timedelta(days=freq_days)
            window = df[(df["Timestamp"] > start) & (df["Timestamp"] <= end)]
            out.append(round(float(window["Reading Value"].mean()), 2) if len(window) else None)
        out.reverse()
        return out

    series = {}
    for aid in asset_ids:
        temp = sensors_df[(sensors_df["Asset ID (FK)"] == aid) & (sensors_df["Sensor Type"] == "Temperature")]
        baseline = float(temp["Baseline Value"].iloc[0])
        series[aid] = {
            "baseline": baseline,
            "30D": resample_series(temp, 1, 30),
            "6M": resample_series(temp, 7, 26),
            "2Y": resample_series(temp, 30, 24),
        }
    return series


def trim_asset(a):
    """Keep only what the dashboard actually renders, dropping the verbose deviation_detail blob."""
    return {
        "asset_id": a["asset_id"], "asset_type": a["asset_type"], "make_model": a["make_model"],
        "site_location": a["site_location"], "criticality_tier": a["criticality_tier"],
        "model1_anomaly_score": a["model1_anomaly_score"],
        "model1_per_sensor": {k: v["anomaly_score"] for k, v in a["model1_per_sensor"].items()},
        "model2_rul_days": a["model2_rul_days"],
        "model3_failure_probability_pct": a["model3_failure_probability_pct"],
        "dataset_health": a["dataset_health"],
        "final_health_score": a["final_health_score"],
        "risk_category": a["risk_category"],
        "sensor_deviation": {k: {"actual": v["actual"], "expected": v["expected"], "deviation_pct": v["deviation_pct"]}
                              for k, v in a["deviation_detail"]["sensors"].items()},
        "maintenance_compliance_pct": a["deviation_detail"]["maintenance"].get("compliance_pct"),
        "age_years": a["deviation_detail"]["age"]["age_years"],
        "design_life_years": a["deviation_detail"]["age"]["design_life_years"],
        "mttf_actual_hours": a["deviation_detail"]["mttf"]["actual_mttf_hours"],
        "mttf_target_hours": a["deviation_detail"]["mttf"]["target_mttf_hours"],
        "incidents_12mo": a["deviation_detail"]["incident"]["actual_incidents_12mo"],
    }


def main():
    combined_path = os.path.join(OUTPUTS_DIR, "combined_asset_state.json")
    if not os.path.exists(combined_path):
        raise SystemExit(
            "outputs/combined_asset_state.json not found — run src/run_pipeline.py first."
        )
    with open(combined_path, encoding="utf-8") as f:
        combined = json.load(f)

    sensors_df = pd.read_csv(os.path.join(DATA_DIR, "sensor_telemetry.csv"), parse_dates=["Timestamp"])
    asset_ids = [a["asset_id"] for a in combined["assets"]]
    temp_series = build_temp_series(sensors_df, asset_ids)

    dashboard_data = {
        "generated_at": combined["generated_at"],
        "model_metrics": combined["model_metrics"],
        "assets": [],
    }
    for a in combined["assets"]:
        trimmed = trim_asset(a)
        trimmed["temp_series"] = temp_series[a["asset_id"]]
        dashboard_data["assets"].append(trimmed)

    out_path = os.path.join(OUTPUTS_DIR, "dashboard_data_v2.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dashboard_data, f, separators=(",", ":"))
    print(f"Written {out_path} — {len(json.dumps(dashboard_data))} chars")


if __name__ == "__main__":
    main()
