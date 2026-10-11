import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeDFloorplannerBlueprint } from './geminiService'

export interface FurnitureItemData {
  id: string
  name: string
  category: 'bed' | 'sofa' | 'tv' | 'table' | 'chair' | 'lamp' | 'wardrobe' | 'rug' | 'bath' | 'toilet' | 'desk' | 'shower'
  roomType: string
  position?: [number, number, number]
  rotation?: number
}

interface Props {
  blueprint?: ThreeDFloorplannerBlueprint | null
  plotDimensions?: string
  totalAreaSqFt?: number
  furnitureList?: FurnitureItemData[]
  onOpenFullCadStudio?: () => void
  onAddFurniture?: (item: FurnitureItemData) => void
  onRemoveFurniture?: (id: string) => void
  onMoveFurniture?: (id: string, newPos: [number, number, number], newRot?: number) => void
}

const DEFAULT_VILLA_BLUEPRINT: ThreeDFloorplannerBlueprint = {
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
    { name: 'Living Hall & Lounge', type: 'living', areaSqFt: 380, polygon: [[-5.8, -8.8], [5.8, -8.8], [5.8, -2.2], [0.8, -2.2], [0.8, -2], [-5.8, -2]] },
    { name: 'Kitchen & Dining Suite', type: 'kitchen', areaSqFt: 260, polygon: [[-5.8, -1.8], [0.8, -1.8], [0.8, 3.8], [-5.8, 3.8]] },
    { name: 'Master Suite Bedroom', type: 'bedroom', areaSqFt: 320, polygon: [[1.2, -1.8], [5.8, -1.8], [5.8, 3.8], [1.2, 3.8]] },
    { name: 'Guest Bedroom 2', type: 'bedroom', areaSqFt: 240, polygon: [[-0.8, 4.2], [5.8, 4.2], [5.8, 8.8], [-0.8, 8.8]] },
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

// ─── PROCEDURAL REALISTIC WOOD & TILE TEXTURE GENERATOR ─────────────
function createRealisticWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.fillStyle = '#c7aa88'
  ctx.fillRect(0, 0, 512, 512)

  const plankHeight = 32
  const plankWidth = 128

  for (let y = 0; y < 512; y += plankHeight) {
    const rowOffset = (Math.floor(y / plankHeight) % 2) * (plankWidth / 2)
    for (let x = -plankWidth; x < 512 + plankWidth; x += plankWidth) {
      const px = x + rowOffset
      const shade = 185 + Math.floor(Math.sin((x + y) * 0.08) * 15)
      ctx.fillStyle = `rgb(${shade + 8}, ${shade - 18}, ${shade - 50})`
      ctx.fillRect(px, y, plankWidth - 2, plankHeight - 2)

      // Wood grain
      ctx.strokeStyle = 'rgba(70, 45, 20, 0.15)'
      ctx.lineWidth = 1
      for (let g = 0; g < 3; g++) {
        const gy = y + 6 + g * 8
        ctx.beginPath()
        ctx.moveTo(px, gy)
        ctx.lineTo(px + plankWidth - 2, gy + (Math.sin(px * 0.1) * 2))
        ctx.stroke()
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  return texture
}

// ─── 3D FURNITURE MESH GENERATORS ───────────────────────────────────

function createBed3D(variant = 'king'): THREE.Group {
  const group = new THREE.Group()
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.5 })
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 2.0), frameMat)
  frame.position.y = 0.175
  frame.castShadow = true
  frame.receiveShadow = true
  group.add(frame)

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.15), frameMat)
  headboard.position.set(0, 0.55, -0.95)
  headboard.castShadow = true
  group.add(headboard)

  // Mattress
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 })
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.28, 1.8), mattressMat)
  mattress.position.set(0, 0.45, 0.05)
  mattress.castShadow = true
  group.add(mattress)

  // Pillows
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.42), pillowMat)
  p1.position.set(-0.52, 0.62, -0.62)
  p1.rotation.x = -0.15
  group.add(p1)

  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.42), pillowMat)
  p2.position.set(0.52, 0.62, -0.62)
  p2.rotation.x = -0.15
  group.add(p2)

  // Blanket
  const blanketColor = variant === 'minimal' ? 0x64748b : 0x3b82f6
  const blanketMat = new THREE.MeshStandardMaterial({ color: blanketColor, roughness: 0.6 })
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.97, 0.06, 0.8), blanketMat)
  blanket.position.set(0, 0.59, 0.5)
  group.add(blanket)

  // Nightstands
  const standMat = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.5 })
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.4 })

  const standLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), standMat)
  standLeft.position.set(-1.35, 0.225, -0.7)
  standLeft.castShadow = true
  group.add(standLeft)

  const lampL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 16), shadeMat)
  lampL.position.set(-1.35, 0.58, -0.7)
  group.add(lampL)

  const standRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), standMat)
  standRight.position.set(1.35, 0.225, -0.7)
  standRight.castShadow = true
  group.add(standRight)

  const lampR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 16), shadeMat)
  lampR.position.set(1.35, 0.58, -0.7)
  group.add(lampR)

  return group
}

function createSofa3D(color = 0x475569, isSectional = false): THREE.Group {
  const group = new THREE.Group()
  const fabricMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
  const cushionMat = new THREE.MeshStandardMaterial({ color: color + 0x111111, roughness: 0.6 })
  const woodLegMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.4 })

  const width = isSectional ? 2.8 : 2.4
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.35, 0.95), fabricMat)
  base.position.y = 0.25
  base.castShadow = true
  group.add(base)

  const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, 0.22), fabricMat)
  back.position.set(0, 0.65, -0.36)
  back.castShadow = true
  group.add(back)

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.95), fabricMat)
  armL.position.set(-(width / 2) + 0.12, 0.52, 0)
  armL.castShadow = true
  group.add(armL)

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.95), fabricMat)
  armR.position.set(width / 2 - 0.12, 0.52, 0)
  armR.castShadow = true
  group.add(armR)

  const cushionCount = isSectional ? 4 : 3
  for (let i = 0; i < cushionCount; i++) {
    const xOff = (i - (cushionCount - 1) / 2) * 0.7
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.7), cushionMat)
    seat.position.set(xOff, 0.48, 0.06)
    seat.castShadow = true
    group.add(seat)
  }

  if (isSectional) {
    const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 1.1), fabricMat)
    chaise.position.set(1.0, 0.25, 0.9)
    chaise.castShadow = true
    group.add(chaise)
  }

  const legGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.15, 8)
  const legOffsets = [[-width / 2 + 0.2, -0.4], [width / 2 - 0.2, -0.4], [-width / 2 + 0.2, 0.4], [width / 2 - 0.2, 0.4]]
  legOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodLegMat)
    leg.position.set(lx, 0.075, lz)
    group.add(leg)
  })

  return group
}

function createTvConsole3D(woodColor = 0x2e1e14): THREE.Group {
  const group = new THREE.Group()
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.4 })
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.48, 0.45), woodMat)
  cabinet.position.y = 0.24
  cabinet.castShadow = true
  group.add(cabinet)

  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.22), standMat)
  base.position.set(0, 0.5, 0)
  group.add(base)

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), standMat)
  pole.position.set(0, 0.6, 0)
  group.add(pole)

  const tvFrameMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.9 })
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.05), tvFrameMat)
  tvFrame.position.set(0, 1.15, 0)
  tvFrame.castShadow = true
  group.add(tvFrame)

  const screenMat = new THREE.MeshPhysicalMaterial({ color: 0x111827, roughness: 0.05, metalness: 0.9, clearcoat: 1.0 })
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.89, 0.02), screenMat)
  screen.position.set(0, 1.15, 0.026)
  group.add(screen)

  return group
}

function createCoffeeTable3D(isMarble = true): THREE.Group {
  const group = new THREE.Group()
  const topColor = isMarble ? 0xf1ede6 : 0x3d271d
  const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.25, metalness: isMarble ? 0.1 : 0.0 })
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.65), topMat)
  top.position.y = 0.38
  top.castShadow = true
  group.add(top)

  const legColor = isMarble ? 0xd4af37 : 0x18181b
  const legMat = new THREE.MeshStandardMaterial({ color: legColor, metalness: 0.8, roughness: 0.25 })
  const legGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.35, 8)
  const offsets = [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]
  offsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(lx, 0.175, lz)
    group.add(leg)
  })

  return group
}

function createDiningSet3D(): THREE.Group {
  const group = new THREE.Group()
  const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2e, roughness: 0.4 })
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.95), tableTopMat)
  tableTop.position.y = 0.74
  tableTop.castShadow = true
  group.add(tableTop)

  const legMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.7, roughness: 0.3 })
  const legGeo = new THREE.BoxGeometry(0.08, 0.7, 0.8)
  const legL = new THREE.Mesh(legGeo, legMat)
  legL.position.set(-0.65, 0.35, 0)
  group.add(legL)
  const legR = new THREE.Mesh(legGeo, legMat)
  legR.position.set(0.65, 0.35, 0)
  group.add(legR)

  const chairWoodMat = new THREE.MeshStandardMaterial({ color: 0x543822, roughness: 0.5 })
  const chairPositions: [number, number, number, number][] = [
    [-0.45, 0, 0.68, 0],
    [0.45, 0, 0.68, 0],
    [-0.45, 0, -0.68, Math.PI],
    [0.45, 0, -0.68, Math.PI]
  ]

  chairPositions.forEach(([cx, cy, cz, rot]) => {
    const chairGroup = new THREE.Group()
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), chairWoodMat)
    seat.position.y = 0.44
    chairGroup.add(seat)

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.04), chairWoodMat)
    backrest.position.set(0, 0.66, 0.19)
    chairGroup.add(backrest)

    const clegGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.42, 6)
    const coffsets = [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]
    coffsets.forEach(([lx, lz]) => {
      const cleg = new THREE.Mesh(clegGeo, legMat)
      cleg.position.set(lx, 0.21, lz)
      chairGroup.add(cleg)
    })

    chairGroup.position.set(cx, cy, cz)
    chairGroup.rotation.y = rot
    group.add(chairGroup)
  })

  return group
}

function createFloorLamp3D(): THREE.Group {
  const group = new THREE.Group()
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 })
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.3, emissive: 0xffd180, emissiveIntensity: 0.4 })

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.04, 16), poleMat)
  base.position.y = 0.02
  group.add(base)

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 8), poleMat)
  pole.position.y = 0.74
  group.add(pole)

  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 16), shadeMat)
  shade.position.y = 1.45
  group.add(shade)

  const warmLight = new THREE.PointLight(0xffb74d, 0.8, 4, 1.5)
  warmLight.position.set(0, 1.45, 0)
  group.add(warmLight)

  return group
}

function createWardrobe3D(woodColor = 0x3d271d): THREE.Group {
  const group = new THREE.Group()
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.4 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.55), woodMat)
  body.position.y = 1.0
  body.castShadow = true
  group.add(body)

  const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 })
  const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), handleMat)
  h1.position.set(-0.06, 1.0, 0.29)
  group.add(h1)

  const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), handleMat)
  h2.position.set(0.06, 1.0, 0.29)
  group.add(h2)

  return group
}

function createRug3D(color = 0x2563eb): THREE.Group {
  const group = new THREE.Group()
  const rugMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 })
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 1.8), rugMat)
  rug.position.y = 0.06
  rug.receiveShadow = true
  group.add(rug)
  return group
}

function createChair3D(color = 0xd97706): THREE.Group {
  const group = new THREE.Group()
  const oakMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.5 })
  const cushionMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 })

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.65), cushionMat)
  seat.position.y = 0.42
  seat.castShadow = true
  group.add(seat)

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.1), oakMat)
  back.position.set(0, 0.65, -0.28)
  back.castShadow = true
  group.add(back)

  const legGeo = new THREE.CylinderGeometry(0.025, 0.018, 0.38, 8)
  const offsets = [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]
  offsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, oakMat)
    leg.position.set(lx, 0.19, lz)
    group.add(leg)
  })

  return group
}

// ─── BATHROOM MESH GENERATORS ───────────────────────────────────────

function createBathtub3D(): THREE.Group {
  const group = new THREE.Group()
  const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })

  const tubOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.65, 0.6, 24), porcelainMat)
  tubOuter.scale.set(1.4, 1.0, 0.8)
  tubOuter.position.y = 0.3
  tubOuter.castShadow = true
  group.add(tubOuter)

  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), chromeMat)
  faucet.position.set(0.9, 0.65, 0)
  group.add(faucet)

  return group
}

function createBathroomVanity3D(): THREE.Group {
  const group = new THREE.Group()
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
  const sinkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 })
  const mirrorMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, roughness: 0.0, metalness: 0.95, clearcoat: 1.0 })

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.5), cabinetMat)
  cabinet.position.y = 0.4
  cabinet.castShadow = true
  group.add(cabinet)

  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.38), sinkMat)
  sink.position.set(0, 0.82, 0)
  group.add(sink)

  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.04), mirrorMat)
  mirror.position.set(0, 1.45, -0.22)
  group.add(mirror)

  return group
}

function createToilet3D(): THREE.Group {
  const group = new THREE.Group()
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 })

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.42, 16), ceramicMat)
  bowl.position.set(0, 0.21, 0.15)
  bowl.scale.set(0.8, 1, 1.2)
  bowl.castShadow = true
  group.add(bowl)

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.22), ceramicMat)
  tank.position.set(0, 0.5, -0.15)
  tank.castShadow = true
  group.add(tank)

  return group
}

function createShowerCubicle3D(): THREE.Group {
  const group = new THREE.Group()
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.4,
    transmission: 0.85,
    roughness: 0.1
  })
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.1), baseMat)
  base.position.y = 0.05
  group.add(base)

  const enclosure = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 1.1), glassMat)
  enclosure.position.y = 1.05
  group.add(enclosure)

  return group
}

function createDesk3D(): THREE.Group {
  const group = new THREE.Group()
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x473322, roughness: 0.4 })
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.2 })

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.7), woodMat)
  top.position.y = 0.74
  top.castShadow = true
  group.add(top)

  const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.6)
  const l1 = new THREE.Mesh(legGeo, metalMat)
  l1.position.set(-0.55, 0.36, 0)
  group.add(l1)

  const l2 = new THREE.Mesh(legGeo, metalMat)
  l2.position.set(0.55, 0.36, 0)
  group.add(l2)

  return group
}

// ─── HELPER: ROOM ICONS & 3D FLOOR LABELS ────────────────────────────
function getRoomIcon(name = '', type = ''): string {
  const n = (name + ' ' + type).toLowerCase()
  if (n.includes('guest') || n.includes('bed 2')) return '🛏️'
  if (n.includes('bed') || n.includes('suite') || n.includes('sleep')) return '🛏️'
  if (n.includes('living') || n.includes('lounge') || n.includes('hall') || n.includes('foyer')) return '🛋️'
  if (n.includes('kitchen') || n.includes('cook') || n.includes('chef')) return '🍳'
  if (n.includes('dining') || n.includes('eat')) return '🍽️'
  if (n.includes('bath') || n.includes('powder') || n.includes('toilet') || n.includes('wash')) return '🚿'
  if (n.includes('park') || n.includes('garage') || n.includes('car')) return '🚗'
  if (n.includes('balcony') || n.includes('terrace')) return '🌿'
  if (n.includes('study') || n.includes('desk') || n.includes('office')) return '💻'
  return '📍'
}

function createRoomFloorPlaque(name: string, type: string, areaSqFt?: number): THREE.Group {
  const group = new THREE.Group()
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (!ctx) return group

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
  if (ctx.roundRect) {
    ctx.roundRect(10, 10, 492, 160, 24)
  } else {
    ctx.fillRect(10, 10, 492, 160)
  }
  ctx.fill()

  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 5
  ctx.stroke()

  const icon = getRoomIcon(name, type)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  const displayTitle = name.length > 22 ? name.slice(0, 21) + '…' : name
  ctx.fillText(`${icon} ${displayTitle}`, 256, 65)

  ctx.fillStyle = '#38bdf8'
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const subText = areaSqFt ? `${areaSqFt} sq ft` : (type.toUpperCase() || 'SECTION')
  ctx.fillText(subText, 256, 120)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  const geo = new THREE.PlaneGeometry(2.4, 0.9)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.08
  group.add(mesh)

  return group
}

// Helper: Selection indicator ring / directional arrow
function createSelectionIndicator(): THREE.Group {
  const group = new THREE.Group()
  const ringGeo = new THREE.RingGeometry(0.8, 0.95, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.06
  group.add(ring)

  // Arrow indicator pointing forward
  const arrowShape = new THREE.Shape()
  arrowShape.moveTo(0, 0.5)
  arrowShape.lineTo(0.3, 0)
  arrowShape.lineTo(0.1, 0)
  arrowShape.lineTo(0.1, -0.4)
  arrowShape.lineTo(-0.1, -0.4)
  arrowShape.lineTo(-0.1, 0)
  arrowShape.lineTo(-0.3, 0)
  arrowShape.closePath()

  const arrowGeo = new THREE.ShapeGeometry(arrowShape)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  const arrow = new THREE.Mesh(arrowGeo, arrowMat)
  arrow.rotation.x = -Math.PI / 2
  arrow.position.set(0, 0.07, 1.1)
  arrow.scale.set(0.6, 0.6, 0.6)
  group.add(arrow)

  return group
}

// Helper: Realistic 3D Architectural Door with Frame, Recessed Wood Panels, Brass Lever Handles and Hinges
function createRealisticDoor3D(width = 0.9, height = 2.15, wallThickness = 0.2): THREE.Group {
  const group = new THREE.Group()
  const frameThickness = 0.05
  const frameDepth = Math.max(wallThickness + 0.03, 0.24)
  
  // Luxury Architectural Materials
  const casingMat = new THREE.MeshStandardMaterial({
    color: 0x3e2817, // Rich dark walnut casing trim
    roughness: 0.35,
    metalness: 0.08
  })
  
  const doorLeafMat = new THREE.MeshStandardMaterial({
    color: 0x5c3b22, // Natural wood door slab
    roughness: 0.4,
    metalness: 0.05
  })
  
  const metalHandleMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Brushed gold/brass luxury handle
    metalness: 0.85,
    roughness: 0.2
  })
  
  const hingeMat = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    metalness: 0.9,
    roughness: 0.3
  })

  // 1. Door Frame / Casing (Left jamb, Right jamb, Top header)
  const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), casingMat)
  leftJamb.position.set(-width / 2 + frameThickness / 2, height / 2, 0)
  leftJamb.castShadow = true
  group.add(leftJamb)

  const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), casingMat)
  rightJamb.position.set(width / 2 - frameThickness / 2, height / 2, 0)
  rightJamb.castShadow = true
  group.add(rightJamb)

  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, frameThickness, frameDepth), casingMat)
  topHeader.position.set(0, height - frameThickness / 2, 0)
  topHeader.castShadow = true
  group.add(topHeader)

  // Floor threshold plate
  const thresholdMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.7, roughness: 0.3 })
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, frameDepth), thresholdMat)
  threshold.position.set(0, 0.01, 0)
  group.add(threshold)

  // 2. Door Leaf (Panel) with swing pivot
  const leafWidth = width - frameThickness * 2
  const leafHeight = height - frameThickness - 0.02
  const leafThickness = 0.045

  // Pivot container placed at hinge point on left jamb
  const pivotGroup = new THREE.Group()
  pivotGroup.position.set(-width / 2 + frameThickness, 0, 0)

  // Door Slab Panel
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, leafHeight, leafThickness), doorLeafMat)
  doorLeaf.position.set(leafWidth / 2, leafHeight / 2 + 0.01, 0)
  doorLeaf.castShadow = true
  pivotGroup.add(doorLeaf)

  // Recessed architectural moldings on the door leaf for realistic home depth
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x482c18, roughness: 0.45 })
  const topPanel = new THREE.Mesh(new THREE.BoxGeometry(leafWidth * 0.75, leafHeight * 0.4, 0.052), panelMat)
  topPanel.position.set(leafWidth / 2, leafHeight * 0.68, 0)
  pivotGroup.add(topPanel)

  const botPanel = new THREE.Mesh(new THREE.BoxGeometry(leafWidth * 0.75, leafHeight * 0.35, 0.052), panelMat)
  botPanel.position.set(leafWidth / 2, leafHeight * 0.26, 0)
  pivotGroup.add(botPanel)

  // Metallic Hardware (Dual Lever Handles + Backplates)
  const handleZ = leafThickness / 2 + 0.015
  const handleY = leafHeight * 0.48
  const handleX = leafWidth - 0.12

  // Front handle
  const plateF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.008), metalHandleMat)
  plateF.position.set(handleX, handleY, handleZ)
  pivotGroup.add(plateF)

  const leverF = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), metalHandleMat)
  leverF.rotation.z = Math.PI / 2
  leverF.position.set(handleX - 0.04, handleY, handleZ + 0.025)
  pivotGroup.add(leverF)

  const stemF = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.03, 8), metalHandleMat)
  stemF.rotation.x = Math.PI / 2
  stemF.position.set(handleX, handleY, handleZ + 0.015)
  pivotGroup.add(stemF)

  // Back handle
  const plateB = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.008), metalHandleMat)
  plateB.position.set(handleX, handleY, -handleZ)
  pivotGroup.add(plateB)

  const leverB = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), metalHandleMat)
  leverB.rotation.z = Math.PI / 2
  leverB.position.set(handleX - 0.04, handleY, -handleZ - 0.025)
  pivotGroup.add(leverB)

  const stemB = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.03, 8), metalHandleMat)
  stemB.rotation.x = Math.PI / 2
  stemB.position.set(handleX, handleY, -handleZ - 0.015)
  pivotGroup.add(stemB)

  // Door Hinges
  ;[leafHeight * 0.2, leafHeight * 0.8].forEach(hy => {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), hingeMat)
    hinge.position.set(0, hy, 0)
    pivotGroup.add(hinge)
  })

  // Open swing angle (32° ajar into room for inviting architectural look)
  pivotGroup.rotation.y = Math.PI * 0.18

  group.add(pivotGroup)
  return group
}

// Helper: Realistic 3D Architectural Multi-Pane Window with Frame, Sill, Mullions and Clear Glazing
function createRealisticWindow3D(width = 1.4, height = 1.3, wallThickness = 0.2): THREE.Group {
  const group = new THREE.Group()
  const frameThickness = 0.045
  const frameDepth = Math.max(wallThickness + 0.03, 0.24)
  
  // Modern powder-coated aluminum frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.65
  })

  // Window Sill Material (Limestone / Architectural stone ledge)
  const sillMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.1
  })

  // Ultra-realistic Double-Glazed Glass Material
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.4,
    roughness: 0.05,
    transmission: 0.92,
    thickness: 0.15,
    ior: 1.52,
    reflectivity: 0.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  })

  // 1. Outer Window Frame (Top, Bottom, Left, Right)
  const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), frameMat)
  leftFrame.position.set(-width / 2 + frameThickness / 2, 0, 0)
  group.add(leftFrame)

  const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameDepth), frameMat)
  rightFrame.position.set(width / 2 - frameThickness / 2, 0, 0)
  group.add(rightFrame)

  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(width, frameThickness, frameDepth), frameMat)
  topFrame.position.set(0, height / 2 - frameThickness / 2, 0)
  group.add(topFrame)

  const botFrame = new THREE.Mesh(new THREE.BoxGeometry(width, frameThickness, frameDepth), frameMat)
  botFrame.position.set(0, -height / 2 + frameThickness / 2, 0)
  group.add(botFrame)

  // 2. Realistic Projecting Window Sill (Bottom Ledge on Exterior & Interior)
  const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.05, frameDepth + 0.08), sillMat)
  sill.position.set(0, -height / 2 - 0.025, 0)
  sill.castShadow = true
  group.add(sill)

  // 3. Central Mullion & Transom (Architectural Window Grid / Sash Frame)
  const innerWidth = width - frameThickness * 2
  const innerHeight = height - frameThickness * 2

  // Vertical Center Mullion
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.035, innerHeight, frameDepth * 0.7), frameMat)
  mullion.position.set(0, 0, 0)
  group.add(mullion)

  // Horizontal Transom Bar (upper 1/3)
  const transomY = innerHeight * 0.18
  const transom = new THREE.Mesh(new THREE.BoxGeometry(innerWidth, 0.03, frameDepth * 0.6), frameMat)
  transom.position.set(0, transomY, 0)
  group.add(transom)

  // 4. Double Pane Crystal Glass Panes
  const glassPane = new THREE.Mesh(new THREE.BoxGeometry(innerWidth, innerHeight, 0.02), glassMat)
  glassPane.position.set(0, 0, 0)
  group.add(glassPane)

  // 5. Metallic Window Sash Latches
  const latchMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), latchMat)
  latch.position.set(0, 0, frameDepth * 0.35 + 0.01)
  group.add(latch)

  return group
}

// Helper: Calculate exact wall alignment angle and wall thickness for any door/window in ANY floorplan
function findNearestWallAlignment(
  pos: [number, number],
  walls: Array<{ start: [number, number]; end: [number, number]; thickness?: number }>,
  specifiedWallIndex?: number
): { angle: number; thickness: number } {
  if (typeof specifiedWallIndex === 'number' && walls[specifiedWallIndex]) {
    const w = walls[specifiedWallIndex]
    const angle = Math.atan2(w.end[1] - w.start[1], w.end[0] - w.start[0])
    return { angle, thickness: w.thickness || 0.2 }
  }

  let bestDist = Infinity
  let bestAngle = 0
  let bestThickness = 0.2

  walls.forEach(w => {
    const [x1, y1] = w.start
    const [x2, y2] = w.end
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return

    const t = Math.max(0, Math.min(1, ((pos[0] - x1) * dx + (pos[1] - y1) * dy) / lenSq))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    const dist = Math.hypot(pos[0] - projX, pos[1] - projY)

    if (dist < bestDist) {
      bestDist = dist
      bestAngle = Math.atan2(dy, dx)
      bestThickness = w.thickness || 0.2
    }
  })

  return { angle: bestAngle, thickness: bestThickness }
}

function getRoomBounds(polygon: Array<[number, number]>) {
  const xs = polygon.map(p => p[0])
  const ys = polygon.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const width = Math.max(maxX - minX, 1)
  const depth = Math.max(maxY - minY, 1)
  return { minX, maxX, minY, maxY, centerX, centerY, width, depth }
}

function computeBlueprintBounds(bp: ThreeDFloorplannerBlueprint) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  if (bp.walls && bp.walls.length > 0) {
    bp.walls.forEach(w => {
      minX = Math.min(minX, w.start[0], w.end[0])
      maxX = Math.max(maxX, w.start[0], w.end[0])
      minY = Math.min(minY, w.start[1], w.end[1])
      maxY = Math.max(maxY, w.start[1], w.end[1])
    })
  } else if (bp.rooms && bp.rooms.length > 0) {
    bp.rooms.forEach(r => {
      r.polygon.forEach(p => {
        minX = Math.min(minX, p[0])
        maxX = Math.max(maxX, p[0])
        minY = Math.min(minY, p[1])
        maxY = Math.max(maxY, p[1])
      })
    })
  } else {
    minX = -6; maxX = 6; minY = -9; maxY = 9
  }
  const centerX = (minX + maxX) / 2
  const centerZ = (minY + maxY) / 2
  const width = Math.max(maxX - minX, 6)
  const depth = Math.max(maxY - minY, 6)
  const maxDim = Math.max(width, depth)
  return { minX, maxX, minY, maxY, centerX, centerZ, width, depth, maxDim }
}

export default function ThreeFloorplannerViewer({
  blueprint = DEFAULT_VILLA_BLUEPRINT,
  plotDimensions,
  totalAreaSqFt,
  furnitureList,
  onOpenFullCadStudio,
  onAddFurniture,
  onRemoveFurniture,
  onMoveFurniture
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeBlueprint = blueprint || DEFAULT_VILLA_BLUEPRINT
  const [wallHeight, setWallHeight] = useState<number>(2.8)
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'isometric'>('3d')
  const [autoRotate, setAutoRotate] = useState<boolean>(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showBadges, setShowBadges] = useState(true)
  const [floatingRoomPins, setFloatingRoomPins] = useState<{
    name: string
    type?: string
    areaSqFt?: number
    x: number
    y: number
    visible: boolean
  }[]>([])

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)
  const furnitureGroupRef = useRef<THREE.Group | null>(null)
  const selectionIndicatorRef = useRef<THREE.Group | null>(null)
  const furnitureMeshMap = useRef<Map<string, THREE.Group>>(new Map())

  // Initial bounds and camera center
  const initialBounds = useMemo(() => computeBlueprintBounds(activeBlueprint), [activeBlueprint])
  const initialRadius = Math.max(28, initialBounds.maxDim * 1.8)

  // Spherical camera orbit state centered on blueprint
  const sphericalRef = useRef({ radius: initialRadius, theta: Math.PI / 4, phi: Math.PI / 3.2 })
  const panOffsetRef = useRef(new THREE.Vector3(initialBounds.centerX, 0.3, initialBounds.centerZ))

  // Build the complete 3D scene
  const rebuildScene = useCallback(() => {
    if (!modelGroupRef.current) return
    const group = modelGroupRef.current
    group.clear()
    furnitureMeshMap.current.clear()

    const bp = activeBlueprint
    const height = wallHeight

    // 1. Realistic White Architectural Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdfdfd,
      roughness: 0.3,
      metalness: 0.05
    })
    const wallCapMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15
    })

    bp.walls.forEach(w => {
      const [sx, sy] = w.start
      const [ex, ey] = w.end
      const dx = ex - sx
      const dy = ey - sy
      const length = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      const thickness = w.thickness || 0.2

      const geo = new THREE.BoxGeometry(length, height, thickness)
      const mesh = new THREE.Mesh(geo, [
        wallMaterial,
        wallMaterial,
        wallCapMaterial,
        wallMaterial,
        wallMaterial,
        wallMaterial
      ])
      mesh.position.set((sx + ex) / 2, height / 2, (sy + ey) / 2)
      mesh.rotation.y = -angle
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    })

    // 2. Room Floors with Realistic Parquet Wood Grain
    const woodTexture = createRealisticWoodTexture()
    bp.rooms.forEach(r => {
      if (r.polygon.length < 3) return
      const shape = new THREE.Shape()
      shape.moveTo(r.polygon[0][0], r.polygon[0][1])
      r.polygon.slice(1).forEach(p => shape.lineTo(p[0], p[1]))
      shape.closePath()

      const isBath = (r.type || '').includes('bath') || (r.name || '').toLowerCase().includes('bath')
      const floorGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false })
      
      const floorMat = new THREE.MeshStandardMaterial({
        map: isBath ? undefined : woodTexture,
        color: isBath ? 0xdbeafe : 0xffffff,
        roughness: isBath ? 0.2 : 0.5,
        metalness: isBath ? 0.1 : 0.05
      })

      const floorMesh = new THREE.Mesh(floorGeo, floorMat)
      floorMesh.rotation.x = Math.PI / 2
      floorMesh.position.y = 0.05
      floorMesh.receiveShadow = true
      group.add(floorMesh)

      // 3D Floor Plaque placed neatly at the side/corner of the room
      const bounds = getRoomBounds(r.polygon)
      const plaque = createRoomFloorPlaque(r.name, r.type || '', r.areaSqFt)
      const plaqueSideX = bounds.minX + Math.min(1.4, bounds.width * 0.25)
      const plaqueSideZ = bounds.minY + Math.min(1.0, bounds.depth * 0.2)
      plaque.position.set(plaqueSideX, 0.07, plaqueSideZ)
      group.add(plaque)
    })

    // 3. Realistic Architectural Doors & Windows
    bp.doors.forEach(d => {
      const { angle, thickness } = findNearestWallAlignment(d.position, bp.walls, d.wall_index)
      const doorGroup = createRealisticDoor3D(d.width || 0.9, Math.min(height * 0.85, 2.15), thickness)
      doorGroup.position.set(d.position[0], 0, d.position[1])
      doorGroup.rotation.y = -angle
      group.add(doorGroup)
    })

    bp.windows.forEach(win => {
      const { angle, thickness } = findNearestWallAlignment(win.position, bp.walls, win.wall_index)
      const winGroup = createRealisticWindow3D(win.width || 1.4, 1.3, thickness)
      winGroup.position.set(win.position[0], 1.45, win.position[1])
      winGroup.rotation.y = -angle
      group.add(winGroup)
    })

    // 4. FURNITURE GROUP WITH MOVEABLE 3D MESHES
    const furnitureGroup = new THREE.Group()
    furnitureGroupRef.current = furnitureGroup
    group.add(furnitureGroup)

    if (furnitureList && furnitureList.length > 0) {
      furnitureList.forEach(item => {
        let mesh: THREE.Group | null = null
        const nameLower = (item.name || '').toLowerCase()
        
        if (item.category === 'bed') {
          mesh = createBed3D()
        } else if (item.category === 'sofa') {
          const isSectional = nameLower.includes('sectional') || nameLower.includes('lounge')
          const isOlive = nameLower.includes('olive')
          const isGrey = nameLower.includes('grey') || nameLower.includes('gray')
          const sofaColor = isOlive ? 0x4d5d43 : (isGrey ? 0x64748b : 0x334155)
          mesh = createSofa3D(sofaColor, isSectional)
        } else if (item.category === 'tv') {
          mesh = createTvConsole3D()
        } else if (item.category === 'table') {
          if (nameLower.includes('coffee') || item.roomType.toLowerCase().includes('living')) {
            mesh = createCoffeeTable3D(!nameLower.includes('wood'))
          } else {
            mesh = createDiningSet3D()
          }
        } else if (item.category === 'chair') {
          const isRed = nameLower.includes('red')
          const isBlue = nameLower.includes('blue')
          const chairColor = isRed ? 0xb91c1c : (isBlue ? 0x1d4ed8 : 0xd97706)
          mesh = createChair3D(chairColor)
        } else if (item.category === 'lamp') {
          mesh = createFloorLamp3D()
        } else if (item.category === 'wardrobe') {
          mesh = createWardrobe3D()
        } else if (item.category === 'rug') {
          mesh = createRug3D(nameLower.includes('blue') ? 0x1d4ed8 : 0x64748b)
        } else if (item.category === 'bath') {
          mesh = createBathtub3D()
        } else if (item.category === 'toilet') {
          mesh = createToilet3D()
        } else if (item.category === 'shower') {
          mesh = createShowerCubicle3D()
        } else if (item.category === 'desk') {
          mesh = createDesk3D()
        }

        if (mesh && item.position) {
          mesh.position.set(item.position[0], item.position[1], item.position[2])
          if (item.rotation) mesh.rotation.y = item.rotation
          
          // Store ID metadata on mesh for raycasting & moving
          mesh.userData = { id: item.id, name: item.name, category: item.category }
          furnitureGroup.add(mesh)
          furnitureMeshMap.current.set(item.id, mesh)
        }
      })
    }

    // Add selection indicator ring to group
    const indicator = createSelectionIndicator()
    indicator.visible = false
    selectionIndicatorRef.current = indicator
    group.add(indicator)
  }, [activeBlueprint, wallHeight, furnitureList])

  const roomPinRefs = useRef<(HTMLDivElement | null)[]>([])

  const updateRoomPins = useCallback(() => {
    if (!containerRef.current || !cameraRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const cam = cameraRef.current

    activeBlueprint.rooms.forEach((r, idx) => {
      const el = roomPinRefs.current[idx]
      if (!el) return

      const bounds = getRoomBounds(r.polygon)
      // Anchor the room tag on the side/corner of the room so furniture and beds remain unobstructed
      const tagSideX = bounds.minX + Math.min(1.4, bounds.width * 0.22)
      const tagSideZ = bounds.minY + Math.min(1.1, bounds.depth * 0.2)
      const vec = new THREE.Vector3(tagSideX, 1.4, tagSideZ)
      vec.project(cam)

      const x = (vec.x * 0.5 + 0.5) * rect.width
      const y = (-(vec.y * 0.5) + 0.5) * rect.height
      const isVisible = vec.z < 1.0 && x >= 15 && x <= rect.width - 15 && y >= 15 && y <= rect.height - 15

      if (isVisible) {
        el.style.display = 'flex'
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`
      } else {
        el.style.display = 'none'
      }
    })
  }, [activeBlueprint])

  const setupScene = useCallback(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 560

    // 1. Scene with clean studio background
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf1f5f9)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 18, 22)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // 3. Renderer with realistic soft shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    rendererRef.current = renderer

    container.replaceChildren(renderer.domElement)

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1)
    scene.add(ambientLight)

    const sun = new THREE.DirectionalLight(0xfff7ed, 1.5)
    sun.position.set(18, 30, 20)
    sun.castShadow = true
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 80
    sun.shadow.bias = -0.0004
    scene.add(sun)

    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.7)
    fillLight.position.set(-18, 15, -18)
    scene.add(fillLight)

    // 5. Build Geometry
    const modelGroup = new THREE.Group()
    modelGroupRef.current = modelGroup
    scene.add(modelGroup)

    rebuildScene()

    // 6. Interactive Raycasting & Moveable Furniture Interaction
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

    let isOrbiting = false
    let isDraggingFurniture = false
    let activeDraggedMesh: THREE.Group | null = null
    let prevMousePos = { x: 0, y: 0 }

    const updateCameraPos = () => {
      const sph = sphericalRef.current
      const pan = panOffsetRef.current
      camera.position.x = pan.x + sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta)
      camera.position.y = pan.y + sph.radius * Math.cos(sph.phi)
      camera.position.z = pan.z + sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta)
      camera.lookAt(pan.x, pan.y, pan.z)
      updateRoomPins()
    }
    updateCameraPos()

    const onMouseDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // Test intersection with furniture items
      if (furnitureGroupRef.current) {
        const intersects = raycaster.intersectObjects(furnitureGroupRef.current.children, true)
        if (intersects.length > 0) {
          let cur: THREE.Object3D | null = intersects[0].object
          while (cur && (!cur.userData || !cur.userData.id) && cur.parent !== furnitureGroupRef.current) {
            cur = cur.parent
          }

          if (cur && cur.userData && cur.userData.id) {
            isDraggingFurniture = true
            activeDraggedMesh = cur as THREE.Group
            setSelectedItemId(cur.userData.id)
            if (selectionIndicatorRef.current) {
              selectionIndicatorRef.current.position.set(cur.position.x, 0.06, cur.position.z)
              selectionIndicatorRef.current.visible = true
            }
            return
          }
        }
      }

      if (!isDraggingFurniture) {
        setSelectedItemId(null)
        if (selectionIndicatorRef.current) selectionIndicatorRef.current.visible = false
      }

      isOrbiting = true
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isDraggingFurniture && activeDraggedMesh) {
        raycaster.setFromCamera(mouse, camera)
        const intersectionPoint = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
          activeDraggedMesh.position.x = intersectionPoint.x
          activeDraggedMesh.position.z = intersectionPoint.z
          
          if (selectionIndicatorRef.current) {
            selectionIndicatorRef.current.position.set(intersectionPoint.x, 0.06, intersectionPoint.z)
          }

          if (onMoveFurniture && activeDraggedMesh.userData.id) {
            onMoveFurniture(activeDraggedMesh.userData.id, [intersectionPoint.x, 0.05, intersectionPoint.z])
          }
        }
        return
      }

      if (isOrbiting) {
        const deltaX = e.clientX - prevMousePos.x
        const deltaY = e.clientY - prevMousePos.y
        prevMousePos = { x: e.clientX, y: e.clientY }

        const sph = sphericalRef.current
        sph.theta -= deltaX * 0.008
        sph.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sph.phi - deltaY * 0.008))
        updateCameraPos()
      }
    }

    const onMouseUp = () => {
      isOrbiting = false
      isDraggingFurniture = false
      activeDraggedMesh = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const sph = sphericalRef.current
      sph.radius = Math.max(8, Math.min(50, sph.radius + e.deltaY * 0.03))
      updateCameraPos()
    }

    const dom = renderer.domElement
    dom.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    // Animation Loop with Auto-Rotation
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Only increment and update when auto-rotate is active
      if (autoRotate && !isOrbiting && !isDraggingFurniture) {
        sphericalRef.current.theta += 0.0006
        updateCameraPos()
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      dom.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      dom.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [rebuildScene, activeBlueprint, autoRotate, onMoveFurniture])

  useEffect(() => {
    setupScene()
  }, [setupScene])

  useEffect(() => {
    rebuildScene()
  }, [rebuildScene])

  // Rotate selected item
  const handleRotateSelected = () => {
    if (!selectedItemId) return
    const mesh = furnitureMeshMap.current.get(selectedItemId)
    if (mesh) {
      mesh.rotation.y += Math.PI / 4
      if (onMoveFurniture) {
        onMoveFurniture(selectedItemId, [mesh.position.x, mesh.position.y, mesh.position.z], mesh.rotation.y)
      }
    }
  }

  // Camera presets & Navigation helpers
  const fitCameraToHome = useCallback((mode: '3d' | 'top' | 'isometric' = '3d') => {
    const bounds = computeBlueprintBounds(activeBlueprint)
    panOffsetRef.current.set(bounds.centerX, 0.3, bounds.centerZ)
    const baseRadius = Math.max(28, bounds.maxDim * 1.85)

    if (mode === 'top') {
      sphericalRef.current = { radius: baseRadius * 1.15, theta: 0, phi: 0.05 }
    } else if (mode === 'isometric') {
      sphericalRef.current = { radius: baseRadius, theta: Math.PI / 4, phi: Math.PI / 3.8 }
    } else {
      sphericalRef.current = { radius: baseRadius, theta: Math.PI / 4, phi: Math.PI / 3.2 }
    }
    setViewMode(mode)
  }, [activeBlueprint])

  const setCameraPreset = (mode: '3d' | 'top' | 'isometric') => {
    fitCameraToHome(mode)
  }

  const handlePan = (dx: number, dz: number) => {
    panOffsetRef.current.x += dx
    panOffsetRef.current.z += dz
  }

  const handleZoom = (delta: number) => {
    sphericalRef.current.radius = Math.max(8, Math.min(60, sphericalRef.current.radius + delta))
  }

  const handleResetView = () => {
    fitCameraToHome('3d')
  }

  return (
    <div className="three-floorplanner-wrapper" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '600px', background: '#f1f5f9', overflow: 'hidden' }}>
      {/* Top Controls Bar matching Blueprint3D */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        right: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto', alignItems: 'center' }}>
          <button style={{ padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>New</button>
          <button style={{ padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Save</button>
          <button style={{ padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Load</button>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          <button
            onClick={() => fitCameraToHome(viewMode)}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Auto-fit and frame the complete 3D home in center"
          >
            🎯 Frame & Center Home
          </button>

          <button
            onClick={() => setCameraPreset('3d')}
            style={{
              padding: '6px 10px',
              background: viewMode === '3d' ? '#1e293b' : '#ffffff',
              color: viewMode === '3d' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📐 3D Orbit
          </button>

          <button
            onClick={() => setCameraPreset('top')}
            style={{
              padding: '6px 10px',
              background: viewMode === 'top' ? '#1e293b' : '#ffffff',
              color: viewMode === 'top' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🏢 Top-Down
          </button>

          <button
            onClick={() => setCameraPreset('isometric')}
            style={{
              padding: '6px 10px',
              background: viewMode === 'isometric' ? '#1e293b' : '#ffffff',
              color: viewMode === 'isometric' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📐 Isometric
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              padding: '6px 11px',
              background: autoRotate ? '#10b981' : '#ffffff',
              color: autoRotate ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {autoRotate ? '⟳ Auto: ON' : '⟳ Auto: OFF'}
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '620px' }} />

      {/* Selected Item Floating Toolbar */}
      {selectedItemId && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '6px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 20,
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
            Selected: {furnitureList?.find(f => f.id === selectedItemId)?.name || 'Furniture'}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Drag to move</span>
          <button
            onClick={handleRotateSelected}
            style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
          >
            ↻ Rotate 45°
          </button>
          {onRemoveFurniture && (
            <button
              onClick={() => {
                onRemoveFurniture(selectedItemId)
                setSelectedItemId(null)
              }}
              style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              ✕ Delete
            </button>
          )}
        </div>
      )}

      {/* In-Scene 3D Room Pin Tags (Stationary when stopped, rotates smoothly with 3D model) */}
      {showBadges && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}>
          {activeBlueprint.rooms.map((room, idx) => {
            const icon = getRoomIcon(room.name, room.type)
            return (
              <div
                key={idx}
                ref={el => { roomPinRefs.current[idx] = el }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 5,
                  transition: 'none',
                  willChange: 'transform'
                }}
              >
                <div style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid #38bdf8',
                  borderRadius: '16px',
                  padding: '3px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontSize: '11px' }}>{icon}</span>
                  <strong style={{ fontSize: '10px', color: '#ffffff' }}>{room.name}</strong>
                  {room.areaSqFt && (
                    <span style={{ fontSize: '9px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 4px', borderRadius: '3px' }}>
                      {room.areaSqFt} sq ft
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom Right Blueprint3D Navigation & Orbit Controls */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => handleZoom(-3)} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Zoom In">🔍+</button>
          <button onClick={handleResetView} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Reset View">⌂</button>
          <button onClick={() => handleZoom(3)} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Zoom Out">🔍-</button>
          <button onClick={() => handlePan(0, -1)} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Pan Up">↑</button>
        </div>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <button onClick={() => handlePan(-1, 0)} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Pan Left">←</button>
          <button onClick={() => handlePan(0, 1)} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Pan Down">↓</button>
          <button onClick={() => handlePan(1, 0)} style={{ width: '32px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="Pan Right">→</button>
        </div>
      </div>
    </div>
  )
}
