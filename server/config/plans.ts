export type Plan = 'free' | 'pro'

export interface PlanLimits {
  maxServers: number
  maxMembersPerServer: number
  retentionDays: number
}

// null = unlimited. Pro pricing/checkout is wired separately (Razorpay);
// this is just the source of truth for what each tier actually gets.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { maxServers: 2, maxMembersPerServer: 1, retentionDays: 7 },
  pro: { maxServers: Infinity, maxMembersPerServer: Infinity, retentionDays: 30 },
}

export const PRO_PRICE_USD = 5

export function limitsFor(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free
}

// Infinity doesn't survive JSON — serialize "unlimited" as null for the client.
export function serializeLimits(limits: PlanLimits) {
  return {
    maxServers: Number.isFinite(limits.maxServers) ? limits.maxServers : null,
    maxMembersPerServer: Number.isFinite(limits.maxMembersPerServer) ? limits.maxMembersPerServer : null,
    retentionDays: limits.retentionDays,
  }
}
