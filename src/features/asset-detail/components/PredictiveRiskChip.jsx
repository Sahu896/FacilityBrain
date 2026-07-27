import { RiskBadge } from '../../../shared/components/Badge'
import { riskBandColor } from '../../../lib/riskBand'
import '../css/PredictiveRiskChip.css'

export default function PredictiveRiskChip({ asset }) {
  return (
    <div className="prc-row">
      <RiskBadge band={asset.band} />
      <span className="prc-text">
        Failure probability <strong style={{ color: riskBandColor(asset.band) }}>{asset.failureProbability}%</strong>
      </span>
      {asset.predictedWindow && (
        <span className="prc-text">Predicted within <strong className="prc-strong">{asset.predictedWindow}</strong></span>
      )}
    </div>
  )
}
