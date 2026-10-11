import React, { useState, useMemo, useCallback } from 'react'
import ThreeFloorplannerViewer, { FurnitureItemData } from './ThreeFloorplannerViewer'
import type { ThreeDFloorplannerBlueprint } from './geminiService'

const DEFAULT_HOME1: ThreeDFloorplannerBlueprint = {
  plotDimensions: "30' 0\" × 50' 0\"",
  totalAreaSqFt: 1450,
  scale: 1.0,
  walls: [
    { start: [-6, -9], end: [6, -9], thickness: 0.22 },
    { start: [6, -9], end: [6, 9], thickness: 0.22 },
    { start: [6, 9], end: [-6, 9], thickness: 0.22 },
    { start: [-6, 9], end: [-6, -9], thickness: 0.22 },
    { start: [-6, -2], end: [1, -2], thickness: 0.16 },
    { start: [1, -2], end: [1, 4], thickness: 0.16 },
    { start: [1, 4], end: [6, 4], thickness: 0.16 },
    { start: [-6, 4], end: [1, 4], thickness: 0.16 },
    { start: [-1, 4], end: [-1, 9], thickness: 0.16 }
  ],
  rooms: [
    { name: 'Living Hall & Foyer', type: 'living', areaSqFt: 380, polygon: [[-5.8, -8.8], [5.8, -8.8], [5.8, -2.2], [0.8, -2.2], [0.8, -2], [-5.8, -2]] },
    { name: 'Chef Kitchen & Dining', type: 'kitchen', areaSqFt: 260, polygon: [[-5.8, -1.8], [0.8, -1.8], [0.8, 3.8], [-5.8, 3.8]] },
    { name: 'Master Suite Bedroom', type: 'bedroom', areaSqFt: 320, polygon: [[1.2, -1.8], [5.8, -1.8], [5.8, 3.8], [1.2, 3.8]] },
    { name: 'Guest Bedroom', type: 'bedroom', areaSqFt: 240, polygon: [[-0.8, 4.2], [5.8, 4.2], [5.8, 8.8], [-0.8, 8.8]] },
    { name: 'Bath & Powder Room', type: 'bathroom', areaSqFt: 90, polygon: [[-5.8, 4.2], [-1.2, 4.2], [-1.2, 8.8], [-5.8, 8.8]] }
  ],
  doors: [
    { position: [0, -9], width: 1.2, type: 'door' },
    { position: [-2, -2], width: 0.9, type: 'door' },
    { position: [1, 1], width: 0.9, type: 'door' },
    { position: [2, 4], width: 0.9, type: 'door' }
  ],
  windows: [
    { position: [3, -9], width: 1.6, type: 'window' },
    { position: [-3, -9], width: 1.6, type: 'window' },
    { position: [6, 1], width: 1.6, type: 'window' },
    { position: [6, 6], width: 1.4, type: 'window' },
    { position: [-6, 1], width: 1.4, type: 'window' }
  ]
}

const DEFAULT_HOME2: ThreeDFloorplannerBlueprint = {
  plotDimensions: "40' 0\" × 60' 0\"",
  totalAreaSqFt: 2380,
  scale: 1.0,
  walls: [
    { start: [-8, -11], end: [8, -11], thickness: 0.25 },
    { start: [8, -11], end: [8, 11], thickness: 0.25 },
    { start: [8, 11], end: [-8, 11], thickness: 0.25 },
    { start: [-8, 11], end: [-8, -11], thickness: 0.25 },
    { start: [-8, -1], end: [2, -1], thickness: 0.18 },
    { start: [2, -1], end: [2, 5], thickness: 0.18 },
    { start: [2, 5], end: [8, 5], thickness: 0.18 },
    { start: [-8, 5], end: [2, 5], thickness: 0.18 },
    { start: [-2, 5], end: [-2, 11], thickness: 0.18 }
  ],
  rooms: [
    { name: 'Grand Living & Lounge', type: 'living', areaSqFt: 620, polygon: [[-7.8, -10.8], [7.8, -10.8], [7.8, -1.2], [1.8, -1.2], [1.8, -1], [-7.8, -1]] },
    { name: 'Modern Island Kitchen', type: 'kitchen', areaSqFt: 380, polygon: [[-7.8, -0.8], [1.8, -0.8], [1.8, 4.8], [-7.8, 4.8]] },
    { name: 'Primary Suite 1', type: 'bedroom', areaSqFt: 450, polygon: [[2.2, -0.8], [7.8, -0.8], [7.8, 4.8], [2.2, 4.8]] },
    { name: 'Guest Bedroom 2', type: 'bedroom', areaSqFt: 340, polygon: [[-1.8, 5.2], [7.8, 5.2], [7.8, 10.8], [-1.8, 10.8]] },
    { name: 'Spa Bathroom Suite', type: 'bathroom', areaSqFt: 180, polygon: [[-7.8, 5.2], [-2.2, 5.2], [-2.2, 10.8], [-7.8, 10.8]] }
  ],
  doors: [
    { position: [0, -11], width: 1.3, type: 'door' },
    { position: [-2, -1], width: 1.0, type: 'door' },
    { position: [2, 2], width: 0.9, type: 'door' }
  ],
  windows: [
    { position: [4, -11], width: 1.8, type: 'window' },
    { position: [-4, -11], width: 1.8, type: 'window' },
    { position: [8, 2], width: 1.8, type: 'window' }
  ]
}

const DEFAULT_HOME3: ThreeDFloorplannerBlueprint = {
  plotDimensions: "25' 0\" × 50' 0\"",
  totalAreaSqFt: 1280,
  scale: 1.0,
  walls: [
    { start: [-5, -10], end: [5, -10], thickness: 0.22 },
    { start: [5, -10], end: [5, 10], thickness: 0.22 },
    { start: [5, 10], end: [-5, 10], thickness: 0.22 },
    { start: [-5, 10], end: [-5, -10], thickness: 0.22 },
    { start: [-5, -2], end: [1, -2], thickness: 0.16 },
    { start: [1, -2], end: [1, 4], thickness: 0.16 },
    { start: [1, 4], end: [5, 4], thickness: 0.16 }
  ],
  rooms: [
    { name: 'Central Living & Dining', type: 'living', areaSqFt: 350, polygon: [[-4.8, -9.8], [4.8, -9.8], [4.8, -2.2], [0.8, -2.2], [-4.8, -2.2]] },
    { name: 'Kitchen & Breakfast Counter', type: 'kitchen', areaSqFt: 220, polygon: [[-4.8, -1.8], [0.8, -1.8], [0.8, 3.8], [-4.8, 3.8]] },
    { name: 'Bedroom Suite', type: 'bedroom', areaSqFt: 280, polygon: [[1.2, -1.8], [4.8, -1.8], [4.8, 3.8], [1.2, 3.8]] }
  ],
  doors: [
    { position: [0, -10], width: 1.1, type: 'door' },
    { position: [-1.5, -2], width: 0.9, type: 'door' },
    { position: [1, 1], width: 0.9, type: 'door' }
  ],
  windows: [
    { position: [3, -10], width: 1.4, type: 'window' },
    { position: [-3, -10], width: 1.4, type: 'window' }
  ]
}

export interface CatalogItemDef {
  name: string
  category: 'bed' | 'sofa' | 'tv' | 'table' | 'chair' | 'lamp' | 'wardrobe' | 'rug' | 'bath' | 'toilet' | 'shower' | 'desk'
  targetRoom: 'master' | 'guest' | 'living' | 'kitchen' | 'bathroom'
  icon: string
  description: string
  tag: string
  style?: string
  price?: number
}

export const CATALOG_ITEMS: CatalogItemDef[] = [
  // Master Bedroom Items
  { name: 'Full Bed', category: 'bed', targetRoom: 'master', icon: '🛏️', description: 'Upholstered king bed with dual nightstands and reading lamps', tag: 'Master Bed', style: 'Modern', price: 48000 },
  { name: 'Wardrobe', category: 'wardrobe', targetRoom: 'master', icon: '📦', description: 'Two-door tall storage wardrobe with brass handles', tag: 'Master Bed', style: 'Modern', price: 38000 },
  { name: 'Nightstand', category: 'table', targetRoom: 'master', icon: '🗄️', description: 'Compact walnut nightstand with pull-out drawer', tag: 'Master Bed', style: 'Scandinavian', price: 12000 },

  // Guest Bedroom Items
  { name: 'Guest Bed', category: 'bed', targetRoom: 'guest', icon: '🛏️', description: 'Comfortable queen bed with linen headboard for guest suite', tag: 'Guest Bed', style: 'Scandinavian', price: 36000 },
  { name: 'Study Desk', category: 'desk', targetRoom: 'guest', icon: '💻', description: 'Ergonomic study desk with solid oak top for work and reading', tag: 'Guest Bed', style: 'Modern', price: 24000 },
  { name: 'Closet', category: 'wardrobe', targetRoom: 'guest', icon: '🚪', description: 'Minimalist guest closet storage unit with coat rack', tag: 'Guest Bed', style: 'Minimal', price: 22000 },

  // Bathroom Items
  { name: 'Bathtub', category: 'bath', targetRoom: 'bathroom', icon: '🛁', description: 'Deep ergonomic oval soaking tub with chrome freestanding faucet', tag: 'Bathroom', style: 'Luxury', price: 55000 },
  { name: 'Vanity', category: 'table', targetRoom: 'bathroom', icon: '🪞', description: 'Sleek dark vanity with porcelain basin and lighted mirror', tag: 'Bathroom', style: 'Modern', price: 28000 },
  { name: 'Toilet', category: 'toilet', targetRoom: 'bathroom', icon: '🚽', description: 'Compact white porcelain commode with soft-close seat', tag: 'Bathroom', style: 'Minimal', price: 16000 },
  { name: 'Shower', category: 'shower', targetRoom: 'bathroom', icon: '🚿', description: 'Tempered glass walk-in shower with rain showerhead', tag: 'Bathroom', style: 'Modern', price: 32000 },

  // Living Room Items
  { name: 'L-Sofa', category: 'sofa', targetRoom: 'living', icon: '🛋️', description: 'L-shape performance fabric sofa with deep seat cushions', tag: 'Living', style: 'Japandi', price: 62000 },
  { name: 'Sofa', category: 'sofa', targetRoom: 'living', icon: '🛋️', description: 'Three-seater tailored sofa with soft textured weave', tag: 'Living', style: 'Modern', price: 46000 },
  { name: 'Smart TV', category: 'tv', targetRoom: 'living', icon: '📺', description: 'Low-profile walnut credenza with 65-inch OLED TV display', tag: 'Living', style: 'Modern', price: 54000 },
  { name: 'Table', category: 'table', targetRoom: 'living', icon: '🪵', description: 'Calacatta marble top coffee table with gold metal legs', tag: 'Living', style: 'Luxury', price: 32000 },
  { name: 'Armchair', category: 'chair', targetRoom: 'living', icon: '🪑', description: 'Comfortable accent armchair with curved backrest', tag: 'Living', style: 'Scandinavian', price: 18500 },
  { name: 'Lounge', category: 'chair', targetRoom: 'living', icon: '🪑', description: 'Plush crimson reading armchair with brass legs', tag: 'Living', style: 'Luxury', price: 24000 },
  { name: 'Lamp', category: 'lamp', targetRoom: 'living', icon: '💡', description: 'Warm glowing ambient floor lamp with brass tripod pole', tag: 'Living', style: 'Modern', price: 11000 },
  { name: 'Rug', category: 'rug', targetRoom: 'living', icon: '🟫', description: 'Plush hand-knotted acoustic geometric area rug', tag: 'Living', style: 'Scandinavian', price: 19000 },

  // Kitchen & Dining Items
  { name: 'Dining', category: 'table', targetRoom: 'kitchen', icon: '🍽️', description: 'Solid oak live-edge dining table with 4 ergonomic chairs', tag: 'Kitchen/Dining', style: 'Scandinavian', price: 44000 },
  { name: 'Bistro', category: 'table', targetRoom: 'kitchen', icon: '☕', description: 'Circular cafe table with brass rim and 2 chairs', tag: 'Kitchen/Dining', style: 'Modern', price: 21000 }
]

function getTargetRoomCoordinates(
  blueprint: ThreeDFloorplannerBlueprint,
  targetType: string,
  category: string,
  indexOffset: number
): { pos: [number, number, number]; rot: number; roomName: string } {
  const targetLower = targetType.toLowerCase()

  let match = blueprint.rooms.find(r => {
    const rName = (r.name || '').toLowerCase()
    const rType = (r.type || '').toLowerCase()
    if (targetLower.includes('guest')) return rName.includes('guest') || rType.includes('guest')
    if (targetLower.includes('bath') || targetLower.includes('powder')) return rName.includes('bath') || rType.includes('bath') || rName.includes('powder')
    if (targetLower.includes('kitchen') || targetLower.includes('dining')) return rName.includes('kitchen') || rName.includes('dining') || rType.includes('kitchen') || rType.includes('dining')
    if (targetLower.includes('master')) return rName.includes('master') || rName.includes('suite')
    if (targetLower.includes('bed')) return rType.includes('bed') || rName.includes('bed')
    if (targetLower.includes('living')) return rType.includes('living') || rName.includes('living') || rName.includes('hall') || rName.includes('lounge')
    return rType.includes(targetLower) || rName.includes(targetLower)
  })

  if (!match) {
    match = blueprint.rooms.find(r => (r.type || '').toLowerCase().includes(targetType) || (r.name || '').toLowerCase().includes(targetType)) || blueprint.rooms[0]
  }

  if (!match || !match.polygon || match.polygon.length < 3) {
    return { pos: [0, 0.05, 0], rot: 0, roomName: 'Living Room' }
  }

  const xs = match.polygon.map(p => p[0])
  const ys = match.polygon.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const width = Math.max(maxX - minX, 1)
  const depth = Math.max(maxY - minY, 1)

  let posX = centerX
  let posZ = centerY
  let rot = 0

  if (category === 'bed') {
    posX = centerX
    posZ = minY + depth * 0.45
    rot = 0
  } else if (category === 'sofa') {
    posX = centerX
    posZ = centerY + depth * 0.28
    rot = 0
  } else if (category === 'tv') {
    posX = centerX
    posZ = minY + depth * 0.2
    rot = 0
  } else if (category === 'bath') {
    posX = minX + 0.8
    posZ = centerY
    rot = Math.PI / 2
  } else if (category === 'toilet') {
    posX = maxX - 0.6
    posZ = minY + 0.6
    rot = 0
  } else if (category === 'shower') {
    posX = minX + 0.7
    posZ = maxY - 0.7
    rot = 0
  } else if (category === 'desk') {
    posX = centerX
    posZ = minY + 0.8
    rot = 0
  } else if (category === 'table' && targetType.includes('living')) {
    posX = centerX
    posZ = centerY
    rot = 0
  } else if (category === 'table') {
    posX = centerX
    posZ = centerY
    rot = 0
  } else if (category === 'lamp') {
    posX = minX + 0.8
    posZ = maxY - 0.8
    rot = 0
  } else if (category === 'wardrobe') {
    posX = minX + 0.6
    posZ = centerY
    rot = Math.PI / 2
  } else if (category === 'rug') {
    posX = centerX
    posZ = centerY + 0.15
    rot = 0
  } else if (category === 'chair') {
    posX = maxX - 0.9
    posZ = centerY + 0.3
    rot = -Math.PI / 4
  }

  if (indexOffset > 0) {
    posX += (indexOffset % 2 === 0 ? 0.75 : -0.75) * Math.min(indexOffset, 2)
  }

  return { pos: [posX, 0.05, posZ], rot, roomName: match.name }
}

interface BlueprintEditorProps {
  room?: string
  plan?: string
  rawBlueprint?: ThreeDFloorplannerBlueprint
  onSave?: () => void
  initialAdvisorOpen?: boolean
}

export default function BlueprintEditor({
  room = 'entire',
  plan,
  rawBlueprint,
  onSave,
  initialAdvisorOpen = false
}: BlueprintEditorProps) {
  const [activeTab, setActiveTab] = useState<'3d' | '2d'>('3d')
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false)
  const [advisorDrawerOpen, setAdvisorDrawerOpen] = useState(initialAdvisorOpen || false)
  const [advisorStyle, setAdvisorStyle] = useState<'Scandinavian' | 'Modern' | 'Japandi' | 'Luxury'>('Scandinavian')
  const [advisorDrawerMinimized, setAdvisorDrawerMinimized] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'living' | 'master' | 'guest' | 'kitchen' | 'bathroom'>('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const parsedBlueprint: ThreeDFloorplannerBlueprint = useMemo(() => {
    if (rawBlueprint) return rawBlueprint
    if (plan && typeof plan === 'string') {
      const trimmed = plan.trim()
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (parsed && Array.isArray(parsed.walls) && Array.isArray(parsed.rooms)) {
            return parsed
          }
        } catch {}
      }
      if (plan.includes('home2') || plan.includes('verde')) return DEFAULT_HOME2
      if (plan.includes('home3') || plan.includes('courtyard')) return DEFAULT_HOME3
    }
    return DEFAULT_HOME1
  }, [plan, rawBlueprint])

  const [furnitureList, setFurnitureList] = useState<FurnitureItemData[]>(() => {
    const list: FurnitureItemData[] = []

    const sofaCoord = getTargetRoomCoordinates(parsedBlueprint, 'living', 'sofa', 0)
    list.push({ id: 'furn-sofa-1', name: 'Sectional Lounge Sofa - Olive', category: 'sofa', roomType: sofaCoord.roomName, position: sofaCoord.pos, rotation: sofaCoord.rot })

    const tvCoord = getTargetRoomCoordinates(parsedBlueprint, 'living', 'tv', 0)
    list.push({ id: 'furn-tv-1', name: 'Media Console & Smart TV', category: 'tv', roomType: tvCoord.roomName, position: tvCoord.pos, rotation: tvCoord.rot })

    const coffeeCoord = getTargetRoomCoordinates(parsedBlueprint, 'living', 'table', 0)
    list.push({ id: 'furn-coffee-1', name: 'Coffee Table - Marble & Brass', category: 'table', roomType: coffeeCoord.roomName, position: coffeeCoord.pos, rotation: coffeeCoord.rot })

    const rugCoord = getTargetRoomCoordinates(parsedBlueprint, 'living', 'rug', 0)
    list.push({ id: 'furn-rug-1', name: 'Designer Wool Area Rug', category: 'rug', roomType: rugCoord.roomName, position: rugCoord.pos, rotation: rugCoord.rot })

    const lampCoord = getTargetRoomCoordinates(parsedBlueprint, 'living', 'lamp', 0)
    list.push({ id: 'furn-lamp-1', name: 'Tripod Arc Floor Lamp', category: 'lamp', roomType: lampCoord.roomName, position: lampCoord.pos, rotation: lampCoord.rot })

    const bedCoord = getTargetRoomCoordinates(parsedBlueprint, 'master', 'bed', 0)
    list.push({ id: 'furn-bed-1', name: 'Full Bed with Headboard', category: 'bed', roomType: bedCoord.roomName, position: bedCoord.pos, rotation: bedCoord.rot })

    const wardCoord = getTargetRoomCoordinates(parsedBlueprint, 'master', 'wardrobe', 0)
    list.push({ id: 'furn-ward-1', name: 'Wardrobe & Dresser - Dark Wood', category: 'wardrobe', roomType: wardCoord.roomName, position: wardCoord.pos, rotation: wardCoord.rot })

    const guestBedCoord = getTargetRoomCoordinates(parsedBlueprint, 'guest', 'bed', 0)
    list.push({ id: 'furn-guest-bed-1', name: 'Guest Queen Bed', category: 'bed', roomType: guestBedCoord.roomName, position: guestBedCoord.pos, rotation: guestBedCoord.rot })

    const bathCoord = getTargetRoomCoordinates(parsedBlueprint, 'bathroom', 'bath', 0)
    list.push({ id: 'furn-bath-1', name: 'Luxury Freestanding Bathtub', category: 'bath', roomType: bathCoord.roomName, position: bathCoord.pos, rotation: bathCoord.rot })

    const toiletCoord = getTargetRoomCoordinates(parsedBlueprint, 'bathroom', 'toilet', 0)
    list.push({ id: 'furn-toilet-1', name: 'Ceramic Dual-Flush Toilet', category: 'toilet', roomType: toiletCoord.roomName, position: toiletCoord.pos, rotation: toiletCoord.rot })

    const diningCoord = getTargetRoomCoordinates(parsedBlueprint, 'kitchen', 'table', 0)
    list.push({ id: 'furn-dining-1', name: 'Dining Table & 4 Chairs', category: 'table', roomType: diningCoord.roomName, position: diningCoord.pos, rotation: diningCoord.rot })

    return list
  })

  const handleAddCatalogItem = useCallback((itemDef: CatalogItemDef) => {
    const existingCount = furnitureList.filter(f => f.category === itemDef.category).length
    const coords = getTargetRoomCoordinates(parsedBlueprint, itemDef.targetRoom, itemDef.category, existingCount)

    const newItem: FurnitureItemData = {
      id: `furn-${itemDef.category}-${Date.now()}`,
      name: itemDef.name,
      category: itemDef.category,
      roomType: coords.roomName,
      position: coords.pos,
      rotation: coords.rot
    }

    setFurnitureList(prev => [...prev, newItem])
    setActiveTab('3d')

    setToastMessage(`✨ Placed "${itemDef.name}" into ${coords.roomName}!`)
    setTimeout(() => setToastMessage(null), 3000)
  }, [furnitureList, parsedBlueprint])

  const handleApplyAiTheme = (themeName: 'Scandinavian' | 'Modern' | 'Japandi' | 'Luxury') => {
    setAdvisorStyle(themeName)
    const list: FurnitureItemData[] = []

    if (themeName === 'Scandinavian') {
      const sofa = getTargetRoomCoordinates(parsedBlueprint, 'living', 'sofa', 0)
      list.push({ id: `sofa-${Date.now()}`, name: 'Modern Sofa - Slate Grey', category: 'sofa', roomType: sofa.roomName, position: sofa.pos, rotation: sofa.rot })
      const chair = getTargetRoomCoordinates(parsedBlueprint, 'living', 'chair', 0)
      list.push({ id: `chair-${Date.now()}`, name: 'Nordic Oak Lounge Chair', category: 'chair', roomType: chair.roomName, position: chair.pos, rotation: chair.rot })
      const rug = getTargetRoomCoordinates(parsedBlueprint, 'living', 'rug', 0)
      list.push({ id: `rug-${Date.now()}`, name: 'Designer Wool Area Rug', category: 'rug', roomType: rug.roomName, position: rug.pos, rotation: rug.rot })
      const dining = getTargetRoomCoordinates(parsedBlueprint, 'kitchen', 'table', 0)
      list.push({ id: `dining-${Date.now()}`, name: 'Dining Table & 4 Chairs', category: 'table', roomType: dining.roomName, position: dining.pos, rotation: dining.rot })
      const bed = getTargetRoomCoordinates(parsedBlueprint, 'master', 'bed', 0)
      list.push({ id: `bed-${Date.now()}`, name: 'Full Bed with Headboard', category: 'bed', roomType: bed.roomName, position: bed.pos, rotation: bed.rot })
    } else if (themeName === 'Japandi') {
      const sofa = getTargetRoomCoordinates(parsedBlueprint, 'living', 'sofa', 0)
      list.push({ id: `sofa-${Date.now()}`, name: 'Sectional Lounge Sofa - Olive', category: 'sofa', roomType: sofa.roomName, position: sofa.pos, rotation: sofa.rot })
      const table = getTargetRoomCoordinates(parsedBlueprint, 'living', 'table', 0)
      list.push({ id: `table-${Date.now()}`, name: 'Coffee Table - Solid Wood', category: 'table', roomType: table.roomName, position: table.pos, rotation: table.rot })
      const desk = getTargetRoomCoordinates(parsedBlueprint, 'guest', 'desk', 0)
      list.push({ id: `desk-${Date.now()}`, name: 'Compact Study Desk & Chair', category: 'desk', roomType: desk.roomName, position: desk.pos, rotation: desk.rot })
      const gbed = getTargetRoomCoordinates(parsedBlueprint, 'guest', 'bed', 0)
      list.push({ id: `gbed-${Date.now()}`, name: 'Guest Queen Bed', category: 'bed', roomType: gbed.roomName, position: gbed.pos, rotation: gbed.rot })
    } else if (themeName === 'Luxury') {
      const sofa = getTargetRoomCoordinates(parsedBlueprint, 'living', 'sofa', 0)
      list.push({ id: `sofa-${Date.now()}`, name: 'Modern Sofa - Slate Grey', category: 'sofa', roomType: sofa.roomName, position: sofa.pos, rotation: sofa.rot })
      const table = getTargetRoomCoordinates(parsedBlueprint, 'living', 'table', 0)
      list.push({ id: `table-${Date.now()}`, name: 'Coffee Table - Marble & Brass', category: 'table', roomType: table.roomName, position: table.pos, rotation: table.rot })
      const chair = getTargetRoomCoordinates(parsedBlueprint, 'living', 'chair', 0)
      list.push({ id: `chair-${Date.now()}`, name: 'Velvet Red Lounge Chair', category: 'chair', roomType: chair.roomName, position: chair.pos, rotation: chair.rot })
      const tub = getTargetRoomCoordinates(parsedBlueprint, 'bathroom', 'bath', 0)
      list.push({ id: `tub-${Date.now()}`, name: 'Luxury Freestanding Bathtub', category: 'bath', roomType: tub.roomName, position: tub.pos, rotation: tub.rot })
    } else {
      const sofa = getTargetRoomCoordinates(parsedBlueprint, 'living', 'sofa', 0)
      list.push({ id: `sofa-${Date.now()}`, name: 'Sectional Lounge Sofa - Olive', category: 'sofa', roomType: sofa.roomName, position: sofa.pos, rotation: sofa.rot })
      const tv = getTargetRoomCoordinates(parsedBlueprint, 'living', 'tv', 0)
      list.push({ id: `tv-${Date.now()}`, name: 'Media Console & Smart TV', category: 'tv', roomType: tv.roomName, position: tv.pos, rotation: tv.rot })
      const mbed = getTargetRoomCoordinates(parsedBlueprint, 'master', 'bed', 0)
      list.push({ id: `mbed-${Date.now()}`, name: 'Full Bed with Headboard', category: 'bed', roomType: mbed.roomName, position: mbed.pos, rotation: mbed.rot })
    }

    setFurnitureList(list)
    setToastMessage(`✨ Applied "${themeName}" Interior Styling across 3D home!`)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleRemoveFurniture = (id: string) => {
    setFurnitureList(prev => prev.filter(item => item.id !== id))
  }

  const handleMoveFurniture = (id: string, newPos: [number, number, number], newRot?: number) => {
    setFurnitureList(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          position: newPos,
          rotation: typeof newRot === 'number' ? newRot : item.rotation
        }
      }
      return item
    }))
  }

  const filteredCatalog = useMemo(() => {
    return CATALOG_ITEMS.filter(item => {
      const matchCategory = catalogCategory === 'all' || item.targetRoom === catalogCategory
      const matchSearch = searchFilter === '' ||
        item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.tag.toLowerCase().includes(searchFilter.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [catalogCategory, searchFilter])

  return (
    <div className="blueprint-example blueprint-enhanced-studio" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '700px',
      background: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #334155',
      position: 'relative'
    }}>
      {/* Top Studio Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '4px 10px',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.5px'
          }}>
            3D CAD STUDIO
          </span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Plot: <strong style={{ color: '#f8fafc' }}>{parsedBlueprint.plotDimensions || "30' × 50'"}</strong> · Area: <strong style={{ color: '#f8fafc' }}>{parsedBlueprint.totalAreaSqFt || 1450} sq ft</strong>
          </span>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'inline-flex', background: '#0f172a', borderRadius: '8px', padding: '3px', gap: '4px' }}>
          <button
            onClick={() => { setActiveTab('3d'); setCatalogDrawerOpen(false); setAdvisorDrawerOpen(false); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === '3d' && !catalogDrawerOpen && !advisorDrawerOpen ? 700 : 500,
              background: activeTab === '3d' && !catalogDrawerOpen && !advisorDrawerOpen ? '#3b82f6' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ✦ 3D Interactive Render
          </button>
          <button
            onClick={() => { setCatalogDrawerOpen(prev => !prev); setAdvisorDrawerOpen(false); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: catalogDrawerOpen ? 700 : 500,
              background: catalogDrawerOpen ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#1e293b',
              color: '#fff',
              border: catalogDrawerOpen ? '1px solid #60a5fa' : '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🛋️ Add Items Catalog ({CATALOG_ITEMS.length})
          </button>
          <button
            onClick={() => { setAdvisorDrawerOpen(prev => !prev); setCatalogDrawerOpen(false); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: advisorDrawerOpen ? 700 : 500,
              background: advisorDrawerOpen ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#1e293b',
              color: '#fff',
              border: advisorDrawerOpen ? '1px solid #c084fc' : '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: advisorDrawerOpen ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none'
            }}
          >
            ✦ Interior Design Advisor
          </button>
          <button
            onClick={() => { setActiveTab('2d'); setCatalogDrawerOpen(false); setAdvisorDrawerOpen(false); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === '2d' ? 700 : 500,
              background: activeTab === '2d' ? '#3b82f6' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ⊞ 2D Schematic
          </button>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && (
            <button
              onClick={onSave}
              style={{
                padding: '6px 16px',
                background: '#10b981',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ✓ Save Design
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div style={{ display: 'flex', flex: 1, minHeight: '600px', position: 'relative', overflow: 'hidden' }}>
        {/* Left Toolbar */}
        <aside style={{
          width: sidebarCollapsed ? '52px' : '280px',
          transition: 'width 0.2s ease',
          background: '#1e293b',
          borderRight: '1px solid #334155',
          padding: sidebarCollapsed ? '12px 6px' : '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: sidebarCollapsed ? 'hidden' : 'auto',
          maxHeight: '650px',
          zIndex: 5,
          position: 'relative'
        }}>
          {/* Sidebar Collapse/Expand Button */}
          <div style={{ display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'space-between', alignItems: 'center' }}>
            {!sidebarCollapsed && (
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                STUDIO TOOLS
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar to view 3D canvas in full screen'}
            >
              {sidebarCollapsed ? '▶' : '◀ Minimize'}
            </button>
          </div>

          {!sidebarCollapsed ? (
            <>
              {/* Design Themes Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.15))',
                border: '1px solid #a855f7',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase' }}>
                    ✦ 1-Click Interior Styling
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button onClick={() => handleApplyAiTheme('Scandinavian')} style={{ padding: '6px', background: advisorStyle === 'Scandinavian' ? '#a855f7' : '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>🌿 Nordic</button>
                  <button onClick={() => handleApplyAiTheme('Japandi')} style={{ padding: '6px', background: advisorStyle === 'Japandi' ? '#a855f7' : '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>☕ Japandi</button>
                  <button onClick={() => handleApplyAiTheme('Luxury')} style={{ padding: '6px', background: advisorStyle === 'Luxury' ? '#a855f7' : '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>👑 Luxury</button>
                  <button onClick={() => handleApplyAiTheme('Modern')} style={{ padding: '6px', background: advisorStyle === 'Modern' ? '#a855f7' : '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>🖤 Modern</button>
                </div>
                <button
                  onClick={() => { setAdvisorDrawerOpen(prev => !prev); setAdvisorDrawerMinimized(false); setCatalogDrawerOpen(false); }}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '7px 10px',
                    background: advisorDrawerOpen && !advisorDrawerMinimized ? '#a855f7' : 'linear-gradient(135deg, #a855f7, #ec4899)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  ✦ {advisorDrawerOpen && !advisorDrawerMinimized ? 'Close Advisor Panel' : 'Open Interior Advisor'}
                </button>
              </div>

          {/* Detected Rooms */}
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 700 }}>
              DETECTED ROOMS ({parsedBlueprint.rooms.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {parsedBlueprint.rooms.map((r, i) => (
                <div key={i} style={{
                  padding: '8px 10px',
                  background: '#0f172a',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <small style={{ color: '#38bdf8', fontWeight: 600 }}>{r.areaSqFt || Math.round(180 + i * 50)} sq ft</small>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add To Respective Rooms */}
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 700 }}>
              QUICK ADD TO ALL SECTIONS
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {CATALOG_ITEMS.slice(0, 8).map(item => (
                <button
                  key={item.name}
                  onClick={() => handleAddCatalogItem(item)}
                  style={{
                    padding: '8px 10px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>
                      {item.name}
                    </div>
                    <small style={{ color: '#38bdf8', fontSize: '10px', fontWeight: 600 }}>In: {item.tag}</small>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px'
                  }}>
                    +
                  </div>
                </button>
              ))}
            </div>
          </div>

              <button
                onClick={() => { setCatalogDrawerOpen(true); setAdvisorDrawerOpen(false); }}
                style={{
                  padding: '10px',
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                🛋️ View All {CATALOG_ITEMS.length} Furniture Items →
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => handleApplyAiTheme('Scandinavian')}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: advisorStyle === 'Scandinavian' ? '#a855f7' : '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Nordic Theme"
              >
                🌿
              </button>
              <button
                onClick={() => handleApplyAiTheme('Japandi')}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: advisorStyle === 'Japandi' ? '#a855f7' : '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Japandi Theme"
              >
                ☕
              </button>
              <button
                onClick={() => handleApplyAiTheme('Luxury')}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: advisorStyle === 'Luxury' ? '#a855f7' : '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Luxury Theme"
              >
                👑
              </button>
              <button
                onClick={() => handleApplyAiTheme('Modern')}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: advisorStyle === 'Modern' ? '#a855f7' : '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Modern Theme"
              >
                🖤
              </button>
              <button
                onClick={() => { setAdvisorDrawerOpen(true); setAdvisorDrawerMinimized(false); }}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Open Interior Design Advisor"
              >
                ✦
              </button>
            </div>
          )}
        </aside>

        {/* Center Canvas */}
        <main style={{ flex: 1, position: 'relative', background: '#f1f5f9', overflow: 'hidden' }}>
          {toastMessage && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#10b981',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '24px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              zIndex: 30
            }}>
              <span>{toastMessage}</span>
            </div>
          )}

          {activeTab === '3d' && (
            <ThreeFloorplannerViewer
              blueprint={parsedBlueprint}
              plotDimensions={parsedBlueprint.plotDimensions}
              totalAreaSqFt={parsedBlueprint.totalAreaSqFt}
              furnitureList={furnitureList}
              onMoveFurniture={handleMoveFurniture}
              onRemoveFurniture={handleRemoveFurniture}
            />
          )}

          {activeTab === '2d' && (
            <div style={{ width: '100%', height: '100%', minHeight: '580px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14', padding: '24px' }}>
              <svg viewBox="-12 -14 24 28" style={{ width: '100%', height: '100%', maxHeight: '540px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                {parsedBlueprint.rooms.map((room, i) => {
                  const pointsStr = room.polygon.map(([x, y]) => `${x},${y}`).join(' ')
                  return (
                    <g key={i}>
                      <polygon points={pointsStr} fill="#1e293b" stroke="#38bdf8" strokeWidth="0.08" opacity={0.8} />
                      <text x={room.polygon.reduce((acc, p) => acc + p[0], 0) / room.polygon.length} y={room.polygon.reduce((acc, p) => acc + p[1], 0) / room.polygon.length} fill="#f8fafc" fontSize="0.45" textAnchor="middle" fontWeight="bold">
                        {room.name}
                      </text>
                    </g>
                  )
                })}
                {parsedBlueprint.walls.map((wall, i) => (
                  <line key={i} x1={wall.start[0]} y1={wall.start[1]} x2={wall.end[0]} y2={wall.end[1]} stroke="#ffffff" strokeWidth={wall.thickness || 0.2} strokeLinecap="round" />
                ))}
              </svg>
            </div>
          )}

          {/* INTERIOR DESIGN ADVISOR: MINIMIZED FLOATING LIVE DOCK */}
          {advisorDrawerOpen && advisorDrawerMinimized && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(14px)',
              border: '1.5px solid #a855f7',
              borderRadius: '30px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 30,
              boxShadow: '0 12px 36px rgba(0,0,0,0.65)',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', marginRight: '4px' }}>
                ✦ Style:
              </span>
              {(['Scandinavian', 'Modern', 'Japandi', 'Luxury'] as const).map(theme => (
                <button
                  key={theme}
                  onClick={() => handleApplyAiTheme(theme)}
                  style={{
                    padding: '6px 12px',
                    background: advisorStyle === theme ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#1e293b',
                    color: '#fff',
                    border: advisorStyle === theme ? '1px solid #c084fc' : '1px solid #334155',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {theme === 'Scandinavian' ? '🌿 Nordic' : theme === 'Japandi' ? '☕ Japandi' : theme === 'Luxury' ? '👑 Luxury' : '🖤 Modern'}
                </button>
              ))}
              <button
                onClick={() => handleApplyAiTheme(advisorStyle)}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Re-apply current theme to 3D model"
              >
                ✨ Apply to 3D
              </button>
              <button
                onClick={() => setAdvisorDrawerMinimized(false)}
                style={{
                  padding: '6px 12px',
                  background: '#334155',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Expand full advisor panel"
              >
                🗖 Expand Catalog
              </button>
              <button
                onClick={() => { setAdvisorDrawerOpen(false); setAdvisorDrawerMinimized(false); }}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '50%',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
                title="Close Advisor"
              >
                ✕
              </button>
            </div>
          )}

          {/* INTERIOR DESIGN ADVISOR IN-STUDIO DRAWER (Full Panel Mode) */}
          {advisorDrawerOpen && !advisorDrawerMinimized && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '360px',
              maxWidth: '85%',
              background: 'rgba(15, 23, 42, 0.98)',
              backdropFilter: 'blur(16px)',
              borderLeft: '1px solid #a855f7',
              zIndex: 25,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.6)'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✦</span> Interior Advisor
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>
                    Curated styles & spatial layout
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setAdvisorDrawerMinimized(true)}
                    style={{
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc',
                      border: '1px solid #a855f7',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Minimize panel to floating dock so 3D model is 100% visible in middle"
                  >
                    🗕 Minimize
                  </button>
                  <button onClick={() => setAdvisorDrawerOpen(false)} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>

              {/* Theme Picker */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Choose Style Theme</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
                  {(['Scandinavian', 'Modern', 'Japandi', 'Luxury'] as const).map(theme => (
                    <button
                      key={theme}
                      onClick={() => handleApplyAiTheme(theme)}
                      style={{
                        padding: '6px 4px',
                        background: advisorStyle === theme ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#1e293b',
                        color: '#fff',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {theme === 'Scandinavian' ? '🌿 Nordic' : theme === 'Japandi' ? '☕ Japandi' : theme === 'Luxury' ? '👑 Luxury' : '🖤 Modern'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Items Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px' }}>Items ({advisorStyle})</strong>
                  <button
                    onClick={() => handleApplyAiTheme(advisorStyle)}
                    style={{ padding: '5px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✨ Apply All
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {CATALOG_ITEMS.map((item, idx) => (
                    <div key={idx} style={{ background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        minWidth: '56px',
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                        borderRadius: '10px',
                        border: '1px solid #334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ width: '100%' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <small style={{ color: '#c084fc', fontSize: '9px', fontWeight: 600, display: 'block', marginTop: '1px' }}>
                          ✦ {item.tag}
                        </small>
                        <button
                          onClick={() => handleAddCatalogItem(item)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginTop: '5px'
                          }}
                        >
                          + Place in 3D
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Items Catalog Drawer */}
          {catalogDrawerOpen && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '640px',
              maxWidth: '90%',
              background: '#0f172a',
              borderLeft: '1px solid #334155',
              zIndex: 25,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>🛋️ Add Items to Any Room</h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    Select bedroom, guest room, bathroom, kitchen or living items to place directly in 3D
                  </p>
                </div>
                <button onClick={() => setCatalogDrawerOpen(false)} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>✕ Close</button>
              </div>

              <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['all', 'master', 'guest', 'bathroom', 'living', 'kitchen'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatalogCategory(cat)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: catalogCategory === cat ? 700 : 500,
                      background: catalogCategory === cat ? '#3b82f6' : '#1e293b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {cat === 'all' ? 'All Items' : cat === 'master' ? 'Master Bed' : cat === 'guest' ? 'Guest Bed' : cat}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', alignContent: 'start' }}>
                {filteredCatalog.map((item, idx) => (
                  <div key={idx} style={{ background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ height: '70px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', position: 'relative' }}>
                      <span>{item.icon}</span>
                      <span style={{ position: 'absolute', top: '4px', right: '4px', padding: '1px 6px', background: '#1e293b', color: '#38bdf8', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                        {item.tag}
                      </span>
                    </div>
                    <strong style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</strong>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, height: '26px', overflow: 'hidden' }}>{item.description}</p>
                    <button
                      onClick={() => handleAddCatalogItem(item)}
                      style={{ padding: '6px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                    >
                      + Place in 3D
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
