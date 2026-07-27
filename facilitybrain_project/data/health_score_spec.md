# FacilityBrain Health Score Calculation Engine — Backend Implementation Reference
Scope note: Deviation calculations are already completed and approved. This document covers only the conversion of those deviation values into Health Scores. No AI/ML scoring, and no additional datasets or metrics are introduced here.

Approved Dataset Weights: Live Sensor Data 40%, Maintenance History 25%, Asset Age 20%, Operational History 15%.

## Core Conversion Rule
Every metric receives an already-calculated deviation value D, normalized 0–1, where D=0 is baseline/fully compliant and D=1 is at or beyond the critical threshold.
Default conversion: Health Score = 100 × (1 − min(D, 1)). This is a Recommended MVP Business Rule — there is no single universal industry formula for turning an arbitrary normalized deviation into a 0–100 health score, so a linear inverse mapping is used for MVP simplicity and explainability.
Two metrics (MTTF, Asset Age) use different formulas, called out individually.

## Dataset 1 — Live Sensor Data (Weight 40%)
Temperature, Humidity, and Power Consumption all use HS = 100 × (1 − min(D,1)). Validation: Recommended MVP Business Rule for each.
Dataset 1 Health Score = (HS_temp + HS_humidity + HS_power) / 3 — equal-weighted average.
Business Rule Required: confirm with Product Owner whether temperature/humidity/power should carry equal weight within Dataset 1, or a custom split, before locking into production.
If a sensor reading is missing/stale, exclude it from the average and flag a data-quality indicator rather than defaulting it to 0 or 100.

## Dataset 2 — Maintenance History (Weight 25%)
Maintenance Compliance: HS_maint = 100 × (1 − min(D_maint,1)). Validation: Recommended MVP Business Rule.
Dataset 2 Health Score = HS_maint (single-metric pass-through). If additional maintenance metrics are approved later, this becomes a weighted/equal average.

## Dataset 3 — Asset Age (Weight 20%)
Age vs. Design Life: HS_age = 100 × (1 − min(D_age,1)). D_age is fraction of design life consumed — a linear remaining-useful-life approximation, a widely used simplification in asset management for wear-out estimation (the middle, linear portion of the reliability "bathtub curve").
Validation: Engineering Best Practice.
Dataset 3 Health Score = HS_age (single-metric pass-through).

## Dataset 4 — Operational History (Weight 15%)
MTTF: uses a reliability-engineering decay curve rather than a linear one. HS_mttf = 100 × e^(−D_mttf). D_mttf is elapsed operating time since last failure/replacement normalized against the asset class's MTTF (t ÷ MTTF). e^(−D_mttf) is the exponential reliability (survival) function R(t) = e^(−t/MTTF), standard in reliability engineering under the constant-failure-rate (exponential distribution) assumption. Unlike other metrics, this is NOT a linear inversion — reliability decays exponentially, not linearly, as elapsed time approaches MTTF. No clipping needed — the exponential naturally stays within (0,100].
Validation: Industry Best Practice / Engineering Best Practice.
Incident History: HS_incident = 100 × (1 − min(D_incident,1)). Validation: Recommended MVP Business Rule.
Runtime / Operating Hours: HS_runtime = 100 × (1 − min(D_runtime,1)). Validation: Recommended MVP Business Rule.
Dataset 4 Health Score = (HS_mttf + HS_incident + HS_runtime) / 3 — equal-weighted average.
Business Rule Required: confirm with Product Owner whether MTTF/Incident/Runtime should be equally weighted within Dataset 4, or split differently, before production lock.
Same missing-data handling as Dataset 1: if one operational metric is unavailable, exclude it from the average and raise a data-quality flag rather than defaulting to 0 or 100.

## Final Health Score
Final_Health_Score = (0.40 × DS1_Health) + (0.25 × DS2_Health) + (0.20 × DS3_Health) + (0.15 × DS4_Health).
Compute all four Dataset Health Scores for the current cycle first, then apply the weighted sum. This runs as the final step in the scoring pipeline, writing Final_Health_Score (rounded to nearest integer) plus the four underlying dataset scores to the asset record, so the UI can render both the headline number and the score-breakdown panel.

## Risk Category Mapping
0–39 Critical | 40–59 High | 60–79 Medium | 80–100 Healthy.
Why these ranges suit the MVP: these bands are already the approved thresholds used elsewhere in FacilityBrain (asset cards, dashboards, alerting). Keeping the Health Score bands identical avoids a mismatch between what the scoring engine outputs and what the UI/alerting layer already expects. A 40-point spread for Critical+High (0–59) reflects that data centre stakeholders want early warning well before an asset actually fails, while the narrower Healthy band (80–100) keeps the bar for "no action needed" appropriately strict.
Validation: Recommended MVP Business Rule (already approved and in use elsewhere in the platform).
