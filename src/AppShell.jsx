import Header from './shared/components/Header'
import Sidebar from './shared/components/Sidebar'
import Copilot from './shared/components/Copilot'
import { useRouter, matchRoute } from './lib/router'
import DashboardPage from './features/dashboard/components/DashboardPage'
import AssetsListPage from './features/asset-detail/components/AssetsListPage'
import AssetDetailPage from './features/asset-detail/components/AssetDetailPage'
import PredictiveInsightsPage from './features/predictive/components/PredictiveInsightsPage'
import ActionsPage from './features/actions/components/ActionsPage'
import ExecutivePage from './features/executive/components/ExecutivePage'
import AlertsPage from './features/alerts/components/AlertsPage'
import './AppShell.css'

const HEADER_TITLE = 'Asset Health Overview'
const HEADER_SUBTITLE = 'Real-time health, predictive risk, and live sensor status across your portfolio.'

function resolvePage(path) {
  if (path === '/' || path === '/dashboard') return { page: <DashboardPage />, showDate: false }
  if (path === '/assets') return { page: <AssetsListPage />, showDate: false }
  const assetMatch = matchRoute('/assets/:id', path)
  if (assetMatch) return { page: <AssetDetailPage assetId={assetMatch.id} />, showDate: false }
  if (path === '/predictive') return { page: <PredictiveInsightsPage />, showDate: false }
  if (path === '/alerts') return { page: <AlertsPage />, showDate: false }
  if (path === '/actions') return { page: <ActionsPage />, showDate: false }
  if (path === '/executive') return { page: <ExecutivePage />, showDate: true }
  return { page: <DashboardPage />, showDate: false }
}

export default function AppShell() {
  const { path } = useRouter()
  const { page, showDate } = resolvePage(path)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell-main">
        <Header showDate={showDate} title={HEADER_TITLE} subtitle={HEADER_SUBTITLE} />
        <main className="app-shell-content">
          {page}
        </main>
      </div>
      <Copilot />
    </div>
  )
}
