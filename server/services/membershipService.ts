import type { Request, Response } from 'express'
import { findMembership, type Membership } from '../repositories/membershipRepository.js'

const ROLE_RANK: Record<string, number> = { viewer: 1, operator: 2, owner: 3 }

export async function getMembership(serverId: string, userId: string): Promise<Membership | null> {
  return findMembership(serverId, userId)
}

export function hasRole(membership: Membership | null, minRole: string) {
  return !!membership && ROLE_RANK[membership.role] >= ROLE_RANK[minRole]
}

// Looks up the caller's membership for a server and enforces a minimum role.
// Sends the response and returns null on failure — route handlers must
// `if (!(await requireRole(...))) return` immediately after calling this.
export async function requireRole(req: Request, res: Response, serverId: string, minRole: string) {
  const membership = await getMembership(serverId, req.user!.id)
  if (!membership) {
    res.status(404).json({ error: 'Server not found' })
    return null
  }
  if (!hasRole(membership, minRole)) {
    res.status(403).json({ error: 'Insufficient permissions for this action' })
    return null
  }
  return membership
}
