import { AlertTriangle, RefreshCw } from '../../lib/icons'
import SkeletonBlock from './SkeletonBlock'
import Tooltip from './Tooltip'
import '../css/KpiCard.css'

export default function KpiCard({ icon: Icon, label, value, subtext, color = 'var(--t1)', tooltip, isLoading, isError, onRetry, emptyMessage, onClick }) {
  const clickable = !!onClick && !isLoading && !isError
  return (
    <div
      className={`card kpi-card${clickable ? ' card--clickable' : ''}`}
      style={{ borderLeftColor: color }}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="kpi-card-head">
        <Tooltip content={tooltip}>
          <span className="kpi-card-label">{label}</span>
        </Tooltip>
        <span className="kpi-card-icon" style={{ color }}><Icon size={16} /></span>
      </div>

      {isLoading ? (
        <>
          <SkeletonBlock width={70} height={30} />
          <SkeletonBlock width={110} height={12} style={{ marginTop: 8 }} />
        </>
      ) : isError ? (
        <div className="kpi-card-error">
          <span className="kpi-card-error-icon"><AlertTriangle size={16} /></span>
          <span className="kpi-card-error-text">Unable to load</span>
          <button className="icon-btn kpi-card-retry" aria-label="Retry" onClick={(e) => { e.stopPropagation(); onRetry?.() }}>
            <RefreshCw size={13} />
          </button>
        </div>
      ) : value === null || value === undefined ? (
        <div className="kpi-card-empty">{emptyMessage}</div>
      ) : (
        <>
          <div className="kpi-card-value" style={{ color }}>{value}</div>
          {subtext && <div className="kpi-card-subtext">{subtext}</div>}
        </>
      )}
    </div>
  )
}
