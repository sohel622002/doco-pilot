import supabase from '../config/supabase.js'
import type { Plan } from '../config/plans.js'

export async function findPlan(userId: string) {
  return supabase.from('profiles').select('plan').eq('id', userId).maybeSingle()
}

export async function updatePlan(userId: string, plan: Plan) {
  return supabase.from('profiles').update({ plan }).eq('id', userId)
}

export async function countOwnedServers(userId: string) {
  return supabase.from('servers').select('id', { count: 'exact', head: true }).eq('user_id', userId)
}

// ── Retention helpers — used by retentionService to scope cleanup by plan ──

export async function listUserIdsForPlan(plan: Plan) {
  const { data } = await supabase.from('profiles').select('id').eq('plan', plan)
  return (data ?? []).map((p: any) => p.id as string)
}

export async function listServerIdsForOwners(ownerIds: string[]) {
  if (ownerIds.length === 0) return []
  const { data } = await supabase.from('servers').select('id').in('user_id', ownerIds)
  return (data ?? []).map((s: any) => s.id as string)
}
