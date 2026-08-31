import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AgentInstallation from "../components/AgentInstallation";
import api from "../lib/axios";
import { useServers } from "../hooks/useServers";

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
    <div className="max-w-container-max mx-auto p-space-md">
      <div className="flex justify-between items-end pb-space-sm">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant font-label-caps mb-1">
            <span>Infrastructure</span>
            <span
              className="material-symbols-outlined text-[14px]"
              data-icon="chevron_right"
            >
              chevron_right
            </span>
            <span>{selectedServer?.name ?? serverId}</span>
          </nav>
          <h2 className="font-h1 text-h1 text-on-surface">
            Server Configuration
          </h2>
        </div>
        <div className="flex gap-space-sm">
          <button className="flex items-center gap-2 px-4 py-2 thin-border rounded-full bg-surface hover:bg-surface-container-low transition-colors font-body-main">
            <span
              className="material-symbols-outlined text-[18px]"
              data-icon="refresh"
            >
              refresh
            </span>
            Refresh Status
          </button>
        </div>
      </div>
      {/* <!-- Dashboard Grid --> */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        {/* <!-- Server API Details Card --> */}
        {/* <div className="lg:col-span-1 p-space-md bg-surface border border-outline-variant rounded-lg flex flex-col space-y-space-md">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface-container-high rounded-lg">
                <span
                  className="material-symbols-outlined text-primary"
                  data-icon="lan"
                >
                  lan
                </span>
              </div>
              <h3 className="font-h2 text-h2">API Endpoint</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="font-label-caps text-[10px] font-bold">
                API ONLINE
              </span>
            </div>
          </div>
          <div>
            <p className="font-label-caps text-on-surface-variant mb-2">
              ENDPOINT URL
            </p>
            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant font-code text-code text-on-surface-variant break-all">
              https://api.dockerdessk.io/v1/nodes/node-01/connect
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2 border border-outline-variant rounded-lg font-body-main hover:bg-surface-container-low transition-colors">
            <span
              className="material-symbols-outlined text-[18px]"
              data-icon="content_copy"
            >
              content_copy
            </span>
            Copy API URL
          </button>
        </div> */}
        {/* <!-- Docker Agent Setup Card (Main Action) --> */}
        <div className="lg:col-span-3">
          <AgentInstallation />
        </div>
        {/* <!-- Alerts link --> */}
        <Link
          to={`/${serverId}/alerts`}
          className="lg:col-span-3 p-space-md bg-surface border border-outline-variant rounded-lg flex items-center justify-between hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-container-high rounded-lg">
              <span className="material-symbols-outlined text-primary" data-icon="notifications">
                notifications
              </span>
            </div>
            <div>
              <h3 className="font-h2 text-h2">Alerts &amp; Monitoring</h3>
              <p className="text-body-main text-on-surface-variant">
                Configure alert rules, review alert history, and see 30-day uptime.
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant" data-icon="chevron_right">
            chevron_right
          </span>
        </Link>
        {/* <!-- Danger Zone --> */}
        <div className="lg:col-span-3 p-space-md bg-surface border border-error rounded-lg space-y-space-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-h2 text-h2 text-error">Danger Zone</h3>
              <p className="text-body-main text-on-surface-variant">
                Deleting this server revokes the agent's credentials and removes it
                from your account. The agent container itself must be removed manually
                from the host.
              </p>
            </div>
            <button
              onClick={handleDeleteServer}
              disabled={deleting}
              className="px-4 py-2 bg-error text-on-error rounded-full font-body-main text-[13px] hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {deleting ? "Deleting…" : "Delete Server"}
            </button>
          </div>
        </div>
      </div>
      {/* <!-- Documentation Link --> */}
      <div className="pt-space-lg flex items-center justify-center">
        <a
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body-main"
          href="#"
        >
          <span
            className="material-symbols-outlined text-[18px]"
            data-icon="menu_book"
          >
            menu_book
          </span>
          Read the detailed Infrastructure Setup Guide
        </a>
      </div>
    </div>
  );
}
