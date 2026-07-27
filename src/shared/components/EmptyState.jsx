import '../css/EmptyState.css'

// Positive empty states (e.g. "No assets at risk") must read as neutral/good,
// never with the same iconography as an error (Section 16).
export default function EmptyState({ icon: Icon, title, body, tone = 'neutral', action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className={`empty-state-icon empty-state-icon--${tone}`}>
          <Icon size={28} />
        </div>
      )}
      <div className="empty-state-title">{title}</div>
      {body && <div className="empty-state-body">{body}</div>}
      {action}
    </div>
  )
}
