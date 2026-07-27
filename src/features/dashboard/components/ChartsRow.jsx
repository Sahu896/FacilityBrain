import HealthTrendChart from './HealthTrendChart'
import RiskDistributionChart from './RiskDistributionChart'
import PredictedFailuresTimeline from './PredictedFailuresTimeline'
import '../css/ChartsRow.css'

export default function ChartsRow() {
  return (
    <div className="charts-row">
      <HealthTrendChart />
      <RiskDistributionChart />
      <PredictedFailuresTimeline />
    </div>
  )
}
