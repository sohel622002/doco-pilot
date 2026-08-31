import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { timeAgo } from "../lib/utils";

const STATUS_META = {
  fired: { label: "Fired", tone: "text-error", dot: "bg-error" },
  resolved: { label: "Resolved", tone: "text-primary", dot: "bg-primary" },
};

const RULE_LABEL = {
  high_cpu_usage: "High CPU Usage",
  container_crashed: "Container Crashed",
};

function AlertRuleConfig({ serverId }) {
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
    <section className="p-space-md bg-surface border border-outline-variant rounded-lg space-y-space-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-surface-container-high rounded-lg">
          <span className="material-symbols-outlined text-primary" data-icon="notifications">
            notifications
          </span>
        </div>
        <div>
          <h3 className="font-h2 text-h2">Alert Rules</h3>
          <p className="text-body-main text-on-surface-variant">
            POST a JSON payload to this webhook when a container crashes or CPU usage
            crosses the threshold. Works with Slack/Discord incoming webhooks, n8n,
            Zapier, or any endpoint that accepts a JSON POST.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-space-sm items-end">
        <div className="md:col-span-2 space-y-space-xs">
          <label className="font-body-main font-semibold block">Webhook URL</label>
          <input
            type="url"
            placeholder="https://hooks.slack.com/services/…"
            className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg font-code text-code outline-none focus:ring-1 focus:ring-primary"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
        <div className="space-y-space-xs">
          <label className="font-body-main font-semibold block">CPU Alert Threshold (%)</label>
          <input
            type="number"
            min={50}
            max={99}
            className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg font-body-main outline-none focus:ring-1 focus:ring-primary"
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
            className="px-space-md py-space-xs rounded-full bg-primary text-on-primary font-body-main hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Alerts() {
  const { serverId } = useParams();

  const { data: uptimeData } = useQuery({
    queryKey: ["uptime", serverId],
    queryFn: async () => (await api.get(`/api/servers/${serverId}/uptime`)).data,
    enabled: !!serverId,
    refetchInterval: 60000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", serverId],
    queryFn: async () => (await api.get(`/api/servers/${serverId}/alerts`, { params: { limit: 50 } })).data,
    enabled: !!serverId,
    refetchInterval: 15000,
  });

  const alerts = alertsData?.alerts ?? [];

  return (
    <div className="max-w-container-max mx-auto p-space-md space-y-space-md">
      <div>
        <h2 className="font-h1 text-h1 text-on-background">Alerts &amp; Monitoring</h2>
        <p className="text-on-surface-variant font-body-main">
          Configure alert rules and review fired/resolved alert history.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            30-Day Uptime
          </span>
          <span className="text-stat font-h1">
            {uptimeData ? `${uptimeData.uptimePercent}%` : "—"}
          </span>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Agent Status
          </span>
          <span className="text-stat font-h1">
            {uptimeData?.currentlyConnected ? "Online" : "Offline"}
          </span>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Alerts (last 50)
          </span>
          <span className="text-stat font-h1">{alerts.length}</span>
        </div>
      </div>

      <AlertRuleConfig serverId={serverId} />

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-space-md border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">Alert History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Rule
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Status
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Value / Threshold
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {alerts.map((alert) => {
                const status = STATUS_META[alert.status] ?? STATUS_META.fired;
                return (
                  <tr key={alert.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-space-md py-space-sm text-on-surface">
                      {RULE_LABEL[alert.rule_type] ?? alert.rule_type}
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className={`inline-flex items-center gap-space-xs text-label-caps ${status.tone}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm font-code text-xs text-on-surface-variant">
                      {alert.value ?? "-"}
                      {alert.threshold != null ? ` / ${alert.threshold}` : ""}
                    </td>
                    <td className="px-space-md py-space-sm text-on-surface-variant">
                      {timeAgo(alert.ts)}
                    </td>
                  </tr>
                );
              })}
              {alerts.length === 0 && (
                <tr>
                  <td className="px-space-md py-space-md text-on-surface-variant" colSpan={4}>
                    No alerts fired yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
