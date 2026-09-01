import { useState } from "react";
import { Copy, Check, Info, ShieldCheck } from "lucide-react";
import { useSystemStore } from "../store/system";

export default function AgentInstallation() {
  const serverData = useSystemStore((state) => state.serverData);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!serverData?.dockerCommand) return;
    await navigator.clipboard.writeText(serverData.dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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

      <div className="relative">
        <div className="p-space-md font-code text-code text-on-surface-variant overflow-x-auto rounded-md bg-surface-container border border-outline-variant pr-14">
          <pre>{serverData?.dockerCommand}</pre>
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          {copied ? <Check size={16} className="text-[#5fd696]" /> : <Copy size={16} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-space-md">
        <div className="flex gap-space-sm">
          <Info size={16} className="text-on-surface-variant shrink-0 mt-0.5" />
          <p className="font-body-main text-[13px] leading-relaxed text-on-surface-variant">
            Requires Docker Engine 20.10+ and network access to port 443 on
            api.dockerdessk.io.
          </p>
        </div>
        <div className="flex gap-space-sm">
          <ShieldCheck size={16} className="text-on-surface-variant shrink-0 mt-0.5" />
          <p className="font-body-main text-[13px] leading-relaxed text-on-surface-variant">
            Uses a short-lived installation token. Do not share this command
            with unauthorized users.
          </p>
        </div>
      </div>
    </div>
  );
}
