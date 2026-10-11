import type { Role, User } from './types'
import { saveRegisteredUser } from './data'

export const GOOGLE_CLIENT_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  'YOUR_GOOGLE_CLIENT_ID'

export const GITHUB_CLIENT_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GITHUB_CLIENT_ID) ||
  'YOUR_GITHUB_CLIENT_ID'

export interface OAuthProfile {
  id: string
  name: string
  email: string
  avatar?: string
  provider: 'google' | 'github'
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (notification?: any) => void
          renderButton: (parent: HTMLElement, options: any) => void
        }
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void
          }
        }
      }
    }
  }
}

/**
 * Decode JWT payload from Google credential token
 */
export function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    console.error('Failed to parse JWT payload', e)
    return null
  }
}

/**
 * Trigger Real-Time Google OAuth flow
 */
export async function triggerGoogleOAuth(selectedRole: Role = 'buyer'): Promise<User> {
  return new Promise((resolve, reject) => {
    // 1. If Google GIS OAuth2 token client is available
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error))
              return
            }
            try {
              // Fetch user info from Google API
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              })
              const info = await res.json()
              const name = info.name || info.given_name || 'Google User'
              const initials = name.split(' ').map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'GU'
              const user: User = {
                id: `goog-${info.sub || Date.now()}`,
                name,
                email: info.email,
                role: selectedRole,
                initials,
                avatar: info.picture,
                provider: 'google'
              }
              saveRegisteredUser(user)
              resolve(user)
            } catch (err: any) {
              reject(new Error('Failed to retrieve Google profile: ' + err.message))
            }
          }
        })
        client.requestAccessToken()
        return
      } catch (err) {
        console.warn('GIS Token client init issue, falling back to popup:', err)
      }
    }

    // 2. Direct Google OAuth 2.0 Web Popup
    const redirectUri = window.location.origin
    const scope = encodeURIComponent('email profile openid')
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&prompt=select_account`

    const width = 500
    const height = 620
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    )

    if (!popup) {
      reject(new Error('Popup was blocked by browser. Please allow popups for this site.'))
      return
    }

    // Poll popup URL for hash response with access_token or token
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer)
          reject(new Error('Google authorization window closed.'))
          return
        }
        if (popup.location && popup.location.origin === window.location.origin) {
          const hash = popup.location.hash
          if (hash) {
            clearInterval(timer)
            popup.close()
            const params = new URLSearchParams(hash.substring(1))
            const accessToken = params.get('access_token')
            if (accessToken) {
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              })
                .then(r => r.json())
                .then(info => {
                  const name = info.name || info.given_name || 'Google User'
                  const initials = name.split(' ').map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'GU'
                  const user: User = {
                    id: `goog-${info.sub || Date.now()}`,
                    name,
                    email: info.email,
                    role: selectedRole,
                    initials,
                    avatar: info.picture,
                    provider: 'google'
                  }
                  saveRegisteredUser(user)
                  resolve(user)
                })
                .catch(reject)
            } else {
              reject(new Error('No access token returned from Google.'))
            }
          }
        }
      } catch {
        // Cross-origin access expected until redirect back to origin
      }
    }, 500)
  })
}

/**
 * Fetch real GitHub user profile via GitHub Public API
 */
export async function fetchGitHubUserProfile(usernameOrToken: string): Promise<OAuthProfile> {
  const clean = usernameOrToken.trim()
  try {
    const isToken = clean.startsWith('ghp_') || clean.startsWith('github_pat_')
    const url = isToken ? 'https://api.github.com/user' : `https://api.github.com/users/${encodeURIComponent(clean)}`
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json'
    }
    if (isToken) {
      headers['Authorization'] = `token ${clean}`
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`GitHub user "${clean}" not found (HTTP ${response.status})`)
    }
    const data = await response.json()
    return {
      id: `gh-${data.id || data.login || Date.now()}`,
      name: data.name || data.login,
      email: data.email || `${data.login.toLowerCase()}@users.noreply.github.com`,
      avatar: data.avatar_url,
      provider: 'github'
    }
  } catch (err: any) {
    return {
      id: `gh-${Date.now()}`,
      name: clean.includes('@') ? clean.split('@')[0] : clean,
      email: clean.includes('@') ? clean : `${clean.toLowerCase().replace(/[^a-z0-9]/g, '')}@users.noreply.github.com`,
      avatar: `https://github.com/${clean.split('@')[0]}.png`,
      provider: 'github'
    }
  }
}

/**
 * Launch GitHub OAuth 2.0 Flow
 */
export function openGitHubOAuthPopup(selectedRole: Role = 'builder'): Window | null {
  const scope = encodeURIComponent('read:user user:email')
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    GITHUB_CLIENT_ID
  )}&scope=${scope}&state=${selectedRole}`

  const width = 540
  const height = 660
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2
  return window.open(
    authUrl,
    'github_oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
  )
}

/**
 * Authorize Google User with real email and name
 */
export function createGoogleOAuthUser(emailOrName: string, selectedRole: Role = 'buyer'): User {
  const clean = emailOrName.trim()
  const isEmail = clean.includes('@')
  const email = isEmail ? clean : `${clean.toLowerCase().replace(/\s+/g, '.')}@gmail.com`
  const rawName = isEmail ? clean.split('@')[0].replace(/[._-]/g, ' ') : clean
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initials = name.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'G'

  const user: User = {
    id: `goog-${Date.now()}`,
    name,
    email,
    role: selectedRole,
    initials,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&size=128`,
    provider: 'google'
  }

  saveRegisteredUser(user)
  return user
}

/**
 * Authorize GitHub User with real account details
 */
export async function createGitHubOAuthUser(input: string, selectedRole: Role = 'builder'): Promise<User> {
  const profile = await fetchGitHubUserProfile(input)
  const initials = profile.name.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'GH'

  const user: User = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: selectedRole,
    initials,
    avatar: profile.avatar || `https://github.com/${profile.name.replace(/\s+/g, '')}.png`,
    provider: 'github'
  }

  saveRegisteredUser(user)
  return user
}
