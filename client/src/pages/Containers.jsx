import { useEffect, useMemo, useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useParams } from "react-router-dom";
import { WS_ACTIONS } from "../lib/actions";
import { useContainerStore } from "../store/container";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Box,
  CheckCircle2,
  FileText,
  Filter,
  Info,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Square,
  Trash2,
  TerminalSquare,
} from "lucide-react";
import Spinner from "../components/Spinner";
import LogsModal from "../components/LogsModal";
import InspectModal from "../components/InspectModal";
import ExecModal from "../components/ExecModal";
import DeployContainerModal from "../components/DeployContainerModal";
import { useLogsStore } from "../store/logs";
import { useInspectStore } from "../store/inspect";
import { useExecStore } from "../store/exec";
import { useServers } from "../hooks/useServers";
import { canWrite } from "../lib/roles";
import { Card, Badge, Button } from "../components/ui";

const STATS_POLL_MS = 5000;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function formatPort(port) {
  const suffix = port.Type ? `/${port.Type}` : "";
  if (port.PublicPort) {
    return `${port.IP && port.IP !== "0.0.0.0" ? port.IP : ""}:${port.PublicPort}→${port.PrivatePort}${suffix}`;
  }
  return `${port.PrivatePort}${suffix}`;
}

function SortHeader({ label, sortKey, activeSort, onSort }) {
  const isActive = activeSort.key === sortKey;
  const Icon = isActive ? (activeSort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-on-surface transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={12} className={isActive ? "text-on-surface" : "opacity-50"} />
      </span>
    </th>
  );
}

export default function Containers() {
  const { serverId } = useParams();
  const { sendMessage, isConnected } = useWebSocket();
  const [deployOpen, setDeployOpen] = useState(false);
  const { data: serversData } = useServers();
  const write = canWrite(serversData?.servers?.find((s) => s.id === serverId)?.role);
  const containers = useContainerStore((state) => state.containers);
  const runningContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "running").length,
  );
  const stoppedContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "exited").length,
  );
  const pausedContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "paused").length,
  );
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const sortedContainers = useMemo(() => {
    if (!sort.key) return containers;
    const dir = sort.dir === "asc" ? 1 : -1;
    const getValue = (container) => {
      switch (sort.key) {
        case "cpu":
          return container?.stats?.cpuPercent ?? -1;
        case "memory":
          return container?.stats?.memory?.usagePercent ?? -1;
        case "network":
          return (container?.stats?.network?.rxBytes ?? 0) + (container?.stats?.network?.txBytes ?? 0);
        default:
          return 0;
      }
    };
    return [...containers].sort((a, b) => (getValue(a) - getValue(b)) * dir);
  }, [containers, sort]);

  const handleContrinerAction = (containerAction, containerId, container) => {
    console.log("🚀 ~ handleContrinerAction ~ containerAction:", container);
    sendMessage({ action: containerAction, containerId, serverId });
  };

  const handleViewLogs = (containerId) => {
    useLogsStore.getState().openFor(containerId);
    sendMessage({ action: WS_ACTIONS.CONTAINER_LOGS, containerId, serverId });
  };

  const handleInspect = (containerId) => {
    useInspectStore.getState().openFor(containerId);
    sendMessage({ action: WS_ACTIONS.CONTAINER_INSPECT, containerId, serverId });
  };

  const handleExec = (containerId, name) => {
    const sessionId =
      globalThis.crypto?.randomUUID?.() ?? `${containerId}-${Date.now()}`;
    useExecStore.getState().openFor(containerId, name, sessionId);
  };

  const handleRemoveContainer = (containerId, name) => {
    if (!window.confirm(`Permanently remove container "${name}"? This cannot be undone.`)) {
      return;
    }
    sendMessage({ action: WS_ACTIONS.CONTAINER_REMOVE, containerId, serverId });
  };

  useEffect(() => {
    sendMessage({ action: WS_ACTIONS.CONTAINER_LIST, serverId });
  }, [serverId, isConnected]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail === serverId) {
        sendMessage({ action: WS_ACTIONS.CONTAINER_LIST, serverId });
      }
    };
    window.addEventListener("containers:refresh", handler);
    return () => window.removeEventListener("containers:refresh", handler);
  }, [serverId]);

  useEffect(() => {
    if (!isConnected) return;
    const poll = () => sendMessage({ action: WS_ACTIONS.CONTAINERS_STATS, serverId });
    poll();
    const interval = setInterval(poll, STATS_POLL_MS);
    return () => clearInterval(interval);
  }, [serverId, isConnected]);

  const allStopped = containers.length > 0 && runningContainers === 0;

  return (
    <div className="max-w-container-max mx-auto">
      {/* <!-- Page Header & Filters --> */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">Containers</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage your active container instances and clusters.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button className="flex items-center gap-space-xs h-9 px-space-sm rounded-md border border-outline-variant text-on-surface-variant text-[13px] font-medium hover:bg-surface-container transition-colors">
            <Filter size={14} />
            Status: All
          </button>
          <button className="flex items-center gap-space-xs h-9 px-space-sm rounded-md border border-outline-variant text-on-surface-variant text-[13px] font-medium hover:bg-surface-container transition-colors">
            <Layers size={14} />
            Stack: All
          </button>
          {write && <Button onClick={() => setDeployOpen(true)}>Deploy Container</Button>}
        </div>
      </div>
      {containers && containers.length > 0 && (
        <>
          <div className="grid grid-cols-12 gap-3 mb-3">
            <Card className="col-span-12 lg:col-span-8 flex items-center">
              <div className="flex w-full">
                <div className="flex-1 text-center">
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
                    Running
                  </p>
                  <p className="text-stat text-on-surface">{runningContainers ?? 0}</p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
                    Stopped
                  </p>
                  <p className="text-stat text-on-surface">{stoppedContainers ?? 0}</p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
                    Paused
                  </p>
                  <p className="text-stat text-on-surface">{pausedContainers ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="col-span-12 lg:col-span-4 flex items-center gap-space-md">
              <div
                className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${
                  allStopped ? "bg-error-container" : "bg-[#173626]"
                }`}
              >
                <CheckCircle2 size={18} className={allStopped ? "text-error" : "text-[#5fd696]"} />
              </div>
              <div>
                <h3 className="font-h2 text-h2 text-on-surface">
                  {allStopped ? "No Containers Running" : "Docker Host Healthy"}
                </h3>
                <p className="font-body-main text-body-main text-on-surface-variant">
                  {allStopped
                    ? "Every container on this host is stopped."
                    : "This host is reporting a stable heartbeat."}
                </p>
              </div>
            </Card>
          </div>
          <div className="bg-card border border-outline-variant rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Container Name
                    </th>
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Image Source
                    </th>
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <SortHeader label="CPU %" sortKey="cpu" activeSort={sort} onSort={handleSort} />
                    <SortHeader label="Memory" sortKey="memory" activeSort={sort} onSort={handleSort} />
                    <SortHeader
                      label="Network I/O"
                      sortKey="network"
                      activeSort={sort}
                      onSort={handleSort}
                    />
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Port Mappings
                    </th>
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-right">
                      Quick Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {sortedContainers.map((container) => (
                    <tr
                      className="hover:bg-surface-container-low transition-colors group"
                      key={container.id}
                    >
                      <td className="px-space-md py-space-md max-w-56">
                        <div className="flex items-center gap-space-sm min-w-0">
                          <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                            {container?.process ? <Spinner /> : <Box size={15} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-h2 text-[14px] text-on-surface flex items-center gap-space-xs">
                              <span className="truncate" title={container?.names[0]}>
                                {container?.names[0]}
                              </span>
                              {container?.healthStatus && (
                                <span
                                  title={`Healthcheck: ${container.healthStatus}`}
                                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    container.healthStatus === "healthy"
                                      ? "bg-[#5fd696]"
                                      : container.healthStatus === "unhealthy"
                                        ? "bg-error"
                                        : "bg-outline"
                                  }`}
                                ></span>
                              )}
                              {container?.restartCount > 0 && (
                                <span
                                  title={`Restarted ${container.restartCount} time(s)`}
                                  className="inline-flex items-center px-space-xs rounded-full bg-surface-container-high text-on-surface-variant text-[10px] leading-4 shrink-0"
                                >
                                  ↻ {container.restartCount}
                                </span>
                              )}
                            </p>
                            <p className="font-label-caps text-label-caps text-on-surface-variant">
                              ID: {container?.shortId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-space-md py-space-md max-w-48">
                        <span
                          className="block truncate font-code text-code text-on-surface-variant bg-surface-container px-space-xs py-1 rounded"
                          title={container?.image}
                        >
                          {container?.image}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md">
                        {container?.state === "running" && (
                          <Badge tone="success" title={container?.status}>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5fd696]"></span>
                            Running
                          </Badge>
                        )}
                        {container?.state === "exited" && (
                          <Badge tone="neutral" title={container?.status}>
                            <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant"></span>
                            Stopped
                          </Badge>
                        )}
                        {container?.state === "paused" && (
                          <Badge tone="warning" title={container?.status}>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#e8b458]"></span>
                            Paused
                          </Badge>
                        )}
                      </td>
                      <td className="px-space-md py-space-md">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.state === "running" && container?.stats
                            ? `${container.stats.cpuPercent}%`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md whitespace-nowrap">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.state === "running" && container?.stats
                            ? `${formatBytes(container.stats.memory.usedBytes)} / ${formatBytes(container.stats.memory.limitBytes)}`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md whitespace-nowrap">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.state === "running" && container?.stats
                            ? `↓${formatBytes(container.stats.network.rxBytes)} / ↑${formatBytes(container.stats.network.txBytes)}`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md max-w-40">
                        <span
                          className="block truncate font-code text-code text-on-surface-variant"
                          title={container?.ports?.length > 0 ? container.ports.map(formatPort).join(", ") : "-"}
                        >
                          {container?.ports?.length > 0
                            ? [...new Set(container.ports.map(formatPort))].join(", ")
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md text-right">
                        <div className="flex items-center justify-end gap-space-xs transition-opacity">
                          <button
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant disabled:opacity-40"
                            disabled={!write || container?.process}
                            title={
                              container?.state === "running"
                                ? "Stop"
                                : container?.state === "paused"
                                  ? "Resume"
                                  : container?.state === "exited"
                                    ? "Start"
                                    : ""
                            }
                            onClick={() =>
                              handleContrinerAction(
                                container?.state === "running"
                                  ? WS_ACTIONS.CONTAINER_STOP
                                  : container?.state === "paused"
                                    ? WS_ACTIONS.CONTAINER_UNPAUSE
                                    : container?.state === "exited"
                                      ? WS_ACTIONS.CONTAINER_START
                                      : undefined,
                                container?.shortId,
                                container,
                              )
                            }
                          >
                            {container?.state === "running" ? (
                              <Square size={18} />
                            ) : (
                              <Play size={18} />
                            )}
                          </button>
                          <button
                            title="Pause"
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant disabled:opacity-40"
                            disabled={
                              !write ||
                              container?.process ||
                              container?.state === "paused" ||
                              container?.state === "exited"
                            }
                            onClick={() =>
                              handleContrinerAction(
                                WS_ACTIONS.CONTAINER_PAUSE,
                                container?.shortId,
                              )
                            }
                          >
                            <Pause size={18} />
                          </button>
                          {/* <button
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                            disabled={container?.process}
                            onClick={() =>
                              handleContrinerAction(
                                WS_ACTIONS.CONTAINER_STOP,
                                container?.shortId,
                              )
                            }
                          >
                            <Square size={18} />
                          </button> */}
                          <button
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant disabled:opacity-40"
                            disabled={!write || container?.process}
                            onClick={() =>
                              handleContrinerAction(
                                WS_ACTIONS.CONTAINER_RESTART,
                                container?.shortId,
                              )
                            }
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button
                            title={
                              !write
                                ? "Viewers can't open a shell"
                                : container?.state === "running"
                                  ? "Open Shell"
                                  : "Start the container to open a shell"
                            }
                            disabled={!write || container?.state !== "running"}
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant disabled:opacity-40 disabled:hover:bg-transparent"
                            onClick={() => handleExec(container?.shortId, container?.names[0])}
                          >
                            <TerminalSquare size={18} />
                          </button>
                          <button
                            title="Inspect"
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                            onClick={() => handleInspect(container?.shortId)}
                          >
                            <Info size={18} />
                          </button>
                          <button
                            title="View Logs"
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                            onClick={() => handleViewLogs(container?.shortId)}
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            title="Remove"
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-error disabled:opacity-40"
                            disabled={!write || container?.state === "running"}
                            onClick={() =>
                              handleRemoveContainer(container?.shortId, container?.names[0])
                            }
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <LogsModal />
      <InspectModal />
      <ExecModal />
      <DeployContainerModal
        serverId={serverId}
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
      />
    </div>
  );
}
