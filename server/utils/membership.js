import supabase from '../config/supabase.js'

const ROLE_RANK = { viewer: 1, operator: 2, owner: 3 }

// { role } | null
export async function getMembership(serverId, userId) {
  const { data } = await supabase
    .from('server_members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export function hasRole(membership, minRole) {
  return !!membership && ROLE_RANK[membership.role] >= ROLE_RANK[minRole]
}

// Looks up the caller's membership for a server and enforces a minimum role.
// Sends the response and returns null on failure — route handlers must
// `if (!(await requireRole(...))) return` immediately after calling this.
export async function requireRole(req, res, serverId, minRole) {
  const membership = await getMembership(serverId, req.user.id)
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
