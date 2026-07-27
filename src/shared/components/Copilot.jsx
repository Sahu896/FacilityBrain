import { MessageCircle, X, Send } from '../../lib/icons'
import { SUGGESTIONS } from '../../lib/copilotResponses'
import { useCopilotChat } from '../handlers/useCopilotChat'
import '../css/Copilot.css'

function renderMd(text) {
  return text.split('\n').map((line, li) => (
    <div key={li}>
      {line.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') ? <strong key={i} className="copilot-strong">{part.slice(2, -2)}</strong> : part
      )}
    </div>
  ))
}

// Persistent floating AI Copilot — bottom-right on every screen, not a
// routed page, so it's always one click away regardless of where you are.
export default function Copilot() {
  const { open, setOpen, msgs, input, setInput, typing, bottomRef, inputRef, send } = useCopilotChat()

  return (
    <>
      <button
        className={`copilot-fab${open ? ' copilot-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI Copilot' : 'Open AI Copilot'}
      >
        {open ? <X size={20} color="#04141a" /> : <MessageCircle size={22} color="#04141a" />}
      </button>

      <div className={`card copilot-panel${open ? ' copilot-panel--open' : ''}`} role="dialog" aria-label="AI Copilot">
        <div className="copilot-header">
          <div className="copilot-avatar" />
          <span className="copilot-title">AI Copilot</span>
          <span className="animate-blink copilot-live-dot" />
        </div>

        <div className="copilot-messages">
          {msgs.map(m => (
            <div key={m.id} className={`copilot-msg-row copilot-msg-row--${m.role}`}>
              {m.role === 'ai' && <div className="copilot-avatar copilot-avatar--sm" />}
              <div className={`copilot-bubble copilot-bubble--${m.role}`}>
                {renderMd(m.text)}
              </div>
            </div>
          ))}
          {typing && (
            <div className="copilot-msg-row">
              <div className="copilot-avatar copilot-avatar--sm" />
              <div className="copilot-typing">
                {[0, 1, 2].map(i => <div key={i} className="animate-blink copilot-typing-dot" />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {msgs.length <= 1 && (
          <div className="copilot-suggestions">
            {SUGGESTIONS.slice(0, 3).map(s => (
              <button key={s} className="chip copilot-suggestion-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        <div className="copilot-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask about your portfolio…"
            className="copilot-input"
          />
          <button className="btn btn-primary copilot-send-btn" disabled={!input.trim()} onClick={() => send(input)} aria-label="Send">
            <Send size={13} />
          </button>
        </div>
      </div>
    </>
  )
}
