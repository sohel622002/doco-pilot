import { Info, ShieldCheck } from "lucide-react";
import { useSystemStore } from "../store/system";
import DockerCommandBlock from "./DockerCommandBlock";

export default function AgentInstallation() {
  const serverData = useSystemStore((state) => state.serverData);

  return (
    <div className="flex flex-col gap-space-md">
      <div>
        <h3 className="font-h2 text-h2 text-on-surface mb-space-xs">Agent Installation</h3>
        <p className="font-body-main text-body-main text-on-surface-variant">
          To link a new server to this management console, run the following
          Docker command on your target host. The agent will automatically
          register itself and begin reporting telemetry.
        </p>
      </div>

      <DockerCommandBlock commands={serverData?.dockerCommand} />

      <div className="grid grid-cols-2 gap-space-md">
        <div className="flex gap-space-sm">
          <Info size={16} className="text-on-surface-variant shrink-0 mt-0.5" />
          <p className="font-body-main text-[13px] leading-relaxed text-on-surface-variant">
            Requires Docker Engine 20.10+ and outbound network access to the
            backend WebSocket endpoint over HTTPS.
          </p>
        </div>
        <div className="flex gap-space-sm">
          <ShieldCheck size={16} className="text-on-surface-variant shrink-0 mt-0.5" />
          <p className="font-body-main text-[13px] leading-relaxed text-on-surface-variant">
            Embeds this server's agent key/secret. Do not share this command
            with unauthorized users.
          </p>
        </div>
      </div>
    </div>
  );
}
