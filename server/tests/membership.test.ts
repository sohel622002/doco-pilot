import { describe, it, expect, vi, beforeAll } from 'vitest'

// Matches the subset of the supabase-js query builder membership.js calls
// (.from().select().eq().eq().maybeSingle()); resolves to whatever the
// test most recently set on `mockResult`.
let membershipModule: any
let mockResult: { data: any; error: any } = { data: null, error: null }

vi.mock('../config/supabase.js', () => ({
  default: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(mockResult)
          })
        })
      })
    })
  }
}))

beforeAll(async () => {
  membershipModule = await import('../services/membershipService.js')
})

describe('hasRole (pure role-rank comparison)', () => {
  it('owner satisfies every minimum role', () => {
    expect(membershipModule.hasRole({ role: 'owner' }, 'viewer')).toBe(true)
    expect(membershipModule.hasRole({ role: 'owner' }, 'operator')).toBe(true)
    expect(membershipModule.hasRole({ role: 'owner' }, 'owner')).toBe(true)
  })
  it('operator satisfies viewer/operator but not owner', () => {
    expect(membershipModule.hasRole({ role: 'operator' }, 'viewer')).toBe(true)
    expect(membershipModule.hasRole({ role: 'operator' }, 'operator')).toBe(true)
    expect(membershipModule.hasRole({ role: 'operator' }, 'owner')).toBe(false)
  })
  it('viewer only satisfies viewer', () => {
    expect(membershipModule.hasRole({ role: 'viewer' }, 'viewer')).toBe(true)
    expect(membershipModule.hasRole({ role: 'viewer' }, 'operator')).toBe(false)
  })
  it('a null/undefined membership never satisfies any role', () => {
    expect(membershipModule.hasRole(null, 'viewer')).toBe(false)
    expect(membershipModule.hasRole(undefined, 'viewer')).toBe(false)
  })
})

describe('requireRole (membership lookup + role gate)', () => {
  function fakeRes() {
    const res: any = { statusCode: null, body: null }
    res.status = (code: number) => { res.statusCode = code; return res }
    res.json = (body: any) => { res.body = body; return res }
    return res
  }

  it('returns the membership and sends nothing when the role is sufficient', async () => {
    mockResult = { data: { role: 'operator' }, error: null }
    const req = { user: { id: 'u1' } }
    const res = fakeRes()
    const membership = await membershipModule.requireRole(req, res, 'server-1', 'operator')
    expect(membership).toEqual({ role: 'operator' })
    expect(res.statusCode).toBeNull()
  })

  it('sends 404 when the user has no membership on the server', async () => {
    mockResult = { data: null, error: null }
    const req = { user: { id: 'stranger' } }
    const res = fakeRes()
    const membership = await membershipModule.requireRole(req, res, 'server-1', 'viewer')
    expect(membership).toBeNull()
    expect(res.statusCode).toBe(404)
  })

  it('sends 403 when the member exists but lacks the required role', async () => {
    mockResult = { data: { role: 'viewer' }, error: null }
    const req = { user: { id: 'u2' } }
    const res = fakeRes()
    const membership = await membershipModule.requireRole(req, res, 'server-1', 'owner')
    expect(membership).toBeNull()
    expect(res.statusCode).toBe(403)
  })
})
