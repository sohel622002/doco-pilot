import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";

function ProfileCard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  useEffect(() => {
    api.get("/api/auth/me").then((res) => {
      setName(res.data?.user?.name || "");
      setEmail(res.data?.user?.email || "");
      setEmailVerified(Boolean(res.data?.user?.email_verified));
    });
  }, []);

  const onResendVerification = async () => {
    setResendState("sending");
    try {
      await api.post("/api/auth/resend-verification");
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.patch("/api/auth/me", { name });
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md mb-space-md">
      <div className="flex items-center gap-space-xs mb-space-md border-b border-outline-variant pb-space-sm">
        <span className="material-symbols-outlined text-primary">person</span>
        <h2 className="font-h2 text-h2">Profile</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-space-sm max-w-md">
        <div className="space-y-space-xs">
          <label className="font-body-main font-semibold block">Full Name</label>
          <input
            type="text"
            required
            className="w-full bg-surface-container-low border border-outline-variant rounded px-space-sm py-space-xs text-body-main focus:ring-1 focus:ring-primary focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-space-xs">
          <label className="font-body-main font-semibold block">Email</label>
          <input
            type="email"
            disabled
            className="w-full bg-surface-container-high border border-outline-variant rounded px-space-sm py-space-xs text-body-main text-on-surface-variant cursor-not-allowed"
            value={email}
          />
          {!emailVerified && (
            <div className="flex items-center gap-space-sm text-label-caps text-error">
              <span>Email not verified</span>
              <button
                type="button"
                onClick={onResendVerification}
                disabled={resendState !== "idle"}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {resendState === "sent"
                  ? "Verification email sent"
                  : resendState === "sending"
                    ? "Sending…"
                    : "Resend verification email"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="text-error text-body-main">{error}</p>}
        {success && <p className="text-primary text-body-main">{success}</p>}
        <div className="flex justify-end pt-space-xs">
          <button
            type="submit"
            disabled={loading}
            className="px-space-md py-space-xs rounded bg-primary text-on-primary font-body-main hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ChangePasswordCard() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      return setError("New password must be at least 8 characters");
    }
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match");
    }

    setLoading(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password updated. Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md mb-space-md">
      <div className="flex items-center gap-space-xs mb-space-md border-b border-outline-variant pb-space-sm">
        <span className="material-symbols-outlined text-primary">lock</span>
        <h2 className="font-h2 text-h2">Change Password</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-space-sm max-w-md">
        <div className="space-y-space-xs">
          <label className="font-body-main font-semibold block">Current Password</label>
          <input
            type="password"
            required
            className="w-full bg-surface-container-low border border-outline-variant rounded px-space-sm py-space-xs text-body-main focus:ring-1 focus:ring-primary focus:outline-none"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-space-xs">
          <label className="font-body-main font-semibold block">New Password</label>
          <input
            type="password"
            required
            className="w-full bg-surface-container-low border border-outline-variant rounded px-space-sm py-space-xs text-body-main focus:ring-1 focus:ring-primary focus:outline-none"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-space-xs">
          <label className="font-body-main font-semibold block">Confirm New Password</label>
          <input
            type="password"
            required
            className="w-full bg-surface-container-low border border-outline-variant rounded px-space-sm py-space-xs text-body-main focus:ring-1 focus:ring-primary focus:outline-none"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-error text-body-main">{error}</p>}
        {success && <p className="text-primary text-body-main">{success}</p>}
        <div className="flex justify-end pt-space-xs">
          <button
            type="submit"
            disabled={loading}
            className="px-space-md py-space-xs rounded bg-primary text-on-primary font-body-main hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Settings() {
  return (
    <div className="max-w-container-max mx-auto p-space-md">
      <div className="max-w-container-max mx-auto">
        <div className="mb-space-lg">
          <h1 className="font-h1 text-h1 text-on-background mb-space-xs">
            Settings &amp; Logs
          </h1>
          <p className="text-body-large text-on-surface-variant">
            Configure your Docker Engine and monitor real-time system output.
          </p>
        </div>
        <ProfileCard />
        <ChangePasswordCard />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md items-start">
          {/* <!-- Engine Configuration Section --> */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md">
            <div className="flex items-center gap-space-xs mb-space-md border-b border-outline-variant pb-space-sm">
              <span className="material-symbols-outlined text-primary">
                settings_applications
              </span>
              <h2 className="font-h2 text-h2">Engine Configuration</h2>
            </div>
            <div className="space-y-space-md">
              {/* <!-- Setting Group: General --> */}
              <div className="space-y-space-sm">
                <p className="font-label-caps text-on-surface-variant uppercase tracking-widest text-[10px]">
                  General Parameters
                </p>
                <div className="flex items-center justify-between py-space-xs border-b border-outline-variant/30">
                  <div>
                    <p className="font-body-main font-semibold">Debug Mode</p>
                    <p className="text-label-caps text-on-surface-variant">
                      Enable verbose logging for engine troubleshooting.
                    </p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-container-highest cursor-pointer">
                    <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white transition"></span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-space-xs border-b border-outline-variant/30">
                  <div>
                    <p className="font-body-main font-semibold">
                      Experimental Features
                    </p>
                    <p className="text-label-caps text-on-surface-variant">
                      Access preview features and alpha plugins.
                    </p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary cursor-pointer">
                    <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-white transition"></span>
                  </div>
                </div>
              </div>
              {/* <!-- Setting Group: Resources --> */}
              <div className="space-y-space-sm">
                <p className="font-label-caps text-on-surface-variant uppercase tracking-widest text-[10px]">
                  Resource Allocation
                </p>
                <div className="space-y-space-xs">
                  <label className="font-body-main font-semibold block">
                    Maximum CPU Usage (%)
                  </label>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-space-sm py-space-xs text-body-main focus:ring-1 focus:ring-primary focus:outline-none"
                    type="text"
                    value="80"
                  />
                  <div className="w-full bg-outline-variant h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[80%]"></div>
                  </div>
                </div>
                <div className="space-y-space-xs">
                  <label className="font-body-main font-semibold block">
                    Memory Limit (GB)
                  </label>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-space-sm py-space-xs text-body-main focus:ring-1 focus:ring-primary focus:outline-none"
                    type="text"
                    value="4"
                  />
                </div>
              </div>
              {/* <!-- Setting Group: Advanced --> */}
              <div className="space-y-space-sm">
                <p className="font-label-caps text-on-surface-variant uppercase tracking-widest text-[10px]">
                  Daemon JSON
                </p>
                <div className="bg-surface-container-high rounded p-space-sm font-code text-code text-on-surface border border-outline-variant/50">
                  <pre>{`{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
      "max-size": "100m"
  },
  "storage-driver": "overlay2"
}`}</pre>
                </div>
              </div>
              <div className="flex justify-end gap-space-sm pt-space-md">
                <button className="px-space-md py-space-xs rounded border border-outline-variant text-on-surface font-body-main hover:bg-surface-container-high transition-colors">
                  Discard
                </button>
                <button className="px-space-md py-space-xs rounded bg-primary text-on-primary font-body-main hover:opacity-90 transition-opacity">
                  Apply Changes
                </button>
              </div>
            </div>
          </section>
          {/* <!-- System Logs Section --> */}
          <section className="bg-inverse-surface rounded-xl p-space-md flex flex-col h-full">
            <div className="flex items-center justify-between mb-space-md border-b border-surface-variant/20 pb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-inverse-primary">
                  terminal
                </span>
                <h2 className="font-h2 text-h2 text-inverse-on-surface">
                  Real-time Log Stream
                </h2>
              </div>
              <div className="flex gap-space-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                <p className="text-label-caps text-surface-variant">
                  Streaming Live
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto font-code text-code space-y-space-xs pr-space-xs scrollbar-thin">
              <div className="flex gap-space-md opacity-60">
                <span className="text-outline-variant shrink-0">14:22:01</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Docker Engine v24.0.5 starting...
                </span>
              </div>
              <div className="flex gap-space-md opacity-60">
                <span className="text-outline-variant shrink-0">14:22:02</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Loading storage driver: overlay2
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:22:04</span>
                <span className="text-primary-fixed-dim shrink-0">[DEBUG]</span>
                <span className="text-inverse-on-surface">
                  Initializing graphdriver: overlay2
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:22:05</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Firewalld running: false
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:22:07</span>
                <span className="text-error-container shrink-0">[ERROR]</span>
                <span className="text-error-container">
                  Failed to register layer: sha256:0a3...
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:22:08</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Retrying layer pull...
                </span>
              </div>
              <div className="flex gap-space-md opacity-80">
                <span className="text-outline-variant shrink-0">14:23:12</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  API listen on /var/run/docker.sock
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:23:15</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Container "nginx-proxy" started (id: d5e8...)
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:23:16</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Container "redis-main" started (id: a1f2...)
                </span>
              </div>
              {/* <!-- Empty space for stream simulation --> */}
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:24:01</span>
                <span className="text-primary-fixed-dim shrink-0">[DEBUG]</span>
                <span className="text-inverse-on-surface">
                  Collecting system metrics...
                </span>
              </div>
              <div className="flex gap-space-md">
                <span className="text-outline-variant shrink-0">14:24:05</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Garbage collection successful (0.5ms)
                </span>
              </div>
              <div className="flex gap-space-md opacity-40">
                <span className="text-outline-variant shrink-0">14:24:10</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  Waiting for next health check...
                </span>
              </div>
              <div className="flex gap-space-md border-l-2 border-primary pl-space-xs py-space-xs bg-surface-variant/10">
                <span className="text-outline-variant shrink-0">14:25:00</span>
                <span className="text-tertiary-fixed-dim shrink-0">[INFO]</span>
                <span className="text-inverse-on-surface">
                  New configuration detected. Reloading daemon...
                </span>
              </div>
            </div>
            <div className="mt-space-md pt-space-sm border-t border-surface-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-space-md">
                <button className="text-surface-variant hover:text-inverse-on-surface transition-colors flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>
                  <span className="text-label-caps">Download Bundle</span>
                </button>
                <button className="text-surface-variant hover:text-inverse-on-surface transition-colors flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px]">
                    delete_sweep
                  </span>
                  <span className="text-label-caps">Clear Screen</span>
                </button>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-variant/10 px-space-sm py-1 rounded border border-surface-variant/20">
                <span className="text-label-caps text-surface-variant">
                  Lines: 1240
                </span>
              </div>
            </div>
          </section>
        </div>
        {/* <!-- Bottom Metric Bento Row --> */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-md">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-space-md flex items-center justify-between">
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase">
                Engine Status
              </p>
              <h3 className="text-h2 font-h2 text-primary">Operational</h3>
            </div>
            <span
              className="material-symbols-outlined text-primary text-[32px]"
            //   style={{fontVariationSettings: "FILL" 1'}}
            >
              check_circle
            </span>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-space-md flex items-center justify-between">
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase">
                Uptime
              </p>
              <h3 className="text-h2 font-h2 text-on-surface">14d 2h 44m</h3>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
              schedule
            </span>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-space-md flex items-center justify-between">
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase">
                Disk Usage
              </p>
              <h3 className="text-h2 font-h2 text-on-surface">42.8 GB</h3>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
              hard_drive
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
