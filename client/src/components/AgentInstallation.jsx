import { Copy } from "lucide-react";
import { useSystemStore } from "../store/system";

export default function AgentInstallation() {
  const serverData = useSystemStore((state) => state.serverData);

  return (
    <div className="flex flex-col space-y-3">
      <h3 className="font-h2 text-h2">Agent Installation</h3>
      <p>
        To link a new server to this management console, run the following
        Docker command on your target host. The agent will automatically
        register itself and begin reporting telemetry.
      </p>

      <div className="relative group">
        <div className="p-4 font-code text-code overflow-x-auto rounded-md bg-[#232323]">
          <pre>{serverData?.dockerCommand}</pre>
        </div>
        <button className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full transition-colors border border-white/5">
          <Copy size={16}/>
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
  );
}
