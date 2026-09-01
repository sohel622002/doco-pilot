import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/axios";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState(() => (token ? "verifying" : "error"));
  const [error, setError] = useState(() =>
    token ? "" : "Missing verification token.",
  );

  useEffect(() => {
    if (!token) return;

    api
      .post("/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err.response?.data?.error || "Verification failed");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-space-md bg-background">
      <div className="bg-card border border-outline-variant rounded-lg p-8 max-w-md w-full text-center">
        {status === "verifying" && (
          <p className="text-body-main text-on-surface-variant">Verifying your email…</p>
        )}
        {status === "success" && (
          <>
            <h2 className="text-h2 font-h2 text-on-surface mb-2">Email verified</h2>
            <p className="text-body-main text-on-surface-variant mb-6">
              Your email address has been confirmed.
            </p>
            <Link to="/" className="text-primary font-medium hover:underline">
              Go to dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h2 className="text-h2 font-h2 text-error mb-2">Verification failed</h2>
            <p className="text-body-main text-on-surface-variant mb-6">{error}</p>
            <Link to="/login" className="text-primary font-medium hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
