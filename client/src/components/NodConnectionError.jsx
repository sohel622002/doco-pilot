import React, { useEffect, useState } from "react";
import AgentInstallation from "./AgentInstallation";
import { useParams } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";
import { useSystemStore } from "../store/system";

export default function NodConnectionError() {
  const serverData = useSystemStore((state) => state.serverData);

  return (
    <>
      {/* <!-- Error Status Indicator --> */}
      <div className="flex flex-col items-center text-center mb-md">
        <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mb-md">
          <span
            className="material-symbols-outlined text-error text-[32px]"
            data-icon="error_outline"
          >
            error_outline
          </span>
        </div>
        <h2 className="font-h1 text-h1 text-on-surface mb-xs">Node Offline</h2>
        <p className="font-body-large text-on-surface-variant max-w-2xl">
          <span className="font-bold">"{serverData?.server?.name}"</span>{" "}
          is currently unreachable. The management console has lost connection
          to the agent.
        </p>
      </div>
      {/* <!-- Centered Error Card --> */}
      <div className="w-full mx-auto max-w-2xl bg-surface-container-lowest border border-error rounded-xl p-md">
        <div className="flex items-center justify-between border-b border-outline-variant pb-md mb-md">
          <div className="flex items-center gap-sm">
            <WifiOff className="text-error text-xl" />
            <div>
              <p className="font-label-caps text-on-surface-variant uppercase">
                Failure Details
              </p>
              <p className="font-body-main text-error font-medium">
                Connection Lost
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-label-caps text-on-surface-variant uppercase">
              Last Heartbeat
            </p>
            <p className="font-body-main text-on-surface">5 minutes ago</p>
          </div>
        </div>
        <div className="space-y-md">
          <div className="bg-surface-container-low p-md rounded-lg">
            <h3 className="font-h2 text-h2 text-on-surface mb-sm flex items-center gap-xs">
              <span
                className="material-symbols-outlined text-sm"
                data-icon="build"
              >
                build
              </span>
              Troubleshooting Steps
            </h3>
            <ul className="space-y-sm">
              <li className="flex items-start gap-sm font-body-main text-on-surface-variant">
                <span className="font-bold text-primary">1.</span>
                Check server power and physical network connectivity to the data
                center or cloud provider.
              </li>
              <li className="flex items-start gap-sm font-body-main text-on-surface-variant">
                <span className="font-bold text-primary">2.</span>
                <span>
                  SSH into the node and ensure the
                  <code className="font-code text-error bg-error-container px-base rounded inline-block mx-1">
                    docker-agent
                  </code>
                  service is active and running.
                </span>
              </li>
              <li className="flex items-start gap-sm font-body-main text-on-surface-variant">
                <span className="font-bold text-primary">3.</span>
                <span>
                  Verify API firewall rules and security groups permit traffic
                  on port
                  <code className="font-code bg-surface-variant px-base rounded inline-block mx-1">
                    2375
                  </code>
                  .
                </span>
              </li>
            </ul>
          </div>
          <div className="flex items-center justify-center gap-md pt-xs">
            <button className="bg-primary text-on-primary px-md py-sm rounded-lg font-body-main font-semibold hover:opacity-90 transition-all active:scale-95 flex items-center gap-xs">
              <span className="material-symbols-outlined" data-icon="refresh">
                refresh
              </span>
              Retry Connection
            </button>
            <button className="bg-surface-container-lowest border border-outline-variant text-on-surface-variant px-md py-sm rounded-lg font-body-main hover:bg-surface-container transition-all active:scale-95 flex items-center gap-xs">
              <span
                className="material-symbols-outlined"
                data-icon="receipt_long"
              >
                receipt_long
              </span>
              View Server Logs
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 my-5 w-full mx-auto max-w-2xl">
        <span className="flex-1 h-px bg-outline-variant"></span>
        <span>OR</span>
        <span className="flex-1 h-px bg-outline-variant"></span>
      </div>
      <div className="w-full mx-auto max-w-2xl">
        <AgentInstallation />
      </div>
    </>
  );
}
