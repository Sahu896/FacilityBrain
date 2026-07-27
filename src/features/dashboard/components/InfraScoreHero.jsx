import { useDataQuery } from '../../../lib/useDataQuery'
import { computeKpis, fetchAssets } from '../../../data/liveData'
import { riskBandColor, riskBandLabel } from '../../../lib/riskBand'
import { useRouter } from '../../../lib/router'
import RingGauge from '../../../shared/components/RingGauge'
import Tooltip from '../../../shared/components/Tooltip'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import { AlertTriangle, Activity } from '../../../lib/icons'
import '../css/InfraScoreHero.css'

// The 4 real dataset-health dimensions the API actually returns (matches
// HEALTH_WEIGHTS in data/liveData.js) — no fabricated 5th metric.
const DIM_META = {
  sensor: { label: 'Sensors', color: '#10E898' },
  maintenance: { label: 'Maintenance', color: '#06D6FF' },
  age: { label: 'Asset Age', color: '#F5A623' },
  operational: { label: 'Operational', color: '#A78BFA' },
}

export default function InfraScoreHero() {
  const { navigate } = useRouter()
  const { data, isLoading, isError, refetch } = useDataQuery(async () => {
    const [kpis, assets] = await Promise.all([computeKpis(), fetchAssets()])
    return { kpis, assets }
  }, [], { pollMs: 60000 })

  if (!isLoading && (isError || !data)) {
    return (
      <div className="card infra-hero-card">
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load portfolio score"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      </div>
    )
  }

  const color = data?.kpis?.band ? riskBandColor(data.kpis.band) : 'var(--cyan)'

  return (
    <div className="card infra-hero-card">
      {isLoading || !data ? (
        <SkeletonBlock height={140} />
      ) : (
        <>
          <div className="infra-hero-circle" style={{ '--hero-color': color }}>
            <div className="infra-hero-score">{data.kpis.portfolioHealthScore}</div>
            <div className="infra-hero-score-label">Portfolio Score</div>
          </div>

          <div className="infra-hero-rings">
            {Object.entries(DIM_META).map(([key, meta]) => (
              <div key={key} className="infra-hero-ring">
                <RingGauge value={data.kpis.datasetHealth[key]} color={meta.color} />
                <div className="infra-hero-ring-label">{meta.label}</div>
              </div>
            ))}
          </div>

          <div className="infra-hero-signal">
            <div className="infra-hero-signal-head">
              <span className="infra-hero-signal-title">Fleet health at a glance</span>
              <span className="infra-hero-signal-icon" style={{ color }}><Activity size={14} /></span>
            </div>
            <div className="infra-hero-signal-list">
              {data.assets.map(a => {
                const dotColor = riskBandColor(a.band)
                return (
                  <Tooltip
                    key={a.id} width={170}
                    content={
                      <div>
                        <div className="infra-hero-bar-tip-title">{a.name}</div>
                        <div className="infra-hero-bar-tip-row"><span>Site</span><span>{a.site}</span></div>
                        <div className="infra-hero-bar-tip-row"><span>Health</span><span style={{ color: dotColor }}>{a.healthScore}</span></div>
                        <div className="infra-hero-bar-tip-row"><span>Status</span><span style={{ color: dotColor }}>{riskBandLabel(a.band)}</span></div>
                      </div>
                    }
                  >
                    <button
                      type="button" className="infra-hero-lollipop-row"
                      onClick={() => navigate(`/assets/${a.id}`)}
                      aria-label={`${a.name}: health score ${a.healthScore}, ${riskBandLabel(a.band)}`}
                    >
                      <span className="infra-hero-lollipop-name">{a.name}</span>
                      <span className="infra-hero-lollipop-track">
                        <span
                          className="infra-hero-lollipop-dot"
                          style={{
                            left: `${Math.max(2, Math.min(98, a.healthScore))}%`,
                            background: dotColor,
                            boxShadow: `0 0 8px color-mix(in srgb, ${dotColor} 70%, transparent)`,
                          }}
                        />
                      </span>
                      <span className="infra-hero-lollipop-score" style={{ color: dotColor }}>{a.healthScore}</span>
                    </button>
                  </Tooltip>
                )
              })}
            </div>
            <div className="infra-hero-signal-caption">
              {data.kpis.assetCount} assets monitored · {data.kpis.atRiskCount} at risk
            </div>
          </div>
        </>
      )}
    </div>
  )
}
