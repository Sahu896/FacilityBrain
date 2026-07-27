import { useDataQuery } from '../../../lib/useDataQuery'
import { fetchAssets, rankRecommendations } from '../../../data/liveData'
import { riskBandColor } from '../../../lib/riskBand'
import { useRouter } from '../../../lib/router'
import { useToast } from '../../../shared/handlers/useToast'
import { SkeletonRows } from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import { CheckSquare, AlertTriangle, Volume2, VolumeX } from '../../../lib/icons'
import { useSpeakOverview, overviewTextFor } from '../handlers/useSpeakOverview'
import '../css/PredictiveInsightsWidget.css'

export default function PredictiveInsightsWidget({ limit = 6, hideViewAll = false, hideHeader = false, hideAccent = false }) {
  const { navigate } = useRouter()
  const { push } = useToast()
  const { data, isLoading, isError, refetch } = useDataQuery(async () => rankRecommendations(await fetchAssets()).slice(0, limit), [limit])
  const { speaking, speak, supported } = useSpeakOverview()

  return (
    <div className={`card predictive-insights-card${hideAccent ? ' predictive-insights-card--no-accent' : ''}`} style={hideAccent ? undefined : { borderLeftColor: 'var(--purple)' }}>
      <div className="predictive-insights-header">
        {!hideHeader ? (
          <div>
            <div className="widget-eyebrow">PREDICTIVE INSIGHTS</div>
            <div className="widget-title">Ranked failure risk</div>
          </div>
        ) : <div />}
        <div className="predictive-insights-header-actions">
          {supported && (
            <button
              className={`icon-btn predictive-insights-speak-btn${speaking ? ' active' : ''}`}
              aria-label={speaking ? 'Stop reading overview' : 'Read overview aloud'}
              title={speaking ? 'Stop reading overview' : 'Read overview aloud'}
              disabled={!data || data.length === 0}
              onClick={() => speak(overviewTextFor(data))}
            >
              {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
          {!hideViewAll && (
            <button className="btn btn-secondary predictive-insights-view-all" onClick={() => navigate('/predictive')}>View all</button>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} height={64} gap={10} />
      ) : isError || !data ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load predictions"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      ) : data.length === 0 ? (
        <EmptyState icon={CheckSquare} tone="positive" title="No active predictions" body="All monitored assets are within healthy operating ranges." />
      ) : (
        <div className="predictive-insights-list">
          {data.map(rec => {
            const color = riskBandColor(rec.band)
            return (
              <div key={rec.id} className="predictive-insights-item" style={{ borderColor: color }}>
                <div className="predictive-insights-item-head">
                  <div>
                    <span className="predictive-insights-item-asset">{rec.assetName}</span>
                    <span className="predictive-insights-item-meta">{rec.site} · Health {rec.healthScore}</span>
                  </div>
                  <span className="predictive-insights-item-window">{rec.predictedWindow}</span>
                </div>

                <div className="predictive-insights-item-bar-row">
                  <div className="predictive-insights-item-track">
                    <div className="predictive-insights-item-fill" style={{ width: `${rec.failureProbability}%`, background: color }} />
                  </div>
                  <span className="predictive-insights-item-pct" style={{ color }}>{rec.failureProbability}%</span>
                </div>

                <div className="predictive-insights-item-action">{rec.action}</div>

                <div className="predictive-insights-item-buttons">
                  {/* <button className="btn btn-primary predictive-insights-btn"
                    onClick={() => push(`Work order created for ${rec.assetName}`, { type: 'success' })}>
                    Create Work Order
                  </button> */}
                  <button className="btn btn-secondary predictive-insights-btn"
                    onClick={() => navigate(`/assets/${rec.assetId}`)}>
                    View Asset
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
