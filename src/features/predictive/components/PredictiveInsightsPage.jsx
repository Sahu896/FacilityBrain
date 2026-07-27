import PredictiveInsightsWidget from '../../dashboard/components/PredictiveInsightsWidget'

export default function PredictiveInsightsPage() {
  return (
    <div className="page-stack">
      <div>
        <div className="page-title">Predictive Insights</div>
        <div className="page-subtitle">
          All AI-generated failure predictions, ranked by failure probability.
        </div>
      </div>
      <PredictiveInsightsWidget limit={Infinity} hideViewAll hideHeader hideAccent />
    </div>
  )
}
