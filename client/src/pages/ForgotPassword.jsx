import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-md min-h-screen">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm max-w-md w-full">
        <div className="mb-8">
          <h2 className="text-h2 text-on-surface mb-2">Reset your password</h2>
          <p className="text-body-main text-on-surface-variant">
            Enter your account email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <p className="text-body-main text-on-surface">
            If that email is registered, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-on-surface-variant uppercase" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full h-11 px-4 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-body-main"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-error text-body-main">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-on-primary font-medium rounded-lg hover:bg-primary-container transition-colors shadow-sm"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-body-main text-on-surface-variant mt-6 text-center">
          <Link to="/login" className="text-primary font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
