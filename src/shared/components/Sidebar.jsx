import { LayoutDashboard, Box, Activity, Bell, CheckSquare, TrendingUp } from '../../lib/icons'
import { Link, useRouter } from '../../lib/router'
import BrandLogo from './BrandLogo'
import '../css/Sidebar.css'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, match: (p) => p === '/dashboard' || p === '/' },
  { label: 'Assets', to: '/assets', icon: Box, match: (p) => p.startsWith('/assets') },
  { label: 'Predictive Insights', to: '/predictive', icon: Activity, match: (p) => p === '/predictive' },
  { label: 'Alerts', to: '/alerts', icon: Bell, match: (p) => p === '/alerts' },
  { label: 'Actions', to: '/actions', icon: CheckSquare, match: (p) => p === '/actions' },
  { label: 'Executive View', to: '/executive', icon: TrendingUp, match: (p) => p === '/executive' },
]

export default function Sidebar() {
  const { path } = useRouter()
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandLogo size={30} />
        <div className="sidebar-label">
          <div className="sidebar-brand-name">Facility<span className="sidebar-brand-accent">Brain</span></div>
          <div className="sidebar-brand-sub">PREDICTIVE MAINTENANCE</div>
        </div>
      </div>

      {NAV_ITEMS.map(item => (
        <Link key={item.label} to={item.to} className={`nav-link${item.match(path) ? ' active' : ''}`} title={item.label}>
          <item.icon size={16} />
          <span className="sidebar-label">{item.label}</span>
        </Link>
      ))}
    </aside>
  )
}
