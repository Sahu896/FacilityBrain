import { useMemo, useState } from 'react'

export function useAssetTableFilters(data) {
  const [siteFilter, setSiteFilter] = useState([])
  const [classFilter, setClassFilter] = useState([])
  const [bandFilter, setBandFilter] = useState([])

  const rows = data ?? []

  const siteOptions = useMemo(() => [...new Set(rows.map(a => a.site))], [rows])
  const classOptions = useMemo(() => [...new Set(rows.map(a => a.assetClass))], [rows])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter(a =>
      (siteFilter.length === 0 || siteFilter.includes(a.site)) &&
      (classFilter.length === 0 || classFilter.includes(a.assetClass)) &&
      (bandFilter.length === 0 || bandFilter.includes(a.band))
    )
  }, [data, siteFilter, classFilter, bandFilter])

  return { siteFilter, setSiteFilter, classFilter, setClassFilter, bandFilter, setBandFilter, filtered, siteOptions, classOptions }
}
