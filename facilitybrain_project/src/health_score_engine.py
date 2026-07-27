"""
FacilityBrain — Health Score Engine
Implements FacilityBrain_Health_Score_Calculation_Spec.docx exactly:
  - Default: HS = 100 x (1 - min(D,1))          [Temp, Humidity, Power, Maintenance, Age, Incident, Runtime]
  - MTTF exception: HS = 100 x e^(-D_mttf)       [reliability survival function]
  - Dataset scores = simple average of their metric HS's (single-metric datasets pass through)
  - Final = 0.40*DS1 + 0.25*DS2 + 0.20*DS3 + 0.15*DS4
  - Risk bands: 0-39 Critical | 40-59 High | 60-79 Medium | 80-100 Healthy
"""
import numpy as np
from paths import OUTPUTS_DIR

WEIGHTS = dict(ds1=0.40, ds2=0.25, ds3=0.20, ds4=0.15)


def linear_hs(D):
    return 100 * (1 - min(D, 1.0))


def mttf_hs(D_mttf):
    return 100 * np.exp(-D_mttf)


def risk_category(score):
    if score >= 80: return "Healthy"
    if score >= 60: return "Medium"
    if score >= 40: return "High"
    return "Critical"


def compute_health_scores(deviation_result):
    """deviation_result: one asset's dict from deviation_engine.run_deviation_engine()"""
    # ---- Dataset 1: Live Sensor Data ----
    sensor_hs = {stype: round(linear_hs(v["D"]), 1) for stype, v in deviation_result["sensors"].items()}
    ds1 = round(float(np.mean(list(sensor_hs.values()))), 1)

    # ---- Dataset 2: Maintenance (single metric, pass-through) ----
    hs_maint = round(linear_hs(deviation_result["maintenance"]["D"]), 1)
    ds2 = hs_maint

    # ---- Dataset 3: Asset Age (single metric, pass-through) ----
    hs_age = round(linear_hs(deviation_result["age"]["D"]), 1)
    ds3 = hs_age

    # ---- Dataset 4: Operational History (MTTF exponential + Incident/Runtime linear) ----
    hs_mttf = round(mttf_hs(deviation_result["mttf"]["D"]), 1)
    hs_incident = round(linear_hs(deviation_result["incident"]["D"]), 1)
    hs_runtime = round(linear_hs(deviation_result["runtime"]["D"]), 1)
    ds4 = round(float(np.mean([hs_mttf, hs_incident, hs_runtime])), 1)

    final = round(WEIGHTS["ds1"]*ds1 + WEIGHTS["ds2"]*ds2 + WEIGHTS["ds3"]*ds3 + WEIGHTS["ds4"]*ds4, 1)

    return dict(
        asset_id=deviation_result["asset_id"],
        sensor_hs=sensor_hs,
        hs_maintenance=hs_maint,
        hs_age=hs_age,
        hs_mttf=hs_mttf, hs_incident=hs_incident, hs_runtime=hs_runtime,
        ds1_health=ds1, ds2_health=ds2, ds3_health=ds3, ds4_health=ds4,
        final_health_score=final,
        risk_category=risk_category(final),
    )


def run_health_score_engine(deviation_results):
    return [compute_health_scores(r) for r in deviation_results]


if __name__ == "__main__":
    import json
    import os
    from deviation_engine import run_deviation_engine

    dev_results = run_deviation_engine()
    hs_results = run_health_score_engine(dev_results)
    with open(os.path.join(OUTPUTS_DIR, "health_scores.json"), "w", encoding="utf-8") as f:
        json.dump(hs_results, f, indent=2)
    for r in hs_results:
        print(f"{r['asset_id']:10s} DS1={r['ds1_health']:5.1f}  DS2={r['ds2_health']:5.1f}  "
              f"DS3={r['ds3_health']:5.1f}  DS4={r['ds4_health']:5.1f}  "
              f"FINAL={r['final_health_score']:5.1f}  RISK={r['risk_category']}")
