"""
FacilityBrain — AI Model 1: Anomaly Detection
Trains one Isolation Forest per (asset, sensor) stream on ~2 years of daily readings,
then scores the most recent 30-day window against it.

Output: Anomaly Score 0-100 per asset (higher = more anomalous), averaged across
that asset's sensors, plus per-sensor detail for explainability.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from paths import DATA_DIR, OUTPUTS_DIR

WINDOW_DAYS = 30


def train_and_score_sensor(g, window_days=WINDOW_DAYS, random_state=42):
    g = g.sort_values("Timestamp").reset_index(drop=True)
    values = g[["Reading Value"]].values

    train = values[:-window_days] if len(values) > window_days else values
    recent = values[-window_days:]

    model = IsolationForest(
        n_estimators=200, contamination=0.05, random_state=random_state
    )
    model.fit(train)

    # decision_function: higher = more normal, lower/negative = more anomalous
    recent_scores = model.decision_function(recent)
    train_scores = model.decision_function(train)

    # Normalize against the training distribution so the score is comparable
    # across sensors with different scales. Map to 0-100 anomaly scale.
    mu, sd = train_scores.mean(), train_scores.std() or 1e-6
    z = (recent_scores.mean() - mu) / sd          # negative z = more anomalous
    anomaly_0_100 = float(np.clip(50 - z * 25, 0, 100))

    return dict(
        n_train=len(train), n_recent=len(recent),
        recent_mean_reading=round(float(recent.mean()), 2),
        model_decision_mean=round(float(recent_scores.mean()), 4),
        anomaly_score=round(anomaly_0_100, 1),
    )


def run_model1(sensors_df):
    results = {}
    for asset_id, adf in sensors_df.groupby("Asset ID (FK)"):
        per_sensor = {}
        for stype, g in adf.groupby("Sensor Type"):
            per_sensor[stype] = train_and_score_sensor(g)
        asset_anomaly = round(float(np.mean([v["anomaly_score"] for v in per_sensor.values()])), 1)
        results[asset_id] = dict(anomaly_score=asset_anomaly, per_sensor=per_sensor)
    return results


if __name__ == "__main__":
    import json
    import os
    sensors_df = pd.read_csv(os.path.join(DATA_DIR, "sensor_telemetry.csv"), parse_dates=["Timestamp"])
    res = run_model1(sensors_df)
    with open(os.path.join(OUTPUTS_DIR, "model1_anomaly_scores.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
    for aid, r in res.items():
        detail = ", ".join(f"{k}={v['anomaly_score']}" for k, v in r["per_sensor"].items())
        print(f"{aid:10s} Anomaly Score={r['anomaly_score']:5.1f}   [{detail}]")
