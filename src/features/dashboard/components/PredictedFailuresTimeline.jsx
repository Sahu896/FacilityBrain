import { fetchAssets, predictedFailuresTimeline } from '../../../data/liveData'
import { useDataQuery } from '../../../lib/useDataQuery'
import { Download, AlertTriangle } from '../../../lib/icons'
import { exportCsv } from '../../../lib/exportChart'
import { useRouter } from '../../../lib/router'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import '../css/PredictedFailuresTimeline.css'

export default function PredictedFailuresTimeline() {
  const { navigate } = useRouter()
  const { data, isLoading, isError, refetch } = useDataQuery(async () => predictedFailuresTimeline(await fetchAssets()), [])
  const max = Math.max(...(data ?? []).map(d => d.count), 1)

  return (
    <div className="card predicted-failures-card" style={{ borderLeftColor: 'var(--cyan)' }}>
      <div className="predicted-failures-header">
        <div>
          <div className="widget-eyebrow">PREDICTED FAILURES</div>
          <div className="widget-title">Forward-looking volume</div>
        </div>
        <button className="icon-btn predicted-failures-export-btn" aria-label="Export CSV" title="Export as CSV" onClick={() => exportCsv(data ?? [], 'predicted-failures.csv')}>
          <Download size={13} />
        </button>
      </div>

      {isLoading ? <SkeletonBlock height={140} /> : isError || !data ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      ) : (
      <div className="predicted-failures-list">
        {data.map(d => (
          <div key={d.window}>
            <div className="predicted-failures-row-head">
              <span className="predicted-failures-window">Within {d.window}</span>
              <button
                onClick={() => navigate('/predictive')}
                className="predicted-failures-count-btn"
                style={{ color: d.color }}
              >
                {d.count} assets
              </button>
            </div>
            <div className="predicted-failures-track">
              <div className="predicted-failures-fill" style={{ width: `${(d.count / max) * 100}%`, background: d.color }} />
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
