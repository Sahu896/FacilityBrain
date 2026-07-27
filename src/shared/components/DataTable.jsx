import { Search, ChevronDown, AlertTriangle } from '../../lib/icons'
import { SkeletonRows } from './SkeletonBlock'
import EmptyState from './EmptyState'
import { useDataTable } from '../handlers/useDataTable'
import '../css/DataTable.css'

// Generic, config-driven table — built once, reused for the Asset Table,
// Recommendation Queue, and Alerts list (Section 18).
export default function DataTable({
  columns, rows, getRowKey = (r) => r.id,
  defaultSort = null, pageSize: initialPageSize = 25,
  searchPlaceholder, searchKeys = [],
  rowClassName, onRowClick,
  isLoading, isError, onRetry,
  emptyTitle = 'No results', emptyBody, toolbarExtra,
}) {
  const { search, setSearch, setPage, sorted, clampedPage, totalPages, pageRows, toggleSort, sort, pageSize } =
    useDataTable({ rows, defaultSort, pageSize: initialPageSize, searchKeys })

  return (
    <div>
      {(searchKeys.length > 0 || toolbarExtra) && (
        <div className="dtable-toolbar">
          {searchKeys.length > 0 && (
            <div className="dtable-search">
              <Search size={14} color="var(--t3)" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder={searchPlaceholder ?? 'Search…'}
                className="dtable-search-input"
              />
            </div>
          )}
          {toolbarExtra}
          <span className="dtable-count">
            Showing {sorted.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, sorted.length)} of {sorted.length}
          </span>
        </div>
      )}

      {isError ? (
        <div className="dtable-error">
          <AlertTriangle size={15} color="var(--red)" />
          <span className="dtable-error-text">Couldn't load data</span>
          <button className="btn btn-secondary dtable-error-retry" onClick={onRetry}>Retry</button>
        </div>
      ) : null}

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width }} onClick={() => col.sortable !== false && toggleSort(col.key)}>
                  <span className="dtable-th-inner">
                    {col.label}
                    {col.sortable !== false && (
                      <ChevronDown size={11} className={`dtable-sort-icon${sort?.key === col.key ? ' dtable-sort-icon--active' : ''}${sort?.key === col.key && sort.dir === 'asc' ? ' dtable-sort-icon--asc' : ''}`} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="dtable-skeleton-cell">
                <SkeletonRows rows={8} height={16} />
              </td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={columns.length}>
                <EmptyState title={emptyTitle} body={emptyBody} />
              </td></tr>
            ) : pageRows.map(row => (
              <tr key={getRowKey(row)}
                className={`${rowClassName?.(row) ?? ''}${onRowClick ? ' dtable-row--clickable' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="dtable-pagination">
          <button className="btn btn-secondary dtable-page-btn" disabled={clampedPage <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span className="dtable-page-label">Page {clampedPage} of {totalPages}</span>
          <button className="btn btn-secondary dtable-page-btn" disabled={clampedPage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
