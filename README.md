# DataCore Health OS (Dummy)

A Vite + React dashboard mockup for a data center / facility monitoring UI, using dummy data throughout.

## Setup

Install dependencies and run dev server:

```bash
npm install
npm run dev
```

Open http://localhost:5173

Structure:
- `src/App.jsx` — composes the layout
- `src/data.js` — dummy chart data, notifications, insights, vitals, nav items
- `src/chat.jsx` — DataCore AI chatbot canned responses
- `src/icons.jsx` — inline SVG icon set + waveform graphic
- `src/components/` — Sidebar, TopBar, NotifPanel, HeroScore, VitalsGrid, CpuChart, AiInsights, NetworkChart, RackLoadChart, HealthRadar, StatusBar, Chatbot
- `src/styles.css` — dark theme tokens, card/sidebar styles, animations

Charts are rendered with `recharts` (AreaChart, LineChart, BarChart, RadarChart).
