import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import core from './core.js'
import metrics from './metrics.js'
import stacks from './stacks.js'
import members from './members.js'

const router = Router()

// All server routes require auth
router.use(requireAuth)

router.use(core)
router.use(metrics)
router.use(stacks)
router.use(members)

export default router
