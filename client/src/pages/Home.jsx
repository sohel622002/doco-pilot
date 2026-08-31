import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "../context/WebSocketContext";
import { useParams } from "react-router-dom";
import { WS_ACTIONS } from "../lib/actions";
import { useSystemStore } from "../store/system";
import { useContainerStore } from "../store/container";
import { Card, Badge, StatCard } from "../components/ui";
import { useServers } from "../hooks/useServers";
import api from "../lib/axios";
import { formatUptime, timeAgo } from "../lib/utils";

const RANGES = [
  { key: "1h", label: "1H" },
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
];

const MAX_CHART_SAMPLES = 60;

// Down-sample a longer history to a fixed number of evenly-spaced points
// so the bar chart stays readable at the 7d range.
function downsample(rows, maxPoints) {
  if (rows.length <= maxPoints) return rows;
  const step = rows.length / maxPoints;
  const sampled = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(rows[Math.floor(i * step)]);
  }
  return sampled;
}

const EVENT_TONE = {
  start: "bg-green-500",
  die: "bg-error",
  stop: "bg-amber-500",
  pull: "bg-primary",
};

function describeEvent(event) {
  const name = event.actor_name || event.details?.actor?.slice(0, 12) || "container";
  switch (event.action) {
    case "start":
      return `Container ${name} started.`;
    case "stop":
      return `Container ${name} stopped.`;
    case "die": {
      const exitCode = event.details?.exitCode;
      return exitCode && String(exitCode) !== "0"
        ? `Container ${name} exited with code ${exitCode}.`
        : `Container ${name} exited.`;
    }
    case "pause":
      return `Container ${name} paused.`;
    case "unpause":
      return `Container ${name} resumed.`;
    default:
      return `${event.type}: ${event.action} — ${name}`;
  }
}

export default function Home() {
  const { serverId } = useParams();
  const { sendMessage } = useWebSocket();
  const systemData = useSystemStore((state) => state.systemData);
  const runningContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "running").length,
  );
  const stoppedContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "exited").length,
  );
  const pausedContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "paused").length,
  );
  const [range, setRange] = useState("1h");

  const { data: serversData } = useServers();
  const selectedServer = serversData?.servers?.find((s) => s.id === serverId);

  const { data: metricsData } = useQuery({
    queryKey: ["metrics", serverId, range],
    queryFn: async () =>
      (await api.get(`/api/servers/${serverId}/metrics`, { params: { range } })).data,
    enabled: !!serverId,
    refetchInterval: 30000,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["events", serverId],
    queryFn: async () =>
      (await api.get(`/api/servers/${serverId}/events`, { params: { limit: 10 } })).data,
    enabled: !!serverId,
    refetchInterval: 15000,
  });

  const chartSamples = useMemo(() => {
    const rows = metricsData?.metrics ?? [];
    return downsample(rows, MAX_CHART_SAMPLES);
  }, [metricsData]);

  useEffect(() => {
    sendMessage({ action: WS_ACTIONS.CONTAINER_LIST, serverId });
    sendMessage({ action: WS_ACTIONS.SYSTEM_STATS, serverId });

    const interval = setInterval(() => {
      sendMessage({ action: WS_ACTIONS.SYSTEM_STATS, serverId });
    }, 5000);

    return () => clearInterval(interval);
  }, [serverId]);

  const isOnline = systemData?.agentState === "online";
  const cpuPercent = Number(systemData?.cpu?.usagePercent ?? 0);
  const memPercent = Number(systemData?.memory?.usagePercent ?? 0);
  const diskPercent = Number(systemData?.disk?.usagePercent ?? 0);
  const cpuThreshold = selectedServer?.alert_cpu_threshold ?? 90;

  const status = !isOnline
    ? "critical"
    : cpuPercent >= cpuThreshold || memPercent >= 90 || diskPercent >= 90
      ? "degraded"
      : "operational";

  const STATUS_META = {
    operational: { tone: "success", dot: "bg-green-500", label: "Operational" },
    degraded: { tone: "warning", dot: "bg-amber-500", label: "Degraded" },
    critical: { tone: "error", dot: "bg-error", label: "Critical" },
  };

  return (
    <div className="">
      <div className="mb-space-lg flex justify-between items-end">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">
            System Overview
          </h2>
          <p className="font-body-main text-body-main text-on-surface-variant">
            {selectedServer?.name ?? "This server"} is{" "}
            {status === "operational" ? "healthy and responding" : status}.
          </p>
        </div>
        <div className="flex gap-space-sm">
          <Badge tone={STATUS_META[status].tone}>
            <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`}></span>
            Status: {STATUS_META[status].label}
          </Badge>
        </div>
      </div>
      {/* <!-- System Health Bento Grid --> */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatCard
          label="CPU Usage"
          icon="memory"
          value={systemData?.cpu?.usagePercent ?? 0}
          unit="%"
          progress={cpuPercent}
        />
        <StatCard
          label="Memory"
          icon="storage"
          value={systemData?.memory?.usedGB}
          unit={`GB / ${systemData?.memory?.totalGB} GB`}
          progress={memPercent}
        />
        <StatCard
          label="Disk Used"
          icon="hard_drive"
          value={systemData?.disk?.usagePercent ?? 0}
          unit="%"
          progress={diskPercent}
        />
        <StatCard
          label="Active Containers"
          icon="view_quilt"
          value={runningContainers}
          footer={
            <div className="flex gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {pausedContainers} Paused
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                •
              </span>
              <span className="font-label-caps text-label-caps text-error">
                {stoppedContainers} Stopped
              </span>
            </div>
          }
        />
        <StatCard
          label="Uptime"
          icon="schedule"
          value={formatUptime(systemData?.uptimeSeconds)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {/* <!-- Resource Trend Chart — persisted history from server_metrics --> */}
        <Card className="md:col-span-2 min-h-80 flex flex-col">
          <div className="flex justify-between items-center mb-space-lg">
            <h3 className="font-h2 text-h2 text-on-surface">
              Resource Usage Trend
            </h3>
            <div className="flex items-center gap-space-md text-xs font-label-caps text-on-surface-variant">
              <span className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                CPU
              </span>
              <span className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Memory
              </span>
              <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5 ml-space-sm">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`px-space-sm py-0.5 rounded-full transition-colors ${
                      range === r.key
                        ? "bg-surface-container-lowest text-primary font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {chartSamples.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-body-main">
              Collecting samples…
            </div>
          ) : (
            <div className="flex-1 relative flex items-end justify-between gap-base px-space-xs">
              {chartSamples.map((sample) => (
                <div key={sample.ts} className="w-full flex flex-col gap-0.5 justify-end h-full">
                  <div
                    className="w-full bg-primary rounded-t-sm"
                    style={{ height: `${Math.min(100, Number(sample.cpu_pct) || 0)}%` }}
                    title={`CPU: ${sample.cpu_pct}%`}
                  ></div>
                  <div
                    className="w-full bg-secondary rounded-t-sm"
                    style={{ height: `${Math.min(100, Number(sample.mem_pct) || 0)}%` }}
                    title={`Memory: ${sample.mem_pct}%`}
                  ></div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-space-sm text-xs font-label-caps text-on-surface-variant opacity-50">
            <span>
              {chartSamples[0] ? new Date(chartSamples[0].ts).toLocaleTimeString() : "—"}
            </span>
            <span>Now</span>
          </div>
        </Card>
        {/* <!-- Recent Activity — real docker events from the persisted history --> */}
        <Card className="md:col-span-1 flex flex-col">
          <div className="flex justify-between items-center mb-space-md">
            <h3 className="font-h2 text-h2 text-on-surface">Recent Activity</h3>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: "18px" }}
            >
              history
            </span>
          </div>
          <div className="flex-1 space-y-space-md overflow-y-auto pr-space-xs">
            {(eventsData?.events ?? []).length === 0 && (
              <p className="text-body-main text-on-surface-variant">
                No recent activity.
              </p>
            )}
            {(eventsData?.events ?? []).map((event) => (
              <div className="flex gap-space-sm" key={event.id}>
                <div
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    EVENT_TONE[event.action] ?? "bg-on-surface-variant"
                  }`}
                ></div>
                <div>
                  <p className="font-body-main text-[13px] text-on-surface leading-snug">
                    {describeEvent(event)}
                  </p>
                  <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                    {timeAgo(event.ts)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
