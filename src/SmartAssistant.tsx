import { useState } from 'react'
import { formatMoney } from './data'
import type { Property } from './types'

interface Message { sender: 'assistant' | 'user'; text: string }

function replyFor(question: string, property: Property) {
  const q = question.toLowerCase()
  if (q.includes('price') || q.includes('cost') || q.includes('emi')) return `${property.title} starts at ${formatMoney(property.price)}. I can open the live EMI planner with the loan amount pre-filled.`
  if (q.includes('near') || q.includes('metro') || q.includes('school') || q.includes('location')) return `${property.locality} has a metro connection about 1.2 km away, schools within 0.8 km and a park within 0.3 km.`
  if (q.includes('tour') || q.includes('room') || q.includes('layout')) return 'The 3D tour includes the living room, kitchen, dining area and bedrooms. You can edit the supplied home plan in the Blueprint3D studio.'
  if (q.includes('recommend') || q.includes('similar')) return `Based on this ${property.beds}-bedroom ${property.type.toLowerCase()}, I would compare it with Verde Villas for more space and The Courtyard for a lower entry price.`
  return `I can help with ${property.title}'s price, EMI, neighbourhood, virtual tour, interior options or similar properties.`
}

export default function SmartAssistant({ property, onOpenCalculator }: { property: Property; onOpenCalculator: () => void; onOpenTwin?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ sender: 'assistant', text: `Hi, I’m Atlas. Ask anything about ${property.title}, or use a quick question below.` }])
  const [draft, setDraft] = useState('')
  const ask = (message: string) => {
    const clean = message.trim()
    if (!clean) return
    setMessages(current => [...current, { sender: 'user', text: clean }, { sender: 'assistant', text: replyFor(clean, property) }])
    setDraft('')
  }
  return <section className="assistant-panel"><div className="assistant-top"><span>✦</span><div><p className="eyebrow">PROPERTY ADVISOR</p><h3>Ask Atlas</h3></div><i>Online</i></div><div className="message-list">{messages.slice(-4).map((message, index) => <p key={index} className={message.sender}>{message.text}</p>)}</div><div className="quick-asks"><button onClick={() => ask('What is the EMI?')}>EMI estimate</button><button onClick={() => ask('What is nearby?')}>What’s nearby?</button></div><form onSubmit={event => { event.preventDefault(); ask(draft) }}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask about this home…" /><button type="submit" aria-label="Send message">↑</button></form><button className="assistant-link" onClick={onOpenCalculator}>Open full EMI planner →</button></section>
}
