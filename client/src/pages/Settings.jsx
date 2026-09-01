import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  SlidersHorizontal,
  Terminal,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  HardDrive,
} from "lucide-react";
import api from "../lib/axios";
import { Card, Button } from "../components/ui";

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-space-sm mb-space-md pb-space-sm border-b border-outline-variant">
      <Icon size={17} className="text-primary" />
      <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-space-xs">
      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface outline-none focus:border-outline disabled:text-on-surface-variant disabled:cursor-not-allowed";

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
    <Card>
      <SectionHeader icon={User} title="Profile" />
      <form onSubmit={onSubmit} className="space-y-space-md max-w-md">
        <FormField label="Full Name">
          <input
            type="text"
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Email">
          <input type="email" disabled className={inputClass} value={email} />
          {!emailVerified && (
            <div className="flex items-center gap-space-sm text-[12px] text-error pt-space-xs">
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
        </FormField>
        {error && <p className="text-error text-body-main">{error}</p>}
        {success && <p className="text-[#5fd696] text-body-main">{success}</p>}
        <div className="flex justify-end pt-space-xs">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Card>
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
    <Card>
      <SectionHeader icon={Lock} title="Change Password" />
      <form onSubmit={onSubmit} className="space-y-space-md max-w-md">
        <FormField label="Current Password">
          <input
            type="password"
            required
            className={inputClass}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </FormField>
        <FormField label="New Password">
          <input
            type="password"
            required
            className={inputClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </FormField>
        <FormField label="Confirm New Password">
          <input
            type="password"
            required
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </FormField>
        {error && <p className="text-error text-body-main">{error}</p>}
        {success && <p className="text-[#5fd696] text-body-main">{success}</p>}
        <div className="flex justify-end pt-space-xs">
          <Button type="submit" disabled={loading}>
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Toggle({ checked }) {
  return (
    <div
      className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors shrink-0 ${
        checked ? "bg-primary" : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      ></span>
    </div>
  );
}

const LOG_LEVEL_COLOR = {
  INFO: "text-on-surface-variant",
  DEBUG: "text-primary",
  ERROR: "text-error",
};

const MOCK_LOGS = [
  { ts: "14:22:01", level: "INFO", msg: "Docker Engine v24.0.5 starting..." },
  { ts: "14:22:02", level: "INFO", msg: "Loading storage driver: overlay2" },
  { ts: "14:22:04", level: "DEBUG", msg: "Initializing graphdriver: overlay2" },
  { ts: "14:22:05", level: "INFO", msg: "Firewalld running: false" },
  { ts: "14:22:07", level: "ERROR", msg: "Failed to register layer: sha256:0a3..." },
  { ts: "14:22:08", level: "INFO", msg: "Retrying layer pull..." },
  { ts: "14:23:12", level: "INFO", msg: "API listen on /var/run/docker.sock" },
  { ts: "14:23:15", level: "INFO", msg: 'Container "nginx-proxy" started (id: d5e8...)' },
  { ts: "14:23:16", level: "INFO", msg: 'Container "redis-main" started (id: a1f2...)' },
  { ts: "14:24:01", level: "DEBUG", msg: "Collecting system metrics..." },
  { ts: "14:24:05", level: "INFO", msg: "Garbage collection successful (0.5ms)" },
  { ts: "14:24:10", level: "INFO", msg: "Waiting for next health check..." },
  { ts: "14:25:00", level: "INFO", msg: "New configuration detected. Reloading daemon..." },
];

export default function Settings() {
  return (
    <div className="max-w-container-max mx-auto">
      <div className="mb-space-lg">
        <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">Settings &amp; Logs</h1>
        <p className="font-body-main text-body-main text-on-surface-variant">
          Configure your Docker Engine and monitor real-time system output.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-3">
        <ProfileCard />
        <ChangePasswordCard />
      </div>

      <div className="grid grid-cols-2 gap-3 items-start mb-3">
        {/* <!-- Engine Configuration --> */}
        <Card>
          <SectionHeader icon={SlidersHorizontal} title="Engine Configuration" />
          <div className="space-y-space-lg">
            <div className="space-y-space-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                General Parameters
              </p>
              <div className="flex items-center justify-between py-space-sm border-b border-outline-variant">
                <div>
                  <p className="font-body-main text-body-main font-medium text-on-surface">
                    Debug Mode
                  </p>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    Enable verbose logging for engine troubleshooting.
                  </p>
                </div>
                <Toggle checked={false} />
              </div>
              <div className="flex items-center justify-between py-space-sm border-b border-outline-variant">
                <div>
                  <p className="font-body-main text-body-main font-medium text-on-surface">
                    Experimental Features
                  </p>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    Access preview features and alpha plugins.
                  </p>
                </div>
                <Toggle checked={true} />
              </div>
            </div>

            <div className="space-y-space-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Resource Allocation
              </p>
              <FormField label="Maximum CPU Usage (%)">
                <input className={inputClass} type="text" value="80" readOnly />
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-xs">
                  <div className="bg-primary h-full rounded-full w-[80%]"></div>
                </div>
              </FormField>
              <FormField label="Memory Limit (GB)">
                <input className={inputClass} type="text" value="4" readOnly />
              </FormField>
            </div>

            <div className="space-y-space-sm">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Daemon JSON
              </p>
              <div className="bg-surface-container border border-outline-variant rounded-md p-space-sm font-code text-code text-on-surface-variant overflow-x-auto">
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

            <div className="flex justify-end gap-space-sm">
              <button className="h-9 px-space-md rounded-md border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container transition-colors">
                Discard
              </button>
              <Button>Apply Changes</Button>
            </div>
          </div>
        </Card>

        {/* <!-- System Logs --> */}
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-space-md pb-space-sm border-b border-outline-variant">
            <div className="flex items-center gap-space-sm">
              <Terminal size={17} className="text-primary" />
              <h2 className="font-h2 text-h2 text-on-surface">Real-time Log Stream</h2>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5fd696] animate-pulse"></span>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                Streaming Live
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto font-code text-code space-y-space-xs pr-space-xs">
            {MOCK_LOGS.map((line, i) => (
              <div
                className={`flex gap-space-sm ${
                  i === MOCK_LOGS.length - 1
                    ? "border-l-2 border-primary pl-space-xs py-space-xs bg-surface-container"
                    : ""
                }`}
                key={i}
              >
                <span className="text-on-surface-variant opacity-60 shrink-0">{line.ts}</span>
                <span className={`shrink-0 ${LOG_LEVEL_COLOR[line.level]}`}>[{line.level}]</span>
                <span className={line.level === "ERROR" ? "text-error" : "text-on-surface"}>
                  {line.msg}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-space-md pt-space-sm border-t border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <button className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors">
                <Download size={15} />
                <span className="font-label-caps text-label-caps">Download Bundle</span>
              </button>
              <button className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors">
                <Trash2 size={15} />
                <span className="font-label-caps text-label-caps">Clear Screen</span>
              </button>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-1 rounded-md border border-outline-variant">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Lines: {MOCK_LOGS.length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* <!-- Bottom Metric Row --> */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Engine Status
            </p>
            <h3 className="text-h2 font-h2 text-on-surface">Operational</h3>
          </div>
          <div className="h-10 w-10 rounded-md bg-[#173626] flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-[#5fd696]" />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Uptime
            </p>
            <h3 className="text-h2 font-h2 text-on-surface">14d 2h 44m</h3>
          </div>
          <div className="h-10 w-10 rounded-md bg-surface-container-high flex items-center justify-center shrink-0">
            <Clock size={18} className="text-on-surface-variant" />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
              Disk Usage
            </p>
            <h3 className="text-h2 font-h2 text-on-surface">42.8 GB</h3>
          </div>
          <div className="h-10 w-10 rounded-md bg-surface-container-high flex items-center justify-center shrink-0">
            <HardDrive size={18} className="text-on-surface-variant" />
          </div>
        </Card>
      </div>
    </div>
  );
}
