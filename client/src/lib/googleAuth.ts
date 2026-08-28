/// <reference types="vite/client" />

/** Starts the Google OAuth redirect against the backend. */
export function startGoogleAuth() {
  const base = (import.meta.env.VITE_BACKEND_API_URL || "").replace(/\/$/, "");
  window.location.href = `${base}/api/auth/google`;
}

export function googleAuthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "google_not_configured":
      return "Google sign-in is not configured on the server.";
    case "google_auth_failed":
      return "Google sign-in failed. Please try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}
