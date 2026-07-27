# FacilityBrain

An AI-powered health scoring system for data centre infrastructure (chillers,
UPS units, generators, PDUs). It ingests sensor telemetry, maintenance
history, asset age, and incident records; runs three trained ML models
(anomaly detection, remaining-useful-life prediction, failure prediction);
combines them into a weighted Health Score per asset; and exposes it all
through a REST API, with an LLM (RAG-grounded in the project's own design
docs) available to generate plain-English recommendations.

This README assumes **you are starting from a completely empty machine** —
no Python, no Ollama, nothing related to this project installed yet. Follow
it top to bottom in order.

---

## 1. Install Python

Skip this section if `python --version` in a terminal already prints `3.10`
or newer.

1. Go to https://www.python.org/downloads/
2. Download the latest Python 3.x installer for your OS.
3. **Windows only — important:** on the first installer screen, tick
   **"Add python.exe to PATH"** before clicking Install. This is the single
   most common setup mistake — if you skip it, none of the `python` commands
   below will work from a terminal.
4. Verify it worked — open a **new** terminal window (Command Prompt,
   PowerShell, or Terminal on Mac/Linux) and run:
   ```bash
   python --version
   pip --version
   ```
   Both should print version numbers, not "command not found."

## 2. Get the project code

If you were sent a `.zip` file:
1. Unzip it anywhere (e.g. `Documents\facilitybrain_project`).
2. Open a terminal and `cd` into that folder:
   ```bash
   cd path\to\facilitybrain_project
   ```

If you're cloning from a git repository instead:
```bash
git clone <repo-url>
cd facilitybrain_project
```

Confirm you're in the right place — this should list folders named `src`,
`data`, `outputs`, plus files like `api_server.py`:
```bash
dir        # Windows
ls         # Mac/Linux
```

## 3. Install the Python packages this project needs

From inside the `facilitybrain_project` folder:
```bash
pip install pandas numpy scikit-learn flask flask-cors
```
This installs everything needed to run the ML pipeline and the API server.
No other packages are required — everything else used is Python's own
standard library.

## 4. Install Ollama (the local AI model)

This project can use either a fully local, free AI model (Ollama) or the
paid Anthropic API. **Start with Ollama** — no account, no API key, no cost.

1. Download and install Ollama from https://ollama.com (Windows/Mac/Linux
   installers available — just run the installer, no special options needed).
2. Once installed, Ollama runs automatically in the background (check your
   system tray on Windows — you should see its icon there).
3. Pull a model — this downloads it once (~2GB, may take a few minutes):
   ```bash
   ollama pull qwen2.5:3b
   ```
4. Confirm it works:
   ```bash
   ollama run qwen2.5:3b
   ```
   You should get an interactive prompt where you can type a message and get
   a reply. Type `/bye` to exit once you've confirmed it responds.

   **If this crashes** with something like `exit status 2`, your machine
   likely doesn't have enough free RAM for this model — try a smaller one
   instead, e.g. `ollama pull llama3.2:1b`, and use that name in step 6 below.

## 5. Generate the project's data and run the ML pipeline

This step reads the raw CSVs already included in `data/`, runs the deviation
engine, health score engine, and all 3 ML models, and writes the results to
`outputs/`. **You only need to re-run this if the underlying data or model
code changes** — otherwise the `outputs/` folder already included in this
repo is ready to use as-is.

```bash
python src/run_pipeline.py
```
You should see 5 steps print, ending in a small table of 4 assets with their
Health Scores. If this fails with `FileNotFoundError`, you're very likely
running it from the wrong folder — make sure you're in the top-level
`facilitybrain_project` folder (the one containing `src/`, not inside `src/`
itself), then try again.

Also run this — it backtests the health score engine over the last 90 days
so `/api/assets/<id>/history` and `/api/fleet/history` can serve a real
trend instead of a single flat point:
```bash
python src/backtest_health_history.py
```

## 6. Start the API server

```bash
python api_server.py
```
You should see:
```
FacilityBrain API server — backend: ollama (qwen2.5:3b)
 * Running on http://127.0.0.1:5050
```
**Leave this terminal window open** — closing it stops the server. If you
pulled a different model in step 4, tell the server to use it instead:
```bash
set OLLAMA_MODEL=llama3.2:1b
python api_server.py
```
(`set` only applies to that one terminal session — if you open a new
terminal later, you'll need to run it again, or use `setx` once to make it
permanent across all future terminals.)

## 7. Verify everything actually works

With `api_server.py` still running, open a **second terminal** (or just a
browser tab) and check:

```bash
curl http://localhost:5050/api/health
```
Expected: `{"backend":"ollama","model":"qwen2.5:3b","status":"ok"}`

```bash
curl http://localhost:5050/api/assets
```
Expected: a JSON array of 4 assets with health scores, anomaly scores, etc.

```bash
curl -X POST http://localhost:5050/api/chat -H "Content-Type: application/json" -d "{\"question\":\"Why is MTTF exponential?\"}"
```
Expected: a JSON response with an `"answer"` field (this one can take
10-90 seconds on first call while the model loads — that's normal, not a
hang).

If all three work, the setup is complete and correct.

---

## Project structure

```
facilitybrain_project/
├── data/                         raw CSVs (2 years of dummy sensor/maintenance/incident data, 4 assets)
│   ├── asset_master.csv
│   ├── sensor_telemetry.csv
│   ├── maintenance_records.csv
│   ├── incident_records.csv
│   ├── asset_usage.csv
│   ├── deviation_engine_prd.md    source spec for the deviation formulas
│   └── health_score_spec.md       source spec for the health score formulas
├── src/
│   ├── paths.py                   resolves data/outputs paths absolutely (works from any directory)
│   ├── deviation_engine.py        implements every formula from deviation_engine_prd.md
│   ├── health_score_engine.py     implements every formula from health_score_spec.md
│   ├── model1_anomaly_detection.py    Isolation Forest per sensor stream
│   ├── model2_rul_prediction.py       RandomForest regressor — remaining useful life
│   ├── model3_failure_prediction.py   RandomForest classifier — failure probability
│   ├── rag_knowledge_base.py       chunks the 2 PRDs, builds a TF-IDF retrieval index
│   ├── run_pipeline.py             orchestrates all of the above
│   ├── backtest_health_history.py  backtests health scores over 90 days for real trend charts (see API_REFERENCE.md)
│   └── prepare_dashboard_data.py   (only needed if you also use the HTML dashboard, see below)
├── outputs/                       generated by run_pipeline.py — already included, ready to use
│   ├── combined_asset_state.json  what api_server.py actually reads
│   └── rag_chunks.json
├── api_server.py                  ⭐ the REST API — see API_REFERENCE.md for every endpoint
├── API_REFERENCE.md               full endpoint documentation for frontend developers
├── server.py                      an older, simpler local proxy (superseded by api_server.py — ignore unless told otherwise)
├── build_dashboard_v3.py          builds a standalone HTML dashboard (not needed if you're only using the API)
└── README.md                      this file
```

**If you're building a frontend against this API**, you only need
`api_server.py` running and `API_REFERENCE.md` open — everything else in
this repo is the pipeline that produced the data it serves.

---

## Troubleshooting

**`FileNotFoundError` when running any script** — you're in the wrong
folder. All commands in this README assume your terminal's current
directory is the top-level `facilitybrain_project` folder. Run `dir`/`ls`
to confirm you see `src`, `data`, `outputs` before trying again.

**`UnicodeEncodeError` / `charmap codec can't encode character`** — this was
a real bug in an earlier version of this project (Windows defaults to a
non-UTF-8 encoding) and has been fixed in every script in this repo. If you
still see it, you're running an outdated copy of a file — re-download.

**`curl: connection refused` on port 5050** — `api_server.py` isn't running,
or was running in a terminal window you've since closed. Start it again and
leave that window open.

**`urlopen error ... actively refused` mentioning port 11434** — Ollama
isn't running. Check your system tray for the Ollama icon, or run
`ollama serve` in its own terminal window. Confirm with `curl
http://localhost:11434` — it should respond, not refuse the connection.

**`llama runner process has terminated: exit status 2`** — Ollama couldn't
load that model, almost always due to insufficient free RAM. Switch to a
smaller model (`ollama pull llama3.2:1b`, or `qwen2.5:3b` if you were on
something larger) and point `OLLAMA_MODEL` at it (step 6 above).

**A model name works in `ollama run X` but the API says "model not found"**
— double check for typos, and that the name exactly matches `ollama list`'s
output character-for-character (including the `:3b` / `:latest` tag).

**Setting `OLLAMA_MODEL` with `set` "didn't work" in a new terminal** — `set`
is scoped to the single terminal window you ran it in. Either re-run it in
every new window, or run `setx OLLAMA_MODEL "qwen2.5:3b"` once and open a
**brand new** terminal window afterward (not one that was already open).

**404 when visiting `http://localhost:5050/` directly in a browser** — this
is expected. There's no route at the bare root; every real endpoint is under
`/api/...` (see API_REFERENCE.md). Try `http://localhost:5050/api/health`
instead.

---

## Known limitations (be upfront about these with anyone using this data)

- **Remaining Useful Life (Model 2)** is trained on physics-informed labels,
  not observed real-world failures — there isn't enough failure history yet
  with only 4 dummy assets. Treat its output as illustrative, not validated.
- **Failure Probability (Model 3)** trains on real incident timestamps
  (genuine supervised learning), but only 15 incidents total across 2 years
  — encouraging validation metrics, not yet proven at that sample size.
- **Asset-class benchmarks** (target MTTF, expected incidents/year, rated
  operating hours) are placeholder values. Both source PRDs in `data/`
  explicitly flag these as needing sign-off from Reliability Engineering /
  Facilities Ops before real-world use.
