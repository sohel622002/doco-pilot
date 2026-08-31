import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useServers } from "../hooks/useServers";
import api from "../lib/axios";
import { Plus, Server as ServerIcon, Trash2, Copy } from "lucide-react";

const HEALTH_META = {
  ok: { label: "OK", dot: "bg-primary", text: "text-primary" },
  warning: { label: "Warning", dot: "bg-amber-500", text: "text-amber-500" },
  critical: { label: "Critical", dot: "bg-error", text: "text-error" },
  unknown: { label: "Unknown", dot: "bg-outline", text: "text-on-surface-variant" },
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
    <form
      onSubmit={onSubmit}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md flex flex-col md:flex-row gap-space-sm md:items-end mb-space-md"
    >
      <div className="flex-1 space-y-space-xs">
        <label className="text-label-caps text-on-surface-variant uppercase">Name</label>
        <input
          required
          className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main outline-none focus:ring-1 focus:ring-primary"
          placeholder="prod-01"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex-1 space-y-space-xs">
        <label className="text-label-caps text-on-surface-variant uppercase">IP / Hostname</label>
        <input
          required
          className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main outline-none focus:ring-1 focus:ring-primary"
          placeholder="203.0.113.10"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-10 px-space-md flex items-center gap-space-xs bg-primary text-on-primary rounded-full font-body-main font-bold hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={16} />
        {loading ? "Creating…" : "Add Server"}
      </button>
      {error && <p className="text-error text-body-main md:ml-space-sm">{error}</p>}
    </form>
  );
}

export default function Servers() {
  const { data, isLoading } = useServers();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newServer, setNewServer] = useState(null);
  const [healthFilter, setHealthFilter] = useState("all");

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
    <div className="max-w-container-max mx-auto p-space-md">
      <div className="mb-space-lg flex flex-col md:flex-row md:items-end md:justify-between gap-space-sm">
        <div>
          <h1 className="font-h1 text-h1 text-on-background mb-space-xs">Your Servers</h1>
          <p className="text-body-large text-on-surface-variant">
            All servers registered to your account.
          </p>
        </div>
        {servers.length > 1 && (
          <div className="flex items-center gap-space-xs bg-surface-container-low border border-outline-variant px-space-sm py-space-xs rounded-full">
            <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
              Health:
            </span>
            <select
              className="bg-transparent text-label-caps outline-none"
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
            >
              <option value="all">All</option>
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
        <div className="mb-space-md p-space-md bg-inverse-surface text-inverse-on-surface rounded-lg font-code text-code overflow-x-auto border border-white/10 relative">
          <p className="mb-space-xs opacity-70">
            Server created — run this on the target host to connect its agent:
          </p>
          <pre>{newServer.dockerCommand}</pre>
          <button
            className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded"
            onClick={() => navigator.clipboard.writeText(newServer.dockerCommand)}
          >
            <Copy size={16} />
          </button>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : servers.length === 0 ? (
        <p className="text-on-surface-variant">
          No servers yet — add one above to get started.
        </p>
      ) : visibleServers.length === 0 ? (
        <p className="text-on-surface-variant">No servers match this health filter.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {visibleServers.map(({ server, samples, health }) => (
            <div
              key={server.id}
              className="bg-surface-container-low border border-outline-variant rounded-xl p-space-md flex flex-col gap-space-sm hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate(`/${server.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="h-8 w-8 rounded bg-primary-container/20 flex items-center justify-center text-primary">
                    <ServerIcon size={18} />
                  </div>
                  <div>
                    <p className="font-h2 text-[14px] text-on-surface">{server.name}</p>
                    <p className="text-label-caps text-on-surface-variant font-code">
                      {server.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs">
                  <span
                    title={`Health: ${HEALTH_META[health].label}`}
                    className={`flex items-center gap-1 px-space-xs py-0.5 rounded-full text-[10px] font-label-caps uppercase ${HEALTH_META[health].text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_META[health].dot}`}></span>
                    {HEALTH_META[health].label}
                  </span>
                  <button
                    title="Delete server"
                    className="p-1 text-on-surface-variant hover:text-error transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(server.id);
                    }}
                  >
                    <Trash2 size={16} />
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
                  className={`w-1.5 h-1.5 rounded-full ${
                    server.agent_connected ? "bg-primary" : "bg-outline"
                  }`}
                ></span>
                <span className="text-label-caps text-on-surface-variant">
                  {server.agent_connected ? "Agent Online" : "Agent Offline"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
