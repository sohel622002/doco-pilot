import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/axios";

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
    <div className="flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-md">
        <div className="w-full max-w-110 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
          <div className="mb-md">
            <h1 className="text-h1 mb-base">Create your account</h1>
            <p className="text-body-main text-on-surface-variant">
              Start managing your containers with ease.
            </p>
          </div>
          <form className="space-y-md" onSubmit={onSubmit}>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-xs uppercase">
                Full Name
              </label>
              <input
                className="w-full h-11 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline"
                placeholder="Enter your full name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-xs uppercase">
                Email Address
              </label>
              <input
                className="w-full h-11 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline"
                placeholder="name@company.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-label-caps text-on-surface-variant mb-xs uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full h-11 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline"
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
            <div className="pt-xs">
              <button
                className="cursor-pointer w-full h-11 bg-primary text-on-primary font-medium rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-xs disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </div>
          </form>
          <div className="mt-md pt-md border-t border-outline-variant flex flex-col gap-sm">
            <button
              className="cursor-pointer w-full h-11 flex items-center justify-center gap-xs border border-outline-variant rounded-lg text-body-main hover:bg-surface-container transition-colors"
              type="button"
            >
              <img
                alt="Google Logo"
                className="w-4 h-4"
                data-alt="A clean, vector-style Google G logo icon centered on a white circular background. The icon uses the standard Google brand colors of blue, red, yellow, and green. The visual style is minimalist and high-resolution, suitable for a professional modern UI sign-up interface."
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
        <div className="mt-lg flex gap-md">
          <a
            className="text-label-caps text-outline hover:text-on-surface-variant"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-label-caps text-outline hover:text-on-surface-variant"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-label-caps text-outline hover:text-on-surface-variant"
            href="#"
          >
            Contact Support
          </a>
        </div>
      </div>
      <footer className="p-md text-center">
        <p className="text-label-caps text-outline">
          © 2024 DockerDesk Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
