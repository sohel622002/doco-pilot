import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { startGoogleAuth } from "../lib/googleAuth";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/register", { name, email, password });
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-space-md">
        <div className="w-full max-w-110 bg-card border border-outline-variant rounded-lg p-space-lg">
          <div className="mb-space-md">
            <h1 className="text-h1 font-h1 text-on-surface mb-base">Create your account</h1>
            <p className="text-body-main text-on-surface-variant">
              Start managing your containers with ease.
            </p>
          </div>
          <form className="space-y-space-md" onSubmit={onSubmit}>
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-space-xs uppercase tracking-wider">
                Full Name
              </label>
              <input
                className="w-full h-11 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline transition-colors"
                placeholder="Enter your full name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-space-xs uppercase tracking-wider">
                Email Address
              </label>
              <input
                className="w-full h-11 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline transition-colors"
                placeholder="name@company.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-space-xs uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full h-11 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline transition-colors"
                  placeholder="Create a password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-error text-body-main">{error}</p>}
            <div className="pt-space-xs">
              <button
                className="cursor-pointer w-full h-11 bg-primary text-on-primary font-medium rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-space-xs disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </div>
          </form>
          <div className="mt-space-md pt-space-md border-t border-outline-variant flex flex-col gap-space-sm">
            <button
              className="cursor-pointer w-full h-11 flex items-center justify-center gap-space-xs border border-outline-variant rounded-md text-body-main text-on-surface hover:bg-surface-container transition-colors"
              type="button"
              onClick={startGoogleAuth}
            >
              <img
                alt="Google Logo"
                className="w-4 h-4"
                src="https://cdn-icons-png.flaticon.com/128/281/281764.png"
              />
              Continue with Google
            </button>
            <p className="text-center text-body-main text-on-surface-variant">
              Already have an account?{" "}
              <Link to={"/login"} className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-space-lg flex gap-space-md">
          <a
            className="text-label-caps text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-label-caps text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-label-caps text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Contact Support
          </a>
        </div>
      </div>
      <footer className="p-space-md text-center">
        <p className="text-label-caps text-on-surface-variant">
          © 2024 DockerDesk Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
