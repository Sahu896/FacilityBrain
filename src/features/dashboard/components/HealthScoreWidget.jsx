import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useDataQuery } from '../../../lib/useDataQuery'
import { computeKpis, flatDatedSeries } from '../../../data/liveData'
import { riskBandColor } from '../../../lib/riskBand'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import { AlertTriangle, HeartPulse } from '../../../lib/icons'
import '../css/HealthScoreWidget.css'

export default function HealthScoreWidget({ scope = 'portfolio', asset }) {
  const { data, isLoading, isError, refetch } = useDataQuery(async () => {
    if (scope === 'asset') return { score: asset.healthScore, band: asset.band }
    const kpis = await computeKpis()
    return { score: kpis.portfolioHealthScore, band: kpis.band, assetCount: kpis.assetCount }
  }, [scope, asset?.id])

  if (!isLoading && (isError || !data)) {
    return (
      <div className="card health-score-card">
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load health score"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      </div>
    )
  }

  const color = data ? riskBandColor(data.band) : 'var(--cyan)'
  const series = data ? flatDatedSeries(30, data.score) : []
  const gradientId = `healthScoreGradient-${scope}-${asset?.id ?? 'portfolio'}`

  return (
    <div className="card health-score-card" style={{ borderLeftColor: color }}>
      <div className="health-score-header">
        <span className="health-score-icon" style={{ color }}><HeartPulse size={16} /></span>
        <div className="health-score-header-text">
          <div className="widget-eyebrow">
            {scope === 'asset' ? 'ASSET HEALTH' : 'PORTFOLIO HEALTH'} · 30-DAY TREND
          </div>
          <div className="widget-title health-score-title">
            {scope === 'asset' ? asset?.name : `${data?.assetCount ?? '—'} assets monitored`}
          </div>
        </div>
        {!isLoading && data && (
          <div className="health-score-badge" style={{ color, borderColor: color }}>{data.score}</div>
        )}
      </div>

      {isLoading || !data ? (
        <SkeletonBlock width="100%" height={140} />
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis domain={[0, 100]} hide />
            <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--b1)', borderRadius: 8, fontSize: 11.5 }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
