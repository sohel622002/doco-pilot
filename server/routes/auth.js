import { Router } from "express";
import { randomBytes } from "crypto";
import supabase from "../config/supabase.js";
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  hashPassword,
  comparePassword,
  hashToken,
  compareToken,
} from "../utils/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema, verifyEmailSchema } from "../schemas/index.js";
import { auditLog } from "../utils/audit.js";
import { logger } from "../utils/logger.js";
import { sendMail, verificationEmail, passwordResetEmail } from "../utils/mail.js";

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body

    const normalizedEmail = email.toLowerCase()

    // Check if user exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // 🔥 Hash password
    const passwordHash = await hashPassword(password)

    // 🔥 Insert user directly
    const { data: user, error } = await supabase
      .from('profiles')
      .insert({
        name,
        email: normalizedEmail,
        password_hash: passwordHash
      })
      .select('id, name, email')
      .single()

    if (error) {
      logger.error({ err: error }, 'Register: failed to create account')
      return res.status(500).json({ error: 'Failed to create account' })
    }

    const accessToken = signAccessToken(user, req.ip)
    const refreshToken = signRefreshToken()
    const refreshTokenHash = await hashToken(refreshToken)

    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })

    setAuthCookies(res, accessToken, refreshToken)

    // Fire-and-forget: don't block the response on email delivery
    sendVerificationEmail(user.id, normalizedEmail).catch((err) =>
      logger.error({ err }, 'Failed to send verification email')
    )

    res.status(201).json({ user })
  } catch (err) {
    logger.error({ err }, 'Register: unexpected error')
    res.status(500).json({ error: 'Server error' })
  }
})

async function sendVerificationEmail(userId, email) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = await hashToken(token)

  await supabase.from('email_verifications').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  })

  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`
  await sendMail({ to: email, subject: 'Verify your email', html: verificationEmail(link) })
}

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase();

  // 🔥 Get user with password hash
  const { data: user, error } = await supabase
    .from("profiles")
    .select("id, email, password_hash")
    .eq("email", normalizedEmail)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // 🔥 Compare password
  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const payload = { id: user.id, email: user.email };

  const accessToken = signAccessToken(payload, req.ip);
  const refreshToken = signRefreshToken();
  const refreshTokenHash = await hashToken(refreshToken);

  await supabase.from("refresh_tokens").insert({
    user_id: user.id,
    token_hash: refreshTokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.json({ user: payload });
});

// ── POST /api/auth/refresh ───────────────────────────────────
router.post("/refresh", async (req, res) => {
  const incomingToken = req.cookies?.refresh_token;

  if (!incomingToken) {
    return res.status(401).json({ error: "No refresh token" });
  }

  // Find all non-expired refresh tokens and compare
  // (we don't store plain token so we must scan recent ones)
  const { data: tokens } = await supabase
    .from("refresh_tokens")
    .select("id, user_id, token_hash, expires_at")
    .gt("expires_at", new Date().toISOString());

  if (!tokens || tokens.length === 0) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  // Find matching token
  let matchedToken = null;
  for (const t of tokens) {
    if (await compareToken(incomingToken, t.token_hash)) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", matchedToken.user_id)
    .single();

  if (!profile) {
    return res.status(401).json({ error: "User not found" });
  }

  // Rotate: delete old, issue new
  await supabase.from("refresh_tokens").delete().eq("id", matchedToken.id);

  const user = { id: profile.id, email: profile.email };
  const newAccessToken = signAccessToken(user, req.ip);
  const newRefreshToken = signRefreshToken();
  const newRefreshTokenHash = await hashToken(newRefreshToken);

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await supabase.from("refresh_tokens").insert({
    user_id: user.id,
    token_hash: newRefreshTokenHash,
    expires_at: expiresAt,
  });

  setAuthCookies(res, newAccessToken, newRefreshToken);
  res.json({ user: { id: user.id, email: user.email } });
});

// ── POST /api/auth/logout ────────────────────────────────────
router.post("/logout", requireAuth, async (req, res) => {
  const incomingToken = req.cookies?.refresh_token;

  if (incomingToken) {
    // Find and delete the matching refresh token
    const { data: tokens } = await supabase
      .from("refresh_tokens")
      .select("id, token_hash")
      .eq("user_id", req.user.id);

    for (const t of tokens ?? []) {
      if (await compareToken(incomingToken, t.token_hash)) {
        await supabase.from("refresh_tokens").delete().eq("id", t.id);
        break;
      }
    }
  }

  clearAuthCookies(res);
  res.json({ message: "Logged out" });
});

// ── POST /api/auth/forgot-password ───────────────────────────
// Always responds 200 regardless of whether the email exists, to avoid
// leaking which emails are registered.
router.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), async (req, res) => {
  const normalizedEmail = req.body.email.toLowerCase();

  const { data: user } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (user) {
    const resetToken = randomBytes(32).toString("hex");
    const tokenHash = await hashToken(resetToken);

    await supabase.from("password_resets").insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendMail({ to: normalizedEmail, subject: "Reset your password", html: passwordResetEmail(resetLink) });

    auditLog({ req: { user: { id: user.id, email: normalizedEmail }, ip: req.ip }, action: "auth:forgot-password", target: user.id });
  }

  res.json({ message: "If that email is registered, a reset link has been sent" });
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body;

  const { data: resets } = await supabase
    .from("password_resets")
    .select("id, user_id, token_hash, expires_at")
    .gt("expires_at", new Date().toISOString());

  if (!resets || resets.length === 0) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  let matched = null;
  for (const r of resets) {
    if (await compareToken(token, r.token_hash)) {
      matched = r;
      break;
    }
  }

  if (!matched) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const passwordHash = await hashPassword(password);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ password_hash: passwordHash })
    .eq("id", matched.user_id);

  if (updateError) {
    return res.status(500).json({ error: "Failed to reset password" });
  }

  // Invalidate this token and any other outstanding tokens/sessions for the user
  await supabase.from("password_resets").delete().eq("user_id", matched.user_id);
  await supabase.from("refresh_tokens").delete().eq("user_id", matched.user_id);

  auditLog({ req: { user: { id: matched.user_id }, ip: req.ip }, action: "auth:reset-password", target: matched.user_id });

  res.json({ message: "Password reset — please log in again" });
});

// ── POST /api/auth/change-password ───────────────────────────
router.post("/change-password", requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const { data: user, error } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .eq("id", req.user.id)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const newHash = await hashPassword(newPassword);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ password_hash: newHash })
    .eq("id", req.user.id);

  if (updateError) {
    return res.status(500).json({ error: "Failed to update password" });
  }

  // Invalidate all refresh tokens — every session (including this one) must log in again
  await supabase.from("refresh_tokens").delete().eq("user_id", req.user.id);
  clearAuthCookies(res);

  auditLog({ req, action: "auth:change-password", target: req.user.id });

  res.json({ message: "Password updated — please log in again" });
});

// ── POST /api/auth/verify-email ──────────────────────────────
router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), async (req, res) => {
  const { token } = req.body;

  const { data: pending } = await supabase
    .from("email_verifications")
    .select("id, user_id, token_hash, expires_at")
    .gt("expires_at", new Date().toISOString());

  if (!pending || pending.length === 0) {
    return res.status(400).json({ error: "Invalid or expired verification token" });
  }

  let matched = null;
  for (const p of pending) {
    if (await compareToken(token, p.token_hash)) {
      matched = p;
      break;
    }
  }

  if (!matched) {
    return res.status(400).json({ error: "Invalid or expired verification token" });
  }

  await supabase.from("profiles").update({ email_verified: true }).eq("id", matched.user_id);
  await supabase.from("email_verifications").delete().eq("user_id", matched.user_id);

  auditLog({ req: { user: { id: matched.user_id }, ip: req.ip }, action: "auth:verify-email", target: matched.user_id });

  res.json({ message: "Email verified" });
});

// ── POST /api/auth/resend-verification ───────────────────────
router.post("/resend-verification", requireAuth, authLimiter, async (req, res) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, email_verified")
    .eq("id", req.user.id)
    .single();

  if (!profile) return res.status(404).json({ error: "User not found" });
  if (profile.email_verified) return res.json({ message: "Email already verified" });

  await supabase.from("email_verifications").delete().eq("user_id", profile.id);
  await sendVerificationEmail(profile.id, profile.email);

  res.json({ message: "Verification email sent" });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, email_verified, created_at")
    .eq("id", req.user.id)
    .single();

  if (!profile) return res.status(404).json({ error: "User not found" });
  res.json({ user: profile });
});

// ── PATCH /api/auth/me ───────────────────────────────────────
router.patch("/me", requireAuth, validateBody(updateProfileSchema), async (req, res) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ name: req.body.name })
    .eq("id", req.user.id)
    .select("id, name, email, created_at")
    .single();

  if (error || !profile) {
    return res.status(500).json({ error: "Failed to update profile" });
  }

  auditLog({ req, action: "auth:update-profile", target: req.user.id });
  res.json({ user: profile });
});

export default router;
