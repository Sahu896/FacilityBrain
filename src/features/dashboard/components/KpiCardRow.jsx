import { HeartPulse, AlertTriangle, Box, Activity } from '../../../lib/icons'
import KpiCard from '../../../shared/components/KpiCard'
import { useDataQuery } from '../../../lib/useDataQuery'
import { computeKpis } from '../../../data/liveData'
import { riskBandColor } from '../../../lib/riskBand'
import { useRouter } from '../../../lib/router'
import '../css/KpiCardRow.css'

export default function KpiCardRow() {
  const { navigate } = useRouter()
  const { data, isLoading, isError, refetch } = useDataQuery(() => computeKpis(), [], { pollMs: 60000 })

  const healthColor = data ? riskBandColor(data.band) : 'var(--t1)'

  return (
    <div className="kpi-row">
      <KpiCard
        icon={HeartPulse} label="Portfolio Health" color={healthColor}
        value={data ? data.portfolioHealthScore : undefined}
        subtext={data ? 'Weighted by asset criticality' : undefined}
        tooltip="Weighted average health score across all monitored assets, weighted by criticality."
        isLoading={isLoading} isError={isError} onRetry={refetch}
        onClick={() => navigate('/predictive')}
      />
      <KpiCard
        icon={AlertTriangle} label="Assets at Risk" color={data?.criticalCount > 0 ? 'var(--red)' : 'var(--amber)'}
        value={data ? data.atRiskCount : undefined}
        subtext={data ? `${data.criticalCount} Critical · ${data.warningCount} Warning` : undefined}
        emptyMessage="No assets currently at risk"
        tooltip="Assets currently scored Warning or Critical based on latest telemetry and AI prediction."
        isLoading={isLoading} isError={isError} onRetry={refetch}
        onClick={() => navigate('/dashboard')}
      />
      <KpiCard
        icon={Box} label="Assets Monitored" color="var(--cyan)"
        value={data ? data.assetCount : undefined}
        subtext={data ? 'Across all connected sites' : undefined}
        tooltip="Total number of assets currently reporting telemetry to FacilityBrain."
        isLoading={isLoading} isError={isError} onRetry={refetch}
        onClick={() => navigate('/assets')}
      />
      <KpiCard
        icon={Activity} label="Predicted Failures (30d)" color={data?.criticalCount > 0 ? 'var(--red)' : 'var(--green)'}
        value={data ? data.criticalCount : undefined}
        subtext={data ? 'Assets in the critical risk band' : undefined}
        emptyMessage="No predicted failures"
        tooltip="Assets whose AI-predicted failure window falls within the next 30 days (critical risk band)."
        isLoading={isLoading} isError={isError} onRetry={refetch}
        onClick={() => navigate('/predictive')}
      />
    </div>
  )
}
