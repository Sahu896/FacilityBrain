import { useCallback, useEffect, useState } from 'react'

// Builds a short spoken summary of the ranked recommendations and reads it
// aloud via the browser's built-in Web Speech API — no new dependency.
export function overviewTextFor(items) {
  if (!items || items.length === 0) {
    return 'No predictive insights are currently available. All monitored assets are within healthy operating ranges.'
  }
  const intro = `Predictive insights overview. ${items.length} asset${items.length === 1 ? '' : 's'} ranked by failure risk.`
  const lines = items.map((rec, i) => {
    const windowPhrase = rec.predictedWindow ? `, predicted within ${rec.predictedWindow}` : ''
    return `Number ${i + 1}: ${rec.assetName} at ${rec.site}. Health Score ${rec.healthScore}, ${rec.failureProbability} percent failure probability${windowPhrase}.`
  })
  return [intro, ...lines].join(' ')
}

export function useSpeakOverview() {
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel() }, [supported])

  const speak = useCallback((text) => {
    if (!supported) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }, [speaking, supported])

  return { speaking, speak, supported }
}
