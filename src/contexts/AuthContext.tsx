import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import api from '../services/api'
import type { User, UserRole } from '../types'

type SessionUser = Omit<User, 'password'>

interface AuthContextType {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'quickship-user'

function readSession(): SessionUser | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? (JSON.parse(stored) as SessionUser) : null
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<SessionUser | null>(() => {
  return readSession()
})
  const [loading] = useState(false)

  async function login(email: string, password: string) {
    const response = await api.get<User[]>('/users', {
      params: { email: email.trim().toLowerCase() },
    })

    // Some deployed APIs return the users array directly, while others wrap it
    // in an object such as { users: [...] }. Normalize both response formats.
    const responseData: unknown = response.data
    const users: User[] = Array.isArray(responseData)
      ? (responseData as User[])
      : responseData &&
          typeof responseData === 'object' &&
          'users' in responseData &&
          Array.isArray((responseData as { users?: unknown }).users)
        ? ((responseData as { users: User[] }).users)
        : []

    if (users.length === 0) {
      throw new Error(
        'Could not read users from the API. Check that VITE_API_URL points to your JSON Server API and that /users returns a list.',
      )
    }

    const account = users.find(
      (item) =>
        item.email.toLowerCase() === email.trim().toLowerCase() &&
        item.password === password &&
        item.status === 'active',
    )

    if (!account) {
      throw new Error('Invalid email or password, or account inactive.')
    }

    const { password: _password, ...safeUser } = account
    const sessionUser: SessionUser = safeUser

    setUser(sessionUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

export function getDashboardPath(role: UserRole) {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'branch_staff':
      return '/branch/dashboard'
    case 'delivery_agent':
      return '/agent/dashboard'
    case 'customer':
      return '/customer/dashboard'
  }
}
