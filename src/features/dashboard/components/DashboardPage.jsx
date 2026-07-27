import InfraScoreHero from './InfraScoreHero'
import KpiCardRow from './KpiCardRow'
import HealthScoreWidget from './HealthScoreWidget'
import LiveSensorSummaryCard from './LiveSensorSummaryCard'
import PredictiveInsightsWidget from './PredictiveInsightsWidget'
import AlertsWidget from './AlertsWidget'
import ChartsRow from './ChartsRow'
import { useAlertsHeightSync } from '../handlers/useAlertsHeightSync'
import '../css/DashboardPage.css'

export default function DashboardPage() {
  const { insightsRef, matchHeight } = useAlertsHeightSync()

  return (
    <div className="dashboard-page">
      <InfraScoreHero />
      <KpiCardRow />
      <HealthScoreWidget scope="portfolio" />
      <LiveSensorSummaryCard />
      <div className="two-col dashboard-two-col">
        <div ref={insightsRef}>
          <PredictiveInsightsWidget limit={6} />
        </div>
        <AlertsWidget maxHeight={matchHeight} onlyCritical />
      </div>
      <ChartsRow />
    </div>
  )
}
