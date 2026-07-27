import { useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fetchAssets, riskDistributionByLocation } from '../../../data/liveData'
import { useDataQuery } from '../../../lib/useDataQuery'
import { riskBandColor } from '../../../lib/riskBand'
import { Download, AlertTriangle } from '../../../lib/icons'
import { exportCsv, exportSvgAsPng } from '../../../lib/exportChart'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import '../css/RiskDistributionChart.css'

const BANDS = ['healthy', 'monitor', 'warning', 'critical']

export default function RiskDistributionChart() {
  const ref = useRef(null)
  const { data, isLoading, isError, refetch } = useDataQuery(async () => riskDistributionByLocation(await fetchAssets()), [])

  return (
    <div className="card risk-distribution-card" ref={ref} style={{ borderLeftColor: 'var(--cyan)' }}>
      <div className="risk-distribution-header">
        <div>
          <div className="widget-eyebrow">ASSET RISK DISTRIBUTION</div>
          <div className="widget-title">By site</div>
        </div>
        <div className="risk-distribution-actions">
          <button className="icon-btn risk-distribution-export-btn" aria-label="Export CSV" title="Export as CSV" onClick={() => exportCsv(data ?? [], 'risk-distribution.csv')}>
            <Download size={13} />
          </button>
          <button className="icon-btn risk-distribution-export-btn" aria-label="Export PNG" title="Export as PNG" onClick={() => exportSvgAsPng(ref.current, 'risk-distribution.png')}>
            PNG
          </button>
        </div>
      </div>

      {isLoading ? <SkeletonBlock height={220} /> : isError || !data ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load risk distribution"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      ) : (
      <div style={{ maxWidth: Math.min(680, data.length * 190), margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={36} barCategoryGap="28%">
          <defs>
            {BANDS.map(band => (
              <linearGradient key={band} id={`riskGradient-${band}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={riskBandColor(band)} stopOpacity={0.95} />
                <stop offset="100%" stopColor={riskBandColor(band)} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey="site" tick={{ fill: 'var(--t3)', fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--b1)', borderRadius: 8, fontSize: 11.5 }}
            formatter={(value, name, props) => {
              const total = BANDS.reduce((s, b) => s + props.payload[b], 0)
              return [`${value} (${Math.round((value / total) * 100)}%)`, name]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v[0].toUpperCase() + v.slice(1)} />
          {BANDS.map(band => (
            <Bar
              key={band} dataKey={band} name={band} stackId="risk"
              fill={`url(#riskGradient-${band})`}
              radius={band === 'critical' ? [4, 4, 0, 0] : 0}
              activeBar={{ fill: riskBandColor(band), stroke: riskBandColor(band), strokeWidth: 1 }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      </div>
      )}
    </div>
  )
}
