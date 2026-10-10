import { useEffect, useRef, useState } from 'react'
import { PEOPLE_INFO } from './talk.js'

// Chat with an AI avatar professor. Talks to the FastAPI backend (backend/main.py);
// in dev, Vite proxies /api to it. On GitHub Pages there's no backend, so it says so.
const API = import.meta.env.VITE_API_URL ?? ''
const MAX_CHARS = 2000

// one chat session per professor per page load, so the backend can keep the conversation going
const sessionId = Math.random().toString(36).slice(2)

// tiny markdown: ``` code blocks, | tables |, `code`, **bold**, *italic*
const Inline = ({ text }) =>
  text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*\n]*\*)/g).map((s, j) =>
    s.startsWith('`') ? (
      <code key={j}>{s.slice(1, -1)}</code>
    ) : s.startsWith('**') ? (
      <b key={j}>{s.slice(2, -2)}</b>
    ) : s.length > 2 && s.startsWith('*') && s.endsWith('*') ? (
      <i key={j}>{s.slice(1, -1)}</i>
    ) : (
      s
    ),
  )

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

function Table({ lines }) {
  const rows = lines.filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l)).map(cells) // drop the |---| divider
  const [head, ...body] = rows
  return (
    <table>
      <thead>
        <tr>{head.map((c, i) => <th key={i}><Inline text={c} /></th>)}</tr>
      </thead>
      <tbody>
        {body.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

// split prose into runs of plain lines and runs of table lines (lines starting with |)
function Prose({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const isTable = line.trim().startsWith('|')
    const last = blocks[blocks.length - 1]
    if (last && last.table === isTable) last.lines.push(line)
    else blocks.push({ table: isTable, lines: [line] })
  }
  return blocks.map((b, i) =>
    b.table && b.lines.length > 1 ? <Table key={i} lines={b.lines} /> : <span key={i}><Inline text={b.lines.join('\n')} /></span>,
  )
}

function Rich({ text }) {
  return text.split(/```(?:\w+)?\n?([\s\S]*?)```/g).map((chunk, i) => (i % 2 ? <pre key={i}>{chunk.trimEnd()}</pre> : <Prose key={i} text={chunk} />))
}

const TOOL_LABELS = {
  search_courses: 'searched courses',
  get_course_details: 'looked up a course',
  find_professor_courses: 'looked up a professor',
  catalog_overview: 'checked the catalog',
}

const history = {} // talk id → messages, kept while the page is open

export default function ChatPanel({ id, onClose }) {
  const info = PEOPLE_INFO[id]
  const [msgs, setMsgs] = useState(() => history[id] ?? [])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef()
  const list = useRef()

  useEffect(() => {
    history[id] = msgs
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [id, msgs])

  useEffect(() => {
    input.current?.focus()
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  async function send(e) {
    e?.preventDefault()
    const message = text.trim()
    if (!message || busy) return
    setText('')
    setMsgs((m) => [...m, { from: 'you', text: message }])
    setBusy(true)
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor: id, message, session_id: sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Server returned ${res.status}`)
      setMsgs((m) => [...m, { from: 'them', text: data.reply, tools: data.tools_used }])
    } catch (err) {
      const offline = err instanceof TypeError || /50[24]|Failed to fetch/.test(String(err.message))
      setMsgs((m) => [
        ...m,
        { from: 'system', text: offline ? "Can't reach the AI backend. Is it running? (The game still works without it.)" : err.message },
      ])
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }

  return (
    <aside className="chat" aria-label={`Chat with ${info.name}`}>
      <header className="chat-head">
        <div>
          <div className="chat-name">{info.name}</div>
          <div className="chat-sub">AI avatar · {info.course} · {info.room}</div>
        </div>
        <button className="chat-x" onClick={onClose} aria-label="Close chat (Esc)">
          ×
        </button>
      </header>

      <div className="chat-list" ref={list}>
        {msgs.length === 0 && <div className="msg system">Say hi! This is an AI avatar, not the real professor.</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            <Rich text={m.text} />
            {m.tools?.length > 0 && <div className="tools">{m.tools.map((t) => TOOL_LABELS[t] ?? t).join(' · ')}</div>}
          </div>
        ))}
        {busy && <div className="msg them typing" aria-label="Thinking">…</div>}
      </div>

      <form className="chat-form" onSubmit={send}>
        <textarea
          ref={input}
          value={text}
          maxLength={MAX_CHARS}
          rows={2}
          placeholder={`Ask ${info.name.split(' ').slice(-1)[0]} anything…`}
          aria-label="Your message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e)
          }}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </aside>
  )
}
