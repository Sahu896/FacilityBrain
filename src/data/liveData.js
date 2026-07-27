// Real-data adapter for the FacilityBrain AI API (facilitybrain_project/api_server.py).
// Fetches via lib/api.js and reshapes real fields into the same internal asset/KPI shape
// data/generate.js used to fabricate — so components didn't need to change, only the
// data-fetching hooks that feed them. See data/generate.js for the (now-commented-out)
// dummy generator this replaces.
import { getAssets, getAsset, getFleet } from '../lib/api'
import { apiRiskCategoryToBand } from '../lib/riskBand'

const round1 = (n) => Math.round(n * 10) / 10

// Real Health Score weights (matches facilitybrain_project/src/health_score_engine.py's
// WEIGHTS exactly: DS1 sensor 40%, DS2 maintenance 25%, DS3 age 20%, DS4 operational 15%).
export const HEALTH_WEIGHTS = { sensor: 0.40, maintenance: 0.25, age: 0.20, operational: 0.15 }

const BAND_RANK = { critical: 0, warning: 1, monitor: 2, healthy: 3 }
const PREDICTED_WINDOW = { critical: '7 days', warning: '30 days', monitor: '90 days', healthy: null }
const DIM_LABEL = { sensor: 'live sensor readings', maintenance: 'maintenance compliance', age: 'asset age', operational: 'operational reliability (MTTF/incidents/runtime)' }

// The API doesn't label sensor units — these are reasonable, documented assumptions
// matching the sensor kinds already understood by LiveSensorTiles/LiveSensorSummaryCard.
const SENSOR_KIND_MAP = { Temperature: 'temperature', Humidity: 'humidity', Current: 'power', Pressure: 'pressure', Vibration: 'vibration' }
const SENSOR_UNITS = { temperature: '°F', humidity: '%', power: 'A', pressure: 'psi', vibration: 'mm/s' }

function worstDim(dims) {
  return Object.entries(dims).sort((a, b) => a[1] - b[1])[0][0]
}

function actionFor(band, dims) {
  const worst = worstDim(dims)
  const urgency = band === 'critical' ? 'Immediate' : band === 'warning' ? 'Schedule within 2 weeks' : 'Monitor'
  return `${urgency}: review ${DIM_LABEL[worst]} — lowest-scoring contributor to health score`
}

// Sensor "Normal/Warning/Critical" status derived from the deviation engine's own D value
// (0 = on baseline, 1 = at/beyond the 30%-critical-threshold rule it already applies) —
// not a separate fabricated threshold.
function mapSensor(rawKind, dev) {
  const kind = SENSOR_KIND_MAP[rawKind] ?? rawKind.toLowerCase()
  const unit = SENSOR_UNITS[kind] ?? ''
  const value = round1(dev.actual)
  const expected = dev.expected
  const status = dev.D >= 1 ? 'Critical' : dev.D >= 0.5 ? 'Warning' : 'Normal'
  return {
    kind, value, unit,
    // Derived from the deviation engine's own 30%-of-baseline critical rule, since the API
    // doesn't expose separate warn/crit constants per sensor.
    warnThreshold: round1(expected * 1.15),
    critThreshold: round1(expected * 1.30),
    status,
    trend: value > expected ? 'up' : 'down',
    // No time-series endpoint exists on the real API — flat placeholder, not a fabricated trend.
    history: [value, value],
  }
}

function mapAsset(raw) {
  const band = apiRiskCategoryToBand(raw.risk_category)
  const dims = {
    sensor: raw.dataset_health.sensor,
    maintenance: raw.dataset_health.maintenance,
    age: raw.dataset_health.age,
    operational: raw.dataset_health.operational,
  }
  const tierMatch = /Tier\s*(\d+)/i.exec(raw.criticality_tier ?? '')
  const ageInfo = raw.deviation_detail?.age
  const sensors = Object.entries(raw.deviation_detail?.sensors ?? {}).map(([k, v]) => mapSensor(k, v))

  return {
    id: raw.asset_id,
    name: `${raw.asset_type} ${raw.asset_id}`,
    site: raw.site_location,
    assetClass: raw.asset_type,
    makeModel: raw.make_model,
    healthScore: Math.round(raw.final_health_score),
    band,
    bandRank: BAND_RANK[band],
    dims,
    failureProbability: Math.round(raw.model3_failure_probability_pct),
    // Real, richer than the old fabricated "predictedWindow" — remaining useful life from
    // Model 2 (flagged by the project's own README as illustrative, not validated).
    rulDays: raw.model2_rul_days,
    predictedWindow: PREDICTED_WINDOW[band],
    criticalityTier: tierMatch ? Number(tierMatch[1]) : 2,
    ageYears: ageInfo ? round1(ageInfo.age_years) : null,
    designLifeYears: ageInfo ? Number(ageInfo.design_life_years) : null,
    // No real equivalent on the API — see plan notes; kept null/fixed rather than fabricated.
    lastMaintenanceDate: null,
    overdue: false,
    connectivity: 'online',
    sensors,
    recommendedAction: actionFor(band, dims),
    estimatedFailureCost: null,
  }
}

// Nearly every widget on the dashboard independently needs the asset list (or the fleet
// aggregate), which used to be "free" when it was a single in-memory dummy array. Against
// a real HTTP API, that means ~10 simultaneous GET requests to the same origin on one page
// load — Chrome caps concurrent connections per origin at 6, so the rest queue and can take
// far longer than expected to even fail. Sharing one in-flight/recent request across callers
// avoids that pileup without needing a full caching library.
function makeSharedFetch(fetcher, ttlMs = 3000) {
  let pending = null
  let startedAt = 0
  return () => {
    const now = Date.now()
    if (pending && now - startedAt < ttlMs) return pending
    startedAt = now
    pending = fetcher().catch(err => { pending = null; throw err })
    return pending
  }
}

async function fetchAssetsUncached() {
  const raw = await getAssets()
  return raw.map(mapAsset)
}
export const fetchAssets = makeSharedFetch(fetchAssetsUncached)

export async function fetchAssetById(assetId) {
  return mapAsset(await getAsset(assetId))
}

async function fetchFleetKpisUncached() {
  const fleet = await getFleet()
  const band = apiRiskCategoryToBand(fleet.risk_category)
  return {
    portfolioHealthScore: Math.round(fleet.final_health_score),
    band,
    assetCount: fleet.asset_count,
    atRiskCount: fleet.critical_count + fleet.high_risk_count,
    criticalCount: fleet.critical_count,
    warningCount: fleet.high_risk_count,
    // No real cost/work-order data on the API — null (not fabricated), rendered as an
    // explicit "not available" empty state by KpiCard rather than a misleading $0 / 0.
    savings: null,
    backlogCount: null,
    overdueCount: null,
    datasetHealth: fleet.dataset_health,
  }
}
// Aliased as `computeKpis` so existing call sites (`() => computeKpis()`) only need their
// import source changed, not the call itself.
export const computeKpis = makeSharedFetch(fetchFleetKpisUncached)
export const fetchFleetKpis = computeKpis

// ── Derived from real per-asset data (no persisted alerts feed on the API) ──────────────
export function deriveAlerts(assets) {
  const alerts = []
  let seq = 0
  const push = (asset, sev, type, msg) => alerts.push({
    id: `ALT-${++seq}`, assetId: asset.id, assetName: asset.name, site: asset.site,
    sev, type, msg, time: new Date().toISOString(), status: 'new',
  })
  assets.forEach(asset => {
    asset.sensors.forEach(s => {
      const dir = s.trend === 'up' ? 'high' : 'low'
      if (s.status === 'Critical') push(asset, 'critical', `${s.kind}_${dir}_critical`, `${asset.name}: ${s.kind} reading ${s.value}${s.unit} is at/beyond the critical threshold of ${s.critThreshold}${s.unit}`)
      else if (s.status === 'Warning') push(asset, 'warning', `${s.kind}_${dir}_threshold`, `${asset.name}: ${s.kind} reading ${s.value}${s.unit} is deviating past the warning threshold of ${s.warnThreshold}${s.unit}`)
    })
    if (asset.dims.maintenance <= 60) push(asset, asset.dims.maintenance <= 40 ? 'critical' : 'warning', 'maintenance_compliance_low', `${asset.name}: maintenance compliance degraded (dataset health ${asset.dims.maintenance})`)
    if (asset.dims.operational <= 60) push(asset, asset.dims.operational <= 40 ? 'critical' : 'warning', 'operational_reliability_low', `${asset.name}: operational reliability degraded (dataset health ${asset.dims.operational})`)
  })
  const sevRank = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => sevRank[a.sev] - sevRank[b.sev])
}

// ── Ranked failure risk (replaces the fabricated `recommendations` array) ──────────────
export function rankRecommendations(assets) {
  return [...assets]
    .sort((a, b) => b.failureProbability - a.failureProbability)
    .map(a => ({
      id: `REC-${a.id}`,
      assetId: a.id, assetName: a.name, site: a.site, band: a.band,
      healthScore: a.healthScore, failureProbability: a.failureProbability,
      predictedWindow: a.predictedWindow, action: a.recommendedAction,
      estimatedFailureCost: null,
      status: 'pending',
    }))
}

export function getSites(assets) {
  return [...new Set(assets.map(a => a.site))]
}

export function riskDistributionByLocation(assets) {
  return getSites(assets).map(site => {
    const siteAssets = assets.filter(a => a.site === site)
    return {
      site,
      healthy: siteAssets.filter(a => a.band === 'healthy').length,
      monitor: siteAssets.filter(a => a.band === 'monitor').length,
      warning: siteAssets.filter(a => a.band === 'warning').length,
      critical: siteAssets.filter(a => a.band === 'critical').length,
    }
  })
}

export function predictedFailuresTimeline(assets) {
  const critical = assets.filter(a => a.band === 'critical').length
  const warning = assets.filter(a => a.band === 'warning').length
  const monitor = assets.filter(a => a.band === 'monitor').length
  return [
    { window: '30 days', count: critical, color: '#FF6B6B' },
    { window: '60 days', count: critical + warning, color: '#F5A623' },
    { window: '90 days', count: critical + warning + monitor, color: '#06D6FF' },
  ]
}

// No time-series endpoint on the real API — dated but flat (constant y), not a fabricated
// trend. Gives area/line charts real date labels on the x-axis without inventing history.
export function recentDateLabels(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
}

export function flatDatedSeries(days, value) {
  return recentDateLabels(days).map(t => ({ t, value }))
}

// Fuller flat series (real date labels, constant y) for the multi-day trend chart, which
// needs distinct x-axis labels even though there's no real historical movement to show.
export function healthTrendSeries(days, portfolioScore, assets) {
  const labels = recentDateLabels(days)
  const sites = getSites(assets)
  return labels.map(t => {
    const row = { t, portfolio: portfolioScore }
    sites.forEach(site => {
      const siteAssets = assets.filter(a => a.site === site)
      row[site] = Math.round(siteAssets.reduce((s, a) => s + a.healthScore, 0) / siteAssets.length)
    })
    return row
  })
}

// No real equivalent on the API (no work-order list) — empty, not fabricated. Existing
// EmptyState/emptyMessage paths already render these gracefully.
export const workOrders = []

export function getAssetById(assets, id) {
  return assets.find(a => a.id === id)
}

export function maintenanceHistoryFor() {
  return []
}
