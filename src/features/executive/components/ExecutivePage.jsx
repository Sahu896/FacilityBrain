import { HeartPulse, AlertTriangle } from '../../../lib/icons'
import KpiCard from '../../../shared/components/KpiCard'
import { useDataQuery } from '../../../lib/useDataQuery'
import { computeKpis, fetchAssets, getSites } from '../../../data/liveData'
import { riskBandColor } from '../../../lib/riskBand'
import RiskDistributionChart from '../../dashboard/components/RiskDistributionChart'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import { MapPin } from '../../../lib/icons'
import '../css/ExecutivePage.css'

// Cycled by index — real site_location strings vary by deployment, unlike the old
// fixed 3-site fictional list.
const SITE_PALETTE = ['#06D6FF', '#A78BFA', '#F5A623', '#10E898']

export default function ExecutivePage() {
  const { data, isLoading, isError, refetch } = useDataQuery(() => computeKpis(), [])
  const { data: assets } = useDataQuery(() => fetchAssets(), [])

  const sitePerformance = assets ? getSites(assets).map(site => {
    const siteAssets = assets.filter(a => a.site === site)
    const avgHealth = Math.round(siteAssets.reduce((s, a) => s + a.healthScore, 0) / siteAssets.length)
    const atRisk = siteAssets.filter(a => a.band === 'critical' || a.band === 'warning').length
    return { site, avgHealth, total: siteAssets.length, atRisk }
  }) : []

  return (
    <div className="page-stack">
      <div>
        <div className="page-title">Executive View</div>
        <div className="page-subtitle">Portfolio-level cost, risk, and ROI roll-up — no operational detail.</div>
      </div>

      <div className="executive-kpi-row">
        <KpiCard icon={HeartPulse} label="Portfolio Health" color={data ? riskBandColor(data.band) : 'var(--t1)'}
          value={data?.portfolioHealthScore} subtext="Weighted by criticality" tooltip="Weighted average across all monitored assets."
          isLoading={isLoading} isError={isError} onRetry={refetch} />
        <KpiCard icon={AlertTriangle} label="Assets at Risk" color={data?.criticalCount > 0 ? 'var(--red)' : 'var(--amber)'}
          value={data?.atRiskCount} subtext={data ? `${data.criticalCount} Critical · ${data.warningCount} Warning` : undefined}
          tooltip="Assets scored Warning or Critical." isLoading={isLoading} isError={isError} onRetry={refetch} />
      </div>

      <div className="card executive-section" style={{ borderLeftColor: 'var(--cyan)' }}>
        <div className="widget-eyebrow">SITE PERFORMANCE</div>
        <div className="widget-title executive-section-title">Health by site</div>
        {!assets ? <SkeletonBlock height={90} /> : (
          <div className="executive-site-grid">
            {sitePerformance.map((s, i) => {
              const siteColor = SITE_PALETTE[i % SITE_PALETTE.length]
              return (
                <div key={s.site} className="executive-site-tile" style={{ borderColor: siteColor }}>
                  <div className="executive-site-tile-head">
                    <span className="executive-site-icon" style={{ color: siteColor }}><MapPin size={14} /></span>
                    <span className="executive-site-name">{s.site}</span>
                  </div>
                  <div className="executive-site-health" style={{ color: siteColor }}>{s.avgHealth}</div>
                  <div className="executive-site-meta">{s.total} assets · {s.atRisk} at risk</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RiskDistributionChart />
    </div>
  )
}
