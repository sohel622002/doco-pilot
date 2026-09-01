import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useVolumeStore } from "../store/volume";
import { WS_ACTIONS } from "../lib/actions";
import { HardDrive, Trash2 } from "lucide-react";
import { Card, Badge } from "../components/ui";

export default function Volumes() {
  const { serverId } = useParams();
  const { sendMessage, isConnected } = useWebSocket();
  const volumes = useVolumeStore((state) => state.volumes);

  const refreshVolumes = () => sendMessage({ action: WS_ACTIONS.VOLUMES_LIST, serverId });

  useEffect(() => {
    refreshVolumes();
  }, [serverId, isConnected]);

  const handleRemove = (name) => {
    if (!window.confirm(`Permanently remove volume "${name}"? This cannot be undone.`)) return;
    sendMessage({ action: WS_ACTIONS.VOLUMES_REMOVE, volumeName: name, serverId });
  };

  const orphanedCount = volumes.filter((v) => v.orphaned).length;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="mb-space-lg">
        <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">Volumes</h2>
        <p className="text-on-surface-variant font-body-main">
          Manage persistent storage volumes on this server.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Total Volumes
          </span>
          <p className="text-stat text-on-surface mt-space-sm">{volumes.length}</p>
        </Card>
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Orphaned Volumes
          </span>
          <div className="flex items-baseline gap-space-xs mt-space-sm">
            <span className="text-stat text-on-surface">{orphanedCount}</span>
            {orphanedCount > 0 && (
              <span className="font-body-main text-body-main text-[#e8b458]">
                Not attached to any container
              </span>
            )}
          </div>
        </Card>
      </div>

      <div className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Name
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Driver
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Mountpoint
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Used By
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {volumes.map((volume) => (
                <tr
                  className="hover:bg-surface-container-low transition-colors group"
                  key={volume.name}
                >
                  <td className="px-space-md py-space-md max-w-64">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                        <HardDrive size={15} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-h2 text-[14px] text-on-surface truncate"
                          title={volume.name}
                        >
                          {volume.name}
                        </p>
                        {volume.orphaned && (
                          <p className="font-label-caps text-label-caps text-error">Orphaned</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-space-md py-space-md whitespace-nowrap">
                    <Badge tone="neutral">{volume.driver}</Badge>
                  </td>
                  <td className="px-space-md py-space-md max-w-72">
                    <span
                      className="block truncate font-code text-code text-on-surface-variant"
                      title={volume.mountpoint}
                    >
                      {volume.mountpoint}
                    </span>
                  </td>
                  <td className="px-space-md py-space-md max-w-48">
                    <span
                      className="block truncate text-on-surface-variant"
                      title={volume.usedBy.join(", ")}
                    >
                      {volume.usedBy.length > 0 ? volume.usedBy.join(", ") : "-"}
                    </span>
                  </td>
                  <td className="px-space-md py-space-md text-right">
                    <button
                      title="Remove Volume"
                      className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                      disabled={!volume.orphaned}
                      onClick={() => handleRemove(volume.name)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {volumes.length === 0 && (
                <tr>
                  <td className="px-space-md py-space-md text-on-surface-variant" colSpan={5}>
                    No volumes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
