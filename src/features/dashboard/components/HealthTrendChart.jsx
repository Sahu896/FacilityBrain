import { useMemo, useRef, useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush, Legend } from 'recharts'
import { fetchAssets, healthTrendSeries, getSites } from '../../../data/liveData'
import { useDataQuery } from '../../../lib/useDataQuery'
import { Download, AlertTriangle } from '../../../lib/icons'
import { exportCsv, exportSvgAsPng } from '../../../lib/exportChart'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import '../css/HealthTrendChart.css'

// Cycled by index rather than keyed by name — real site_location strings vary by deployment.
const SITE_PALETTE = ['#06D6FF', '#A78BFA', '#F5A623', '#10E898']
const RANGES = [7, 30, 90]

export default function HealthTrendChart() {
  const [range, setRange] = useState(30)
  const [view, setView] = useState('Health') // 'Health' | 'sites'
  const ref = useRef(null)
  const { data: full, isLoading, isError, refetch } = useDataQuery(async () => {
    const assets = await fetchAssets()
    const HealthScore = Math.round(assets.reduce((s, a) => s + a.healthScore, 0) / assets.length)
    return { rows: healthTrendSeries(90, HealthScore, assets), sites: getSites(assets) }
  }, [])
  const data = useMemo(() => full ? full.rows.slice(-range) : [], [full, range])
  const sites = full?.sites ?? []

  if (isLoading) return <div className="card health-trend-card"><SkeletonBlock height={280} /></div>

  if (isError || !full) {
    return (
      <div className="card health-trend-card">
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load health trend"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      </div>
    )
  }

  return (
    <div className="card health-trend-card" ref={ref} style={{ borderLeftColor: 'var(--cyan)' }}>
      <div className="health-trend-header">
        <div>
          <div className="widget-eyebrow">Health Score TREND</div>
          <div className="widget-title">{view === 'Health' ? 'Health average' : 'By site'}</div>
        </div>
        <div className="health-trend-controls">
          <div className="health-trend-range-group">
            {RANGES.map(r => (
              <button key={r} className={`btn btn-secondary health-trend-range-btn${range === r ? ' health-trend-range-btn--active' : ''}`} onClick={() => setRange(r)}>{r}d</button>
            ))}
          </div>
          <button className="btn btn-secondary health-trend-view-btn" onClick={() => setView(v => v === 'Health' ? 'sites' : 'Health')}>
            {view === 'Health' ? 'Split by site' : 'Health view'}
          </button>
          <button className="icon-btn health-trend-export-btn" aria-label="Export CSV" title="Export as CSV" onClick={() => exportCsv(data, 'health-score-trend.csv')}>
            <Download size={13} />
          </button>
          <button className="icon-btn health-trend-export-btn" aria-label="Export PNG" title="Export as PNG" onClick={() => exportSvgAsPng(ref.current, 'health-score-trend.png')}>
            PNG
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="healthTrendHealthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06D6FF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06D6FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis domain={[0, 100]} tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--b1)', borderRadius: 8, fontSize: 11.5 }} />
          {view === 'sites' && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {view === 'Health' ? (
            <Area type="monotone" dataKey="Health" name="Health" stroke="#06D6FF" strokeWidth={2} fill="url(#healthTrendHealthGradient)" dot={false} />
          ) : (
            sites.map((site, i) => (
              <Line key={site} type="monotone" dataKey={site} name={site} stroke={SITE_PALETTE[i % SITE_PALETTE.length]} strokeWidth={2} dot={false} />
            ))
          )}
          {range > 7 && <Brush dataKey="t" height={20} stroke="var(--b1)" fill="var(--bg1)" travellerWidth={8} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
