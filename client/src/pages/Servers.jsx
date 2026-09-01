import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useServers } from "../hooks/useServers";
import api from "../lib/axios";
import { Plus, Server as ServerIcon, Trash2, Copy, Check, Filter } from "lucide-react";
import { Card, Badge, Button } from "../components/ui";

const HEALTH_META = {
  ok: { label: "OK", dot: "bg-[#5fd696]", tone: "success" },
  warning: { label: "Warning", dot: "bg-[#e8b458]", tone: "warning" },
  critical: { label: "Critical", dot: "bg-error", tone: "error" },
  unknown: { label: "Unknown", dot: "bg-on-surface-variant", tone: "neutral" },
};

// Worst-first — used both for the filter dropdown order and the default sort.
const HEALTH_RANK = { critical: 0, warning: 1, unknown: 2, ok: 3 };

function computeHealth(server, latestMetric) {
  if (!server.agent_connected) return "critical";
  if (!latestMetric) return "unknown";

  const threshold = server.alert_cpu_threshold ?? 90;
  const cpu = Number(latestMetric.cpu_pct ?? 0);
  const mem = Number(latestMetric.mem_pct ?? 0);
  const disk = Number(latestMetric.disk_pct ?? 0);

  if (cpu >= threshold || mem >= 90 || disk >= 90) return "critical";
  if (cpu >= threshold * 0.8 || mem >= 75 || disk >= 75) return "warning";
  return "ok";
}

function Sparkline({ samples, dataKey, color }) {
  if (!samples || samples.length < 2) {
    return <div className="h-8 flex items-center text-[10px] text-on-surface-variant">No data yet</div>;
  }
  const points = samples.map((s) => Math.max(0, Math.min(100, Number(s[dataKey]) || 0)));
  const width = 100;
  const height = 32;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - (p / 100) * height).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AddServerForm({ onCreated }) {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/servers", { name, ip });
      setName("");
      setIp("");
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card as="form" onSubmit={onSubmit} className="flex flex-col md:flex-row gap-space-sm md:items-end mb-3">
      <div className="flex-1 space-y-space-xs">
        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
          Name
        </label>
        <input
          required
          className="w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface outline-none focus:border-outline"
          placeholder="prod-01"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex-1 space-y-space-xs">
        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
          IP / Hostname
        </label>
        <input
          required
          className="w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md text-body-main text-on-surface outline-none focus:border-outline"
          placeholder="203.0.113.10"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="h-10">
        <Plus size={16} />
        {loading ? "Creating…" : "Add Server"}
      </Button>
      {error && <p className="text-error text-body-main md:ml-space-sm">{error}</p>}
    </Card>
  );
}

export default function Servers() {
  const { data, isLoading } = useServers();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newServer, setNewServer] = useState(null);
  const [healthFilter, setHealthFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  const servers = useMemo(() => data?.servers || [], [data]);

  const metricsQueries = useQueries({
    queries: servers.map((server) => ({
      queryKey: ["metrics", server.id, "1h"],
      queryFn: async () =>
        (await api.get(`/api/servers/${server.id}/metrics`, { params: { range: "1h" } })).data,
      enabled: !!server.id,
      refetchInterval: 30000,
    })),
  });

  const serversWithHealth = useMemo(
    () =>
      servers.map((server, i) => {
        const samples = metricsQueries[i]?.data?.metrics ?? [];
        const latest = samples[samples.length - 1] ?? null;
        return { server, samples, health: computeHealth(server, latest) };
      }),
    [servers, metricsQueries],
  );

  const visibleServers = useMemo(() => {
    const filtered =
      healthFilter === "all"
        ? serversWithHealth
        : serversWithHealth.filter((s) => s.health === healthFilter);
    return [...filtered].sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health]);
  }, [serversWithHealth, healthFilter]);

  const handleCreated = (created) => {
    setNewServer(created);
    queryClient.invalidateQueries({ queryKey: ["servers"] });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this server? This cannot be undone.")) return;
    await api.delete(`/api/servers/${id}`);
    queryClient.invalidateQueries({ queryKey: ["servers"] });
  };

  return (
    <div className="min-h-screen bg-background p-space-lg">
      <div className="max-w-container-max mx-auto">
        <div className="mb-space-lg flex flex-col md:flex-row md:items-end md:justify-between gap-space-sm">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">Your Servers</h1>
            <p className="font-body-main text-body-main text-on-surface-variant">
              All servers registered to your account.
            </p>
          </div>
          {servers.length > 1 && (
            <div className="flex items-center gap-space-xs h-9 px-space-sm rounded-md border border-outline-variant text-on-surface-variant">
              <Filter size={14} />
              <select
                className="bg-transparent text-[13px] font-medium text-on-surface outline-none"
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value)}
              >
                <option value="all">All Health</option>
                {Object.keys(HEALTH_RANK).map((key) => (
                  <option key={key} value={key}>
                    {HEALTH_META[key].label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <AddServerForm onCreated={handleCreated} />

        {newServer?.dockerCommand && (
          <Card className="mb-3 relative">
            <p className="font-body-main text-body-main text-on-surface-variant mb-space-sm">
              Server created — run this on the target host to connect its agent:
            </p>
            <div className="relative">
              <div className="p-space-md pr-14 font-code text-code text-on-surface-variant overflow-x-auto rounded-md bg-surface-container border border-outline-variant">
                <pre>{newServer.dockerCommand}</pre>
              </div>
              <button
                className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(newServer.dockerCommand);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check size={16} className="text-[#5fd696]" /> : <Copy size={16} />}
              </button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <p className="text-on-surface-variant font-body-main">Loading…</p>
        ) : servers.length === 0 ? (
          <p className="text-on-surface-variant font-body-main">
            No servers yet — add one above to get started.
          </p>
        ) : visibleServers.length === 0 ? (
          <p className="text-on-surface-variant font-body-main">No servers match this health filter.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {visibleServers.map(({ server, samples, health }) => (
              <Card
                key={server.id}
                hoverable
                className="flex flex-col gap-space-sm"
                onClick={() => navigate(`/${server.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="h-8 w-8 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                      <ServerIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-h2 text-[14px] text-on-surface truncate">{server.name}</p>
                      <p className="text-label-caps text-on-surface-variant font-code truncate">
                        {server.ip}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs shrink-0">
                    <Badge tone={HEALTH_META[health].tone} title={`Health: ${HEALTH_META[health].label}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_META[health].dot}`}></span>
                      {HEALTH_META[health].label}
                    </Badge>
                    <button
                      title="Delete server"
                      className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(server.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-space-md">
                  <div className="flex-1">
                    <Sparkline samples={samples} dataKey="cpu_pct" color="var(--color-primary)" />
                    <span className="text-[10px] text-on-surface-variant">CPU (1h)</span>
                  </div>
                  <div className="flex-1">
                    <Sparkline samples={samples} dataKey="mem_pct" color="var(--color-secondary)" />
                    <span className="text-[10px] text-on-surface-variant">Memory (1h)</span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      server.agent_connected ? "bg-[#5fd696]" : "bg-on-surface-variant"
                    }`}
                  ></span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    {server.agent_connected ? "Agent Online" : "Agent Offline"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
