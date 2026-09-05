import { logger } from '../utils/logger.js'
import { listMemberUserIds } from '../repositories/membershipRepository.js'
import { clientSockets } from './state.js'

// Short-lived cache of each server's member user_ids — docker events can
// arrive multiple times a second, so this avoids a DB round trip per event.
// Worst case, a just-added/removed member is a few seconds stale; the
// owner (always present from server creation) is unaffected.
const MEMBER_CACHE_MS = 30 * 1000
const memberIdsCache = new Map<string, { userIds: string[]; fetchedAt: number }>()

async function getServerMemberIds(serverId: string): Promise<string[]> {
  const cached = memberIdsCache.get(serverId)
  if (cached && Date.now() - cached.fetchedAt < MEMBER_CACHE_MS) return cached.userIds

  const { data, error } = await listMemberUserIds(serverId)
  if (error) {
    logger.error({ err: error, serverId }, 'Failed to fetch server members for broadcast')
    return cached?.userIds ?? []
  }

  const userIds = data.map((m: any) => m.user_id)
  memberIdsCache.set(serverId, { userIds, fetchedAt: Date.now() })
  return userIds
}

// Broadcast to all open tabs/windows of a user
export function broadcastToUser(userId: string, data: Record<string, unknown>) {
  logger.debug('Broadcasting users')

  const sockets = clientSockets.get(userId)
  if (!sockets) return
  const payload = JSON.stringify(data)
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(payload)
  }
}

// Broadcast to every member of a server (owner + operators + viewers),
// not just the original creator — replaces the old owner-only broadcast.
export async function broadcastToServerMembers(serverId: string, data: Record<string, unknown>) {
  const userIds = await getServerMemberIds(serverId)
  for (const userId of userIds) broadcastToUser(userId, data)
}

// Called by the REST routes after a membership change so a newly
// invited/removed member doesn't wait out the cache TTL for live updates.
export function invalidateServerMemberCache(serverId: string) {
  memberIdsCache.delete(serverId)
}
