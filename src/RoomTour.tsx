import { useState } from 'react'
import BlueprintEditor from './BlueprintEditor'
import type { Property } from './types'

type RoomKey = 'living' | 'bedroom' | 'kitchen' | 'dining' | 'entire'

const rooms: { key: RoomKey; number: string; label: string; detail: string }[] = [
  { key: 'living', number: '01', label: 'Living room', detail: 'Sofa, coffee table and floor lamp' },
  { key: 'bedroom', number: '02', label: 'Primary bedroom', detail: 'Bed and bedside table' },
  { key: 'kitchen', number: '03', label: 'Kitchen', detail: 'Table and chairs' },
  { key: 'dining', number: '04', label: 'Dining', detail: 'Dining table and chairs' },
  { key: 'entire', number: '05', label: 'Entire home', detail: 'See every room together' },
]

export default function RoomTour({ property, onEditor }: { property: Property; onEditor: () => void }) {
  const [room, setRoom] = useState<RoomKey>('entire')
  const selected = rooms.find(item => item.key === room)!
  return <section className="tour-page room-tour-page">
    <div className="tour-stage room-tour-stage">
      <BlueprintEditor key={`${property.blueprintPlan}-${room}`} room={room} plan={property.blueprintPlan} />
      <div className="room-tour-caption"><span>{selected.label}</span><small>{selected.detail} · Customize with Add Items</small></div>
    </div>
    <aside className="tour-sidebar">
      <button className="back-button" onClick={() => history.back()}>← Listing details</button>
      <p className="eyebrow">VIRTUAL TOUR · {property.title.toUpperCase()}</p>
      <h1>Explore every room.</h1>
      <p className="tour-copy">Choose a room to view it on its own, or open the complete home. Add furniture, resize it, and edit the design in Blueprint3D.</p>
      <div className="room-list">{rooms.map(item => <button key={item.key} className={room === item.key ? 'current' : ''} onClick={() => setRoom(item.key)}><span>{item.number}</span>{item.label}<i>{room === item.key ? '→' : ''}</i></button>)}</div>
      <div className="tour-sidebar-bottom"><button className="outline-button wide" onClick={onEditor}>✦ Open full studio</button></div>
    </aside>
  </section>
}
