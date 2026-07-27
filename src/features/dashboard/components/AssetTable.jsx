import DataTable from '../../../shared/components/DataTable'
import MultiSelectDropdown from '../../../shared/components/MultiSelectDropdown'
import Chip from '../../../shared/components/Chip'
import { RiskBadge, StatusBadge } from '../../../shared/components/Badge'
import { fetchAssets } from '../../../data/liveData'
import { riskBandColor, RISK_BANDS } from '../../../lib/riskBand'
import { formatDate } from '../../../lib/formatters'
import { useRouter } from '../../../lib/router'
import { useDataQuery } from '../../../lib/useDataQuery'
import { Box, Wrench } from '../../../lib/icons'
import { useToast } from '../../../shared/handlers/useToast'
import { useAssetTableFilters } from '../handlers/useAssetTableFilters'
import '../css/AssetTable.css'

export default function AssetTable() {
  const { navigate } = useRouter()
  const { push } = useToast()
  const { data, isLoading, isError, refetch } = useDataQuery(() => fetchAssets(), [])
  const { siteFilter, setSiteFilter, classFilter, setClassFilter, bandFilter, setBandFilter, filtered, siteOptions, classOptions } = useAssetTableFilters(data)

  const columns = [
    { key: 'name', label: 'Asset Name' },
    { key: 'site', label: 'Site' },
    { key: 'assetClass', label: 'Class' },
    {
      key: 'healthScore', label: 'Health Score', render: (r) => (
        <span className="asset-table-health">
          <span className="asset-table-health-dot" style={{ background: riskBandColor(r.band) }} />
          {r.healthScore}
        </span>
      )
    },
    { key: 'bandRank', label: 'Risk Band', render: (r) => <RiskBadge band={r.band} size="sm" /> },
    { key: 'failureProbability', label: 'Failure Prob.', render: (r) => `${r.failureProbability}%` },
    { key: 'predictedWindow', label: 'Predicted Window', render: (r) => r.predictedWindow ?? '—' },
    { key: 'lastMaintenanceDate', label: 'Last Maintenance', render: (r) => r.lastMaintenanceDate ? formatDate(r.lastMaintenanceDate) : '—' },
    { key: 'connectivity', label: 'Status', render: (r) => <StatusBadge status={r.connectivity} /> },
    {
      key: 'actions', label: 'Actions', sortable: false, render: (r) => (
        <div className="row-actions asset-table-row-actions">
          <button className="icon-btn asset-table-action-btn" aria-label="View detail" title="View detail"
            onClick={(e) => { e.stopPropagation(); navigate(`/assets/${r.id}`) }}><Box size={12} /></button>
          <button className="icon-btn asset-table-action-btn" aria-label="Create work order" title="Create work order"
            onClick={(e) => { e.stopPropagation(); push(`Work order created for ${r.name}`, { type: 'success' }) }}><Wrench size={12} /></button>
        </div>
      )
    },
  ]

  return (
    <div className="card asset-table-card">
      <div className="asset-table-header">
        <div className="asset-table-header-left">
          <span className="asset-table-header-icon"><Box size={16} /></span>
          <div>
            <div className="widget-eyebrow">ASSET TABLE</div>
            <div className="widget-title">All monitored assets</div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        defaultSort={{ key: 'bandRank', dir: 'asc' }}
        searchPlaceholder="Search by asset name or ID…"
        searchKeys={['name', 'id']}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(r) => navigate(`/assets/${r.id}`)}
        emptyTitle="No assets match these filters"
        emptyBody="Try removing a filter."
        toolbarExtra={(
          <>
            <MultiSelectDropdown label="Site" options={siteOptions} selected={siteFilter} onChange={setSiteFilter} />
            <MultiSelectDropdown label="Class" options={classOptions} selected={classFilter} onChange={setClassFilter} />
            <div className="asset-table-band-chips">
              {RISK_BANDS.map(b => (
                <Chip key={b} active={bandFilter.includes(b)} color={riskBandColor(b)}
                  onClick={() => setBandFilter(f => f.includes(b) ? f.filter(x => x !== b) : [...f, b])}>
                  {b[0].toUpperCase() + b.slice(1)}
                </Chip>
              ))}
            </div>
          </>
        )}
      />
    </div>
  )
}
