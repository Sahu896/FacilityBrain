"""
FacilityBrain — AI Model 2: RUL (Remaining Useful Life) Prediction

With only 4 assets and no real end-of-life failure history, we can't train on
"actual RUL at failure" labels the way a mature fleet would. Instead we build a
weekly-snapshot training set (~104 snapshots/asset x 4 assets) where:
  - FEATURES come from real operational data as of that snapshot date
    (age fraction, trailing sensor deviation, incident count, maintenance compliance)
  - LABELS are physics-informed: design-life-remaining scaled down by how severe
    the sensor deviation was at that point in time.
This is a standard technique (physics-informed / simulation-assisted labeling)
for bootstrapping a data-driven RUL model before enough real failure history exists.
Swap in real time-to-failure labels once available.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from paths import DATA_DIR, OUTPUTS_DIR

TODAY = datetime(2026, 7, 25)
START = TODAY - timedelta(days=730)
FEATURES = ["age_fraction", "avg_sensor_dev_pct", "incidents_to_date",
            "maint_compliance_pct", "operating_hours_frac"]


def snapshot_features(aid, snap_date, install_date, design_life_days,
                       asset_sensors, asset_maint, asset_inc, max_hours):
    """Compute one feature row (+ physics-informed label) for asset `aid` as of `snap_date`."""
    age_days = (snap_date - install_date).days
    age_fraction = min(age_days / design_life_days, 1.5)

    window = asset_sensors[(asset_sensors["Timestamp"] <= snap_date) &
                            (asset_sensors["Timestamp"] > snap_date - timedelta(days=30))]
    if window.empty:
        return None
    dev_pcts = []
    for stype, g in window.groupby("Sensor Type"):
        baseline = g["Baseline Value"].iloc[0]
        dev_pcts.append(abs(g["Reading Value"].mean() - baseline) / baseline)
    avg_sensor_dev_pct = float(np.mean(dev_pcts))

    incidents_to_date = asset_inc[asset_inc["Incident Date/Time"] <= snap_date].shape[0]

    scored = asset_maint[(asset_maint["Scheduled Date"] <= snap_date) &
                          (asset_maint["Maintenance Compliance Score (Trailing %)"].notna())]
    maint_compliance_pct = scored["Maintenance Compliance Score (Trailing %)"].iloc[-1] \
        if len(scored) else 95.0

    frac_through = age_days / max((TODAY - install_date).days, 1)
    operating_hours_frac = min((frac_through * max_hours) / (design_life_days * 20), 1.0)

    # ---- physics-informed label ----
    base_remaining_days = max(design_life_days - age_days, 0)
    severity_penalty = np.clip(1 - (avg_sensor_dev_pct / 0.45), 0.05, 1.0)
    rul_label_days = base_remaining_days * severity_penalty

    return dict(asset_id=aid, snapshot_date=snap_date,
                age_fraction=age_fraction, avg_sensor_dev_pct=avg_sensor_dev_pct,
                incidents_to_date=incidents_to_date,
                maint_compliance_pct=maint_compliance_pct,
                operating_hours_frac=operating_hours_frac,
                rul_label_days=rul_label_days)


def build_snapshots(asset_master, sensors, maintenance, incidents, usage, include_today=False):
    rows = []
    for _, a in asset_master.iterrows():
        aid, design_life_years = a["Asset ID"], a["Design Lifespan (Years)"]
        install_date = a["Install Date"]
        design_life_days = design_life_years * 365.25
        asset_sensors = sensors[sensors["Asset ID (FK)"] == aid].sort_values("Timestamp")
        asset_maint = maintenance[maintenance["Asset ID (FK)"] == aid]
        asset_inc = incidents[incidents["Asset ID (FK)"] == aid].sort_values("Incident Date/Time")
        asset_usage = usage[usage["Asset ID (FK)"] == aid].reset_index(drop=True)
        max_hours = asset_usage["Operating Hours (Cumulative)"].iloc[-1]

        snap_date = install_date + timedelta(days=60)  # skip earliest days (not enough history)
        while snap_date < TODAY:
            row = snapshot_features(aid, snap_date, install_date, design_life_days,
                                     asset_sensors, asset_maint, asset_inc, max_hours)
            if row:
                rows.append(row)
            snap_date += timedelta(days=7)

        if include_today:
            row = snapshot_features(aid, TODAY, install_date, design_life_days,
                                     asset_sensors, asset_maint, asset_inc, max_hours)
            if row:
                rows.append(row)
    return pd.DataFrame(rows)


def train_model2(snapshots_df):
    X = snapshots_df[FEATURES]
    y = snapshots_df["rul_label_days"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=300, max_depth=8, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = dict(mae_days=round(mean_absolute_error(y_test, preds), 1),
                   r2=round(r2_score(y_test, preds), 3), n_train=len(X_train), n_test=len(X_test))
    return model, metrics


def predict_current_rul(model, asset_master, sensors, maintenance, incidents, usage):
    """Score each asset's LATEST snapshot (exactly TODAY) using the trained model."""
    snap = build_snapshots(asset_master, sensors, maintenance, incidents, usage, include_today=True)
    latest = snap[snap["snapshot_date"] == TODAY]
    preds = model.predict(latest[FEATURES])
    out = {}
    for aid, rul in zip(latest["asset_id"].values, preds):
        out[aid] = dict(predicted_rul_days=int(round(max(rul, 10))))
    return out


if __name__ == "__main__":
    import json
    import os
    asset_master = pd.read_csv(os.path.join(DATA_DIR, "asset_master.csv"), parse_dates=["Install Date"])
    sensors = pd.read_csv(os.path.join(DATA_DIR, "sensor_telemetry.csv"), parse_dates=["Timestamp"])
    maintenance = pd.read_csv(os.path.join(DATA_DIR, "maintenance_records.csv"), parse_dates=["Scheduled Date", "Completion Date"])
    incidents = pd.read_csv(os.path.join(DATA_DIR, "incident_records.csv"), parse_dates=["Incident Date/Time"])
    usage = pd.read_csv(os.path.join(DATA_DIR, "asset_usage.csv"))

    snapshots = build_snapshots(asset_master, sensors, maintenance, incidents, usage)
    print(f"Training snapshots built: {len(snapshots)}")

    model, metrics = train_model2(snapshots)
    print("Model 2 (RUL Regressor) validation metrics:", metrics)

    current_rul = predict_current_rul(model, asset_master, sensors, maintenance, incidents, usage)
    with open(os.path.join(OUTPUTS_DIR, "model2_rul_predictions.json"), "w", encoding="utf-8") as f:
        json.dump({"metrics": metrics, "predictions": current_rul}, f, indent=2)
    for aid, r in current_rul.items():
        print(f"{aid:10s} Predicted RUL = {r['predicted_rul_days']} days")
