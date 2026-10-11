import type { ThreeDFloorplannerBlueprint } from './geminiService'

export type Role = 'buyer' | 'builder' | 'owner' | 'admin'

export type PropertyStatus = 'published' | 'review' | 'draft'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  initials: string
  avatar?: string
  provider?: 'google' | 'github' | 'email'
}

export interface Property {
  id: string
  title: string
  city: string
  locality: string
  price: number
  area: number
  beds: number
  baths: number
  status: PropertyStatus
  type: string
  image: string
  accent: string
  builder: string
  views: number
  createdAt: string
  verified: boolean
  tags: string[]
  description: string
  blueprintPlan?: string
  rawBlueprint?: ThreeDFloorplannerBlueprint
}

export interface Design {
  id: string
  propertyId: string
  name: string
  wallColor: string
  floorColor: string
  furniture: string[]
  createdAt: string
  planData?: string
}

export interface AppStore {
  properties: Property[]
  designs: Design[]
}
