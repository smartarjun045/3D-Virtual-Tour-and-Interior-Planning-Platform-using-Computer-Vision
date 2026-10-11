import { useState } from 'react'
import BlueprintEditor from './BlueprintEditor'
import type { Design, Property } from './types'

export default function BlueprintStudioEditor({
  property,
  designs,
  onSave,
  initialAdvisorOpen = false
}: {
  property: Property
  designs: Design[]
  onSave: (design: Design) => void
  initialAdvisorOpen?: boolean
}) {
  const [name, setName] = useState(designs[0]?.name || 'My new design')
  const save = () => onSave({
    id: `design-${Date.now()}`,
    propertyId: property.id,
    name: name.trim() || 'Untitled design',
    wallColor: designs[0]?.wallColor || '#f5eee4',
    floorColor: designs[0]?.floorColor || '#b9855d',
    furniture: designs[0]?.furniture || [],
    createdAt: new Date().toISOString().slice(0, 10),
  })

  return (
    <section className="editor-page blueprint-only-editor">
      <div className="editor-top">
        <div>
          <p className="eyebrow">3D INTERIOR ADVISOR & STUDIO · {property.title.toUpperCase()}</p>
          <h2>Make the layout yours.</h2>
        </div>
        <div>
          <input className="design-name" value={name} onChange={event => setName(event.target.value)} aria-label="Design name" />
          <button className="button" onClick={save}>Save design <span>→</span></button>
        </div>
      </div>
      <div className="blueprint-only-canvas">
        <BlueprintEditor
          room="entire"
          plan={property.blueprintPlan}
          rawBlueprint={property.rawBlueprint}
          initialAdvisorOpen={initialAdvisorOpen}
          onSave={save}
        />
      </div>
    </section>
  )
}
