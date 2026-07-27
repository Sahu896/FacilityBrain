import { useCallback, useEffect, useRef, useState } from 'react'
import { postChat } from '../../lib/api'

export function useCopilotChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    { id: 0, role: 'ai', text: "Hi, I'm the **FacilityBrain AI Copilot**. Ask me about portfolio health, asset risk, or the deviation/health-score methodology — I'm grounded in the project's own PRDs.", ts: new Date() },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 250) }, [open])

  // Real call to POST /api/chat (RAG-grounded LLM Q&A) — replaces the old local
  // pattern-matcher. Can take a while on a cold local Ollama model; the `typing`
  // indicator stays up for the real duration of the request, not a fake delay.
  const send = useCallback(async (text) => {
    if (!text.trim()) return
    const question = text.trim()
    setMsgs(m => [...m, { id: Date.now(), role: 'user', text: question, ts: new Date() }])
    setInput('')
    setTyping(true)
    try {
      const res = await postChat(question)
      setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', text: res.answer, ts: new Date() }])
    } catch (err) {
      setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', text: `Couldn't reach the AI backend — ${err.message}`, ts: new Date() }])
    } finally {
      setTyping(false)
    }
  }, [])

  return { open, setOpen, msgs, input, setInput, typing, bottomRef, inputRef, send }
}
