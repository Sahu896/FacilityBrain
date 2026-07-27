"""
FacilityBrain — AI Model 3: Failure Prediction

Trains a RandomForestClassifier on weekly snapshots across all 4 assets' 2-year
history. Label = 1 if a recorded incident occurred within the FOLLOWING 30 days
of that snapshot, else 0. This is real supervised learning on real incident
history (Dataset 3 - Maintenance / Incident Records), not a synthetic label.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
from paths import DATA_DIR, OUTPUTS_DIR

TODAY = datetime(2026, 7, 25)
FEATURES = ["age_fraction", "avg_sensor_dev_pct", "incidents_trailing_180d",
            "maint_compliance_pct", "days_since_last_incident"]


def build_labeled_snapshots(asset_master, sensors, maintenance, incidents):
    rows = []
    for _, a in asset_master.iterrows():
        aid, design_life_years = a["Asset ID"], a["Design Lifespan (Years)"]
        install_date = a["Install Date"]
        design_life_days = design_life_years * 365.25
        asset_sensors = sensors[sensors["Asset ID (FK)"] == aid].sort_values("Timestamp")
        asset_maint = maintenance[maintenance["Asset ID (FK)"] == aid]
        asset_inc = incidents[incidents["Asset ID (FK)"] == aid].sort_values("Incident Date/Time")
        inc_dates = asset_inc["Incident Date/Time"]

        snap_date = install_date + timedelta(days=60)
        while snap_date < TODAY - timedelta(days=30):   # need a full 30-day forward label window
            age_days = (snap_date - install_date).days
            age_fraction = min(age_days / design_life_days, 1.5)

            window = asset_sensors[(asset_sensors["Timestamp"] <= snap_date) &
                                    (asset_sensors["Timestamp"] > snap_date - timedelta(days=30))]
            if window.empty:
                snap_date += timedelta(days=7)
                continue
            dev_pcts = []
            for stype, g in window.groupby("Sensor Type"):
                baseline = g["Baseline Value"].iloc[0]
                dev_pcts.append(abs(g["Reading Value"].mean() - baseline) / baseline)
            avg_sensor_dev_pct = float(np.mean(dev_pcts))

            incidents_trailing_180d = inc_dates[(inc_dates <= snap_date) &
                                                 (inc_dates > snap_date - timedelta(days=180))].shape[0]
            past_incidents = inc_dates[inc_dates <= snap_date]
            days_since_last_incident = (snap_date - past_incidents.max()).days if len(past_incidents) else 999

            scored = asset_maint[(asset_maint["Scheduled Date"] <= snap_date) &
                                  (asset_maint["Maintenance Compliance Score (Trailing %)"].notna())]
            maint_compliance_pct = scored["Maintenance Compliance Score (Trailing %)"].iloc[-1] \
                if len(scored) else 95.0

            label = int(((inc_dates > snap_date) & (inc_dates <= snap_date + timedelta(days=30))).any())

            rows.append(dict(asset_id=aid, snapshot_date=snap_date,
                              age_fraction=age_fraction, avg_sensor_dev_pct=avg_sensor_dev_pct,
                              incidents_trailing_180d=incidents_trailing_180d,
                              maint_compliance_pct=maint_compliance_pct,
                              days_since_last_incident=min(days_since_last_incident, 999),
                              failure_within_30d=label))
            snap_date += timedelta(days=7)
    return pd.DataFrame(rows)


def snapshot_at_today(asset_master, sensors, maintenance, incidents):
    """Build the feature row for right now (used for live inference, not training)."""
    rows = []
    for _, a in asset_master.iterrows():
        aid, design_life_years = a["Asset ID"], a["Design Lifespan (Years)"]
        install_date = a["Install Date"]
        design_life_days = design_life_years * 365.25
        asset_sensors = sensors[sensors["Asset ID (FK)"] == aid].sort_values("Timestamp")
        asset_maint = maintenance[maintenance["Asset ID (FK)"] == aid]
        asset_inc = incidents[incidents["Asset ID (FK)"] == aid].sort_values("Incident Date/Time")
        inc_dates = asset_inc["Incident Date/Time"]

        age_days = (TODAY - install_date).days
        age_fraction = min(age_days / design_life_days, 1.5)
        window = asset_sensors[asset_sensors["Timestamp"] > TODAY - timedelta(days=30)]
        dev_pcts = []
        for stype, g in window.groupby("Sensor Type"):
            baseline = g["Baseline Value"].iloc[0]
            dev_pcts.append(abs(g["Reading Value"].mean() - baseline) / baseline)
        avg_sensor_dev_pct = float(np.mean(dev_pcts)) if dev_pcts else 0.0

        incidents_trailing_180d = inc_dates[inc_dates > TODAY - timedelta(days=180)].shape[0]
        days_since_last_incident = (TODAY - inc_dates.max()).days if len(inc_dates) else 999

        scored = asset_maint[asset_maint["Maintenance Compliance Score (Trailing %)"].notna()]
        maint_compliance_pct = scored["Maintenance Compliance Score (Trailing %)"].iloc[-1] \
            if len(scored) else 95.0

        rows.append(dict(asset_id=aid, age_fraction=age_fraction, avg_sensor_dev_pct=avg_sensor_dev_pct,
                          incidents_trailing_180d=incidents_trailing_180d,
                          maint_compliance_pct=maint_compliance_pct,
                          days_since_last_incident=min(days_since_last_incident, 999)))
    return pd.DataFrame(rows)


def train_model3(snapshots_df):
    X, y = snapshots_df[FEATURES], snapshots_df["failure_within_30d"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=300, max_depth=6, class_weight="balanced", random_state=42)
    model.fit(X_train, y_train)
    proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, proba) if len(set(y_test)) > 1 else None
    report = classification_report(y_test, model.predict(X_test), output_dict=False)
    return model, dict(auc=round(auc, 3) if auc else None, n_train=len(X_train), n_test=len(X_test)), report


if __name__ == "__main__":
    import json
    import os
    asset_master = pd.read_csv(os.path.join(DATA_DIR, "asset_master.csv"), parse_dates=["Install Date"])
    sensors = pd.read_csv(os.path.join(DATA_DIR, "sensor_telemetry.csv"), parse_dates=["Timestamp"])
    maintenance = pd.read_csv(os.path.join(DATA_DIR, "maintenance_records.csv"), parse_dates=["Scheduled Date", "Completion Date"])
    incidents = pd.read_csv(os.path.join(DATA_DIR, "incident_records.csv"), parse_dates=["Incident Date/Time"])

    snap = build_labeled_snapshots(asset_master, sensors, maintenance, incidents)
    print(f"Training snapshots: {len(snap)}  |  positive rate: {snap['failure_within_30d'].mean():.2%}")

    model, metrics, report = train_model3(snap)
    print("Model 3 (Failure Classifier) metrics:", metrics)
    print(report)

    today_snap = snapshot_at_today(asset_master, sensors, maintenance, incidents)
    probs = model.predict_proba(today_snap[FEATURES])[:, 1]
    out = {aid: dict(failure_probability_pct=round(float(p) * 100, 1))
           for aid, p in zip(today_snap["asset_id"], probs)}
    with open(os.path.join(OUTPUTS_DIR, "model3_failure_predictions.json"), "w", encoding="utf-8") as f:
        json.dump({"metrics": metrics, "predictions": out}, f, indent=2)
    for aid, r in out.items():
        print(f"{aid:10s} Failure Probability (next 30d) = {r['failure_probability_pct']}%")
