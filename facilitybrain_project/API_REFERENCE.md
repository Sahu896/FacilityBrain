# FacilityBrain API Reference

Base URL (running locally): `http://localhost:5050`

CORS is open — call this from any frontend origin (localhost:3000, a deployed
site, whatever) with no extra configuration.

## Setup (one-time)
```bash
pip install flask flask-cors
```

## Running it
```bash
# 1. Generate the pipeline data (only needs re-running when the underlying
#    dummy data or models change — the API just reads what this writes)
python src/run_pipeline.py

# 2. Start the API server (leave this running)
python api_server.py
```
Console will show:
```
FacilityBrain API server — backend: ollama (qwen2.5:3b)
 * Running on http://127.0.0.1:5050
```

### Choosing the AI backend
Two endpoints (`/api/recommend`, `/api/chat`) call an LLM. Defaults to a local
Ollama model (`qwen2.5:3b`) — free, private, no API key. To use the real
Anthropic API instead (better quality, needs your own key, uses credits):
```bash
set BACKEND=anthropic
set ANTHROPIC_API_KEY=sk-ant-...
python api_server.py
```

---

## Endpoints

### `GET /api/health`
Quick check that the server (and which AI backend) is up.
```json
{ "status": "ok", "backend": "ollama", "model": "qwen2.5:3b" }
```

### `GET /api/assets`
All 4 assets with their full computed state — deviations, dataset health
breakdown, and all 3 model outputs.
```json
[
  {
    "asset_id": "AST-1001",
    "asset_type": "Chiller",
    "make_model": "Carrier 30XA-350",
    "site_location": "Delhi DC1 - Hall A",
    "criticality_tier": "Tier 1 - Critical",
    "model1_anomaly_score": 78.3,
    "model1_per_sensor": { "Temperature": 90.1, "Pressure": 96.6, "Vibration": 48.3 },
    "model2_rul_days": 1575,
    "model3_failure_probability_pct": 8.9,
    "dataset_health": { "sensor": 34.8, "maintenance": 55.6, "age": 50.9, "operational": 28.9 },
    "final_health_score": 42.3,
    "risk_category": "High",
    "deviation_detail": { "...": "full per-metric deviation breakdown, see below" }
  }
]
```

### `GET /api/assets/<asset_id>`
Single asset, same shape as one element above. `asset_id` is one of
`AST-1001` (Chiller), `AST-1002` (UPS), `AST-1003` (Generator), `AST-1004` (PDU).
Returns `404 { "error": "asset '...' not found" }` for an unknown id.

### `GET /api/fleet`
Fleet-wide aggregate (simple average across all 4 assets) — useful for a
top-level overview screen before drilling into a specific asset.
```json
{
  "asset_id": "FLEET",
  "asset_count": 4,
  "critical_count": 1,
  "high_risk_count": 2,
  "final_health_score": 49.2,
  "risk_category": "High",
  "dataset_health": { "sensor": 41.0, "maintenance": 75.0, "age": 53.5, "operational": 22.7 },
  "model1_anomaly_score": 79.7,
  "model2_rul_days": 1666,
  "model3_failure_probability_pct": 7.2
}
```

### `GET /api/assets/<asset_id>/history`
**This is what a trend chart should actually use** — `/api/assets` and
`/api/assets/<id>` only give you *today's* snapshot, which is why a chart
built from them looks like a flat line. This endpoint returns a real
backtested series: ~31 points spread across the last 90 days, each computed
using only the sensor/maintenance/incident data that would have existed as
of that historical date (no lookahead).

This is precomputed and cached to `outputs/health_score_history.json` — the
API just reads that file, it doesn't recompute 90 days of history on every
request. Regenerate it with:
```bash
python src/backtest_health_history.py
```
(only needed when the underlying dummy data changes — same as `run_pipeline.py`)

```json
{
  "asset_id": "AST-1002",
  "series": [
    { "date": "2026-04-26", "final_health_score": 74.2, "risk_category": "Medium" },
    { "date": "2026-04-29", "final_health_score": 74.0, "risk_category": "Medium" },
    { "date": "2026-07-25", "final_health_score": 50.4, "risk_category": "High" }
  ]
}
```
`404` if `asset_id` doesn't exist.

### `GET /api/fleet/history`
Same shape, averaged across all 4 assets per date — for a fleet-wide trend
chart instead of one asset's.

### `POST /api/recommend`
LLM-generated maintenance recommendation, grounded in the two source PRDs via
RAG. Takes 2-90 seconds depending on backend/model (local Ollama, especially
on first call / cold model load, is the slow end).

**Request:**
```json
{ "asset_id": "AST-1003" }
```
Use `"asset_id": "FLEET"` for a fleet-wide forecast instead of one asset.

**Response:**
```json
{
  "asset_id": "AST-1003",
  "recommendation": "Reliability Forecast: this Generator's MTTF is well below its asset-class benchmark and maintenance compliance sits at 55%. Recommend prioritizing the next scheduled PM and reviewing fuel/coolant systems within 7 days.",
  "citations": [
    { "source": "Deviation Engine PRD", "section": "MTTF (Mean Time To Failure)" },
    { "source": "Health Score Calculation Spec", "section": "Dataset 2 — Maintenance History (Weight 25%)" }
  ]
}
```
Errors: `404` if `asset_id` doesn't exist; `502` with `{ "error": "..." }` if
the LLM backend couldn't be reached (e.g., Ollama not running).

### `POST /api/chat`
Free-form Q&A about the methodology, grounded in the two PRDs.

**Request:**
```json
{ "question": "Why does MTTF use an exponential formula instead of linear?" }
```
**Response:**
```json
{
  "answer": "Reliability doesn't degrade linearly — MTTF uses the exponential survival function R(t) = e^(-t/MTTF), standard under the constant-failure-rate assumption in reliability engineering...",
  "citations": [ { "source": "Health Score Calculation Spec", "section": "MTTF" } ]
}
```
`400` if `question` is missing/empty. `502` if the LLM backend is unreachable.

### `GET /api/rag/search?q=<query>&k=<n>`
Raw retrieval only, no LLM call — useful if the frontend wants to show
"relevant source material" without generating text, or for debugging what
context a recommendation/chat answer was grounded in. `k` defaults to 4.
```
GET /api/rag/search?q=humidity+deviation&k=2
```
```json
[
  { "source": "Deviation Engine PRD", "header": "Humidity", "text": "...", "score": 0.52 },
  { "source": "Health Score Calculation Spec", "header": "Dataset 1 — Live Sensor Data", "text": "...", "score": 0.31 }
]
```

---

## Known limitations (tell your frontend dev, don't let this be a surprise later)
- **Model 2 (RUL)** is trained on physics-informed labels, not observed failures — see main `README.md` for why. Treat `model2_rul_days` as illustrative, not validated.
- **Model 3 (Failure Probability)** trains on real incident history but only 15 incidents total across 2 years — encouraging (AUC ≈0.97) but not proven at that sample size.
- **Asset-class benchmarks** (target MTTF, expected incidents/year, etc.) are placeholders pending real sign-off — see the source PRDs' own "Business Rule Required" sections.
- `/api/recommend` and `/api/chat` respond slowly on local Ollama, especially the first call after starting the server (cold model load can take 30-90s). Build your frontend to show a loading state, not a fixed timeout under ~2 minutes.
