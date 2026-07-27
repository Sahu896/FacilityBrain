import { useMemo, useState } from 'react'

export function useDataTable({ rows, defaultSort = null, pageSize: initialPageSize = 25, searchKeys = [] }) {
  const [sort, setSort] = useState(defaultSort)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(initialPageSize)

  const filtered = useMemo(() => {
    if (!search || !searchKeys.length) return rows
    const q = search.toLowerCase()
    return rows.filter(r => searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(q)))
  }, [rows, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const { key, dir } = sort
    return [...filtered].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av === bv) return 0
      const cmp = av > bv ? 1 : -1
      return dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const clampedPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)

  const toggleSort = (key) => {
    setPage(1)
    setSort(s => {
      if (!s || s.key !== key) return { key, dir: 'desc' }
      if (s.dir === 'desc') return { key, dir: 'asc' }
      return null
    })
  }

  return { sort, search, setSearch, page, setPage, pageSize, sorted, clampedPage, totalPages, pageRows, toggleSort }
}
