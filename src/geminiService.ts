/** Shared schema returned by POST /api/floorplan/analyze. */
export interface FloorplannerWall {
  start: [number, number]
  end: [number, number]
  thickness?: number
}

export interface FloorplannerRoom {
  name: string
  polygon: Array<[number, number]>
  type?: string
  areaSqFt?: number
}

export interface FloorplannerOpening {
  position: [number, number]
  width?: number
  wall_index?: number
  type?: 'door' | 'window'
}

export interface ThreeDFloorplannerBlueprint {
  plotDimensions?: string
  totalAreaSqFt?: number
  scale?: number
  walls: FloorplannerWall[]
  rooms: FloorplannerRoom[]
  doors: FloorplannerOpening[]
  windows: FloorplannerOpening[]
  ai_provider?: string
  ai_model?: string
}
