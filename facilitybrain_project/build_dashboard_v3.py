import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

with open(os.path.join(OUTPUTS_DIR, "dashboard_data_v2.json"), encoding="utf-8") as f:
    dashboard_data_json = f.read()
with open(os.path.join(OUTPUTS_DIR, "rag_chunks.json"), encoding="utf-8") as f:
    rag_chunks_json = f.read()

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FacilityBrain — Health OS</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  :root {
    --bg: #080B12;
    --sidebar: #0A0E17;
    --panel: #0F1420;
    --panel-2: #131928;
    --card: #10151F;
    --hairline: #1D2534;
    --text: #EAEEF6;
    --text-dim: #7C879C;
    --text-dimmer: #565F70;
    --teal: #2FE2C4;
    --teal-dim: rgba(47,226,196,.14);
    --blue: #4F8CF6;
    --amber: #F5A623;
    --purple: #A78BFA;
    --green: #4ADE80;
    --red: #F0555C;
    --font: 'Inter', -apple-system, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }
  .app { display: flex; min-height: 100vh; }

  /* ---------------- Sidebar ---------------- */
  .sidebar { width: 250px; flex-shrink: 0; background: var(--sidebar); border-right: 1px solid var(--hairline);
    padding: 22px 16px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 11px; padding: 4px 8px 22px; }
  .brand-icon { width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg,#2FE2C4,#4F8CF6);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .brand-name { font-weight: 700; font-size: 15px; letter-spacing: -.2px; }
  .brand-sub { font-size: 10.5px; color: var(--text-dim); letter-spacing: .5px; margin-top: 1px; }
  .nav-section-label { font-size: 10px; color: var(--text-dimmer); letter-spacing: 1.2px; padding: 14px 12px 8px; }
  .nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 9px; margin-bottom: 2px;
    color: var(--text-dim); font-size: 13.5px; font-weight: 500; cursor: pointer; position: relative; transition: background .12s; }
  .nav-item:hover { background: rgba(255,255,255,.03); color: var(--text); }
  .nav-item.active { background: var(--teal-dim); color: var(--teal); }
  .nav-item svg { width: 17px; height: 17px; flex-shrink: 0; }
  .nav-badge { position: absolute; right: 12px; background: var(--red); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 20px; padding: 1px 6px; }

  /* ---------------- Main ---------------- */
  .main { flex: 1; padding: 26px 32px 60px; max-width: 1360px; }
  .topline { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 4px; }
  .eyebrow { font-size: 11.5px; color: var(--text-dim); letter-spacing: 1px; font-weight: 500; margin-bottom: 10px; }
  .title { font-size: 30px; font-weight: 800; letter-spacing: -.6px; margin: 0 0 10px; }
  .title .accent { color: var(--teal); }
  .desc { font-size: 13.5px; color: var(--text-dim); line-height: 1.6; max-width: 700px; margin-bottom: 20px; }
  .desc b { color: var(--text); font-weight: 600; }

  .top-right { display: flex; align-items: center; gap: 10px; }
  .pill-live { display: flex; align-items: center; gap: 7px; background: var(--teal-dim); color: var(--teal);
    font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 20px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 0 rgba(47,226,196,.6);
    animation: pulse 1.8s infinite; }
  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(47,226,196,.55)} 70%{box-shadow:0 0 0 7px rgba(47,226,196,0)} 100%{box-shadow:0 0 0 0 rgba(47,226,196,0)} }
  .icon-btn { width: 38px; height: 38px; border-radius: 10px; background: var(--panel-2); border: 1px solid var(--hairline);
    display: flex; align-items: center; justify-content: center; position: relative; color: var(--text-dim); }
  .icon-btn .red-dot { position: absolute; top: 7px; right: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--red); }
  .clock { background: var(--panel-2); border: 1px solid var(--hairline); border-radius: 10px; padding: 9px 14px;
    font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }

  /* ---------------- Asset switcher ---------------- */
  .asset-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .asset-tab { border: 1px solid var(--hairline); background: var(--panel-2); border-radius: 10px; padding: 8px 14px;
    font-size: 12.5px; font-weight: 600; color: var(--text-dim); cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .asset-tab .risk-dot { width: 7px; height: 7px; border-radius: 50%; }
  .asset-tab.active { border-color: var(--teal); color: var(--text); background: rgba(47,226,196,.07); }

  /* ---------------- Hero panel ---------------- */
  .hero { background: var(--panel); border: 1px solid var(--hairline); border-radius: 18px; padding: 28px;
    display: flex; align-items: center; gap: 36px; margin-bottom: 20px; flex-wrap: wrap; }
  .gauge-big-wrap { position: relative; width: 148px; height: 148px; flex-shrink: 0; }
  .gauge-big-glow { position: absolute; inset: -20px; border-radius: 50%; filter: blur(22px); opacity: .35; }
  .gauge-big-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .gauge-big-num { font-size: 34px; font-weight: 800; line-height: 1; }
  .gauge-big-cap { font-size: 10px; color: var(--text-dim); letter-spacing: 1px; margin-top: 4px; font-weight: 600; }

  .rings { display: flex; gap: 26px; flex-wrap: wrap; }
  .ring-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ring-wrap { position: relative; width: 68px; height: 68px; }
  .ring-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; }
  .ring-cap { font-size: 11px; color: var(--text-dim); font-weight: 500; }

  .cluster-panel { flex: 1; min-width: 260px; }
  .cluster-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .cluster-value { font-size: 26px; font-weight: 800; }
  .cluster-label { font-size: 12.5px; color: var(--text-dim); }
  .cluster-delta { margin-left: auto; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
  .sparkline-wrap { margin-top: 10px; }
  .cluster-foot { font-size: 11px; color: var(--text-dimmer); margin-top: 6px; }

  /* ---------------- Metric cards ---------------- */
  .metrics-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .metric-card { background: var(--card); border: 1px solid var(--hairline); border-radius: 14px; padding: 18px; }
  .metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .metric-name { font-size: 11px; color: var(--text-dim); letter-spacing: .6px; font-weight: 600; }
  .metric-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .metric-value { font-size: 27px; font-weight: 800; line-height: 1; }
  .metric-unit { font-size: 12px; color: var(--text-dim); margin-left: 4px; font-weight: 500; }
  .metric-trend { font-size: 11.5px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--hairline); font-weight: 600; }

  /* ---------------- Bottom row ---------------- */
  .bottom-row { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 980px) { .bottom-row { grid-template-columns: 1fr; } }
  .chart-card { background: var(--panel); border: 1px solid var(--hairline); border-radius: 16px; padding: 22px; }
  .chart-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; flex-wrap: wrap; gap: 10px;}
  .chart-eyebrow { font-size: 11px; color: var(--text-dim); letter-spacing: .8px; font-weight: 600; margin-bottom: 6px; }
  .chart-title { font-size: 16px; font-weight: 700; }
  .chart-title .status { font-weight: 600; }
  .range-toggle { display: flex; gap: 4px; background: var(--panel-2); border: 1px solid var(--hairline); border-radius: 9px; padding: 3px; height: fit-content; }
  .range-btn { border: none; background: transparent; color: var(--text-dim); font-size: 11.5px; font-weight: 600;
    padding: 6px 12px; border-radius: 6px; cursor: pointer; }
  .range-btn.active { background: var(--teal); color: #06110E; }

  .insights-card { background: var(--panel); border: 1px solid var(--hairline); border-radius: 16px; padding: 22px; }
  .insights-head { display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
  .insights-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--teal-dim); color: var(--teal);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .insights-title { font-size: 14.5px; font-weight: 700; }
  .insights-meta { font-size: 11px; color: var(--text-dimmer); margin-top: 1px; }
  .insight-card { background: var(--panel-2); border: 1px solid var(--hairline); border-radius: 11px; padding: 14px 16px; }
  .insight-card h4 { margin: 0 0 8px; font-size: 13px; }
  .insight-card p { margin: 0; font-size: 12.5px; color: var(--text-dim); line-height: 1.6; }
  .insight-skeleton { display: flex; flex-direction: column; gap: 8px; }
  .skel-line { height: 10px; border-radius: 5px; background: linear-gradient(90deg, var(--hairline), rgba(255,255,255,.06), var(--hairline));
    background-size: 200% 100%; animation: shimmer 1.4s infinite; }
  @keyframes shimmer { to { background-position: -200% 0; } }
  .cite-row { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
  .cite { font-size: 10px; color: var(--text-dimmer); background: var(--panel); border: 1px solid var(--hairline);
    border-radius: 5px; padding: 2px 7px; }

  /* ---------------- Floating chat ---------------- */
  .fab { position: fixed; bottom: 26px; right: 28px; width: 54px; height: 54px; border-radius: 50%;
    background: linear-gradient(135deg,#2FE2C4,#22B8A0); display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 6px 24px rgba(47,226,196,.35); z-index: 40; }

  /* ---------------- Voice orb ---------------- */
  .orb-wrap { position: fixed; bottom: 26px; left: 28px; z-index: 40; display: flex; flex-direction: column;
    align-items: center; gap: 10px; }
  .orb-caption { max-width: 220px; background: var(--panel); border: 1px solid var(--hairline); border-radius: 10px;
    padding: 8px 12px; font-size: 11.5px; color: var(--text-dim); text-align: center; line-height: 1.5;
    box-shadow: 0 10px 30px rgba(0,0,0,.4); opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; }
  .orb-caption.show { opacity: 1; transform: translateY(0); }
  .orb-fab { position: relative; width: 64px; height: 64px; border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center; }
  .orb-ring { position: absolute; inset: -8px; border-radius: 50%; border: 1.5px solid rgba(47,226,196,.5);
    opacity: 0; }
  .orb-fab.speaking .orb-ring { animation: orb-ripple 1.6s ease-out infinite; }
  @keyframes orb-ripple { 0% { transform: scale(.85); opacity: .8; } 100% { transform: scale(1.45); opacity: 0; } }
  .orb-blob { position: absolute; width: 44px; height: 44px; border-radius: 50%; filter: blur(6px);
    mix-blend-mode: screen; }
  .orb-blob-1 { background: radial-gradient(circle at 35% 35%, #2FE2C4, transparent 70%);
    animation: orb-drift-1 5s ease-in-out infinite; }
  .orb-blob-2 { background: radial-gradient(circle at 65% 40%, #4F8CF6, transparent 70%);
    animation: orb-drift-2 6.5s ease-in-out infinite; }
  .orb-blob-3 { background: radial-gradient(circle at 50% 65%, #A78BFA, transparent 70%);
    animation: orb-drift-3 4.2s ease-in-out infinite; }
  @keyframes orb-drift-1 { 0%,100% { transform: translate(-4px,-2px) scale(1); } 50% { transform: translate(3px,4px) scale(1.15); } }
  @keyframes orb-drift-2 { 0%,100% { transform: translate(4px,2px) scale(1.05); } 50% { transform: translate(-3px,-3px) scale(0.9); } }
  @keyframes orb-drift-3 { 0%,100% { transform: translate(0,4px) scale(0.95); } 50% { transform: translate(2px,-4px) scale(1.1); } }
  .orb-fab.speaking .orb-blob-1 { animation: orb-drift-1 1.1s ease-in-out infinite; }
  .orb-fab.speaking .orb-blob-2 { animation: orb-drift-2 0.9s ease-in-out infinite; }
  .orb-fab.speaking .orb-blob-3 { animation: orb-drift-3 0.75s ease-in-out infinite; }
  .orb-core { position: relative; width: 22px; height: 22px; z-index: 1; }
  .orb-fab:hover { filter: brightness(1.1); }
  .chat-panel { position: fixed; bottom: 96px; right: 28px; width: 380px; max-height: 560px; background: var(--panel);
    border: 1px solid var(--hairline); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.5); display: none;
    flex-direction: column; z-index: 41; overflow: hidden; }
  .chat-panel.open { display: flex; }
  .chat-head { padding: 16px 18px; border-bottom: 1px solid var(--hairline); }
  .chat-head h3 { margin: 0; font-size: 14px; }
  .chat-head p { margin: 4px 0 0; font-size: 11px; color: var(--text-dim); }
  .chat-log { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; max-height: 320px; }
  .msg { font-size: 12.5px; line-height: 1.55; padding: 9px 12px; border-radius: 10px; max-width: 88%; }
  .msg.user { align-self: flex-end; background: rgba(47,226,196,.13); color: var(--text); }
  .msg.assistant { align-self: flex-start; background: var(--panel-2); border: 1px solid var(--hairline); }
  .chat-suggestions { padding: 10px 16px 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .chat-sugg { font-size: 10.5px; color: var(--text-dim); border: 1px solid var(--hairline); border-radius: 20px;
    padding: 5px 10px; cursor: pointer; }
  .chat-input-row { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid var(--hairline); }
  .chat-input-row input { flex: 1; background: var(--panel-2); border: 1px solid var(--hairline); border-radius: 8px;
    padding: 9px 11px; color: var(--text); font-family: var(--font); font-size: 12.5px; }
  .chat-input-row input:focus { outline: none; border-color: var(--teal); }
  .chat-send { background: var(--teal); border: none; border-radius: 8px; padding: 0 14px; color: #06110E; font-weight: 700;
    cursor: pointer; font-size: 12.5px; }
  .spinner { display: inline-block; width: 11px; height: 11px; border: 2px solid rgba(47,226,196,.3);
    border-top-color: var(--teal); border-radius: 50%; animation: spin .7s linear infinite; margin-right: 6px; vertical-align: -1px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .footnote { font-size: 10.5px; color: var(--text-dimmer); margin-top: 22px; line-height: 1.6; }
</style>
</head>
<body>
<div class="app">

  <div class="sidebar">
    <div class="brand">
      <div class="brand-icon">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v6H4V4zm0 10h16v6H4v-6z" stroke="#06110E" stroke-width="2" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="brand-name">FacilityBrain</div>
        <div class="brand-sub">HEALTH OS · AI</div>
      </div>
    </div>
    <div class="nav-section-label">MONITORING</div>
    <div class="nav-item active" data-nav="dashboard">
      <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/></svg>
      Dashboard
    </div>
    <div class="nav-item" data-nav="assets">
      <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="14" width="18" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8"/></svg>
      Assets
    </div>
    <div class="nav-item" data-nav="telemetry">
      <svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Telemetry
    </div>
    <div class="nav-item" data-nav="maintenance">
      <svg viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-3 3-2-2 3-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      Maintenance
    </div>
    <div class="nav-item" data-nav="alerts">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3l9-16z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r=".9" fill="currentColor"/></svg>
      Alerts
      <span class="nav-badge" id="alertBadge">0</span>
    </div>
    <div class="nav-item" data-nav="reports">
      <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      Reports
    </div>
  </div>

  <div class="main">
    <div class="topline">
      <div>
        <div class="eyebrow" id="topEyebrow"></div>
        <div class="title">Infrastructure <span class="accent">Overview</span></div>
      </div>
      <div class="top-right">
        <div class="pill-live"><span class="dot"></span>LIVE</div>
        <div class="icon-btn"><span class="red-dot"></span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        </div>
        <div class="clock" id="clockEl">03:57:32 PM</div>
      </div>
    </div>
    <div class="desc" id="descText"></div>

    <div class="asset-tabs" id="assetTabs"></div>

    <div class="hero" id="heroPanel"></div>

    <div class="metrics-row" id="metricsRow"></div>

    <div class="bottom-row">
      <div class="chart-card">
        <div class="chart-head">
          <div>
            <div class="chart-eyebrow" id="chartEyebrow">TEMPERATURE TREND</div>
            <div class="chart-title" id="chartTitle"></div>
          </div>
          <div class="range-toggle" id="rangeToggle">
            <button class="range-btn active" data-range="30D">30D</button>
            <button class="range-btn" data-range="6M">6M</button>
            <button class="range-btn" data-range="2Y">2Y</button>
          </div>
        </div>
        <div id="chartSvgWrap"></div>
      </div>

      <div class="insights-card">
        <div class="insights-head">
          <div class="insights-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div class="insights-title">AI Predictive Insights</div>
            <div class="insights-meta" id="insightsMeta">Model 4 · LLM + RAG</div>
          </div>
        </div>
        <div id="insightSlot"></div>
      </div>
    </div>

    <div class="footnote">Model 2 (RUL) and Model 3 (Failure Probability) are trained on this session's dummy 2-year dataset — see project README for validation metrics and known limitations before treating outputs as production guidance.</div>
  </div>
</div>

<div class="orb-wrap">
  <div class="orb-caption" id="orbCaption"></div>
  <div class="orb-fab" id="orbFab" title="Click to hear a spoken briefing">
    <div class="orb-ring"></div>
    <div class="orb-blob orb-blob-1"></div>
    <div class="orb-blob orb-blob-2"></div>
    <div class="orb-blob orb-blob-3"></div>
    <svg class="orb-core" id="orbIcon" viewBox="0 0 24 24" fill="none">
      <path d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M6 11a6 6 0 0012 0M12 19v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  </div>
</div>

<div class="fab" id="fabBtn">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.4 8.4 0 01-3.8-.9L4 21l1.9-4.7A8.5 8.5 0 1121 11.5z" stroke="#06110E" stroke-width="1.9" stroke-linejoin="round"/></svg>
</div>
<div class="chat-panel" id="chatPanel">
  <div class="chat-head">
    <h3>Ask FacilityBrain</h3>
    <p>Grounded in the Deviation Engine PRD &amp; Health Score Spec</p>
  </div>
  <div class="chat-suggestions" id="chatSuggestions"></div>
  <div class="chat-log" id="chatLog"></div>
  <div class="chat-input-row">
    <input type="text" id="chatInput" placeholder="Ask about the methodology…" />
    <button class="chat-send" id="chatSend">Ask</button>
  </div>
</div>

<script>
const DATA = __DASHBOARD_DATA__;
const RAG_CHUNKS = __RAG_CHUNKS__;

const RISK_COLOR = { Healthy: 'var(--teal)', Medium: 'var(--amber)', High: '#F0873D', Critical: 'var(--red)' };
const RISK_HEX   = { Healthy: '#2FE2C4', Medium: '#F5A623', High: '#F0873D', Critical: '#F0555C' };
let selectedAssetId = 'FLEET';
let currentRange = '30D';
const recCache = {};

function asset(id) { return DATA.assets.find(a => a.asset_id === id); }

function fleetAgg() {
  const avg = arr => arr.reduce((x,y)=>x+y,0) / arr.length;
  const n = DATA.assets.length;
  const critical = DATA.assets.filter(a=>a.risk_category==='Critical').length;
  const high = DATA.assets.filter(a=>a.risk_category==='High').length;
  const health = avg(DATA.assets.map(a=>a.final_health_score));
  return {
    asset_id: 'FLEET', asset_type: 'Fleet', make_model: `${critical} critical · ${high} high-risk of ${n}`,
    site_location: DATA.assets[0].site_location, criticality_tier: `${n} assets monitored`,
    model1_anomaly_score: avg(DATA.assets.map(a=>a.model1_anomaly_score)),
    model2_rul_days: Math.round(avg(DATA.assets.map(a=>a.model2_rul_days))),
    model3_failure_probability_pct: avg(DATA.assets.map(a=>a.model3_failure_probability_pct)),
    maintenance_compliance_pct: avg(DATA.assets.map(a=>a.maintenance_compliance_pct||0)),
    dataset_health: {
      sensor: avg(DATA.assets.map(a=>a.dataset_health.sensor)),
      maintenance: avg(DATA.assets.map(a=>a.dataset_health.maintenance)),
      age: avg(DATA.assets.map(a=>a.dataset_health.age)),
      operational: avg(DATA.assets.map(a=>a.dataset_health.operational)),
    },
    final_health_score: health,
    risk_category: health>=80?'Healthy':health>=60?'Medium':health>=40?'High':'Critical',
  };
}
function current() { return selectedAssetId === 'FLEET' ? fleetAgg() : asset(selectedAssetId); }

// fleet-wide series = avg % deviation from each asset's own baseline (baselines differ per asset/type)
function fleetTempSeries(range) {
  const arrs = DATA.assets.map(a => a.temp_series[range]);
  const baselines = DATA.assets.map(a => a.temp_series.baseline);
  const n = arrs[0].length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const devs = [];
    arrs.forEach((arr, j) => { if (arr[i] != null) devs.push(((arr[i]-baselines[j])/baselines[j])*100); });
    out.push(devs.length ? devs.reduce((a,b)=>a+b,0)/devs.length : null);
  }
  return out;
}
function getSeries(range) {
  if (selectedAssetId === 'FLEET') {
    return { series: fleetTempSeries(range).filter(v=>v!=null), baseline: 0, unit: '%',
              caption: `Avg deviation from baseline across ${DATA.assets.length} assets` };
  }
  const a = asset(selectedAssetId);
  return { series: a.temp_series[range].filter(v=>v!=null), baseline: a.temp_series.baseline, unit: '°C',
            caption: `Temperature trend · ${a.make_model}` };
}

// ---------------- clock ----------------
function tickClock() {
  const d = new Date();
  document.getElementById('clockEl').textContent = d.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
}
tickClock(); setInterval(tickClock, 1000);

// ---------------- retrieval (client-side RAG) ----------------
function tokenize(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2); }
function retrieve(query, k=3) {
  const q = new Set(tokenize(query));
  return RAG_CHUNKS.map(c => {
    const t = tokenize(c.header+' '+c.text);
    let overlap = 0; t.forEach(w=>{ if(q.has(w)) overlap++; });
    return { ...c, score: overlap/Math.sqrt(t.length+1) };
  }).sort((a,b)=>b.score-a.score).slice(0,k).filter(c=>c.score>0);
}

async function askClaude(systemPrompt, userPrompt) {
  // Path 1: works automatically inside a Claude.ai artifact (sandbox injects credentials).
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 450, system: systemPrompt,
        messages: [{ role:'user', content: userPrompt }] })
    });
    if (!resp.ok) throw new Error('artifact API path returned ' + resp.status);
    const data = await resp.json();
    const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
    if (text) return text;
    throw new Error('empty response from artifact API path');
  } catch (e1) {
    // Path 2: standalone/local viewing — falls back to a local proxy server (server.py).
    let resp;
    try {
      resp = await fetch('http://localhost:5001/api/chat', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ max_tokens: 450, system: systemPrompt,
          messages: [{ role:'user', content: userPrompt }] })
      });
    } catch (networkErr) {
      // fetch() itself threw — the proxy genuinely isn't reachable at all.
      throw new Error('Not running inside a Claude artifact, and no local proxy found at localhost:5001. See README.md for setup — run: python server.py');
    }
    // The proxy WAS reached — surface whatever it actually said, don't hide it.
    const data = await resp.json();
    if (data.error) throw new Error('Local proxy reached it, but: ' + data.error);
    const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
    return text || '(local proxy returned an empty response)';
  }
}

// ---------------- SVG ring helper ----------------
function ringSvg(size, stroke, pct, color, trackColor) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/>
  </svg>`;
}

// ---------------- smooth path helper (catmull-rom -> bezier) ----------------
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1], p1 = points[i], p2 = points[i+1], p3 = points[i+2 < points.length ? i+2 : i+1];
    const cp1x = p1[0] + (p2[0]-p0[0])/6, cp1y = p1[1] + (p2[1]-p0[1])/6;
    const cp2x = p2[0] - (p3[0]-p1[0])/6, cp2y = p2[1] - (p3[1]-p1[1])/6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ---------------- Asset tabs ----------------
function renderTabs() {
  const fleetHealth = fleetAgg().final_health_score;
  const fleetColor = RISK_HEX[fleetAgg().risk_category];
  const fleetTab = `
    <div class="asset-tab ${selectedAssetId==='FLEET'?'active':''}" data-id="FLEET">
      <span class="risk-dot" style="background:${fleetColor}"></span>
      All Assets · Fleet
    </div>`;
  const assetTabs = DATA.assets.map(a => `
    <div class="asset-tab ${a.asset_id===selectedAssetId?'active':''}" data-id="${a.asset_id}">
      <span class="risk-dot" style="background:${RISK_HEX[a.risk_category]}"></span>
      ${a.asset_id} · ${a.asset_type}
    </div>`).join('');
  document.getElementById('assetTabs').innerHTML = fleetTab + assetTabs;
  document.querySelectorAll('.asset-tab').forEach(el => el.addEventListener('click', () => {
    stopSpeaking(); selectedAssetId = el.dataset.id; renderAll();
  }));
}

// ---------------- Header text ----------------
function renderHeader() {
  const criticalCount = DATA.assets.filter(a=>a.risk_category==='Critical').length;
  const highCount = DATA.assets.filter(a=>a.risk_category==='High').length;
  document.getElementById('alertBadge').textContent = criticalCount + highCount;
  const now = new Date(DATA.generated_at + 'T00:00:00');
  const dayStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }).toUpperCase();
  document.getElementById('topEyebrow').textContent = `${dayStr} · ${DATA.assets[0].site_location.split(' - ')[0].toUpperCase()} · ${DATA.assets.length} MONITORED ASSETS`;
  const worst = DATA.assets.slice().sort((a,b)=>a.final_health_score-b.final_health_score)[0];
  document.getElementById('descText').innerHTML =
    `All ${DATA.assets.length} assets reporting. <b>${criticalCount} critical</b>, <b>${highCount} high-risk</b> — ` +
    `${worst.asset_id} (${worst.asset_type}) needs attention first at a Health Score of <b>${worst.final_health_score.toFixed(0)}</b>. ` +
    `Predictive recommendation queued below.`;
}

// ---------------- Hero ----------------
function renderHero() {
  const a = current();
  const color = RISK_HEX[a.risk_category];
  const rings = [
    { key:'sensor', label:'Sensor', val: a.dataset_health.sensor, color:'#2FE2C4' },
    { key:'maintenance', label:'Maint.', val: a.dataset_health.maintenance, color:'#4F8CF6' },
    { key:'age', label:'Age', val: a.dataset_health.age, color:'#F5A623' },
    { key:'operational', label:'Ops', val: a.dataset_health.operational, color:'#A78BFA' },
  ];

  const { series: sparkPts, caption: sparkCaption } = getSeries('30D');
  const sMin = Math.min(...sparkPts), sMax = Math.max(...sparkPts);
  const sparkCoords = sparkPts.map((v,i) => [ (i/(sparkPts.length-1))*300, 46 - ((v - sMin)/((sMax-sMin)||1))*40 ]);

  document.getElementById('heroPanel').innerHTML = `
    <div class="gauge-big-wrap">
      <div class="gauge-big-glow" style="background:${color}"></div>
      ${ringSvg(148, 11, a.final_health_score, color, 'rgba(255,255,255,.06)')}
      <div class="gauge-big-label">
        <div class="gauge-big-num" style="color:${color}">${a.final_health_score.toFixed(0)}</div>
        <div class="gauge-big-cap">HEALTH SCORE</div>
      </div>
    </div>
    <div class="rings">
      ${rings.map(r => `
        <div class="ring-item">
          <div class="ring-wrap">
            ${ringSvg(68, 6, r.val, r.color, 'rgba(255,255,255,.06)')}
            <div class="ring-num" style="color:${r.color}">${r.val.toFixed(0)}%</div>
          </div>
          <div class="ring-cap">${r.label}</div>
        </div>`).join('')}
    </div>
    <div class="cluster-panel">
      <div class="cluster-top">
        <div class="cluster-value" style="color:${color}">${a.risk_category}</div>
        <div class="cluster-label">risk category</div>
        <div class="cluster-delta" style="background:${color}22;color:${color}">${a.model1_anomaly_score.toFixed(0)} anomaly</div>
      </div>
      <div class="sparkline-wrap">
        <svg width="100%" height="52" viewBox="0 0 300 52" preserveAspectRatio="none">
          <path d="${smoothPath(sparkCoords)}" fill="none" stroke="${color}" stroke-width="2"
            style="filter:drop-shadow(0 0 5px ${color}66)"/>
        </svg>
      </div>
      <div class="cluster-foot">${sparkCaption} (30D) · ${a.criticality_tier}</div>
    </div>
  `;
}

// ---------------- Metric cards ----------------
function metricCard(name, value, unit, iconSvg, iconBg, iconColor, trendText, trendColor) {
  return `<div class="metric-card">
    <div class="metric-top">
      <div class="metric-name">${name}</div>
      <div class="metric-icon" style="background:${iconBg};color:${iconColor}">${iconSvg}</div>
    </div>
    <div><span class="metric-value">${value}</span><span class="metric-unit">${unit}</span></div>
    <div class="metric-trend" style="color:${trendColor}">${trendText}</div>
  </div>`;
}
const ICONS = {
  anomaly: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rul: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  fail: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3l9-16z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  maint: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-3 3-2-2 3-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};
function renderMetrics() {
  const a = current();
  document.getElementById('metricsRow').innerHTML = [
    metricCard('ANOMALY SCORE', a.model1_anomaly_score.toFixed(1), '/ 100', ICONS.anomaly, 'rgba(47,226,196,.12)', '#2FE2C4',
      a.model1_anomaly_score > 70 ? '⚠ Elevated vs. 2Y baseline' : '✓ Within normal range', a.model1_anomaly_score > 70 ? '#F0873D' : '#4ADE80'),
    metricCard('REMAINING USEFUL LIFE', a.model2_rul_days, 'days', ICONS.rul, 'rgba(79,140,246,.12)', '#4F8CF6',
      `${(a.model2_rul_days/365).toFixed(1)} years at current wear rate`, '#7C879C'),
    metricCard('FAILURE PROBABILITY', a.model3_failure_probability_pct.toFixed(1), '% / 30d', ICONS.fail, 'rgba(240,85,92,.12)', '#F0555C',
      a.model3_failure_probability_pct > 15 ? '⚠ Above fleet average' : '✓ Below fleet average', a.model3_failure_probability_pct > 15 ? '#F0873D' : '#4ADE80'),
    metricCard('MAINTENANCE COMPLIANCE', (a.maintenance_compliance_pct??0).toFixed(0), '%', ICONS.maint, 'rgba(167,139,250,.12)', '#A78BFA',
      `Trailing 12-month PM on-time rate`, '#7C879C'),
  ].join('');
}

// ---------------- Chart ----------------
function renderChart() {
  const a = current();
  const isFleet = selectedAssetId === 'FLEET';
  document.getElementById('chartTitle').innerHTML = isFleet
    ? `Fleet temp. deviation — <span class="status" style="color:${a.model1_anomaly_score>70?'#F0873D':'#2FE2C4'}">${a.model1_anomaly_score>70?'Elevated':'Nominal'}</span>`
    : `${a.asset_type} inlet temp — <span class="status" style="color:${a.model1_anomaly_score>70?'#F0873D':'#2FE2C4'}">${a.model1_anomaly_score>70?'Elevated':'Nominal'}</span>`;

  const { series, baseline, unit } = getSeries(currentRange);
  const W = 640, H = 220, pad = 24, leftGutter = 34;
  const allVals = series.concat([baseline]);
  const vMin = Math.min(...allVals) - (isFleet ? 2 : 1), vMax = Math.max(...allVals) + (isFleet ? 2 : 1);
  const coords = series.map((v,i) => [ leftGutter + (i/(series.length-1))*(W-leftGutter-pad), H-pad - ((v-vMin)/(vMax-vMin))*(H-2*pad) ]);
  const baseY = H-pad - ((baseline-vMin)/(vMax-vMin))*(H-2*pad);
  const linePath = smoothPath(coords);
  const areaPath = linePath + ` L ${coords[coords.length-1][0]} ${H-pad} L ${coords[0][0]} ${H-pad} Z`;

  const ticks = [vMax, (vMax+vMin)/2, vMin];
  const tickYs = [pad, H/2, H-pad];
  const fmt = v => isFleet ? `${v>=0?'+':''}${v.toFixed(0)}%` : `${v.toFixed(0)}°`;
  const tickLabels = ticks.map((t,i) => `<text x="4" y="${tickYs[i]+4}" font-size="10.5" fill="#565F70" font-family="Inter">${fmt(t)}</text>`).join('');
  const gridLines = tickYs.map(y => `<line x1="${leftGutter}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="#1D2534" stroke-width="1"/>`).join('');

  document.getElementById('chartSvgWrap').innerHTML = `
    <svg width="100%" height="240" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2FE2C4" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#2FE2C4" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${tickLabels}
      <line x1="${leftGutter}" y1="${baseY}" x2="${W-pad}" y2="${baseY}" stroke="#3A4358" stroke-width="1" stroke-dasharray="4 4"/>
      <path d="${areaPath}" fill="url(#areaGrad)"/>
      <path d="${linePath}" fill="none" stroke="#2FE2C4" stroke-width="2.5" style="filter:drop-shadow(0 0 6px rgba(47,226,196,.5))"/>
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-dimmer);margin-top:4px;">
      <span>${currentRange === '30D' ? '30 days ago' : currentRange === '6M' ? '6 months ago' : '2 years ago'}</span>
      <span style="color:#3A4358">- - - baseline ${isFleet ? '0%' : baseline+'°C'}</span>
      <span>today</span>
    </div>
  `;
}
document.getElementById('rangeToggle').addEventListener('click', e => {
  const btn = e.target.closest('.range-btn'); if (!btn) return;
  currentRange = btn.dataset.range;
  document.querySelectorAll('.range-btn').forEach(b=>b.classList.toggle('active', b===btn));
  renderChart();
});

// ---------------- AI Insight ----------------
async function renderInsight() {
  const a = current();
  const isFleet = selectedAssetId === 'FLEET';
  document.getElementById('insightsMeta').textContent = 'Model 4 · LLM + RAG · generating…';
  if (recCache[a.asset_id]) {
    showInsight(recCache[a.asset_id]);
    return;
  }
  document.getElementById('insightSlot').innerHTML = `
    <div class="insight-card insight-skeleton">
      <div class="skel-line" style="width:60%"></div>
      <div class="skel-line" style="width:95%"></div>
      <div class="skel-line" style="width:88%"></div>
      <div class="skel-line" style="width:70%"></div>
    </div>`;

  const query = isFleet
    ? 'health score risk category maintenance compliance business rules open'
    : `${a.asset_type} health score risk maintenance MTTF sensor deviation recommendation`;
  const context = retrieve(query, 3);
  const contextText = context.map(c => `[${c.source} — ${c.header}]\n${c.text}`).join('\n\n---\n\n');
  const systemPrompt = isFleet
    ? `You are FacilityBrain's Model 4 assistant giving a FLEET-WIDE forecast across several data centre assets.
In 3-4 sentences, identify which asset needs attention first and why, grounded ONLY in the PRD excerpts and the
per-asset summary given. Start with a short bold-style heading phrase (e.g. "Fleet Risk Forecast:"). End with one
concrete next action and timeframe. Do not invent numbers not given to you.`
    : `You are FacilityBrain's Model 4 assistant. In 3-4 sentences, give a specific predictive
maintenance forecast for a data centre asset, grounded ONLY in the PRD excerpts and live model outputs given.
Start with a short bold-style heading phrase (e.g. "Thermal Forecast:", "Reliability Forecast:") followed by the
forecast. End with one concrete next action and timeframe. Do not invent numbers not given to you.`;
  const stateForPrompt = isFleet
    ? { fleet_summary: a, per_asset: DATA.assets.map(x => ({ id: x.asset_id, type: x.asset_type,
        health_score: x.final_health_score, risk: x.risk_category, anomaly: x.model1_anomaly_score,
        rul_days: x.model2_rul_days, failure_probability_pct: x.model3_failure_probability_pct })) }
    : a;
  const userPrompt = `ASSET STATE:\n${JSON.stringify(stateForPrompt, null, 2)}\n\nPRD EXCERPTS:\n${contextText}`;

  try {
    const text = await askClaude(systemPrompt, userPrompt);
    recCache[a.asset_id] = { text, context };
    if (selectedAssetId === a.asset_id) showInsight(recCache[a.asset_id]);
  } catch (e) {
    document.getElementById('insightSlot').innerHTML = `<div class="insight-card"><p>${e.message}</p></div>`;
  }
}
function showInsight({ text, context }) {
  document.getElementById('insightsMeta').textContent = 'Model 4 · LLM + RAG · updated just now';
  const parts = text.split(':');
  const heading = parts.length > 1 ? parts[0] : 'Predictive Forecast';
  const body = parts.length > 1 ? parts.slice(1).join(':').trim() : text;
  document.getElementById('insightSlot').innerHTML = `
    <div class="insight-card">
      <h4>${heading}</h4>
      <p>${body.replace(/\n/g,'<br>')}</p>
      <div class="cite-row">${context.map(c=>`<span class="cite">${c.source} · ${c.header}</span>`).join('')}</div>
    </div>`;
}

// ---------------- Chat ----------------
const chatLog = [];
function renderChatLog() {
  document.getElementById('chatLog').innerHTML = chatLog.map(m =>
    `<div class="msg ${m.role}">${m.text.replace(/\n/g,'<br>')}</div>`).join('');
  document.getElementById('chatLog').scrollTop = 1e9;
}
async function sendChat(q) {
  if (!q.trim()) return;
  chatLog.push({role:'user', text:q}); renderChatLog();
  document.getElementById('chatInput').value = '';
  const btn = document.getElementById('chatSend'); btn.disabled = true;
  const context = retrieve(q, 3);
  const contextText = context.map(c=>`[${c.source} — ${c.header}]\n${c.text}`).join('\n\n---\n\n');
  const systemPrompt = `Answer questions about FacilityBrain's deviation/health-score methodology using ONLY the
given PRD excerpts. Be concise (2-3 sentences). Say plainly if the excerpts don't cover it.`;
  try {
    const answer = await askClaude(systemPrompt, `QUESTION: ${q}\n\nEXCERPTS:\n${contextText}`);
    const cites = context.map(c=>`${c.source} · ${c.header}`).join(' | ');
    chatLog.push({role:'assistant', text: answer + (cites?`\n\n<span style="color:var(--text-dimmer);font-size:10px">${cites}</span>`:'')});
  } catch(e) { chatLog.push({role:'assistant', text: e.message}); }
  btn.disabled = false; renderChatLog();
}
document.getElementById('chatSend').addEventListener('click', ()=>sendChat(document.getElementById('chatInput').value));
document.getElementById('chatInput').addEventListener('keydown', e=>{ if(e.key==='Enter') sendChat(e.target.value); });
document.getElementById('fabBtn').addEventListener('click', ()=>document.getElementById('chatPanel').classList.toggle('open'));
const SUGGESTIONS = ['Why is MTTF exponential, not linear?','What business rules are still open?','How is humidity deviation different from temperature?'];
document.getElementById('chatSuggestions').innerHTML = SUGGESTIONS.map(s=>`<div class="chat-sugg">${s}</div>`).join('');
document.querySelectorAll('.chat-sugg').forEach(el=>el.addEventListener('click',()=>sendChat(el.textContent)));

// ---------------- Voice orb ----------------
const orbFab = document.getElementById('orbFab');
const orbCaption = document.getElementById('orbCaption');
let isSpeaking = false;

function buildFactSummary(a) {
  const isFleet = a.asset_id === 'FLEET';
  if (isFleet) {
    const critical = DATA.assets.filter(x=>x.risk_category==='Critical').length;
    const high = DATA.assets.filter(x=>x.risk_category==='High').length;
    const worst = DATA.assets.slice().sort((x,y)=>x.final_health_score-y.final_health_score)[0];
    return `Fleet overview. ${DATA.assets.length} assets monitored. ${critical} critical, ${high} high risk. `
      + `Average health score is ${a.final_health_score.toFixed(0)}. `
      + `${worst.asset_id}, the ${worst.asset_type}, needs attention first, with a health score of ${worst.final_health_score.toFixed(0)}.`;
  }
  return `${a.asset_id}, a ${a.asset_type}, has a health score of ${a.final_health_score.toFixed(0)}, `
    + `placing it in the ${a.risk_category} risk category. `
    + `Anomaly score is ${a.model1_anomaly_score.toFixed(0)} out of 100. `
    + `Estimated remaining useful life is ${a.model2_rul_days} days. `
    + `Failure probability over the next 30 days is ${a.model3_failure_probability_pct.toFixed(1)} percent.`;
}

function setOrbSpeaking(speaking, captionText) {
  isSpeaking = speaking;
  orbFab.classList.toggle('speaking', speaking);
  if (captionText) {
    orbCaption.textContent = captionText;
    orbCaption.classList.add('show');
  } else {
    orbCaption.classList.remove('show');
  }
}

function speakText(text, label) {
  if (!('speechSynthesis' in window)) {
    setOrbSpeaking(false, 'Voice isn\'t supported in this browser.');
    setTimeout(() => orbCaption.classList.remove('show'), 2500);
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  utter.pitch = 1.0;
  utter.onstart = () => setOrbSpeaking(true, label || text);
  utter.onend = () => setOrbSpeaking(false, null);
  utter.onerror = () => setOrbSpeaking(false, 'Could not play voice audio.');
  window.speechSynthesis.speak(utter);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  setOrbSpeaking(false, null);
}

orbFab.addEventListener('click', () => {
  if (isSpeaking) { stopSpeaking(); return; }
  const a = current();
  const cached = recCache[a.asset_id];
  // Prefer the AI-generated recommendation if it's already been produced (richer than raw stats);
  // fall back to a fact summary built directly from the model outputs otherwise.
  const text = cached ? cached.text.replace(/^[^:]+:\s*/, '') : buildFactSummary(a);
  const label = cached ? `Speaking the AI recommendation for ${a.asset_id}…` : `Speaking a fact summary for ${a.asset_id}…`;
  speakText(text, label);
});

// ---------------- init ----------------
function renderAll() {
  renderTabs(); renderHeader(); renderHero(); renderMetrics(); renderChart(); renderInsight();
}
renderAll();
</script>
</body>
</html>
"""

final_html = HTML_TEMPLATE.replace("__DASHBOARD_DATA__", dashboard_data_json).replace("__RAG_CHUNKS__", rag_chunks_json)
out_path = os.path.join(OUTPUTS_DIR, "facilitybrain_dashboard_v3.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(final_html)
print(f"Written {out_path} —", len(final_html), "bytes")
