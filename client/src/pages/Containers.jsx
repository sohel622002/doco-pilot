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
  FileText,
  Info,
  Pause,
  Play,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import Spinner from "../components/Spinner";
import LogsModal from "../components/LogsModal";
import InspectModal from "../components/InspectModal";
import DeployContainerModal from "../components/DeployContainerModal";
import { useLogsStore } from "../store/logs";
import { useInspectStore } from "../store/inspect";

const STATS_POLL_MS = 5000;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function SortHeader({ label, sortKey, activeSort, onSort }) {
  const isActive = activeSort.key === sortKey;
  const Icon = isActive ? (activeSort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest cursor-pointer select-none"
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

  return (
    <div className="">
      {/* <!-- Page Header & Filters --> */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface">Containers</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage your active container instances and clusters.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <div className="flex items-center gap-space-xs bg-surface-container-low border border-outline-variant px-space-sm py-space-xs rounded-full cursor-pointer hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-sm">
              filter_list
            </span>
            <span className="text-label-caps uppercase tracking-wider">
              Status: All
            </span>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container-low border border-outline-variant px-space-sm py-space-xs rounded-full cursor-pointer hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-sm">stacks</span>
            <span className="text-label-caps uppercase tracking-wider">
              Stack: All
            </span>
          </div>
          <button
            onClick={() => setDeployOpen(true)}
            className="bg-primary text-on-primary px-space-md py-space-xs rounded-full font-body-main font-bold hover:opacity-90 transition-opacity"
          >
            Deploy Container
          </button>
        </div>
      </div>
      {containers && containers.length > 0 && (
        <>
          <div className="grid grid-cols-12 gap-space-md mb-space-lg">
            <div className="col-span-12 lg:col-span-8 bg-surface-container-low border border-outline-variant rounded-xl py-space-md flex items-center justify-between">
              <div className="flex w-full">
                <div className="flex-1 text-center">
                  <p className="text-label-caps text-on-surface-variant mb-space-xs">
                    RUNNING
                  </p>
                  <p className="font-h1 text-stat text-primary">
                    {runningContainers ?? 0}
                  </p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="text-label-caps text-on-surface-variant mb-space-xs">
                    STOPPED
                  </p>
                  <p className="font-h1 text-stat text-secondary">{stoppedContainers ?? 0}</p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="text-label-caps text-on-surface-variant mb-space-xs">
                    PAUSED
                  </p>
                  <p className="font-h1 text-stat text-on-surface">{pausedContainers ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 bg-primary text-on-primary rounded-xl p-space-md relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-h2 text-h2 mb-space-xs">Docker Node Healthy</h3>
                <p className="font-body-main opacity-80">
                  All 4 nodes are reporting stable heartbeat responses.
                </p>
              </div>
              <span className="material-symbols-outlined absolute -right-space-md -bottom-space-md text-8xl opacity-10 rotate-12">
                check_circle
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Container Name
                    </th>
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Image Source
                    </th>
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
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
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Port Mappings
                    </th>
                    <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest text-right">
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
                      <td className="px-space-md py-space-md">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-8 h-8 rounded bg-primary-container/20 flex items-center justify-center text-primary">
                            {container?.process ? <Spinner /> : <Box />}
                          </div>
                          <div>
                            <p className="font-h2 text-[14px] text-on-surface flex items-center gap-space-xs">
                              {container?.names[0]}
                              {container?.healthStatus && (
                                <span
                                  title={`Healthcheck: ${container.healthStatus}`}
                                  className={`w-2 h-2 rounded-full ${
                                    container.healthStatus === "healthy"
                                      ? "bg-primary"
                                      : container.healthStatus === "unhealthy"
                                        ? "bg-error"
                                        : "bg-outline"
                                  }`}
                                ></span>
                              )}
                              {container?.restartCount > 0 && (
                                <span
                                  title={`Restarted ${container.restartCount} time(s)`}
                                  className="inline-flex items-center px-space-xs rounded-full bg-secondary-container text-secondary text-[10px] leading-4"
                                >
                                  ↻ {container.restartCount}
                                </span>
                              )}
                            </p>
                            <p className="text-label-caps text-on-surface-variant">
                              ID: {container?.shortId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-space-md py-space-md">
                        <span className="font-code text-code text-on-surface-variant bg-surface-container px-space-xs py-1 rounded">
                          {container?.image}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md">
                        {container?.state === "running" && (
                          <span
                            title={container?.status}
                            className="inline-flex items-center gap-space-xs px-space-xs py-1 rounded-full bg-primary-container/20 text-primary text-label-caps"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Running
                          </span>
                        )}
                        {container?.state === "exited" && (
                          <span
                            title={container?.status}
                            className="inline-flex items-center gap-space-xs px-space-xs py-1 rounded-full bg-secondary-container text-secondary text-label-caps"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                            Stopped
                          </span>
                        )}
                        {container?.state === "paused" && (
                          <span
                            title={container?.status}
                            className="inline-flex items-center gap-space-xs px-space-xs py-1 rounded-full border border-secondary-container text-secondary text-label-caps"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-space-md py-space-md">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.state === "running" && container?.stats
                            ? `${container.stats.cpuPercent}%`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.state === "running" && container?.stats
                            ? `${formatBytes(container.stats.memory.usedBytes)} / ${formatBytes(container.stats.memory.limitBytes)}`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.state === "running" && container?.stats
                            ? `↓${formatBytes(container.stats.network.rxBytes)} / ↑${formatBytes(container.stats.network.txBytes)}`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.ports.length > 0 ? (
                            <span>{container?.ports.join(", ")}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md text-right">
                        <div className="flex items-center justify-end gap-space-xs transition-opacity">
                          <button
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                            disabled={container?.process}
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
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                            disabled={
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
                            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                            disabled={container?.process}
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
                            disabled={container?.state === "running"}
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
      <DeployContainerModal
        serverId={serverId}
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
      />
    </div>
  );
}
