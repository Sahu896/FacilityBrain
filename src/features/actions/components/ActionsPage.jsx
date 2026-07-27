import DataTable from '../../../shared/components/DataTable'
import Chip from '../../../shared/components/Chip'
import { RiskBadge, StatusBadge } from '../../../shared/components/Badge'
import { formatCurrency } from '../../../lib/formatters'
import { useRouter } from '../../../lib/router'
import { Check, X, Box, ClipboardList } from '../../../lib/icons'
import { useActionsQueue } from '../handlers/useActionsQueue'
import '../css/ActionsPage.css'

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'dismissed']

export default function ActionsPage() {
  const { navigate } = useRouter()
  const { filtered, statusFilter, setStatusFilter, setStatus, isLoading, isError, refetch } = useActionsQueue()

  const columns = [
    { key: 'assetName', label: 'Asset' },
    { key: 'site', label: 'Site' },
    { key: 'healthScore', label: 'Health Score' },
    { key: 'failureProbability', label: 'Failure Prob.', render: (r) => `${r.failureProbability}%` },
    { key: 'predictedWindow', label: 'Window' },
    { key: 'estimatedFailureCost', label: 'Est. Cost Impact', render: (r) => r.estimatedFailureCost != null ? formatCurrency(r.estimatedFailureCost) : '—' },
    { key: 'action', label: 'Recommended Action', render: (r) => <span className="actions-page-action-text">{r.action}</span> },
    { key: 'band', label: 'Risk', render: (r) => <RiskBadge band={r.band} size="sm" /> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Actions', sortable: false, render: (r) => (
        <div className="row-actions actions-page-row-actions">
          {r.status === 'pending' && (
            <>
              <button className="icon-btn actions-page-action-btn" aria-label="Accept" title="Accept"
                onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'accepted') }}><Check size={12} /></button>
              <button className="icon-btn actions-page-action-btn" aria-label="Dismiss" title="Dismiss"
                onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'dismissed') }}><X size={12} /></button>
            </>
          )}
          <button className="icon-btn actions-page-action-btn" aria-label="View asset" title="View asset"
            onClick={(e) => { e.stopPropagation(); navigate(`/assets/${r.assetId}`) }}><Box size={12} /></button>
        </div>
      )
    },
  ]

  return (
    <div className="page-stack">
      <div>
        <div className="page-title">Actions</div>
        <div className="page-subtitle">Recommendation queue — accept to create a work order, or dismiss.</div>
      </div>

      <div className="card actions-page-card">
        <div className="actions-page-header">
          <span className="actions-page-header-icon"><ClipboardList size={16} /></span>
          <div>
            <div className="widget-eyebrow">ACTIONS QUEUE</div>
            <div className="widget-title">Recommended actions</div>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          defaultSort={{ key: 'failureProbability', dir: 'desc' }}
          searchPlaceholder="Search recommendations…"
          searchKeys={['assetName']}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No recommendations"
          emptyBody="Nothing matches this filter right now."
          toolbarExtra={(
            <div className="actions-page-status-chips">
              {STATUS_FILTERS.map(s => (
                <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s[0].toUpperCase() + s.slice(1)}</Chip>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  )
}
