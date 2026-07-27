import { StatusBadge } from '../../../shared/components/Badge'
import { formatDate } from '../../../lib/formatters'
import EmptyState from '../../../shared/components/EmptyState'
import { ClipboardList, Wrench } from '../../../lib/icons'
import '../css/MaintenanceHistoryList.css'

export default function MaintenanceHistoryList({ workOrders }) {
  if (workOrders.length === 0) {
    return <EmptyState icon={ClipboardList} title="No maintenance history" body="No work orders recorded for this asset yet." />
  }
  return (
    <div className="mhl-list">
      {workOrders.map(w => (
        <div key={w.id} className={`list-row mhl-row${w.overdue ? ' mhl-row--overdue' : w.status === 'closed' ? ' mhl-row--closed' : ''}`}>
          <span className="mhl-row-icon"><Wrench size={14} /></span>
          <div className="mhl-row-body">
            <div className="mhl-row-desc">{w.description}</div>
            <div className="mhl-row-meta">{w.id} · Due {formatDate(w.dueDate)}</div>
          </div>
          <StatusBadge status={w.overdue ? 'open' : w.status} />
        </div>
      ))}
    </div>
  )
}
