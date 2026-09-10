import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Cpu, HardDrive, Boxes } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { WS_ACTIONS } from "../lib/actions";
import { useEngineStore } from "../store/engine";

const REFRESH_MS = 15000;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export default function EngineLogsPanel() {
  const { serverId } = useParams();
  const { sendMessage, isConnected } = useWebSocket();
  const info = useEngineStore((state) => state.info);
  const logs = useEngineStore((state) => state.logs);

  const refresh = () => {
    sendMessage({ action: WS_ACTIONS.SYSTEM_ENGINE_INFO, serverId });
    sendMessage({ action: WS_ACTIONS.SYSTEM_LOGS_TAIL, serverId });
  };

  useEffect(() => {
    if (!isConnected) return;
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, isConnected]);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h3 className="font-h2 text-h2 text-on-surface">Engine & Logs</h3>
        <button
          onClick={refresh}
          className="flex items-center gap-space-xs h-8 px-space-sm rounded-md border border-outline-variant text-on-surface-variant text-[12px] font-medium hover:bg-surface-container transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {!info ? (
        <p className="text-on-surface-variant text-body-main">Loading engine info…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Docker Engine
            </span>
            <p className="text-on-surface mt-1 font-code text-code">{info.version}</p>
          </div>
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              API Version
            </span>
            <p className="text-on-surface mt-1 font-code text-code">{info.apiVersion}</p>
          </div>
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Storage Driver
            </span>
            <p className="text-on-surface mt-1 font-code text-code">{info.storageDriver}</p>
          </div>
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              OS / Arch
            </span>
            <p className="text-on-surface mt-1 font-code text-code">
              {info.os} / {info.arch}
            </p>
          </div>
          <div className="flex items-center gap-space-xs">
            <Boxes size={14} className="text-on-surface-variant" />
            <span className="text-body-main text-on-surface">
              {info.containersRunning} running / {info.containers} total
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <Cpu size={14} className="text-on-surface-variant" />
            <span className="text-body-main text-on-surface">{info.cpus} CPUs</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <HardDrive size={14} className="text-on-surface-variant" />
            <span className="text-body-main text-on-surface">{formatBytes(info.memTotalBytes)} RAM</span>
          </div>
        </div>
      )}

      <div>
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          Live log tail — all running containers
        </span>
        <div className="mt-space-xs h-56 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-md p-space-sm font-code text-code text-on-surface-variant">
          {logs.length === 0 ? (
            <p>No log output.</p>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-on-surface">{entry.container}</span> {entry.line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
