"""
FacilityBrain — local API proxy (optional, for standalone use)

The dashboard's "AI Predictive Insights" and "Ask FacilityBrain" chat call an
LLM. Inside a Claude.ai artifact, that works with no setup — Claude's own
sandbox authenticates the request for you. Opened as a plain webpage
(file://, localhost, wherever), there's no key attached to that request, so
it fails. This server fixes that by running locally and proxying to whichever
backend you choose. The dashboard's JS doesn't know or care which one you
picked — this file normalizes both to the same response shape.

BACKEND 1 — Ollama (fully local, free, private, no API key, no billing)
  1. Install Ollama: https://ollama.com
  2. Pull a model:      ollama pull llama3.1
  3. Ollama runs its own server automatically on http://localhost:11434
     (if not, run `ollama serve` in a separate terminal)
  4. Run this proxy:    python server.py
     (BACKEND defaults to "ollama" — override with OLLAMA_MODEL if you pulled
      a different model, e.g.:  set OLLAMA_MODEL=mistral)

BACKEND 2 — Anthropic API (needs your own API key + uses real credits)
  1. Get a key from https://console.anthropic.com
  2. set BACKEND=anthropic
     set ANTHROPIC_API_KEY=sk-ant-...
  3. Run this proxy:    python server.py

Either way, then open facilitybrain_dashboard_v3.html as a normal webpage —
the AI panels will call this local server (localhost:5001) automatically.
"""
import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer

BACKEND = os.environ.get("BACKEND", "ollama").lower()  # "ollama" or "anthropic"
PORT = 5001

# --- Ollama settings ---
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")

# --- Anthropic settings ---
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = "claude-sonnet-5"  # a real public model slug


def call_ollama(system_prompt, messages, max_tokens):
    print(f"[proxy] Calling Ollama ({OLLAMA_MODEL})... this can take 30-90s on a cold model load.")
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": False,
        "options": {"num_predict": max_tokens},
    }).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat", data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
    text = data.get("message", {}).get("content", "")
    print(f"[proxy] Ollama responded ({len(text)} chars).")
    return {"content": [{"type": "text", "text": text}]}


def call_anthropic(system_prompt, messages, max_tokens):
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set. Set BACKEND=ollama instead if you don't have one.")
    payload = json.dumps({
        "model": ANTHROPIC_MODEL, "max_tokens": max_tokens,
        "system": system_prompt, "messages": messages,
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=payload,
        headers={"Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY,
                 "anthropic-version": "2023-06-01"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


class ProxyHandler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_GET(self):
        status = f"""FacilityBrain local proxy is running.

Backend: {BACKEND}
{"Ollama URL: " + OLLAMA_URL + "   Model: " + OLLAMA_MODEL if BACKEND == "ollama" else "Anthropic API key set: " + ("yes" if ANTHROPIC_API_KEY else "NO")}

This endpoint doesn't do anything when visited directly like this — it only
responds to POST requests at /api/chat, which the dashboard sends automatically
when you click "Generate AI Recommendation" or use the chat. Open
facilitybrain_dashboard_v3.html in your browser instead of this URL.
"""
        self.send_response(200)
        self._cors_headers()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(status.encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_response(404)
            self._cors_headers()
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        system_prompt = body.get("system", "")
        messages = body.get("messages", [])
        max_tokens = body.get("max_tokens", 450)

        try:
            if BACKEND == "ollama":
                result = call_ollama(system_prompt, messages, max_tokens)
            elif BACKEND == "anthropic":
                result = call_anthropic(system_prompt, messages, max_tokens)
            else:
                raise RuntimeError(f"Unknown BACKEND '{BACKEND}' — use 'ollama' or 'anthropic'.")
            self._send_json(200, result)
        except urllib.error.HTTPError as e:
            # The backend WAS reached, but rejected the request (bad model name, bad payload, etc.)
            err_body = e.read().decode(errors="replace")
            print(f"[proxy] {BACKEND} rejected the request (HTTP {e.code}): {err_body}")
            self._send_json(502, {"error": f"{BACKEND} rejected the request (HTTP {e.code}): {err_body}"})
        except urllib.error.URLError as e:
            hint = (" Is Ollama actually running? Try: ollama serve"
                    if BACKEND == "ollama" else "")
            print(f"[proxy] Could not reach {BACKEND}: {e}")
            self._send_json(502, {"error": f"Could not reach {BACKEND} at its expected address.{hint} ({e})"})
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._send_json(500, {"error": str(e)})

    def _send_json(self, status, obj):
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode())

    def log_message(self, fmt, *args):
        print("[proxy]", fmt % args)


if __name__ == "__main__":
    print(f"FacilityBrain local API proxy running on http://localhost:{PORT}")
    print(f"Backend: {BACKEND}")
    if BACKEND == "ollama":
        print(f"  Ollama URL: {OLLAMA_URL}   Model: {OLLAMA_MODEL}")
        print(f"  (make sure `ollama pull {OLLAMA_MODEL}` has been run at least once)")
    elif BACKEND == "anthropic":
        print(f"  API key set: {'yes' if ANTHROPIC_API_KEY else 'NO — set ANTHROPIC_API_KEY and restart'}")
    HTTPServer(("localhost", PORT), ProxyHandler).serve_forever()
