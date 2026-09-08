import type { AuthStatus, TokenResponse, UserPublic } from '@/types'

export type AuthBootstrapResult =
  | { kind: 'existing'; user: UserPublic }
  | { kind: 'sso'; session: TokenResponse }
  | null

interface AuthBootstrapDependencies {
  hasToken: () => boolean
  clearToken: () => void
  getMe: () => Promise<UserPublic>
  getStatus: () => Promise<AuthStatus>
  exchangeDatabricksSso: () => Promise<TokenResponse>
}

export async function runAuthBootstrap(
  deps: AuthBootstrapDependencies,
): Promise<AuthBootstrapResult> {
  if (deps.hasToken()) {
    try {
      return { kind: 'existing', user: await deps.getMe() }
    } catch {
      // Um JWT interno expirado não deve impedir o SSO do Databricks de
      // recuperar a sessão na mesma inicialização.
      deps.clearToken()
    }
  }

  const status = await deps.getStatus()
  if (!status.databricks_sso_enabled) return null
  return { kind: 'sso', session: await deps.exchangeDatabricksSso() }
}
