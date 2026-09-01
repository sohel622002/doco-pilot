import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import api from "../lib/axios";
import { Card } from "../components/ui";
import AgentInstallation from "../components/AgentInstallation";

function ServerSetupSection() {
  return (
    <div>
      <Card>
        <AgentInstallation />
      </Card>
      <div className="pt-space-lg flex items-center justify-center">
        <a
          className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors font-body-main text-body-main"
          href="#"
        >
          <BookOpen size={16} />
          Read the detailed Server Setup Guide
        </a>
      </div>
    </div>
  );
}

function DangerZoneSection() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteServer = async () => {
    if (!window.confirm("Delete this server? The agent will be disconnected and its credentials revoked. This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/api/servers/${serverId}`);
      navigate("/");
    } catch (err) {
      console.error("Failed to delete server:", err);
      setDeleting(false);
    }
  };

  return (
    <div className="p-space-md bg-card border border-error/40 rounded-lg">
      <div className="flex items-center justify-between gap-space-md">
        <div>
          <h3 className="font-h2 text-h2 text-error">Danger Zone</h3>
          <p className="font-body-main text-body-main text-on-surface-variant">
            Deleting this server revokes the agent's credentials and removes it
            from your account. The agent container itself must be removed manually
            from the host.
          </p>
        </div>
        <button
          onClick={handleDeleteServer}
          disabled={deleting}
          className="h-9 px-space-md rounded-md bg-error text-on-error font-body-main text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {deleting ? "Deleting…" : "Delete Server"}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="max-w-container-max mx-auto space-y-3">
      <div>
        <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">Settings</h1>
        <p className="font-body-main text-body-main text-on-surface-variant">
          Manage your server configuration.
        </p>
      </div>

      <ServerSetupSection />
      <DangerZoneSection />
    </div>
  );
}
