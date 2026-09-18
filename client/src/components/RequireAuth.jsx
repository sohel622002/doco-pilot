import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../lib/axios";

/** App shell routes — landing and auth pages stay public. */
export default function RequireAuth() {
  const location = useLocation();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/auth/me", { skipAuthRedirect: true })
      .then(() => {
        if (!cancelled) setStatus("authed");
      })
      .catch(() => {
        if (!cancelled) setStatus("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-on-surface-variant font-body-main text-body-main">
        Loading…
      </div>
    );
  }

  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
