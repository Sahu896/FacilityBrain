"""
FacilityBrain — Master Pipeline Orchestrator
Runs: Deviation Engine -> Health Score Engine -> Model 1 (Anomaly) ->
      Model 2 (RUL) -> Model 3 (Failure Probability) -> combines everything
      into outputs/combined_asset_state.json, which the dashboard consumes.

RAG chunks are built separately (rag_knowledge_base.py) since Model 4's actual
LLM call happens client-side in the dashboard artifact.
"""
import json
import os
import pandas as pd

from paths import DATA_DIR, OUTPUTS_DIR
from deviation_engine import run_deviation_engine
from health_score_engine import run_health_score_engine
from model1_anomaly_detection import run_model1
from model2_rul_prediction import (build_snapshots as m2_build_snapshots,
                                    train_model2, predict_current_rul)
from model3_failure_prediction import (build_labeled_snapshots, train_model3,
                                        snapshot_at_today, FEATURES as M3_FEATURES)


def main():
    asset_master = pd.read_csv(os.path.join(DATA_DIR, "asset_master.csv"), parse_dates=["Install Date"])
    sensors = pd.read_csv(os.path.join(DATA_DIR, "sensor_telemetry.csv"), parse_dates=["Timestamp"])
    maintenance = pd.read_csv(os.path.join(DATA_DIR, "maintenance_records.csv"), parse_dates=["Scheduled Date", "Completion Date"])
    incidents = pd.read_csv(os.path.join(DATA_DIR, "incident_records.csv"), parse_dates=["Incident Date/Time"])
    usage = pd.read_csv(os.path.join(DATA_DIR, "asset_usage.csv"))

    print("1/5  Deviation Engine...")
    deviation_results = run_deviation_engine(DATA_DIR)

    print("2/5  Health Score Engine...")
    health_results = run_health_score_engine(deviation_results)

    print("3/5  Model 1 — Anomaly Detection (Isolation Forest)...")
    model1_results = run_model1(sensors)

    print("4/5  Model 2 — RUL Prediction (RandomForest Regressor)...")
    m2_snapshots = m2_build_snapshots(asset_master, sensors, maintenance, incidents, usage)
    m2_model, m2_metrics = train_model2(m2_snapshots)
    model2_results = predict_current_rul(m2_model, asset_master, sensors, maintenance, incidents, usage)

    print("5/5  Model 3 — Failure Prediction (RandomForest Classifier)...")
    m3_snapshots = build_labeled_snapshots(asset_master, sensors, maintenance, incidents)
    m3_model, m3_metrics, _ = train_model3(m3_snapshots)
    today_feats = snapshot_at_today(asset_master, sensors, maintenance, incidents)
    m3_probs = m3_model.predict_proba(today_feats[M3_FEATURES])[:, 1]
    model3_results = {aid: round(float(p) * 100, 1) for aid, p in zip(today_feats["asset_id"], m3_probs)}

    combined = []
    for hs, dev in zip(health_results, deviation_results):
        aid = hs["asset_id"]
        meta = asset_master[asset_master["Asset ID"] == aid].iloc[0]
        combined.append(dict(
            asset_id=aid,
            asset_type=meta["Asset Type"],
            make_model=meta["Make / Model"],
            site_location=meta["Site / Location"],
            criticality_tier=meta["Criticality Tier"],
            model1_anomaly_score=model1_results[aid]["anomaly_score"],
            model1_per_sensor=model1_results[aid]["per_sensor"],
            model2_rul_days=model2_results[aid]["predicted_rul_days"],
            model3_failure_probability_pct=model3_results[aid],
            dataset_health=dict(
                sensor=hs["ds1_health"], maintenance=hs["ds2_health"],
                age=hs["ds3_health"], operational=hs["ds4_health"],
            ),
            final_health_score=hs["final_health_score"],
            risk_category=hs["risk_category"],
            deviation_detail=dev,
        ))

    with open(os.path.join(OUTPUTS_DIR, "combined_asset_state.json"), "w", encoding="utf-8") as f:
        json.dump(dict(
            generated_at="2026-07-25",
            model_metrics=dict(model2_rul=m2_metrics, model3_failure=m3_metrics),
            assets=combined,
        ), f, indent=2, default=str)

    print("\n=== FacilityBrain Pipeline — Final State ===")
    for a in combined:
        print(f"{a['asset_id']:10s} {a['asset_type']:10s} | Anomaly={a['model1_anomaly_score']:5.1f} "
              f"| RUL={a['model2_rul_days']:5d}d | FailProb={a['model3_failure_probability_pct']:5.1f}% "
              f"| Health={a['final_health_score']:5.1f} ({a['risk_category']})")

    print(f"\nSaved: {os.path.join(OUTPUTS_DIR, 'combined_asset_state.json')}")


if __name__ == "__main__":
    main()
