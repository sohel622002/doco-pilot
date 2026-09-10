import supabase from '../config/supabase.js'

export interface Membership {
  role: string
}

export interface MemberRow {
  user_id: string
  role: string
  created_at: string
}

export async function findMembership(serverId: string, userId: string): Promise<Membership | null> {
  const { data } = await supabase
    .from('server_members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function listMemberships(userId: string) {
  return supabase
    .from('server_members')
    .select('server_id, role')
    .eq('user_id', userId)
}

export async function listMembers(serverId: string) {
  return supabase
    .from('server_members')
    .select('user_id, role, created_at')
    .eq('server_id', serverId)
    .order('created_at', { ascending: true })
}

export async function listMemberUserIds(serverId: string) {
  return supabase.from('server_members').select('user_id').eq('server_id', serverId)
}

export async function insertMember(serverId: string, userId: string, role: string, invitedBy?: string) {
  return supabase
    .from('server_members')
    .insert({ server_id: serverId, user_id: userId, role, invited_by: invitedBy })
}

export async function insertOwnerMember(serverId: string, userId: string) {
  return supabase.from('server_members').insert({ server_id: serverId, user_id: userId, role: 'owner' })
}

export async function updateMemberRole(serverId: string, userId: string, role: string) {
  return supabase
    .from('server_members')
    .update({ role })
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .select('user_id, role')
    .single()
}

export async function deleteMember(serverId: string, userId: string) {
  return supabase.from('server_members').delete().eq('server_id', serverId).eq('user_id', userId)
}

export async function findMemberRole(serverId: string, userId: string) {
  return supabase
    .from('server_members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .single()
}

export async function countOwners(serverId: string) {
  return supabase
    .from('server_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('server_id', serverId)
    .eq('role', 'owner')
}
