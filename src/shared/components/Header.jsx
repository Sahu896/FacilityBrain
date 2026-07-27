import { Bell, Settings, LogOut } from '../../lib/icons'
import { SevBadge } from './Badge'
import { formatRelativeTime } from '../../lib/formatters'
import { useRouter } from '../../lib/router'
import { useHeaderState } from '../handlers/useHeaderState'
import { useAuth, nameFromEmail, initialsFromEmail } from '../handlers/useAuth'
import '../css/Header.css'

// const ENVIRONMENT = 'staging' // set to 'production' to hide the environment tag

export default function Header({ showDate = false, title, subtitle }) {
  const { navigate } = useRouter()
  const { time, notifOpen, setNotifOpen, profileOpen, setProfileOpen, live, setLive, notifRef, profileRef, alerts } = useHeaderState()
  const { user, logout } = useAuth()

  const recentAlerts = alerts.slice(0, 10)
  const unread = alerts.filter(a => a.status === 'new').length

  const words = title ? title.split(' ') : []
  const accentWord = words[words.length - 1]
  const leadWords = words.slice(0, -1).join(' ')

  return (
    <header className="app-header">
      {/* {ENVIRONMENT !== 'production' && (
        <span className="app-header-env-tag">{ENVIRONMENT.toUpperCase()}</span>
      )} */}

      {title && (
        <div className="app-header-titles">
          <div className="app-header-title">
            {leadWords ? `${leadWords} ` : ''}<span className="app-header-title-accent">{accentWord}</span>
          </div>
          {subtitle && <div className="app-header-subtitle">{subtitle}</div>}
        </div>
      )}

      <div className="app-header-right">
        <button className="app-header-live" onClick={() => setLive(l => !l)} title="Toggle live telemetry connection (demo)">
          <span className={`app-header-live-dot${live ? ' animate-blink app-header-live-dot--on' : ''}`} />
          <span className="app-header-live-text">{live ? 'Live' : 'Last synced 18m ago'}</span>
        </button>

        {showDate && (
          <span className="app-header-date">
            {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        )}

        <span className="app-header-time">
          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>

        <div className="app-header-menu" ref={notifRef}>
          <button
            className={`app-header-icon-btn${notifOpen ? ' app-header-icon-btn--open' : ''}`}
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unread > 0 && <span className="app-header-unread-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {notifOpen && (
            <div className="card app-header-dropdown app-header-dropdown--notif">
              <div className="app-header-dropdown-title">Notifications</div>
              {recentAlerts.length === 0 ? (
                <div className="app-header-dropdown-empty">You're all caught up.</div>
              ) : (
                <div className="app-header-notif-list">
                  {recentAlerts.map(a => (
                    <div key={a.id} className="app-header-notif-row">
                      <span className={`app-header-notif-dot app-header-notif-dot--${a.sev}`} />
                      <div>
                        <div className="app-header-notif-top">
                          <div className="app-header-notif-asset">{a.assetName}</div>
                          <SevBadge sev={a.sev} />
                        </div>
                        <div className="app-header-notif-msg">{a.msg}</div>
                        <div className="app-header-notif-time">{formatRelativeTime(a.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="btn btn-secondary app-header-view-all"
                onClick={() => { setNotifOpen(false); navigate('/alerts') }}
              >
                View all alerts
              </button>
            </div>
          )}
        </div>

        <div className="app-header-menu" ref={profileRef}>
          <button className="app-header-avatar" onClick={() => setProfileOpen(o => !o)} aria-label="User profile">
            {user ? initialsFromEmail(user) : '—'}
          </button>
          {profileOpen && (
            <div className="card app-header-dropdown app-header-dropdown--profile">
              <div className="app-header-profile-info">
                <div className="app-header-profile-name">{user ? nameFromEmail(user) : 'Unknown'}</div>
                <div className="app-header-profile-email">{user}</div>
                <div className="app-header-profile-role">FacilityBrain Team Member</div>
              </div>
              {/* <button className="nav-link app-header-menu-item"><Settings size={14} /> Settings</button> */}
              <button className="nav-link app-header-menu-item" onClick={logout}><LogOut size={14} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
