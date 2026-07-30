// RETIRED — this was the deterministic dummy-data generator the MVP dashboard was built
// against before the real FacilityBrain AI API (facilitybrain_project/api_server.py) was
// wired in. Kept here, commented out, for reference — every export it used to provide now
// has a real-data equivalent in src/data/liveData.js. Nothing in the app imports this file
// anymore.
/*
import { makeRng } from '../lib/seededRandom'
import { scoreToBand } from '../lib/riskBand'

const rng = makeRng(1337)
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round1 = (n) => Math.round(n * 10) / 10
const DAY_MS = 86400000
const NOW = new Date('2026-07-25T20:00:00Z').getTime()

export const SITES = ['North DC', 'South Campus', 'West Annex']
const SITE_CODES = { 'North DC': 'NDC', 'South Campus': 'SOC', 'West Annex': 'WAX' }
export const ASSET_CLASSES = ['Chiller', 'CRAC Unit', 'UPS', 'Pump', 'Generator', 'AHU']

// Section 5 tooltip: canonical Health Score dimension weights.
export const HEALTH_WEIGHTS = { telemetry: 0.40, maintenance: 0.25, incidents: 0.15, age: 0.10, trend: 0.10 }

const BAND_WEIGHTS = [['healthy', 0.50], ['monitor', 0.27], ['warning', 0.14], ['critical', 0.09]]
const BAND_RANGE = { healthy: [85, 99], monitor: [70, 84], warning: [50, 69], critical: [18, 49] }
const PREDICTED_WINDOW = { critical: '7 days', warning: '30 days', monitor: '90 days', healthy: null }
const BAND_RANK = { critical: 0, warning: 1, monitor: 2, healthy: 3 }

function pickBand() {
  const r = rng.next()
  let acc = 0
  for (const [band, w] of BAND_WEIGHTS) { acc += w; if (r <= acc) return band }
  return 'critical'
}

function sparkline(len, end, amplitude) {
  const pts = []
  let v = end - rng.range(-amplitude, amplitude)
  for (let i = 0; i < len; i++) {
    v = clamp(v + rng.range(-amplitude / 3, amplitude / 3), 0, 200)
    pts.push(round1(v))
  }
  pts[len - 1] = end
  return pts
}

function makeSensor(kind, band) {
  // Fraction of the way from baseline toward (and past) the critical
  // threshold — tuned so 'critical' assets reliably exceed crit and
  // 'warning' assets land right around warn.
  const stress = { healthy: 0.08, monitor: 0.28, warning: 0.55, critical: 0.9 }[band]
  const cfg = {
    temperature: { base: 68, unit: '°F', warn: 120, crit: 140 },
    humidity: { base: 38, unit: '%', warn: 55, crit: 65 },
    power: { base: 55, unit: 'A', warn: 220, crit: 260 },
    vibration: { base: 1.0, unit: 'mm/s', warn: 4.5, crit: 7 },
  }[kind]
  const span = cfg.crit - cfg.base
  const noise = rng.range(-span * 0.06, span * 0.06)
  const value = round1(Math.max(0, cfg.base + stress * span * 1.3 + noise))
  let status = 'Normal'
  if (value >= cfg.crit) status = 'Critical'
  else if (value >= cfg.warn) status = 'Warning'
  return {
    kind, value, unit: cfg.unit, warnThreshold: cfg.warn, critThreshold: cfg.crit, status,
    trend: rng.bool(0.5) ? 'up' : 'down',
    history: sparkline(24, value, span * 0.12),
  }
}

function sensorKindsFor(assetClass) {
  const base = ['temperature', 'power']
  if (['CRAC Unit', 'AHU', 'Chiller'].includes(assetClass)) base.push('humidity')
  if (['Pump', 'Generator', 'UPS'].includes(assetClass)) base.push('vibration')
  return base
}

function actionFor(assetClass, band) {
  const actions = {
    Chiller: 'Inspect condenser coils and verify refrigerant charge',
    'CRAC Unit': 'Check dehumidification capacity and filter condition',
    UPS: 'Test battery bank and inspect capacitors',
    Pump: 'Verify bearing lubrication and check for cavitation',
    Generator: 'Run load-bank test and inspect fuel system',
    AHU: 'Replace air filters and inspect belt tension',
  }
  const urgency = band === 'critical' ? 'Immediate' : band === 'warning' ? 'Schedule within 2 weeks' : 'Schedule within 90 days'
  return `${urgency}: ${actions[assetClass] ?? 'Inspect asset'}`
}

export const assets = []
let seq = 1
SITES.forEach(site => {
  const perSite = 18
  for (let i = 0; i < perSite; i++) {
    const assetClass = rng.pick(ASSET_CLASSES)
    const band0 = pickBand()
    const [lo, hi] = BAND_RANGE[band0]
    const target = rng.range(lo, hi)
    const dims = {
      telemetry: round1(clamp(target + rng.range(-12, 12))),
      maintenance: round1(clamp(target + rng.range(-12, 12))),
      incidents: round1(clamp(target + rng.range(-12, 12))),
      age: round1(clamp(target + rng.range(-15, 15))),
      trend: round1(clamp(target + rng.range(-12, 12))),
    }
    const healthScore = Math.round(
      dims.telemetry * HEALTH_WEIGHTS.telemetry + dims.maintenance * HEALTH_WEIGHTS.maintenance +
      dims.incidents * HEALTH_WEIGHTS.incidents + dims.age * HEALTH_WEIGHTS.age + dims.trend * HEALTH_WEIGHTS.trend
    )
    const band = scoreToBand(healthScore)
    const failureProbability = Math.round(clamp(100 - healthScore + rng.range(-8, 8), 1, 99))
    const criticalityTier = rng.pick([1, 1, 2, 2, 3])
    const ageYears = rng.int(1, 18)
    const designLifeYears = ageYears + rng.int(2, 12)
    const lastMaintenanceDate = new Date(NOW - rng.int(1, 200) * DAY_MS).toISOString()
    const overdue = band === 'critical' ? rng.bool(0.55) : band === 'warning' ? rng.bool(0.3) : rng.bool(0.08)
    const connectivity = rng.bool(0.94) ? 'online' : 'offline'
    const id = `AST-${String(seq).padStart(4, '0')}`
    const name = `${assetClass} ${SITE_CODES[site]}-${String(i + 1).padStart(2, '0')}`
    const sensors = sensorKindsFor(assetClass).map(kind => makeSensor(kind, band))
    const healthHistory = sparkline(90, healthScore, 10)

    assets.push({
      id, name, site, assetClass, healthScore, band, bandRank: BAND_RANK[band], dims, failureProbability,
      predictedWindow: PREDICTED_WINDOW[band], criticalityTier, ageYears, designLifeYears,
      lastMaintenanceDate, overdue, connectivity, sensors, healthHistory,
      recommendedAction: actionFor(assetClass, band),
      estimatedFailureCost: Math.round(rng.range(8000, 120000)),
    })
    seq++
  }
})

// ── Alerts ───────────────────────────────────────────────────────────────
const SEV_BY_BAND = { critical: 'critical', warning: 'warning', monitor: 'info' }
const worstDim = (dims) => Object.entries(dims).sort((a, b) => a[1] - b[1])[0][0]
const DIM_LABEL = { telemetry: 'live telemetry', maintenance: 'maintenance compliance', incidents: 'incident history', age: 'asset age', trend: 'health trend' }

export const alerts = assets
  .filter(a => a.band !== 'healthy')
  .slice(0, 22)
  .map((a, i) => {
    const sev = SEV_BY_BAND[a.band]
    const status = rng.bool(0.55) ? 'new' : rng.bool(0.7) ? 'acknowledged' : 'resolved'
    return {
      id: `ALT-${1000 + i}`,
      assetId: a.id,
      assetName: a.name,
      site: a.site,
      sev,
      msg: `${a.name}: ${DIM_LABEL[worstDim(a.dims)]} degraded — Health Score ${a.healthScore}`,
      time: new Date(NOW - rng.int(1, 180) * 60000).toISOString(),
      status,
    }
  })
  .sort((a, b) => new Date(b.time) - new Date(a.time))

// ── Recommendations (Predictive Insights + Actions queue) ───────────────
export const recommendations = assets
  .filter(a => a.band === 'critical' || a.band === 'warning' || (a.band === 'monitor' && rng.bool(0.3)))
  .sort((a, b) => b.failureProbability - a.failureProbability)
  .map((a, i) => ({
    id: `REC-${2000 + i}`,
    assetId: a.id,
    assetName: a.name,
    site: a.site,
    band: a.band,
    healthScore: a.healthScore,
    failureProbability: a.failureProbability,
    predictedWindow: a.predictedWindow,
    action: a.recommendedAction,
    estimatedFailureCost: a.estimatedFailureCost,
    status: 'pending',
  }))

// ── Historical accepted recommendations (drives the Savings KPI) ────────
export const historicalAcceptedSavings = Array.from({ length: 11 }, (_, i) => ({
  id: `HIST-${i}`,
  assetName: rng.pick(assets).name,
  amount: Math.round(rng.range(6000, 85000)),
  acceptedDate: new Date(NOW - rng.int(1, 85) * DAY_MS).toISOString(),
}))

// ── Work orders (Maintenance Backlog) ────────────────────────────────────
export const workOrders = Array.from({ length: 46 }, (_, i) => {
  const asset = rng.pick(assets)
  const status = rng.bool(0.62) ? 'open' : 'closed'
  const dueDate = new Date(NOW + rng.int(-20, 45) * DAY_MS).toISOString()
  return {
    id: `WO-${3000 + i}`,
    assetId: asset.id,
    assetName: asset.name,
    site: asset.site,
    status,
    dueDate,
    overdue: status === 'open' && new Date(dueDate).getTime() < NOW,
    description: `${rng.pick(['PM inspection', 'Filter replacement', 'Belt tension check', 'Battery test', 'Lubrication service', 'Coil cleaning'])} — ${asset.name}`,
  }
})

// ── KPI aggregates (Section 4) ───────────────────────────────────────────
export function computeKpis() {
  const weightSum = assets.reduce((s, a) => s + a.criticalityTier, 0)
  const scoreSum = assets.reduce((s, a) => s + a.healthScore * a.criticalityTier, 0)
  const HealthHealthScore = Math.round(scoreSum / weightSum)

  const atRisk = assets.filter(a => a.band === 'critical' || a.band === 'warning')
  const criticalCount = atRisk.filter(a => a.band === 'critical').length
  const warningCount = atRisk.filter(a => a.band === 'warning').length

  const savings = historicalAcceptedSavings.reduce((s, h) => s + h.amount, 0)

  const openOrders = workOrders.filter(w => w.status === 'open')
  const overdueOrders = openOrders.filter(w => w.overdue)

  return {
    HealthHealthScore,
    atRiskCount: atRisk.length,
    criticalCount,
    warningCount,
    savings,
    backlogCount: openOrders.length,
    overdueCount: overdueOrders.length,
  }
}

// ── Chart series ─────────────────────────────────────────────────────────
export function healthTrendSeries(days = 90) {
  const kpis = computeKpis()
  const Health = sparkline(days, kpis.HealthHealthScore, 6)
  const perSite = {}
  SITES.forEach(site => {
    const siteAssets = assets.filter(a => a.site === site)
    const avg = Math.round(siteAssets.reduce((s, a) => s + a.healthScore, 0) / siteAssets.length)
    perSite[site] = sparkline(days, avg, 7)
  })
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(NOW - (days - 1 - i) * DAY_MS)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
  return labels.map((t, i) => {
    const row = { t, Health: Health[i] }
    SITES.forEach(site => { row[site] = perSite[site][i] })
    return row
  })
}

export function riskDistributionBySite() {
  return SITES.map(site => {
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

export function predictedFailuresTimeline() {
  const critical = assets.filter(a => a.band === 'critical').length
  const warning = assets.filter(a => a.band === 'warning').length
  const monitor = assets.filter(a => a.band === 'monitor').length
  return [
    { window: '30 days', count: critical, color: '#FF6B6B' },
    { window: '60 days', count: critical + warning, color: '#F5A623' },
    { window: '90 days', count: critical + warning + monitor, color: '#06D6FF' },
  ]
}

export function getAssetById(id) {
  return assets.find(a => a.id === id)
}

export function maintenanceHistoryFor(assetId) {
  return workOrders.filter(w => w.assetId === assetId).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
}
*/
