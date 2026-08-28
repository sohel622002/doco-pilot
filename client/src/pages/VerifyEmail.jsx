import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/axios";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    api
      .post("/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err.response?.data?.error || "Verification failed");
      });
  }, [token]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-md min-h-screen">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm max-w-md w-full text-center">
        {status === "verifying" && (
          <p className="text-body-main text-on-surface-variant">Verifying your email…</p>
        )}
        {status === "success" && (
          <>
            <h2 className="text-h2 text-on-surface mb-2">Email verified</h2>
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
            <h2 className="text-h2 text-error mb-2">Verification failed</h2>
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
