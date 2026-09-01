/// <reference types="vite/client" />
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { googleAuthErrorMessage, startGoogleAuth } from "../lib/googleAuth";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const oauthError = googleAuthErrorMessage(searchParams.get("error"));
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Login failed");
        return;
      }

      const userData = await res.json();
      localStorage.setItem("user", JSON.stringify(userData?.user || {}));

      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-space-md">
        <div className="bg-card border border-outline-variant rounded-lg p-8">
          <div className="mb-8">
            <h2 className="text-h2 font-h2 text-on-surface mb-2">Welcome back</h2>
            <p className="text-body-main text-on-surface-variant">
              Log in to manage your containers and infrastructure.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label
                className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                className="w-full h-11 px-4 rounded-md border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline transition-colors text-body-main"
                id="email"
                placeholder="name@company.com"
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-error text-body-main">{errors.email.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label
                  className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider"
                  htmlFor="password"
                >
                  Password
                </label>
                <Link
                  className="text-label-caps text-primary hover:underline"
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  className="w-full h-11 px-4 pr-11 rounded-md border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline transition-colors text-body-main"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-error text-body-main">{errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-error text-body-main">{error}</p>}
            <button
              disabled={loading}
              className="w-full h-11 bg-primary text-on-primary font-medium rounded-md hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
              type="submit"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 w-full">
              <div className="h-px bg-outline-variant flex-1"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Or continue with
              </span>
              <div className="h-px bg-outline-variant flex-1"></div>
            </div>
            <div className="w-full pb-6 border-b border-outline-variant">
              <button
                type="button"
                onClick={startGoogleAuth}
                className="flex items-center justify-center gap-2 w-full h-10 border border-outline-variant rounded-md hover:bg-surface-container transition-colors"
              >
                <img
                  alt="Google"
                  className="w-4 h-4"
                  src="https://cdn-icons-png.flaticon.com/128/281/281764.png"
                />
                <span className="text-body-main text-on-surface font-medium">
                  Continue with Google
                </span>
              </button>
            </div>
            <p className="text-body-main text-on-surface-variant">
              Don't have an account?{" "}
              <Link
                to={"/register"}
                className="text-primary font-medium hover:underline"
              >
                Create account
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
