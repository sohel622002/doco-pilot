import AgentInstallation from "./AgentInstallation";
import { Info, RefreshCw } from "lucide-react";
import { useSystemStore } from "../store/system";

export default function NodConnectionError() {
  const serverData = useSystemStore((state) => state.serverData);

  return (
    <>
      {/* <!-- Error Status Indicator --> */}
      <div className="flex flex-col items-center text-center mb-space-md">
        <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mb-space-md">
          <Info size={24} className="text-on-error-container" />
        </div>
        <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">
          Node Offline
        </h2>
        <p className="font-body-large text-on-surface-variant max-w-lg">
          <span className="font-bold">"{serverData?.server?.name}"</span> is
          currently unreachable. The management console has lost connection to
          the agent.
        </p>
      </div>
      {/* <!-- Centered Error Card --> */}
      <div className="space-y-space-md">
        <div className="bg-surface-container border border-outline-variant p-space-md rounded-lg">
          <h3 className="font-h2 text-h2 text-on-surface mb-space-sm flex items-center gap-space-xs">
            Troubleshooting Steps
          </h3>
          <ul className="space-y-space-sm">
            <li className="flex items-start gap-space-sm font-body-main text-on-surface-variant">
              <span className="font-bold text-primary">1.</span>
              Check server power and physical network connectivity to the data
              center or cloud provider.
            </li>
            <li className="flex items-start gap-space-sm font-body-main text-on-surface-variant">
              <span className="font-bold text-primary">2.</span>
              <span>
                SSH into the node and ensure the
                <code className="font-code text-error bg-error-container px-base rounded inline-block mx-1">
                  docker-agent
                </code>
                service is active and running.
              </span>
            </li>
            <li className="flex items-start gap-space-sm font-body-main text-on-surface-variant">
              <span className="font-bold text-primary">3.</span>
              <span>
                Verify API firewall rules and security groups permit traffic on
                port
                <code className="font-code bg-surface-container-high px-base rounded inline-block mx-1">
                  2375
                </code>
                .
              </span>
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <button className="bg-primary text-on-primary px-space-md py-space-sm rounded-md font-body-main font-semibold hover:opacity-90 transition-all active:scale-95 flex items-center gap-space-xs">
            <RefreshCw size={16} />
            Retry Connection
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 my-5 w-full">
        <span className="flex-1 h-px bg-outline-variant"></span>
        <span className="text-on-surface-variant text-body-main">OR</span>
        <span className="flex-1 h-px bg-outline-variant"></span>
      </div>
      <AgentInstallation />
    </>
  );
}
