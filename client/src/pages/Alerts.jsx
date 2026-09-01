import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import api from "../lib/axios";
import { timeAgo } from "../lib/utils";
import { Card, Badge, Button } from "../components/ui";

const STATUS_META = {
  fired: { label: "Fired", tone: "error", dot: "bg-error" },
  resolved: { label: "Resolved", tone: "success", dot: "bg-[#5fd696]" },
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
    <Card>
      <div className="flex items-center gap-space-md mb-space-md">
        <div className="h-10 w-10 rounded-md bg-primary-container flex items-center justify-center shrink-0">
          <Bell size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="font-h2 text-h2 text-on-surface">Alert Rules</h3>
          <p className="font-body-main text-body-main text-on-surface-variant">
            POST a JSON payload to this webhook when a container crashes or CPU usage
            crosses the threshold. Works with Slack/Discord incoming webhooks, n8n,
            Zapier, or any endpoint that accepts a JSON POST.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-3 gap-space-sm items-end">
        <div className="col-span-2 space-y-space-xs">
          <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
            Webhook URL
          </label>
          <input
            type="url"
            placeholder="https://hooks.slack.com/services/…"
            className="w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface outline-none focus:border-outline"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
        <div className="space-y-space-xs">
          <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
            CPU Alert Threshold (%)
          </label>
          <input
            type="number"
            min={50}
            max={99}
            className="w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md font-body-main text-on-surface outline-none focus:border-outline"
            value={cpuThreshold}
            onChange={(e) => setCpuThreshold(e.target.value)}
          />
        </div>
        <div className="col-span-3 flex items-center justify-between mt-space-xs">
          <div>
            {error && <p className="text-error text-body-main">{error}</p>}
            {success && <p className="text-[#5fd696] text-body-main">{success}</p>}
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Card>
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
    <div className="max-w-container-max mx-auto">
      <div className="mb-space-lg">
        <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">Alerts &amp; Monitoring</h2>
        <p className="text-on-surface-variant font-body-main">
          Configure alert rules and review fired/resolved alert history.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            30-Day Uptime
          </span>
          <p className="text-stat text-on-surface mt-space-sm">
            {uptimeData ? `${uptimeData.uptimePercent}%` : "—"}
          </p>
        </Card>
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Agent Status
          </span>
          <div className="flex items-center gap-space-xs mt-space-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                uptimeData?.currentlyConnected ? "bg-[#5fd696]" : "bg-error"
              }`}
            ></span>
            <p className="text-stat text-on-surface">
              {uptimeData?.currentlyConnected ? "Online" : "Offline"}
            </p>
          </div>
        </Card>
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Alerts (last 50)
          </span>
          <p className="text-stat text-on-surface mt-space-sm">{alerts.length}</p>
        </Card>
      </div>

      <div className="mb-3">
        <AlertRuleConfig serverId={serverId} />
      </div>

      <div className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <div className="px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">Alert History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Rule
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Value / Threshold
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {alerts.map((alert) => {
                const status = STATUS_META[alert.status] ?? STATUS_META.fired;
                return (
                  <tr key={alert.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-space-md py-space-md text-on-surface whitespace-nowrap">
                      {RULE_LABEL[alert.rule_type] ?? alert.rule_type}
                    </td>
                    <td className="px-space-md py-space-md whitespace-nowrap">
                      <Badge tone={status.tone}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`}></span>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-space-md py-space-md font-code text-code text-on-surface-variant whitespace-nowrap">
                      {alert.value ?? "-"}
                      {alert.threshold != null ? ` / ${alert.threshold}` : ""}
                    </td>
                    <td className="px-space-md py-space-md text-on-surface-variant whitespace-nowrap">
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
