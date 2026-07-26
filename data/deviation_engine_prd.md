# FacilityBrain Deviation Engine PRD — Developer Reference
Scope: Deviation logic only — Health Score composite calculation is defined separately.

## Dataset 1 — Live Sensor Data

### Temperature
Purpose: Tells us if an asset is running hotter or colder than it safely should — an early warning sign for cooling failure, overload, or airflow blockage.
Expected Value: The manufacturer-rated safe operating range for that specific asset, from the Asset Register. Falls back to a rolling 30-day statistical baseline if OEM data isn't available.
Actual Value: The most recent temperature reading ingested from the BMS/SCADA/IoT sensor feed (typically every 1–15 minutes).
Deviation Formula: Deviation (°C) = Actual Temperature − Expected Max Temperature. Deviation (%) = (Deviation (°C) ÷ Expected Max Temperature) × 100.
If actual_temp ≤ expected_max_temp, deviation = 0. If no reading has arrived in the last hour, mark the asset's data as 'stale' instead of assuming 0 deviation.
Validation: Recommended MVP Business Rule — ASHRAE gives recommended data centre temperature ranges, but converting the gap into a percentage deviation for scoring is our own normalization choice, not an industry-mandated formula.

### Humidity
Purpose: Tells us if humidity around IT/electrical equipment is outside the safe band — too dry causes static discharge risk, too wet causes condensation and corrosion risk.
Expected Value: The ASHRAE-recommended humidity band for data centre equipment (commonly ~40–60% RH).
Deviation Formula: If Actual > Expected Max: Deviation(%) = ((Actual-Max)/Max)*100. If Actual < Expected Min: Deviation(%) = ((Min-Actual)/Min)*100. Else 0. Humidity has two 'wrong directions' (too dry AND too wet), so both sides are checked.
Validation: Recommended MVP Business Rule, informed by ASHRAE guideline.
Business Rule Required: Confirm the exact humidity band to use — ASHRAE guidance has changed across revisions and may need adjusting per data centre design (raised-floor vs. hot/cold aisle containment).

### Power Consumption
Purpose: Tells us if an asset is drawing more or less electrical power than expected — a strong early indicator of motor strain, failing components, or load imbalance.
Expected Value: The asset's rated power consumption under normal load (nameplate at registration), or a rolling baseline from its own healthy readings over the trailing 30 days.
Deviation Formula: Deviation(kW) = Actual − Expected. Deviation(%) = (Deviation(kW) ÷ Expected) × 100.
Flag both over-consumption (>expected) and significant under-consumption as two different conditions — do not assume 'less power = healthy'.
Validation: Recommended MVP Business Rule.
Business Rule Required: Threshold for under-consumption (how low signals 'asset may not be running properly' vs. normal low-load operation) needs to be defined per asset class.

## Dataset 2 — Maintenance History

### Maintenance Compliance
Purpose: Tells us how well an asset's scheduled preventive maintenance (PM) has actually been kept up with — missed or late maintenance is one of the strongest predictors of unexpected failure.
Expected Value: The scheduled maintenance date/interval defined in the CMMS for that asset.
Deviation Formula: Days Overdue = Current Date − Scheduled Date (only if positive). Compliance Deviation (%) = 100 − [(Completed On-Time Tasks ÷ Total Scheduled Tasks) × 100].
If the asset has fewer than 2 scheduled tasks in its history, do not calculate a compliance percentage — mark as 'insufficient maintenance history'.
Validation: Industry Standard — 'PM Compliance Rate' is a widely recognised maintenance/reliability KPI used across CMMS platforms (Maximo, Fiix, UpKeep). Expressing it as a 'deviation from 100%' is our Recommended MVP Business Rule.
Business Rule Required: How to treat tasks marked 'cancelled' or 'not required this cycle' by an engineer — these shouldn't count the same as a silently missed task, needs sign-off from Maintenance Ops.

## Dataset 3 — Asset Age

### Asset Age Deviation
Purpose: Tells us how much of an asset's useful life has already been consumed — older assets closer to end-of-life carry more risk regardless of how 'healthy' they currently read on sensors.
Expected Value: The manufacturer-stated design life for the asset (in years), captured in the Asset Register at registration.
Deviation Formula: Life Consumed (%) = (Actual Age ÷ Design Life) × 100.
If design_life_years is missing, do not default to any assumed value — flag as 'incomplete registration data'.
Validation: Recommended MVP Business Rule — using manufacturer design life as the denominator is standard reliability engineering practice, similar in spirit to how depreciation schedules work in finance.
Business Rule Required: For usage-hour-driven assets (e.g., generators that run only during outages), should Age be measured in calendar years or run-hours against a rated run-hour life? Calendar age can significantly understate real wear for such assets.

## Dataset 4 — Operational History

### MTTF (Mean Time To Failure)
Purpose: Tells us, on average, how long this asset tends to run before it fails — a lower-than-expected MTTF means the asset is failing more often than it should.
Expected Value: The benchmark/target MTTF for this asset class — sourced from OEM reliability data where available, or FacilityBrain's own fleet-wide historical average once enough data exists.
Actual MTTF = Total Operating Hours ÷ Number of Failures (in the observed period, e.g., trailing 24 months).
Deviation Formula: MTTF Deviation (%) = ((Target MTTF − Actual MTTF) ÷ Target MTTF) × 100. Positive means the asset is failing more often than the benchmark.
If failure_count = 0, do not divide by zero — treat Actual MTTF as 'at or above target' rather than leaving it undefined.
Validation: Industry Standard — MTTF = Operating Time ÷ Number of Failures is a standard reliability engineering calculation, widely referenced (e.g., IEC 60300 reliability standards).
Business Rule Required: Target MTTF values must be sourced per asset class — not yet defined; will need input from OEM documentation or reliability engineering benchmarks.

### Incident History (Incident Frequency Deviation)
Purpose: Tells us whether this asset is experiencing more failure/incident events than expected for its class — a rising incident rate is one of the clearest signs of declining reliability.
Expected Value: The benchmark/expected incident rate for the asset class over a given period, based on OEM data or fleet-wide historical average.
Deviation Formula: Incident Deviation (%) = ((Actual Incident Count − Expected Incident Count) ÷ Expected Incident Count) × 100.
If expected_incident_count = 0, apply a minimum floor value (e.g., 1) to avoid a division-by-zero error.
This metric does not distinguish severity (a minor incident counts the same as a major one) — severity weighting would be a separate, later enhancement.
Validation: Recommended MVP Business Rule.
Business Rule Required: Expected incident counts per asset class are not yet defined and need to be established from historical fleet data or OEM failure-rate data.

### Runtime / Operating Hours (Utilization Deviation)
Purpose: Tells us whether an asset is being run more or less than its expected duty cycle — both over-utilization (accelerated wear) and unexpected under-utilization (may indicate the asset isn't functioning as intended, or a process change) are useful signals.
Expected Value: The asset's rated or planned operating hours for the period.
Deviation Formula: Runtime Deviation (%) = ((Actual Operating Hours − Expected Operating Hours) ÷ Expected Operating Hours) × 100. Positive means it ran more than expected (potential over-utilization/wear risk); negative means under-utilization.
If expected_operating_hours = 0, apply a floor value rather than dividing by zero.
Validation: Recommended MVP Business Rule.
Business Rule Required: Expected/rated operating hours per asset class and per period need to be defined — will vary significantly between continuously running assets (CRAC units, chillers) and standby assets (generators, backup UPS).

## Open Business Rules — Required Before Implementation
Humidity band per data centre design; Power under-consumption threshold per asset class; Treatment of cancelled/not-required maintenance tasks; Calendar-age vs. run-hours for standby assets; Target MTTF values per asset class; Expected incident counts per asset class and the zero-floor value; Expected/rated operating hours per asset class and period.
These should be resolved with Reliability Engineering and Facilities SMEs before the Feature Engineering Service sprint begins.
