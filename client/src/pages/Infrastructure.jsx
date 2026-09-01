import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, RefreshCw, BellRing, BookOpen } from "lucide-react";
import AgentInstallation from "../components/AgentInstallation";
import api from "../lib/axios";
import { useServers } from "../hooks/useServers";
import { Card } from "../components/ui";

export default function Infrastructure() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const { data: serversData } = useServers();
  const selectedServer = serversData?.servers?.find((s) => s.id === serverId);

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
    <div className="max-w-container-max mx-auto">
      <div className="flex justify-between items-end mb-space-lg">
        <div>
          <nav className="flex items-center gap-space-xs text-on-surface-variant font-label-caps text-label-caps mb-space-xs">
            <span>Infrastructure</span>
            <ChevronRight size={12} />
            <span>{selectedServer?.name ?? serverId}</span>
          </nav>
          <h2 className="font-h1 text-h1 text-on-surface">Server Configuration</h2>
        </div>
        <button className="flex items-center gap-space-xs h-9 px-space-sm rounded-md border border-outline-variant text-on-surface-variant text-[13px] font-medium hover:bg-surface-container transition-colors">
          <RefreshCw size={14} />
          Refresh Status
        </button>
      </div>
      {/* <!-- Dashboard Grid --> */}
      <div className="grid grid-cols-1 gap-3">
        {/* <!-- Docker Agent Setup Card (Main Action) --> */}
        <Card>
          <AgentInstallation />
        </Card>
        {/* <!-- Alerts link --> */}
        <Link to={`/${serverId}/alerts`}>
          <Card
            hoverable
            className="flex items-center justify-between hover:bg-surface-container-high"
          >
            <div className="flex items-center gap-space-md">
              <div className="h-10 w-10 rounded-md bg-primary-container flex items-center justify-center shrink-0">
                <BellRing size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-h2 text-h2 text-on-surface">Alerts &amp; Monitoring</h3>
                <p className="font-body-main text-body-main text-on-surface-variant">
                  Configure alert rules, review alert history, and see 30-day uptime.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant shrink-0" />
          </Card>
        </Link>
        {/* <!-- Danger Zone --> */}
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
      </div>
      {/* <!-- Documentation Link --> */}
      <div className="pt-space-lg flex items-center justify-center">
        <a
          className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors font-body-main text-body-main"
          href="#"
        >
          <BookOpen size={16} />
          Read the detailed Infrastructure Setup Guide
        </a>
      </div>
    </div>
  );
}
