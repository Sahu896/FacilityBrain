import AlertsWidget from '../../dashboard/components/AlertsWidget'

export default function AlertsPage() {
  return (
    <div className="page-stack">
      <div>
        <div className="page-title">Alerts</div>
        <div className="page-subtitle">
          All active alerts, derived live from real per-asset deviation data.
        </div>
      </div>
      <AlertsWidget hideViewAll hideHeader hideAccent />
    </div>
  )
}
