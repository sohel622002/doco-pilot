import { useEffect, useState } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useParams } from "react-router-dom";
import { WS_ACTIONS } from "../lib/actions";
import { useContainerStore } from "../store/container";
import { Box, FileText, Info, Pause, Play, RefreshCw, Square, Trash2 } from "lucide-react";
import Spinner from "../components/Spinner";
import LogsModal from "../components/LogsModal";
import InspectModal from "../components/InspectModal";
import DeployContainerModal from "../components/DeployContainerModal";
import { useLogsStore } from "../store/logs";
import { useInspectStore } from "../store/inspect";

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

  return (
    <div className="max-w-container-max mx-auto p-md">
      {/* <!-- Page Header & Filters --> */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface">Containers</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage your active container instances and clusters.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant px-sm py-xs rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-sm">
              filter_list
            </span>
            <span className="text-label-caps uppercase tracking-wider">
              Status: All
            </span>
          </div>
          <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant px-sm py-xs rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-sm">stacks</span>
            <span className="text-label-caps uppercase tracking-wider">
              Stack: All
            </span>
          </div>
          <button
            onClick={() => setDeployOpen(true)}
            className="bg-primary text-on-primary px-md py-xs rounded-lg font-body-main font-bold hover:opacity-90 transition-opacity"
          >
            Deploy Container
          </button>
        </div>
      </div>
      {containers && containers.length > 0 && (
        <>
          <div className="grid grid-cols-12 gap-md mb-lg">
            <div className="col-span-12 lg:col-span-8 bg-surface-container-low border border-outline-variant rounded-xl py-md flex items-center justify-between">
              <div className="flex w-full">
                <div className="flex-1 text-center">
                  <p className="text-label-caps text-on-surface-variant mb-xs">
                    RUNNING
                  </p>
                  <p className="font-h1 text-h1 text-primary">
                    {runningContainers ?? 0}
                  </p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="text-label-caps text-on-surface-variant mb-xs">
                    STOPPED
                  </p>
                  <p className="font-h1 text-h1 text-secondary">{stoppedContainers ?? 0}</p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="text-label-caps text-on-surface-variant mb-xs">
                    PAUSED
                  </p>
                  <p className="font-h1 text-h1 text-on-surface">{pausedContainers ?? 0}</p>
                </div>
                <div className="flex-1 text-center border-l border-outline-variant">
                  <p className="text-label-caps text-on-surface-variant mb-xs">
                    RESOURCE UTIL
                  </p>
                  <p className="font-h1 text-h1 text-on-surface">75%</p>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 bg-primary text-on-primary rounded-xl p-md relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-h2 text-h2 mb-xs">Docker Node Healthy</h3>
                <p className="font-body-main opacity-80">
                  All 4 nodes are reporting stable heartbeat responses.
                </p>
              </div>
              <span className="material-symbols-outlined absolute -right-md -bottom-md text-8xl opacity-10 rotate-12">
                check_circle
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Container Name
                    </th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Image Source
                    </th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                      Port Mappings
                    </th>
                    <th className="px-md py-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest text-right">
                      Quick Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {containers.map((container) => (
                    <tr
                      className="hover:bg-surface-container-low transition-colors group"
                      key={container.id}
                    >
                      <td className="px-md py-md">
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 rounded bg-primary-container/20 flex items-center justify-center text-primary">
                            {container?.process ? <Spinner /> : <Box />}
                          </div>
                          <div>
                            <p className="font-h2 text-[14px] text-on-surface">
                              {container?.names[0]}
                            </p>
                            <p className="text-label-caps text-on-surface-variant">
                              ID: {container?.shortId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-md">
                        <span className="font-code text-code text-on-surface-variant bg-surface-container px-xs py-1 rounded">
                          {container?.image}
                        </span>
                      </td>
                      <td className="px-md py-md">
                        {container?.state === "running" && (
                          <span
                            title={container?.status}
                            className="inline-flex items-center gap-xs px-xs py-1 rounded-full bg-primary-container/20 text-primary text-label-caps"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Running
                          </span>
                        )}
                        {container?.state === "exited" && (
                          <span
                            title={container?.status}
                            className="inline-flex items-center gap-xs px-xs py-1 rounded-full bg-secondary-container text-secondary text-label-caps"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                            Stopped
                          </span>
                        )}
                        {container?.state === "paused" && (
                          <span
                            title={container?.status}
                            className="inline-flex items-center gap-xs px-xs py-1 rounded-full border border-secondary-container text-secondary text-label-caps"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-md py-md">
                        <span className="font-code text-code text-on-surface-variant">
                          {container?.ports.length > 0 ? (
                            <span>{container?.ports.join(", ")}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </span>
                      </td>
                      <td className="px-md py-md text-right">
                        <div className="flex items-center justify-end gap-xs transition-opacity">
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
            <div className="p-md bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
              <p className="text-label-caps text-on-surface-variant">
                Showing 4 of 34 containers
              </p>
              <div className="flex items-center gap-sm">
                <button className="px-sm py-xs border border-outline-variant rounded-lg text-label-caps hover:bg-surface-container-low transition-colors">
                  Previous
                </button>
                <button className="px-sm py-xs border border-outline-variant rounded-lg text-label-caps hover:bg-surface-container-low transition-colors">
                  Next
                </button>
              </div>
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
