import { useEffect } from "react";
import { useWebSocket } from "../context/WebSocketContext";
import { useParams } from "react-router-dom";
import { WS_ACTIONS } from "../lib/actions";
import { useSystemStore } from "../store/system";
import { useContainerStore } from "../store/container";

export default function Home() {
  const { serverId } = useParams();
  const { sendMessage } = useWebSocket();
  const systemData = useSystemStore((state) => state.systemData);
  const history = useSystemStore((state) => state.history);
  const runningContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "running").length,
  );
  const stoppedContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "exited").length,
  );
  const pausedContainers = useContainerStore(
    (state) => state.containers.filter((c) => c.state === "paused").length,
  );

  useEffect(() => {
    sendMessage({ action: WS_ACTIONS.CONTAINER_LIST, serverId });
    sendMessage({ action: WS_ACTIONS.SYSTEM_STATS, serverId });

    // Poll for stats every 5s so the trend chart has real, live data —
    // this is a session-lived rolling window (last ~2.5 min), not a
    // persisted time series.
    const interval = setInterval(() => {
      sendMessage({ action: WS_ACTIONS.SYSTEM_STATS, serverId });
    }, 5000);

    return () => clearInterval(interval);
  }, [serverId]);

  return (
    <div className="max-w-container-max mx-auto p-md">
      <div className="mb-lg flex justify-between items-end">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface mb-xs">
            System Overview
          </h2>
          <p className="font-body-main text-body-main text-on-surface-variant">
            Cluster node DockerNode-01 is healthy and responding.
          </p>
        </div>
        <div className="flex gap-sm">
          <div className="flex items-center gap-xs px-sm py-xs rounded border border-outline-variant bg-surface">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              Status: Operational
            </span>
          </div>
        </div>
      </div>
      {/* <!-- System Health Bento Grid --> */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">
        {/* <!-- CPU Card --> */}
        <div className="md:col-span-1 bg-surface-container-low border border-outline-variant p-md rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                CPU Usage
              </span>
              <span className="material-symbols-outlined text-primary">
                memory
              </span>
            </div>
            <div className="flex items-baseline gap-xs mb-xs">
              <span className="font-h1 text-h1">
                {systemData?.cpu?.usagePercent ?? 0}
              </span>
              <span className="font-body-main text-body-main text-on-surface-variant">
                %
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary-container h-1 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{ width: `${systemData?.cpu?.usagePercent ?? 0}%` }}
            ></div>
          </div>
        </div>
        {/* <!-- Memory Card --> */}
        <div className="md:col-span-1 bg-surface-container-low border border-outline-variant p-md rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Memory
              </span>
              <span className="material-symbols-outlined text-primary">
                storage
              </span>
            </div>
            <div className="flex items-baseline gap-xs mb-xs">
              <span className="font-h1 text-h1">
                {systemData?.memory?.usedGB}
              </span>
              <span className="font-body-main text-body-main text-on-surface-variant">
                GB / {systemData?.memory?.totalGB} GB
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary-container h-1 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{ width: `${systemData?.memory?.usagePercent}%` }}
            ></div>
          </div>
        </div>
        {/* <!-- Containers Card --> */}
        <div className="md:col-span-1 bg-surface-container-low border border-outline-variant p-md rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Active Containers
              </span>
              <span className="material-symbols-outlined text-primary">
                view_quilt
              </span>
            </div>
            <div className="flex items-baseline gap-xs mb-xs">
              <span className="font-h1 text-h1">{runningContainers}</span>
              <span className="font-body-main text-body-main text-green-600">
                Running
              </span>
            </div>
          </div>
          <div className="flex gap-xs">
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
        </div>
        {/* <!-- Disk Card --> */}
        <div className="md:col-span-1 bg-surface-container-low border border-outline-variant p-md rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-sm">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Disk I/O
              </span>
              <span className="material-symbols-outlined text-primary">
                speed
              </span>
            </div>
            <div className="flex items-baseline gap-xs mb-xs">
              <span className="font-h1 text-h1">12.4</span>
              <span className="font-body-main text-body-main text-on-surface-variant">
                MB/s
              </span>
            </div>
          </div>
          <div className="text-xs font-code text-on-surface-variant opacity-60">
            Read: 8.2MB/s | Write: 4.2MB/s
          </div>
        </div>
        {/* <!-- Resource Trend Chart — real CPU/memory samples, polled every 5s --> */}
        <div className="md:col-span-3 bg-surface-container-low border border-outline-variant p-md rounded-xl min-h-80 flex flex-col">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="font-h2 text-h2 text-on-surface">
              Resource Usage Trend
            </h3>
            <div className="flex items-center gap-md text-xs font-label-caps text-on-surface-variant">
              <span className="flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                CPU
              </span>
              <span className="flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Memory
              </span>
              <span className="opacity-60">Last {history.length} samples</span>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-body-main">
              Collecting samples…
            </div>
          ) : (
            <div className="flex-1 relative flex items-end justify-between gap-base px-xs">
              {history.map((sample) => (
                <div key={sample.ts} className="w-full flex flex-col gap-0.5 justify-end h-full">
                  <div
                    className="w-full bg-primary rounded-t-sm"
                    style={{ height: `${Math.min(100, sample.cpu)}%` }}
                    title={`CPU: ${sample.cpu}%`}
                  ></div>
                  <div
                    className="w-full bg-secondary rounded-t-sm"
                    style={{ height: `${Math.min(100, sample.memory)}%` }}
                    title={`Memory: ${sample.memory}%`}
                  ></div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-sm text-xs font-label-caps text-on-surface-variant opacity-50">
            <span>{history[0] ? new Date(history[0].ts).toLocaleTimeString() : "—"}</span>
            <span>Now</span>
          </div>
        </div>
        {/* <!-- Recent Events / Logs --> */}
        <div className="md:col-span-1 bg-surface-container-low border border-outline-variant p-md rounded-xl flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-h2 text-h2 text-on-surface">Recent Events</h3>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: "18px" }}
            >
              history
            </span>
          </div>
          <div className="flex-1 space-y-md overflow-y-auto custom-scrollbar pr-xs">
            <div className="flex gap-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0"></div>
              <div>
                <p className="font-body-main text-[13px] text-on-surface leading-snug">
                  Container
                  <span className="font-code text-primary">web-proxy-01</span>
                  started successfully.
                </p>
                <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                  2 minutes ago
                </span>
              </div>
            </div>
            <div className="flex gap-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-amber-500 shrink-0"></div>
              <div>
                <p className="font-body-main text-[13px] text-on-surface leading-snug">
                  High CPU usage detected on node
                  <span className="font-code text-primary">DockerNode-01</span>.
                </p>
                <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                  15 minutes ago
                </span>
              </div>
            </div>
            <div className="flex gap-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0"></div>
              <div>
                <p className="font-body-main text-[13px] text-on-surface leading-snug">
                  New image
                  <span className="font-code text-primary">redis:alpine</span>
                  pulled from registry.
                </p>
                <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                  42 minutes ago
                </span>
              </div>
            </div>
            <div className="flex gap-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-error shrink-0"></div>
              <div>
                <p className="font-body-main text-[13px] text-on-surface leading-snug">
                  Container
                  <span className="font-code text-error">api-worker-7</span>
                  exited with code 1.
                </p>
                <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                  1 hour ago
                </span>
              </div>
            </div>
            <div className="flex gap-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0"></div>
              <div>
                <p className="font-body-main text-[13px] text-on-surface leading-snug">
                  System backup completed to
                  <span className="font-code text-primary">
                    s3://docker-vault
                  </span>
                  .
                </p>
                <span className="text-[11px] font-label-caps text-on-surface-variant opacity-60">
                  3 hours ago
                </span>
              </div>
            </div>
          </div>
          <button className="mt-md w-full py-xs border border-outline-variant rounded font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container transition-colors">
            View All Logs
          </button>
        </div>
      </div>
      {/* <!-- Quick Actions Grid --> */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="bg-surface-container-low border border-outline-variant p-md rounded-xl hover:border-primary transition-colors cursor-pointer group">
          <div className="flex items-center gap-md">
            <div className="h-10 w-10 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined">rocket_launch</span>
            </div>
            <div>
              <h4 className="font-h2 text-h2 text-on-surface">Quick Deploy</h4>
              <p className="font-body-main text-body-main text-on-surface-variant">
                Launch from templates
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant p-md rounded-xl hover:border-primary transition-colors cursor-pointer group">
          <div className="flex items-center gap-md">
            <div className="h-10 w-10 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined">
                cleaning_services
              </span>
            </div>
            <div>
              <h4 className="font-h2 text-h2 text-on-surface">Prune System</h4>
              <p className="font-body-main text-body-main text-on-surface-variant">
                Cleanup unused resources
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant p-md rounded-xl hover:border-primary transition-colors cursor-pointer group">
          <div className="flex items-center gap-md">
            <div className="h-10 w-10 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <h4 className="font-h2 text-h2 text-on-surface">
                Export Metrics
              </h4>
              <p className="font-body-main text-body-main text-on-surface-variant">
                Download CSV/JSON reports
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
