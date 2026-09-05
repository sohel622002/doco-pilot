import { Resend } from 'resend'
import { env } from '../env.js'
import { logger } from '../utils/logger.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

interface SendMailParams {
  to: string
  subject: string
  html: string
}

/**
 * Send a transactional email. If RESEND_API_KEY isn't configured, falls back
 * to logging the content — keeps auth flows testable without a mail provider.
 */
export async function sendMail({ to, subject, html }: SendMailParams) {
  if (!resend) {
    logger.info({ to, subject, html }, 'RESEND_API_KEY not set — logging email instead of sending')
    return
  }

  const { error } = await resend.emails.send({ from: env.MAIL_FROM, to, subject, html })

  if (error) {
    logger.error({ err: error, to, subject }, 'Failed to send email via Resend')
  }
}

export function verificationEmail(link: string) {
  return `
    <p>Welcome to doco-pilot — confirm your email to get started.</p>
    <p><a href="${link}">Verify your email address</a></p>
    <p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
  `
}

interface MemberInvitedEmailParams {
  serverName: string
  role: string
  inviterName: string
}

export function memberInvitedEmail({ serverName, role, inviterName }: MemberInvitedEmailParams) {
  return `
    <p>${inviterName} has given you <strong>${role}</strong> access to the server "${serverName}" on doco-pilot.</p>
    <p>Log in to your doco-pilot account to see it in your server list.</p>
  `
}

export function passwordResetEmail(link: string) {
  return `
    <p>We received a request to reset your doco-pilot password.</p>
    <p><a href="${link}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  `
}
