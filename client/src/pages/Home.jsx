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
import { computeServerStatus, formatUptime, timeAgo } from "../lib/utils";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Boxes,
  Clock,
  History,
  Play,
  Square,
  XCircle,
  Pause,
  Download,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const RANGES = [
  { key: "1h", label: "1H" },
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
];

const MAX_CHART_SAMPLES = 60;

function progressTone(percent, threshold) {
  if (percent >= threshold) return "critical";
  if (percent >= threshold * 0.85) return "warning";
  return "normal";
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-high border border-outline rounded-md px-space-sm py-space-xs shadow-pill">
      <p className="text-[11px] text-on-surface-variant mb-1">
        {new Date(label).toLocaleTimeString()}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-[12px] flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-on-surface font-medium">
            {entry.name}: {Number(entry.value).toFixed(1)}%
          </span>
        </p>
      ))}
    </div>
  );
}

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

const EVENT_META = {
  start: { icon: Play, iconBg: "bg-[#173626]", iconColor: "text-[#5fd696]" },
  unpause: { icon: Play, iconBg: "bg-[#173626]", iconColor: "text-[#5fd696]" },
  stop: { icon: Square, iconBg: "bg-[#3a2c10]", iconColor: "text-[#e8b458]" },
  pause: { icon: Pause, iconBg: "bg-[#3a2c10]", iconColor: "text-[#e8b458]" },
  die: { icon: XCircle, iconBg: "bg-error-container", iconColor: "text-error" },
  pull: { icon: Download, iconBg: "bg-primary-container", iconColor: "text-primary" },
};
const DEFAULT_EVENT_META = {
  icon: Info,
  iconBg: "bg-surface-container-highest",
  iconColor: "text-on-surface-variant",
};

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function describeEvent(event) {
  const name = truncate(
    event.actor_name || event.details?.actor?.slice(0, 12) || "container",
    42,
  );
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

  const cpuPercent = Number(systemData?.cpu?.usagePercent ?? 0);
  const memPercent = Number(systemData?.memory?.usagePercent ?? 0);
  const diskPercent = Number(systemData?.disk?.usagePercent ?? 0);
  const cpuThreshold = selectedServer?.alert_cpu_threshold ?? 90;
  const { status } = computeServerStatus(systemData, selectedServer);

  const STATUS_META = {
    operational: { tone: "success", dot: "bg-[#5fd696]", label: "Operational" },
    degraded: { tone: "warning", dot: "bg-[#e8b458]", label: "Degraded" },
    critical: { tone: "error", dot: "bg-error", label: "Critical" },
  };

  return (
    <div className="max-w-container-max mx-auto">
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
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`}></span>
            {STATUS_META[status].label}
          </Badge>
        </div>
      </div>
      {/* <!-- System Health — full width so labels/units never wrap --> */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <StatCard
          label="CPU Usage"
          icon={Cpu}
          value={systemData?.cpu?.usagePercent ?? 0}
          unit="%"
          progress={cpuPercent}
          progressTone={progressTone(cpuPercent, cpuThreshold)}
        />
        <StatCard
          label="Memory"
          icon={MemoryStick}
          value={systemData?.memory?.usedGB}
          unit={`GB / ${systemData?.memory?.totalGB} GB`}
          progress={memPercent}
          progressTone={progressTone(memPercent, 90)}
        />
        <StatCard
          label="Disk Used"
          icon={HardDrive}
          value={systemData?.disk?.usagePercent ?? 0}
          unit="%"
          progress={diskPercent}
          progressTone={progressTone(diskPercent, 90)}
        />
        <StatCard
          label="Active Containers"
          icon={Boxes}
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
      </div>

      <div className="flex gap-3">
        {/* LEFT COLUMN — sets the overall row height */}
        <div className="flex-2 min-w-0">
          {/* <!-- Resource Trend Chart — persisted history from server_metrics --> */}
          <Card className="h-140 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-space-lg shrink-0">
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
                <div className="flex items-center gap-1 bg-surface-container-high rounded-full p-0.5 ml-space-sm">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRange(r.key)}
                      className={`px-space-sm py-0.5 rounded-full transition-colors ${
                        range === r.key
                          ? "bg-primary text-on-primary font-semibold"
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
              <div className="flex-1 min-h-0 flex items-center justify-center text-on-surface-variant text-body-main">
                Collecting samples…
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSamples} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--color-outline-variant)"
                    />
                    <XAxis
                      dataKey="ts"
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      tick={{ fill: "var(--color-on-surface-variant)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--color-outline-variant)" }}
                      tickLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: "var(--color-on-surface-variant)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mem_pct"
                      name="Memory"
                      stroke="var(--color-secondary)"
                      strokeWidth={2}
                      fill="url(#memFill)"
                      dot={false}
                      activeDot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu_pct"
                      name="CPU"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#cpuFill)"
                      dot={false}
                      activeDot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN — Uptime + Recent Activity heights are pinned so their
             total always equals the chart's 560px, regardless of content. */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* <!-- Uptime — compact, since it's a single fact with nothing to compare against --> */}
          <Card className="h-16 flex items-center gap-space-md shrink-0">
            <div className="h-9 w-9 rounded-md bg-surface-container-high flex items-center justify-center shrink-0">
              <Clock size={16} className="text-on-surface-variant" />
            </div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Uptime
            </span>
            <span className="text-h2 font-h2 text-on-surface ml-auto">
              {formatUptime(systemData?.uptimeSeconds)}
            </span>
          </Card>

          {/* <!-- Recent Activity — real docker events from the persisted history.
               560px chart - 64px Uptime - 12px gap = 484px. --> */}
          <Card className="h-121 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-space-md shrink-0">
              <h3 className="font-h2 text-h2 text-on-surface">Recent Activity</h3>
              <History size={17} className="text-on-surface-variant" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1.5 px-1.5">
              {(eventsData?.events ?? []).length === 0 && (
                <p className="text-body-main text-on-surface-variant">
                  No recent activity.
                </p>
              )}
              {(eventsData?.events ?? []).map((event) => {
                const meta = EVENT_META[event.action] ?? DEFAULT_EVENT_META;
                const Icon = meta.icon;
                return (
                  <div
                    className="flex gap-space-sm py-2 rounded-md hover:bg-surface-container-high transition-colors"
                    key={event.id}
                  >
                    <div
                      className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${meta.iconBg}`}
                    >
                      <Icon size={14} className={meta.iconColor} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body-main text-[13px] text-on-surface leading-snug line-clamp-2 wrap-break-word">
                        {describeEvent(event)}
                      </p>
                      <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                        {timeAgo(event.ts)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
