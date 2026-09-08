import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { UserPublic, SignupPayload } from '@/types'
import {
  getToken, setToken, clearToken, getMe, setTenantSlug,
  authStatus, databricksSso, login as apiLogin, register as apiRegister,
  signup as apiSignup,
} from '@/services/api'
import { runAuthBootstrap } from '@/context/authBootstrap'

interface AuthCtx {
  user: UserPublic | null
  loading: boolean
  login: (slug: string, email: string, password: string) => Promise<void>
  register: (slug: string, name: string, email: string, password: string) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => void
  setUser: (u: UserPublic) => void
}

const Ctx = createContext<AuthCtx>(null as any)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)

  const finish = (r: { access_token: string; user: UserPublic }) => {
    setToken(r.access_token)
    if (r.user.tenant_slug) setTenantSlug(r.user.tenant_slug)
    setUser(r.user)
  }

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        const result = await runAuthBootstrap({
          hasToken: () => Boolean(getToken()),
          clearToken,
          getMe,
          getStatus: authStatus,
          exchangeDatabricksSso: databricksSso,
        })
        if (!active || !result) return
        if (result.kind === 'existing') setUser(result.user)
        else finish(result.session)
      } catch {
        clearToken()
      } finally {
        if (active) setLoading(false)
      }
    }

    void bootstrap()
    return () => { active = false }
  }, [])

  const login = async (slug: string, email: string, password: string) =>
    finish(await apiLogin(slug, email, password))
  const register = async (slug: string, name: string, email: string, password: string) =>
    finish(await apiRegister(slug, name, email, password))
  const signup = async (payload: SignupPayload) =>
    finish(await apiSignup(payload))
  const logout = () => { clearToken(); setUser(null) }

  return (
    <Ctx.Provider value={{ user, loading, login, register, signup, logout, setUser }}>
      {children}
    </Ctx.Provider>
  )
}
