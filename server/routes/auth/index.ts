import { Router } from 'express'
import password from './password.js'
import google from './google.js'
import session from './session.js'
import verification from './verification.js'
import profile from './profile.js'

const router = Router()

router.use(password)
router.use(google)
router.use(session)
router.use(verification)
router.use(profile)

export default router
