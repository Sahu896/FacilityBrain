// Single source of truth for the four canonical risk bands (Section 5/12).
// No widget may invent a fifth band or a different color mapping.
export const RISK_BANDS = ['healthy', 'monitor', 'warning', 'critical']

const BAND_META = {
  healthy: { label: 'Healthy', hex: '#10E898' },
  monitor: { label: 'Monitor', hex: '#06D6FF' },
  warning: { label: 'Warning', hex: '#F5A623' },
  critical: { label: 'Critical', hex: '#FF6B6B' },
}

export function scoreToBand(score) {
  if (score >= 85) return 'healthy'
  if (score >= 70) return 'monitor'
  if (score >= 50) return 'warning'
  return 'critical'
}

export function riskBandMeta(band) {
  return BAND_META[band] ?? BAND_META.critical
}

export function riskBandColor(band) {
  return riskBandMeta(band).hex
}

export function riskBandLabel(band) {
  return riskBandMeta(band).label
}

// Maps the real FacilityBrain API's risk_category string (Healthy/Medium/High/Critical,
// computed server-side by health_score_engine.py) onto our 4-band enum above. The real
// API's own thresholds (>=80/>=60/>=40) differ slightly from scoreToBand's — always trust
// the API's own category rather than recomputing from final_health_score.
export function apiRiskCategoryToBand(category) {
  const key = String(category ?? '').toLowerCase()
  if (key === 'healthy') return 'healthy'
  if (key === 'medium') return 'monitor'
  if (key === 'high') return 'warning'
  return 'critical'
}
