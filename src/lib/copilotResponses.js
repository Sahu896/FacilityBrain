// RETIRED — this pattern-matching stand-in for an AI chat backend is superseded by a real
// call to POST /api/chat on the FacilityBrain API (see shared/handlers/useCopilotChat.js).
// Kept here, commented out, for reference. SUGGESTIONS below are just static prompt
// strings shown as quick-start chips — not fabricated data — so that part stays live.

export const SUGGESTIONS = ['Health Health Score', 'Which assets are at risk?', 'Failure probability by asset', 'Maintenance compliance', 'Why is MTTF exponential?']

/*
import { assets, recommendations, computeKpis, riskDistributionBySite } from '../data/generate'
import { formatCurrency } from './formatters'
import { riskBandLabel } from './riskBand'

function findAsset(q) {
  return assets.find(a => q.includes(a.name.toLowerCase()) || q.includes(a.id.toLowerCase()))
}

export function getCopilotResponse(input) {
  const q = input.toLowerCase()

  const asset = findAsset(q)
  if (asset) {
    return `**${asset.name}** (${asset.site}) — Health Score **${asset.healthScore}** (${riskBandLabel(asset.band)}). Failure probability ${asset.failureProbability}%${asset.predictedWindow ? `, predicted within ${asset.predictedWindow}` : ''}. Recommended action: ${asset.recommendedAction}.`
  }

  if (q.match(/health|score|Health|overall/)) {
    const k = computeKpis()
    return `Health Health Score is **${k.HealthHealthScore}**, weighted by asset criticality. ${k.atRiskCount} assets are currently at risk (${k.criticalCount} Critical, ${k.warningCount} Warning).`
  }

  if (q.match(/risk|critical|warning|worst/)) {
    const top = [...recommendations].slice(0, 3).map(r => `${r.assetName} (${r.failureProbability}%)`).join(', ')
    const k = computeKpis()
    return `**${k.atRiskCount} assets** are at risk across the Health. Highest failure probability: ${top}. Full ranked list is on the Predictive Insights page.`
  }

  if (q.match(/saving|cost|roi|downtime avoided|money/)) {
    const k = computeKpis()
    return `**${formatCurrency(k.savings)}** in downtime avoided this quarter from accepted AI recommendations, based on historical failure-cost modeling. See the Executive View for the full cost breakdown.`
  }

  if (q.match(/backlog|work order|maintenance/)) {
    const k = computeKpis()
    return `There are **${k.backlogCount}** open maintenance work orders, of which **${k.overdueCount}** are overdue. Check the Actions page to triage them.`
  }

  if (q.match(/site|location|distribution/)) {
    const dist = riskDistributionBySite()
    return dist.map(d => `**${d.site}**: ${d.critical} Critical, ${d.warning} Warning, ${d.monitor} Monitor, ${d.healthy} Healthy`).join('\n')
  }

  return "I can help with Health Score, at-risk assets, cost savings, maintenance backlog, or a specific asset by name (e.g. \"Show me Chiller NDC-01\"). What would you like to know?"
}
*/
