import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Pencil, ShieldCheck, ShieldAlert } from "lucide-react";
import api from "../lib/axios";
import { Card, Button, Modal } from "../components/ui";

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

function ProfileForm({ initialName, onSaved }) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.patch("/api/auth/me", { name });
      onSaved(name);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-space-md">
      <FormField label="Full Name">
        <input
          type="text"
          required
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      {error && <p className="text-error text-body-main">{error}</p>}
      <div className="flex justify-end pt-space-xs">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
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
    <form onSubmit={onSubmit} className="space-y-space-md">
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
  );
}

export default function Profile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

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

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-space-lg text-center">
        <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">My Profile</h1>
        <p className="font-body-main text-body-main text-on-surface-variant">
          Manage your account details and security.
        </p>
      </div>

      <Card>
        <div className="flex flex-col items-center text-center pb-space-md mb-space-md border-b border-outline-variant">
          <div className="h-16 w-16 rounded-full bg-surface-container-high flex items-center justify-center mb-space-sm">
            <User size={26} className="text-on-surface-variant" />
          </div>
          <h2 className="font-h2 text-h2 text-on-surface">{name || "—"}</h2>
          <p className="font-body-main text-body-main text-on-surface-variant">{email}</p>
          {emailVerified ? (
            <span className="flex items-center gap-space-xs text-[12px] text-[#5fd696] mt-space-xs">
              <ShieldCheck size={14} />
              Email verified
            </span>
          ) : (
            <div className="flex items-center gap-space-sm text-[12px] text-error mt-space-xs">
              <ShieldAlert size={14} />
              <span>Email not verified</span>
              <button
                type="button"
                onClick={onResendVerification}
                disabled={resendState !== "idle"}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {resendState === "sent"
                  ? "Verification sent"
                  : resendState === "sending"
                    ? "Sending…"
                    : "Resend"}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-space-xs">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center justify-between py-space-sm text-left hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <Pencil size={16} className="text-primary" />
              <span className="font-body-main text-body-main text-on-surface">Edit Profile</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="w-full flex items-center justify-between py-space-sm text-left hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <Lock size={16} className="text-primary" />
              <span className="font-body-main text-body-main text-on-surface">Change Password</span>
            </div>
          </button>
        </div>
      </Card>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Edit Profile">
        <ProfileForm
          initialName={name}
          onSaved={(newName) => {
            setName(newName);
            setProfileOpen(false);
          }}
        />
      </Modal>
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change Password">
        <ChangePasswordForm />
      </Modal>
    </div>
  );
}
