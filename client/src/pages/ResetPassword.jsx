import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/axios";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      return setError("Password must be at least 8 characters");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-space-md min-h-screen">
        <p className="text-error text-body-main">
          Missing reset token. Please use the link from your email, or{" "}
          <Link to="/forgot-password" className="text-primary hover:underline">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-space-md min-h-screen">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm max-w-md w-full">
        <div className="mb-8">
          <h2 className="text-h2 text-on-surface mb-2">Set a new password</h2>
          <p className="text-body-main text-on-surface-variant">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant uppercase" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full h-11 px-4 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-body-main"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant uppercase" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="w-full h-11 px-4 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-body-main"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-error text-body-main">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary text-on-primary font-medium rounded-full hover:bg-primary-container transition-colors shadow-sm"
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
