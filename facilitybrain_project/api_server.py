"""
FacilityBrain — REST API server

A clean HTTP API over everything the pipeline produces, for a separate
frontend/UI to consume directly — no embedded JSON, no HTML-specific logic.

Run:
    pip install flask flask-cors
    python api_server.py

Then hit http://localhost:5050/api/... from any frontend (CORS is open).
See API_REFERENCE.md for the full endpoint list, request/response shapes,
and example calls.
"""
import json
import os
import sys

from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))
from paths import DATA_DIR, OUTPUTS_DIR  # noqa: E402
from rag_knowledge_base import build_knowledge_base, retrieve as rag_retrieve  # noqa: E402

import urllib.request
import urllib.error

# Built React UI (vite build output at the repo root) — served by this same app so
# one Render web service hosts UI + API together on the same origin.
UI_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")

app = Flask(__name__, static_folder=UI_DIST, static_url_path="")
CORS(app)  # open CORS — any frontend origin can call this

BACKEND = os.environ.get("BACKEND", "ollama").lower()  # "ollama" or "anthropic"
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = "claude-sonnet-5"

_rag_cache = None  # lazily built on first request that needs it


# ---------------------------------------------------------------------------
# Data loading (reads what src/run_pipeline.py already produced)
# ---------------------------------------------------------------------------
def load_combined():
    path = os.path.join(OUTPUTS_DIR, "combined_asset_state.json")
    if not os.path.exists(path):
        raise FileNotFoundError(
            "outputs/combined_asset_state.json not found. Run: python src/run_pipeline.py"
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_rag():
    global _rag_cache
    if _rag_cache is None:
        _rag_cache = build_knowledge_base(DATA_DIR)  # (chunks, vectorizer, matrix)
    return _rag_cache


def fleet_aggregate(assets):
    n = len(assets)
    avg = lambda key: sum(a[key] for a in assets) / n  # noqa: E731
    avg_ds = lambda key: sum(a["dataset_health"][key] for a in assets) / n  # noqa: E731
    critical = sum(1 for a in assets if a["risk_category"] == "Critical")
    high = sum(1 for a in assets if a["risk_category"] == "High")
    health = avg("final_health_score")
    risk = "Healthy" if health >= 80 else "Medium" if health >= 60 else "High" if health >= 40 else "Critical"
    return {
        "asset_id": "FLEET",
        "asset_count": n,
        "critical_count": critical,
        "high_risk_count": high,
        "final_health_score": round(health, 1),
        "risk_category": risk,
        "dataset_health": {
            "sensor": round(avg_ds("sensor"), 1),
            "maintenance": round(avg_ds("maintenance"), 1),
            "age": round(avg_ds("age"), 1),
            "operational": round(avg_ds("operational"), 1),
        },
        "model1_anomaly_score": round(avg("model1_anomaly_score"), 1),
        "model2_rul_days": round(avg("model2_rul_days")),
        "model3_failure_probability_pct": round(avg("model3_failure_probability_pct"), 1),
    }


# ---------------------------------------------------------------------------
# LLM call (same dual-backend logic as server.py, factored out cleanly)
# ---------------------------------------------------------------------------
def call_llm(system_prompt, user_prompt, max_tokens=500):
    if BACKEND == "ollama":
        payload = json.dumps({
            "model": OLLAMA_MODEL,
            "messages": [{"role": "system", "content": system_prompt},
                         {"role": "user", "content": user_prompt}],
            "stream": False,
            "options": {"num_predict": max_tokens},
        }).encode()
        req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=payload,
                                      headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read())
        except urllib.error.URLError as e:
            # Most common cause: BACKEND=ollama on a host (e.g. Render) that
            # has no Ollama process running — localhost:11434 is unreachable
            # there. Ollama only exists on your own machine unless you've
            # deployed it separately and pointed OLLAMA_URL at it.
            raise RuntimeError(
                f"Could not reach Ollama at {OLLAMA_URL} ({e}). If this is running "
                "on a cloud host (Render, etc.), Ollama isn't installed there — "
                "set BACKEND=anthropic and ANTHROPIC_API_KEY instead."
            ) from e
        return data.get("message", {}).get("content", "")

    if BACKEND == "anthropic":
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY not set (BACKEND=anthropic)")
        payload = json.dumps({
            "model": ANTHROPIC_MODEL, "max_tokens": max_tokens,
            "system": system_prompt, "messages": [{"role": "user", "content": user_prompt}],
        }).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages", data=payload,
            headers={"Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY,
                     "anthropic-version": "2023-06-01"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            raise RuntimeError(f"Anthropic API error {e.code}: {body}") from e
        return "\n".join(b["text"] for b in data.get("content", []) if b.get("type") == "text")

    raise RuntimeError(f"Unknown BACKEND '{BACKEND}'")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify(status="ok", backend=BACKEND,
                    model=OLLAMA_MODEL if BACKEND == "ollama" else ANTHROPIC_MODEL)


@app.route("/api/assets")
def list_assets():
    return jsonify(load_combined()["assets"])


@app.route("/api/assets/<asset_id>")
def asset_detail(asset_id):
    match = next((a for a in load_combined()["assets"] if a["asset_id"] == asset_id), None)
    if not match:
        return jsonify(error=f"asset '{asset_id}' not found"), 404
    return jsonify(match)


@app.route("/api/fleet")
def fleet():
    return jsonify(fleet_aggregate(load_combined()["assets"]))


def load_history():
    path = os.path.join(OUTPUTS_DIR, "health_score_history.json")
    if not os.path.exists(path):
        raise FileNotFoundError(
            "outputs/health_score_history.json not found. Run: python src/backtest_health_history.py"
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@app.route("/api/assets/<asset_id>/history")
def asset_history(asset_id):
    history = load_history()
    if asset_id not in history:
        return jsonify(error=f"no history for asset '{asset_id}'"), 404
    return jsonify(asset_id=asset_id, series=history[asset_id])


@app.route("/api/fleet/history")
def fleet_history():
    history = load_history()
    return jsonify(asset_id="FLEET", series=history["FLEET"])


@app.route("/api/recommend", methods=["POST"])
def recommend():
    body = request.get_json(force=True, silent=True) or {}
    asset_id = body.get("asset_id", "FLEET")
    combined = load_combined()

    if asset_id == "FLEET":
        state = fleet_aggregate(combined["assets"])
        query = "health score risk category maintenance compliance business rules open"
        system_prompt = ("You are FacilityBrain's Model 4 assistant giving a FLEET-WIDE forecast. In 3-4 "
                          "sentences, identify which asset needs attention first and why, grounded ONLY in "
                          "the PRD excerpts and per-asset summary given. Start with a short heading phrase. "
                          "End with one concrete next action and timeframe. Do not invent numbers.")
        state["per_asset"] = [{"id": a["asset_id"], "type": a["asset_type"], "health": a["final_health_score"],
                                "risk": a["risk_category"]} for a in combined["assets"]]
    else:
        state = next((a for a in combined["assets"] if a["asset_id"] == asset_id), None)
        if not state:
            return jsonify(error=f"asset '{asset_id}' not found"), 404
        query = f"{state['asset_type']} health score risk maintenance MTTF sensor deviation recommendation"
        system_prompt = ("You are FacilityBrain's Model 4 assistant. In 3-4 sentences, give a specific "
                          "predictive maintenance forecast for this asset, grounded ONLY in the PRD "
                          "excerpts and live model outputs given. Start with a short heading phrase. End "
                          "with one concrete next action and timeframe. Do not invent numbers.")

    chunks, vectorizer, matrix = get_rag()
    context = rag_retrieve(query, chunks, vectorizer, matrix, k=3)
    context_text = "\n\n---\n\n".join(f"[{c['source']} — {c['header']}]\n{c['text']}" for c in context)
    user_prompt = f"ASSET STATE:\n{json.dumps(state, indent=2)}\n\nPRD EXCERPTS:\n{context_text}"

    try:
        text = call_llm(system_prompt, user_prompt)
    except Exception as e:
        return jsonify(error=str(e)), 502

    return jsonify(
        asset_id=asset_id,
        recommendation=text,
        citations=[{"source": c["source"], "section": c["header"]} for c in context],
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(force=True, silent=True) or {}
    question = body.get("question", "").strip()
    if not question:
        return jsonify(error="body must include a non-empty 'question'"), 400

    chunks, vectorizer, matrix = get_rag()
    context = rag_retrieve(question, chunks, vectorizer, matrix, k=3)
    context_text = "\n\n---\n\n".join(f"[{c['source']} — {c['header']}]\n{c['text']}" for c in context)
    system_prompt = ("Answer questions about FacilityBrain's deviation/health-score methodology using ONLY "
                      "the given PRD excerpts. Be concise (2-3 sentences). Say plainly if the excerpts "
                      "don't cover it.")
    user_prompt = f"QUESTION: {question}\n\nPRD EXCERPTS:\n{context_text}"

    try:
        text = call_llm(system_prompt, user_prompt, max_tokens=300)
    except Exception as e:
        return jsonify(error=str(e)), 502

    return jsonify(
        answer=text,
        citations=[{"source": c["source"], "section": c["header"]} for c in context],
    )


@app.route("/api/rag/search")
def rag_search():
    q = request.args.get("q", "")
    if not q:
        return jsonify(error="query param 'q' is required"), 400
    chunks, vectorizer, matrix = get_rag()
    results = rag_retrieve(q, chunks, vectorizer, matrix, k=int(request.args.get("k", 4)))
    return jsonify(results)


# ---------------------------------------------------------------------------
# UI (built React app) — same origin as the API, so the frontend needs no
# VITE_API_BASE in production. Registered after the /api routes so those win.
# ---------------------------------------------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_ui(path):
    if not os.path.isdir(UI_DIST):
        return jsonify(error="UI not built. Run: npm install && npm run build (repo root)"), 503
    if path and os.path.exists(os.path.join(UI_DIST, path)):
        return app.send_static_file(path)
    return app.send_static_file("index.html")


if __name__ == "__main__":
    print(f"FacilityBrain API server — backend: {BACKEND}"
          f" ({OLLAMA_MODEL if BACKEND == 'ollama' else ANTHROPIC_MODEL})")
    print("Endpoints: see API_REFERENCE.md")
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=False)
