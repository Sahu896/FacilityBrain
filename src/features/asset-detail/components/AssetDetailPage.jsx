import { ArrowLeft, Box, Activity } from '../../../lib/icons'
import { useRouter } from '../../../lib/router'
import { fetchAssetById } from '../../../data/liveData'
import { useDataQuery } from '../../../lib/useDataQuery'
import HealthScoreWidget from '../../dashboard/components/HealthScoreWidget'
import LiveSensorTiles from './LiveSensorTiles'
import PredictiveRiskChip from './PredictiveRiskChip'
import EmptyState from '../../../shared/components/EmptyState'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import Modal from '../../../shared/modal/Modal'
import { useToast } from '../../../shared/handlers/useToast'
import { useAssetRecommendation } from '../handlers/useAssetRecommendation'
import '../css/AssetDetailPage.css'

export default function AssetDetailPage({ assetId }) {
  const { navigate } = useRouter()
  const { push } = useToast()
  const { data: asset, isLoading, isError, refetch } = useDataQuery(() => fetchAssetById(assetId), [assetId])
  const rec = useAssetRecommendation(assetId)

  if (isLoading) {
    return (
      <div className="page-stack">
        <SkeletonBlock height={32} width={180} />
        <SkeletonBlock height={160} />
      </div>
    )
  }

  if (isError || !asset) {
    return (
      <div className="card asset-detail-not-found">
        <EmptyState icon={Box} title="Asset not found"
          body={isError ? "Couldn't reach the FacilityBrain API — is api_server.py running?" : `No asset with ID ${assetId}.`}
          action={<button className="btn btn-secondary" onClick={() => (isError ? refetch() : navigate('/dashboard'))}>{isError ? 'Retry' : 'Back to Dashboard'}</button>} />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <button className="btn btn-secondary asset-detail-back" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="asset-detail-head">
        <div>
          <div className="asset-detail-name">{asset.name}</div>
          <div className="asset-detail-meta">{asset.site} · {asset.makeModel} · {asset.ageYears} yrs old (design life {asset.designLifeYears} yrs)</div>
          <div className="asset-detail-chip"><PredictiveRiskChip asset={asset} /></div>
        </div>
        <div className="asset-detail-actions">
          <button className="btn btn-secondary" onClick={rec.request}>Get AI Recommendation</button>
          {/* <button className="btn btn-primary" onClick={() => push(`Work order created for ${asset.name}`, { type: 'success' })}>
            Create Work Order
          </button> */}
        </div>
      </div>

      <HealthScoreWidget scope="asset" asset={asset} />

      <div className="card asset-detail-section" style={{ borderLeftColor: 'var(--cyan)' }}>
        <div className="asset-detail-section-head">
          <span className="asset-detail-section-icon" style={{ color: 'var(--cyan)' }}><Activity size={16} /></span>
          <div>
            <div className="widget-eyebrow">LIVE SENSOR DATA</div>
            <div className="widget-title asset-detail-section-title">Current readings</div>
          </div>
        </div>
        <LiveSensorTiles sensors={asset.sensors} />
      </div>

      <Modal open={rec.open} onClose={() => rec.setOpen(false)} title={`AI Recommendation — ${asset.name}`}>
        {rec.loading ? (
          <div className="asset-detail-rec-loading">
            <SkeletonBlock height={14} />
            <SkeletonBlock height={14} width="80%" />
            <SkeletonBlock height={14} width="60%" />
            <div className="asset-detail-rec-hint">Generating forecast — this can take up to a minute on a local model.</div>
          </div>
        ) : rec.error ? (
          <div className="asset-detail-rec-error">{rec.error}</div>
        ) : rec.result ? (
          <div className="asset-detail-rec-body">
            <p className="asset-detail-rec-text">{rec.result.recommendation}</p>
            {rec.result.citations?.length > 0 && (
              <div className="asset-detail-rec-citations">
                <div className="asset-detail-rec-citations-title">Grounded in:</div>
                {rec.result.citations.map((c, i) => (
                  <div key={i} className="asset-detail-rec-citation">{c.source} — {c.section}</div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
