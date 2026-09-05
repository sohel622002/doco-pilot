import { Router } from 'express'
import { requireRole, getMembership } from '../../services/membershipService.js'
import { auditLog } from '../../services/auditService.js'
import { validateBody } from '../../middleware/validate.js'
import { inviteMemberSchema, updateMemberSchema } from '../../schemas/index.js'
import { logger } from '../../utils/logger.js'
import { sendMail, memberInvitedEmail } from '../../services/mailService.js'
import { invalidateServerMemberCache } from '../../ws/index.js'
import * as membershipRepo from '../../repositories/membershipRepository.js'
import * as profileRepo from '../../repositories/profileRepository.js'
import * as serverRepo from '../../repositories/serverRepository.js'

const router = Router()

// ── GET /api/servers/:id/members ─────────────────────────────
router.get('/:id/members', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

  const { data: members, error } = await membershipRepo.listMembers(req.params.id)

  if (error) {
    logger.error({ err: error }, 'Fetch members error')
    return res.status(500).json({ error: 'Failed to fetch members' })
  }

  // Two queries instead of a PostgREST embed — server_members has two FKs
  // into profiles (user_id, invited_by), which makes embedding ambiguous.
  const { data: userProfiles } = await profileRepo.findByIds(members.map((m: any) => m.user_id))

  const profileById = new Map((userProfiles ?? []).map((p: any) => [p.id, p]))

  res.json({
    members: members.map((m: any) => ({
      userId: m.user_id,
      role: m.role,
      name: profileById.get(m.user_id)?.name ?? null,
      email: profileById.get(m.user_id)?.email ?? null,
      addedAt: m.created_at,
    })),
  })
})

// ── POST /api/servers/:id/members ────────────────────────────
// Invite an existing registered user by email. Owner-only.
router.post('/:id/members', validateBody(inviteMemberSchema), async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { email, role } = req.body

  const { data: invitedUser } = await profileRepo.findByEmailCaseInsensitive(email)

  if (!invitedUser) {
    return res.status(404).json({ error: 'No doco-pilot account found for that email — ask them to sign up first' })
  }

  const existingMembership = await getMembership(req.params.id, invitedUser.id)
  if (existingMembership) {
    return res.status(409).json({ error: 'That user already has access to this server' })
  }

  const { error: insertError } = await membershipRepo.insertMember(req.params.id, invitedUser.id, role, req.user!.id)

  if (insertError) {
    logger.error({ err: insertError }, 'Invite member error')
    return res.status(500).json({ error: 'Failed to add member' })
  }

  invalidateServerMemberCache(req.params.id)

  const { data: server } = await serverRepo.findName(req.params.id)

  sendMail({
    to: invitedUser.email,
    subject: `You've been added to "${server?.name ?? 'a server'}" on doco-pilot`,
    html: memberInvitedEmail({ serverName: server?.name ?? 'a server', role, inviterName: req.user!.name ?? req.user!.email }),
  }).catch((err) => logger.error({ err }, 'Failed to send member-invited email'))

  auditLog({ req, action: 'members:invite', target: invitedUser.email, serverId: req.params.id })
  res.status(201).json({ member: { userId: invitedUser.id, role, name: invitedUser.name, email: invitedUser.email } })
})

// ── PATCH /api/servers/:id/members/:userId ───────────────────
router.patch('/:id/members/:userId', validateBody(updateMemberSchema), async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  if (req.body.role !== 'owner') {
    const blocked = await wouldRemoveLastOwner(req.params.id, req.params.userId)
    if (blocked) return res.status(400).json({ error: 'A server must have at least one owner' })
  }

  const { data, error } = await membershipRepo.updateMemberRole(req.params.id, req.params.userId, req.body.role)

  if (error || !data) return res.status(404).json({ error: 'Member not found' })

  invalidateServerMemberCache(req.params.id)
  auditLog({ req, action: 'members:update-role', target: req.params.userId, serverId: req.params.id })
  res.json({ member: { userId: data.user_id, role: data.role } })
})

// ── DELETE /api/servers/:id/members/:userId ──────────────────
router.delete('/:id/members/:userId', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const blocked = await wouldRemoveLastOwner(req.params.id, req.params.userId)
  if (blocked) return res.status(400).json({ error: 'A server must have at least one owner' })

  const { error } = await membershipRepo.deleteMember(req.params.id, req.params.userId)

  if (error) return res.status(500).json({ error: 'Failed to remove member' })

  invalidateServerMemberCache(req.params.id)
  auditLog({ req, action: 'members:remove', target: req.params.userId, serverId: req.params.id })
  res.status(204).end()
})

// True if changing/removing this member's role would leave the server
// with zero owners.
async function wouldRemoveLastOwner(serverId: string, userId: string) {
  const { data: member } = await membershipRepo.findMemberRole(serverId, userId)

  if (member?.role !== 'owner') return false

  const { count } = await membershipRepo.countOwners(serverId)

  return (count ?? 0) <= 1
}

export default router
