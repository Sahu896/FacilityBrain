import { useRouter } from '../../../lib/router'
import { formatDateTime } from '../../../lib/formatters'
import Chip from '../../../shared/components/Chip'
import EmptyState from '../../../shared/components/EmptyState'
import { SevBadge } from '../../../shared/components/Badge'
import { SkeletonRows } from '../../../shared/components/SkeletonBlock'
import { Check, Box, Inbox, AlertTriangle, Clock } from '../../../lib/icons'
import { useAlerts } from '../handlers/useAlerts'
import '../css/AlertsWidget.css'

const SEV_COLOR = { critical: '#FF6B6B', warning: '#F5A623', info: '#06D6FF' }
const SEV_RANK = { critical: 0, warning: 1, info: 2 }
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical', color: SEV_COLOR.critical },
  { key: 'warning', label: 'Warning', color: SEV_COLOR.warning },
  { key: 'info', label: 'Info', color: SEV_COLOR.info },
]

export default function AlertsWidget({ hideViewAll = false, hideHeader = false, maxHeight, onlyCritical = false, hideAccent = false }) {
  const { navigate } = useRouter()
  const { items, filter, setFilter, filtered, acknowledge, isLoading, isError, refetch } = useAlerts()
  const rows = onlyCritical ? items.filter(a => a.sev === 'critical') : filtered

  const worstSev = items.reduce((w, a) => (!w || SEV_RANK[a.sev] < SEV_RANK[w] ? a.sev : w), null)
  const accentColor = worstSev ? SEV_COLOR[worstSev] : 'var(--green)'

  return (
    <div
      className={`card alerts-card${hideAccent ? ' alerts-card--no-accent' : ''}`}
      style={{ height: maxHeight ?? undefined, ...(hideAccent ? {} : { borderLeftColor: accentColor }) }}
    >
      <div className="alerts-header">
        {!hideHeader ? (
          <div>
            <div className="widget-eyebrow">ALERTS</div>
            <div className="widget-title">{onlyCritical ? 'Critical alerts' : 'Recent activity'}</div>
          </div>
        ) : <div />}
        {!hideViewAll && (
          <button className="btn btn-secondary alerts-view-all" onClick={() => navigate('/alerts')}>View all</button>
        )}
      </div>

      {!onlyCritical && (
        <div className="alerts-filters">
          {FILTERS.map(f => (
            <Chip key={f.key} active={filter === f.key} color={f.color ?? 'var(--cyan)'} onClick={() => setFilter(f.key)}>{f.label}</Chip>
          ))}
        </div>
      )}

      {isLoading ? (
        <SkeletonRows rows={4} height={54} gap={8} />
      ) : isError ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load alerts"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} tone="positive" title={onlyCritical ? 'No critical alerts' : 'No alerts'}
          body={onlyCritical ? 'No assets currently have a critical-severity alert.' : 'Nothing matches this filter right now.'} />
      ) : (
        <div className="alerts-list">
          {rows.map(a => (
            <div key={a.id} className={`list-row alerts-row alerts-row--${a.sev}${a.status !== 'new' ? ' alerts-row--ack' : ''}`}>
              <span className="alerts-row-icon" style={{ color: SEV_COLOR[a.sev] }}><AlertTriangle size={14} /></span>
              <div className="alerts-row-body">
                <div className="alerts-row-tags">
                  <SevBadge sev={a.sev} />
                  <span className="alerts-row-type">{a.type}</span>
                </div>
                <div className="alerts-row-msg">{a.msg}</div>
                <div className="alerts-row-time"><Clock size={11} /> {formatDateTime(a.time)}</div>
              </div>
              <div className="row-actions alerts-row-actions">
                {a.status === 'new' && (
                  <button className="icon-btn alerts-action-btn" aria-label="Acknowledge" title="Acknowledge" onClick={() => acknowledge(a.id)}>
                    <Check size={12} />
                  </button>
                )}
                <button className="icon-btn alerts-action-btn" aria-label="View asset" title="View asset" onClick={() => navigate(`/assets/${a.assetId}`)}>
                  <Box size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
