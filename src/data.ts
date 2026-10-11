import type { AppStore, Design, Property, User } from './types'

const KEY = 'smartestate-store-v1'
const SESSION_KEY = 'smartestate-session-v1'

export interface StoredUserAccount extends User {
  passwordHash?: string
  registeredAt?: string
}

const USERS_KEY = 'smartestate-users-v1'

export const DEFAULT_PRESEEDED_USERS: StoredUserAccount[] = [
  {
    id: 'usr-admin-1',
    name: 'SmArt Arjun',
    email: 'smartarjun045@gmail.com',
    role: 'admin',
    initials: 'SA',
    provider: 'email',
    passwordHash: btoa('Password@123'),
    registeredAt: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'usr-buyer-2',
    name: 'Alex Reynolds',
    email: 'buyer@smartestate.io',
    role: 'buyer',
    initials: 'AR',
    provider: 'email',
    passwordHash: btoa('Password@123'),
    registeredAt: '2026-08-01T00:00:00.000Z'
  }
]

export function loadRegisteredUsers(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default seeded accounts have their passwords preserved
        DEFAULT_PRESEEDED_USERS.forEach(def => {
          const idx = parsed.findIndex(u => u.email.toLowerCase() === def.email.toLowerCase())
          if (idx < 0) {
            parsed.push(def)
          } else if (!parsed[idx].passwordHash) {
            parsed[idx].passwordHash = def.passwordHash
          }
        })
        return parsed
      }
    }
  } catch { /* use defaults */ }
  return [...DEFAULT_PRESEEDED_USERS]
}

export function saveRegisteredUser(user: User, password?: string): StoredUserAccount {
  const users = loadRegisteredUsers()
  const existingIdx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase())
  const account: StoredUserAccount = {
    ...user,
    passwordHash: password ? btoa(password) : existingIdx >= 0 ? users[existingIdx].passwordHash : undefined,
    registeredAt: new Date().toISOString()
  }
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...account }
  } else {
    users.push(account)
  }
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch (err) {
    console.error('Failed to save user in local registry:', err)
  }
  return account
}

export function resetUserPassword(email: string, newPassword: string): boolean {
  const users = loadRegisteredUsers()
  const idx = users.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase())
  if (idx < 0) return false
  users[idx].passwordHash = btoa(newPassword)
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch (err) {
    console.error('Failed to update password:', err)
  }
  return true
}

export function authenticateRegisteredUser(email: string, password?: string): User | null {
  const users = loadRegisteredUsers()
  const matched = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!matched) return null
  if (!password) return null
  if (!matched.passwordHash || matched.passwordHash !== btoa(password)) {
    return null // Strict password verification
  }
  const { passwordHash: _, ...userOnly } = matched
  return userOnly
}

export const initialProperties: Property[] = [
  {
    id: 'skyline-residence', title: 'Skyline Residence', city: 'Pune', locality: 'Kalyani Nagar', price: 12500000,
    area: 1460, beds: 3, baths: 3, status: 'published', type: 'Apartment', image: 'SKYLINE', accent: '#5271ff',
    builder: 'Nisha Developers', views: 1284, createdAt: '2026-08-05', verified: true, tags: ['Ready to move', '3D tour'],
    description: 'A light-filled 3 BHK designed for modern family living, with an expansive balcony and amenity access.', blueprintPlan: 'home1',
  },
  {
    id: 'verde-villas', title: 'Verde Villas', city: 'Bengaluru', locality: 'Whitefield', price: 21000000,
    area: 2380, beds: 4, baths: 4, status: 'published', type: 'Villa', image: 'VERDE', accent: '#3f9774',
    builder: 'GreenDoor Realty', views: 892, createdAt: '2026-08-02', verified: true, tags: ['Private garden', '3D tour'],
    description: 'Contemporary independent villa with a landscaped garden, double-height living room and flexible study.', blueprintPlan: 'home2',
  },
  {
    id: 'aura-heights', title: 'Aura Heights', city: 'Mumbai', locality: 'Powai', price: 18500000,
    area: 1120, beds: 2, baths: 2, status: 'review', type: 'Apartment', image: 'AURA', accent: '#ed855d',
    builder: 'Nisha Developers', views: 356, createdAt: '2026-08-07', verified: false, tags: ['New launch'],
    description: 'Efficiently planned urban two-bedroom home close to business hubs, lakeside walks and metro access.', blueprintPlan: 'home1',
  },
  {
    id: 'the-courtyard', title: 'The Courtyard', city: 'Hyderabad', locality: 'Kokapet', price: 9800000,
    area: 1280, beds: 3, baths: 2, status: 'published', type: 'Apartment', image: 'COURTYARD', accent: '#ad76c8',
    builder: 'Riverview Homes', views: 615, createdAt: '2026-07-29', verified: true, tags: ['Clubhouse', '3D tour'],
    description: 'Thoughtful community living with a central green court, generous bedrooms and a functional kitchen.', blueprintPlan: 'home3',
  },
]

const starterDesign: Design = {
  id: 'design-starter', propertyId: 'skyline-residence', name: 'Warm Minimal', wallColor: '#f5eee4', floorColor: '#b9855d', furniture: ['Sofa', 'Dining table'], createdAt: '2026-08-08',
}

export function loadStore(): AppStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '') as AppStore
    if (Array.isArray(parsed.properties) && Array.isArray(parsed.designs)) return parsed
  } catch { /* First visit or cleared data: use starter data. */ }
  return { properties: initialProperties, designs: [starterDesign] }
}

export function saveStore(store: AppStore) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function loadSession(): User | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as User | null } catch { return null }
}

export function saveSession(user: User | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else localStorage.removeItem(SESSION_KEY)
}

export const formatMoney = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export const formatCompactMoney = (amount: number) => `₹${(amount / 100000).toFixed(amount >= 10000000 ? 2 : 1)} L`
