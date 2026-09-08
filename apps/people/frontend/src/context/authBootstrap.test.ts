import { describe, expect, it, vi } from 'vitest'
import { runAuthBootstrap } from './authBootstrap'

const user = {
  email: 'person@example.com',
  name: 'Person',
  tenant_id: 'tenant-id',
  tenant_slug: 'atlas',
  is_admin: false,
  must_change_password: false,
}

describe('runAuthBootstrap', () => {
  it('falls through to Databricks SSO when the saved JWT is invalid', async () => {
    const clearToken = vi.fn()
    const exchangeDatabricksSso = vi.fn().mockResolvedValue({
      access_token: 'fresh',
      token_type: 'bearer',
      user,
    })

    const result = await runAuthBootstrap({
      hasToken: () => true,
      clearToken,
      getMe: vi.fn().mockRejectedValue(new Error('expired')),
      getStatus: vi.fn().mockResolvedValue({
        auth_enabled: true,
        databricks_sso_enabled: true,
        pass_mark: 70,
      }),
      exchangeDatabricksSso,
    })

    expect(clearToken).toHaveBeenCalledOnce()
    expect(exchangeDatabricksSso).toHaveBeenCalledOnce()
    expect(result).toEqual({
      kind: 'sso',
      session: { access_token: 'fresh', token_type: 'bearer', user },
    })
  })
})
