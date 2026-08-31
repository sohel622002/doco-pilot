import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useVolumeStore } from "../store/volume";
import { WS_ACTIONS } from "../lib/actions";
import { HardDrive, Trash2 } from "lucide-react";

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
    <div className="max-w-container-max mx-auto p-space-md">
      <div className="flex items-center justify-between mb-space-md">
        <div>
          <h2 className="font-h1 text-h1 text-on-background">Volumes</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage persistent storage volumes on this server.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-md">
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Total Volumes
          </span>
          <span className="text-stat font-h1">{volumes.length}</span>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Orphaned Volumes
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">{orphanedCount}</span>
            {orphanedCount > 0 && (
              <span className="text-error font-body-main pb-1">Not attached to any container</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Name
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Driver
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Mountpoint
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Used By
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {volumes.map((volume) => (
                <tr
                  className="hover:bg-surface-container-lowest transition-colors group"
                  key={volume.name}
                >
                  <td className="px-space-md py-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center text-primary">
                        <HardDrive size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{volume.name}</p>
                        {volume.orphaned && (
                          <p className="text-xs text-error">Orphaned</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="px-space-xs py-0.5 bg-secondary-container text-on-secondary-container rounded font-code text-xs">
                      {volume.driver}
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="font-code text-xs text-on-surface-variant break-all">
                      {volume.mountpoint}
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm text-on-surface-variant">
                    {volume.usedBy.length > 0 ? volume.usedBy.join(", ") : "-"}
                  </td>
                  <td className="px-space-md py-space-sm text-right">
                    <button
                      title="Remove Volume"
                      className="p-1 text-on-surface-variant hover:text-error transition-colors disabled:opacity-40"
                      disabled={!volume.orphaned}
                      onClick={() => handleRemove(volume.name)}
                    >
                      <Trash2 size={18} />
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
