import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AgentInstallation from "../components/AgentInstallation";
import api from "../lib/axios";

function AlertsCard({ serverId }) {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [cpuThreshold, setCpuThreshold] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get(`/api/servers/${serverId}`).then((res) => {
      setWebhookUrl(res.data?.server?.alert_webhook_url || "");
      setCpuThreshold(res.data?.server?.alert_cpu_threshold ?? 90);
    });
  }, [serverId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.patch(`/api/servers/${serverId}`, {
        alertWebhookUrl: webhookUrl,
        alertCpuThreshold: Number(cpuThreshold),
      });
      setSuccess("Alert settings saved.");
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save alert settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="lg:col-span-3 p-md bg-surface border border-outline-variant rounded-lg space-y-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-surface-container-high rounded-lg">
          <span className="material-symbols-outlined text-primary" data-icon="notifications">
            notifications
          </span>
        </div>
        <div>
          <h3 className="font-h2 text-h2">Alerts</h3>
          <p className="text-body-main text-on-surface-variant">
            POST a JSON payload to this webhook when a container crashes or CPU usage
            crosses the threshold. Works with Slack/Discord incoming webhooks, n8n,
            Zapier, or any endpoint that accepts a JSON POST.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-sm items-end">
        <div className="md:col-span-2 space-y-xs">
          <label className="font-body-main font-semibold block">Webhook URL</label>
          <input
            type="url"
            placeholder="https://hooks.slack.com/services/…"
            className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg font-code text-code outline-none focus:ring-1 focus:ring-primary"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
        <div className="space-y-xs">
          <label className="font-body-main font-semibold block">CPU Alert Threshold (%)</label>
          <input
            type="number"
            min={50}
            max={99}
            className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg font-body-main outline-none focus:ring-1 focus:ring-primary"
            value={cpuThreshold}
            onChange={(e) => setCpuThreshold(e.target.value)}
          />
        </div>
        <div className="md:col-span-3 flex items-center justify-between">
          <div>
            {error && <p className="text-error text-body-main">{error}</p>}
            {success && <p className="text-primary text-body-main">{success}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-md py-xs rounded bg-primary text-on-primary font-body-main hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Infrastructure() {
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
    <div className="max-w-container-max mx-auto p-md">
      <div className="flex justify-between items-end pb-sm">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant font-label-caps mb-1">
            <span>Infrastructure</span>
            <span
              className="material-symbols-outlined text-[14px]"
              data-icon="chevron_right"
            >
              chevron_right
            </span>
            <span>DockerNode-01</span>
          </nav>
          <h2 className="font-h1 text-h1 text-on-surface">
            Server Configuration
          </h2>
        </div>
        <div className="flex gap-sm">
          <button className="flex items-center gap-2 px-4 py-2 thin-border rounded-lg bg-surface hover:bg-surface-container-low transition-colors font-body-main">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* <!-- Server API Details Card --> */}
        {/* <div className="lg:col-span-1 p-md bg-surface border border-outline-variant rounded-lg flex flex-col space-y-md">
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
        <AlertsCard serverId={serverId} />
        {/* <!-- Security/Access Tokens Card --> */}
        <div className="lg:col-span-3 p-md bg-surface border border-outline-variant rounded-lg space-y-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface-container-high rounded-lg">
                <span
                  className="material-symbols-outlined text-primary"
                  data-icon="key"
                >
                  key
                </span>
              </div>
              <h3 className="font-h2 text-h2">API Access &amp; Security</h3>
            </div>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg font-body-main text-[13px] hover:opacity-90">
              Create New Token
            </button>
          </div>
          <div className="space-y-0 thin-border rounded-lg overflow-hidden">
            {/* <!-- Token Row --> */}
            <div className="flex items-center justify-between p-sm hover:bg-surface-container-low transition-colors border-b border-outline-variant last:border-b-0">
              <div className="flex items-center gap-md">
                <div className="flex flex-col">
                  <span className="font-body-main font-semibold">
                    Primary Agent Token
                  </span>
                  <span className="font-code text-[12px] text-on-surface-variant">
                    dk_live_9a2b••••••••••••••••3h5i
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-lg">
                <div className="hidden md:flex flex-col items-end">
                  <span className="font-label-caps text-on-surface-variant">
                    LAST USED
                  </span>
                  <span className="font-body-main text-[13px]">
                    2 minutes ago
                  </span>
                </div>
                <div className="flex gap-sm">
                  <button className="p-2 hover:text-primary transition-colors">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      data-icon="visibility"
                    >
                      visibility
                    </span>
                  </button>
                  <button className="p-2 hover:text-error transition-colors">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      data-icon="published_with_changes"
                    >
                      published_with_changes
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {/* <!-- Token Row --> */}
            <div className="flex items-center justify-between p-sm hover:bg-surface-container-low transition-colors border-b border-outline-variant last:border-b-0">
              <div className="flex items-center gap-md">
                <div className="flex flex-col">
                  <span className="font-body-main font-semibold">
                    Backup Monitoring
                  </span>
                  <span className="font-code text-[12px] text-on-surface-variant">
                    dk_live_k1l2••••••••••••••••p9r0
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-lg">
                <div className="hidden md:flex flex-col items-end">
                  <span className="font-label-caps text-on-surface-variant">
                    LAST USED
                  </span>
                  <span className="font-body-main text-[13px]">Never</span>
                </div>
                <div className="flex gap-sm">
                  <button className="p-2 hover:text-primary transition-colors">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      data-icon="visibility"
                    >
                      visibility
                    </span>
                  </button>
                  <button className="p-2 hover:text-error transition-colors">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      data-icon="published_with_changes"
                    >
                      published_with_changes
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* <!-- Danger Zone --> */}
        <div className="lg:col-span-3 p-md bg-surface border border-error rounded-lg space-y-sm">
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
              className="px-4 py-2 bg-error text-on-error rounded-lg font-body-main text-[13px] hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {deleting ? "Deleting…" : "Delete Server"}
            </button>
          </div>
        </div>
      </div>
      {/* <!-- Documentation Link --> */}
      <div className="pt-lg flex items-center justify-center">
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
