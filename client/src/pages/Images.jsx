import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useImageStore } from "../store/image";
import { useDiskUsageStore } from "../store/diskUsage";
import { useEffect, useState } from "react";
import { WS_ACTIONS } from "../lib/actions";
import { formatBytes, timeAgo } from "../lib/utils";
import { Trash2, Download, Sparkles } from "lucide-react";

function parseImageTag(tags) {
  const raw = Array.isArray(tags) && tags.length > 0 ? tags[0] : null;
  if (!raw || raw === "<none>:<none>") {
    return { repository: "<none>", tag: "<none>" };
  }
  const colon = raw.lastIndexOf(":");
  if (colon <= 0) {
    return { repository: raw, tag: "latest" };
  }
  return {
    repository: raw.slice(0, colon),
    tag: raw.slice(colon + 1) || "latest",
  };
}

export default function Images() {
  const { serverId } = useParams();
  const { sendMessage, isConnected } = useWebSocket();
  const images = useImageStore((state) => state.images);
  const diskUsage = useDiskUsageStore((state) => state.diskUsage);
  const danglingImages = useDiskUsageStore((state) => state.danglingImages);
  const [pullValue, setPullValue] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pruning, setPruning] = useState(false);

  const refreshImages = () => sendMessage({ action: WS_ACTIONS.IMAGES_LIST, serverId });
  const refreshDiskUsage = () => {
    sendMessage({ action: WS_ACTIONS.SYSTEM_DISK_USAGE, serverId });
    sendMessage({ action: WS_ACTIONS.IMAGES_DANGLING, serverId });
  };

  useEffect(() => {
    refreshImages();
    refreshDiskUsage();
  }, [serverId, isConnected]);

  useEffect(() => {
    const handler = () => {
      setPruning(false);
      refreshImages();
      refreshDiskUsage();
    };
    window.addEventListener("images:pruned", handler);
    return () => window.removeEventListener("images:pruned", handler);
  }, [serverId]);

  const handlePrune = () => {
    if (!window.confirm("Remove all dangling (unused) images? This cannot be undone.")) return;
    setPruning(true);
    sendMessage({ action: WS_ACTIONS.IMAGES_PRUNE, serverId });
  };

  const handlePull = (e) => {
    e.preventDefault();
    if (!pullValue.trim()) return;
    setPulling(true);
    sendMessage({ action: WS_ACTIONS.IMAGES_PULL, imageName: pullValue.trim(), serverId });
    setPullValue("");
    setTimeout(() => {
      setPulling(false);
      refreshImages();
      refreshDiskUsage();
    }, 3000);
  };

  const handleRemove = (imageId) => {
    sendMessage({ action: WS_ACTIONS.IMAGES_REMOVE, imageId, serverId });
    setTimeout(() => {
      refreshImages();
      refreshDiskUsage();
    }, 1000);
  };

  return (
    <div className="max-w-container-max mx-auto p-space-md">
      {/* <!-- Breadcrumbs & Header --> */}
      <div className="flex items-center justify-between mb-space-md">
        <div>
          <h2 className="font-h1 text-h1 text-on-background">Image Registry</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage your local and remote Docker image repository
          </p>
        </div>
        <form onSubmit={handlePull} className="flex items-center gap-space-xs">
          <input
            className="px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-full font-code text-code text-on-surface"
            placeholder="e.g. nginx:latest"
            value={pullValue}
            onChange={(e) => setPullValue(e.target.value)}
          />
          <button
            type="submit"
            disabled={pulling}
            className="flex items-center gap-space-xs bg-primary text-on-primary px-space-md py-space-xs rounded-full font-body-main font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download size={16} />
            {pulling ? "Pulling…" : "Pull Image"}
          </button>
          <button
            type="button"
            disabled={pruning || danglingImages.length === 0}
            onClick={handlePrune}
            title={
              danglingImages.length === 0
                ? "No dangling images to remove"
                : `Remove ${danglingImages.length} dangling image(s)`
            }
            className="flex items-center gap-space-xs bg-error-container text-on-error-container px-space-md py-space-xs rounded-full font-body-main font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Sparkles size={16} />
            {pruning ? "Pruning…" : `Prune Unused (${danglingImages.length})`}
          </button>
        </form>
      </div>
      {/* <!-- Dashboard Stats Row --> */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md mb-space-md">
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Total Images
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">{images?.length ?? 0}</span>
          </div>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Image Storage
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">
              {diskUsage ? formatBytes(diskUsage.images.totalBytes) : "—"}
            </span>
            <span className="text-on-surface-variant font-body-main pb-1">
              {diskUsage ? `${formatBytes(diskUsage.images.reclaimableBytes)} reclaimable` : ""}
            </span>
          </div>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Unused Images
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">{danglingImages.length}</span>
            {danglingImages.length > 0 && (
              <span className="text-error font-body-main pb-1">Cleanup due</span>
            )}
          </div>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Total Disk Reclaimable
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">
              {diskUsage ? formatBytes(diskUsage.reclaimableBytes) : "—"}
            </span>
            <span className="text-on-surface-variant font-body-main pb-1">
              {diskUsage ? `of ${formatBytes(diskUsage.totalBytes)}` : ""}
            </span>
          </div>
        </div>
      </div>
      {/* <!-- Image List --> */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Repository Name
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Tag
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Image ID
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Size
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Created
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {/* <!-- Row 1 --> */}
              {images &&
                images.map((image) => {
                  const { repository, tag } = parseImageTag(image?.tags);
                  return (
                  <tr className="hover:bg-surface-container-lowest transition-colors group" key={image?.id}>
                    <td className="px-space-md py-space-sm">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center text-primary">
                          <span
                            className="material-symbols-outlined"
                            data-icon="description"
                          >
                            description
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">
                            {repository}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            Local Image
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className="px-space-xs py-0.5 bg-secondary-container text-on-secondary-container rounded font-code text-xs">
                        {tag}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className="font-code text-xs text-on-surface-variant">
                        {image?.id}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm text-on-surface">{formatBytes(image?.size)}</td>
                    <td className="px-space-md py-space-sm text-on-surface-variant">
                      {timeAgo(image?.created)}
                    </td>
                    <td className="px-space-md py-space-sm text-right">
                      <button
                        title="Remove Image"
                        className="p-1 text-on-surface-variant hover:text-error transition-colors"
                        onClick={() => handleRemove(image?.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      {/* <!-- Disk usage breakdown --> */}
      {diskUsage && (
        <div className="mt-space-md p-space-md bg-surface border border-outline-variant rounded-xl">
          <h3 className="font-h2 text-h2 text-on-surface mb-space-sm">
            Disk Usage Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
            {["images", "containers", "volumes", "buildCache"].map((key) => (
              <div key={key} className="flex flex-col gap-space-xs">
                <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
                  {key === "buildCache" ? "Build Cache" : key}
                </span>
                <span className="text-body-main font-bold text-on-surface">
                  {formatBytes(diskUsage[key].totalBytes)}{" "}
                  <span className="text-xs text-on-surface-variant font-normal">
                    ({diskUsage[key].count})
                  </span>
                </span>
                <span className="text-xs text-on-surface-variant">
                  {formatBytes(diskUsage[key].reclaimableBytes)} reclaimable
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
