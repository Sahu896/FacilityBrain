import AssetTable from '../../dashboard/components/AssetTable'

export default function AssetsListPage() {
  return (
    <div className="page-stack">
      <div>
        <div className="page-title">Assets</div>
        <div className="page-subtitle">
          All monitored assets. Click any row to open its detail page.
        </div>
      </div>
      <AssetTable />
    </div>
  )
}
