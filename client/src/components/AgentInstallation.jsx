import { Copy, SquareTerminalIcon } from "lucide-react";
import { useSystemStore } from "../store/system";

export default function AgentInstallation() {
  const serverData = useSystemStore((state) => state.serverData);

  return (
    <div className="p-space-md bg-surface border border-outline-variant rounded-lg flex flex-col space-y-space-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-surface-container-high rounded-lg">
          <SquareTerminalIcon className="text-primary" />
        </div>
        <h3 className="font-h2 text-h2">Agent Installation</h3>
      </div>
      <div className="space-y-space-sm">
        <p className="text-body-main text-on-surface-variant">
          To link a new server to this management console, run the following
          Docker command on your target host. The agent will automatically
          register itself and begin reporting telemetry.
        </p>

        <div className="relative group">
          <div className="p-4 bg-inverse-surface text-inverse-on-surface rounded-lg font-code text-code overflow-x-auto border border-white/10">
            <pre>
              {serverData?.dockerCommand}
            </pre>
          </div>
          <button className="absolute top-2 right-2 pt-2 pb-1 px-1 bg-surface/10 hover:bg-surface/20 text-inverse-on-surface rounded-full transition-colors border border-white/5">
            <Copy />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-sm">
          <div className="flex gap-3">
            <span
              className="material-symbols-outlined text-primary-fixed-dim"
              data-icon="info"
            >
              info
            </span>
            <p className="text-label-caps leading-relaxed text-on-secondary-fixed-variant">
              Requires Docker Engine 20.10+ and network access to port 443 on
              api.dockerdessk.io.
            </p>
          </div>
          <div className="flex gap-3">
            <span
              className="material-symbols-outlined text-primary-fixed-dim"
              data-icon="security"
            >
              security
            </span>
            <p className="text-label-caps leading-relaxed text-on-secondary-fixed-variant">
              Uses a short-lived installation token. Do not share this command
              with unauthorized users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
