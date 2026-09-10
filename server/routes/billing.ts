import { Router } from 'express'
import { logger } from '../utils/logger.js'
import { env } from '../env.js'
import { requireAuth } from '../middleware/auth.js'
import { PRO_PRICE_USD, limitsFor, serializeLimits } from '../config/plans.js'
import * as billingRepo from '../repositories/billingRepository.js'

const router = Router()

// ── GET /api/billing ─────────────────────────────────────────
// Current plan, its limits, and usage against them.
router.get('/', requireAuth, async (req, res) => {
  const { data: profile, error } = await billingRepo.findPlan(req.user!.id)

  if (error) {
    logger.error({ err: error }, 'Fetch plan error')
    return res.status(500).json({ error: 'Failed to fetch billing info' })
  }

  const plan = profile?.plan ?? 'free'
  const limits = limitsFor(plan)
  const { count: serversUsed } = await billingRepo.countOwnedServers(req.user!.id)

  res.json({
    plan,
    limits: serializeLimits(limits),
    usage: { servers: serversUsed ?? 0 },
    proPriceUsd: PRO_PRICE_USD,
  })
})

// ── POST /api/billing/checkout ───────────────────────────────
// Stub — creates a Razorpay order and returns it to the client once
// RAZORPAY_KEY_ID/SECRET are configured. Until then, tells the caller
// plainly that checkout isn't live yet instead of pretending to work.
router.post('/checkout', requireAuth, async (req, res) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return res.status(501).json({ error: 'Payments are not configured yet — check back soon.' })
  }

  // TODO(razorpay): create a subscription/order here via the Razorpay SDK,
  // return { orderId, amount, currency, keyId: env.RAZORPAY_KEY_ID } for the
  // client checkout widget, and mark the plan 'pro' from the webhook below
  // once payment is confirmed — not from this response.
  res.status(501).json({ error: 'Checkout not implemented yet' })
})

// ── POST /api/billing/webhook ─────────────────────────────────
// Stub — Razorpay calls this on payment/subscription events.
router.post('/webhook', async (req, res) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(501).json({ error: 'Webhook not configured' })
  }

  // TODO(razorpay): verify the `X-Razorpay-Signature` header against the raw
  // body using RAZORPAY_WEBHOOK_SECRET, then on a successful payment/
  // subscription-activated event call billingRepo.updatePlan(userId, 'pro')
  // (and 'free' on cancellation/failure). Reject with 400 on bad signature.
  res.status(501).json({ error: 'Webhook not implemented yet' })
})

export default router
