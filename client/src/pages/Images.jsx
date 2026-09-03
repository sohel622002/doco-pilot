import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useImageStore } from "../store/image";
import { useDiskUsageStore } from "../store/diskUsage";
import { useImageBuildStore } from "../store/imageBuild";
import { useEffect, useState } from "react";
import { WS_ACTIONS } from "../lib/actions";
import { formatBytes, timeAgo } from "../lib/utils";
import { Trash2, Download, Sparkles, FileText, Hammer } from "lucide-react";
import { Card, Badge, Button } from "../components/ui";
import BuildImageModal from "../components/BuildImageModal";
import { useServers } from "../hooks/useServers";
import { canWrite } from "../lib/roles";

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
  const [buildOpen, setBuildOpen] = useState(false);
  const { data: serversData } = useServers();
  const write = canWrite(serversData?.servers?.find((s) => s.id === serverId)?.role);

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
    window.addEventListener("images:built", handler);
    return () => {
      window.removeEventListener("images:pruned", handler);
      window.removeEventListener("images:built", handler);
    };
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
    <div className="max-w-container-max mx-auto">
      {/* <!-- Breadcrumbs & Header --> */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">Image Registry</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage your local and remote Docker image repository
          </p>
        </div>
        <form onSubmit={handlePull} className="flex items-center gap-space-sm">
          <input
            className="h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline"
            placeholder="e.g. nginx:latest"
            value={pullValue}
            onChange={(e) => setPullValue(e.target.value)}
          />
          <Button type="submit" disabled={!write || pulling}>
            <Download size={16} />
            {pulling ? "Pulling…" : "Pull Image"}
          </Button>
          <button
            type="button"
            disabled={!write}
            onClick={() => {
              useImageBuildStore.getState().openModal();
              setBuildOpen(true);
            }}
            className="flex items-center gap-space-xs h-9 px-space-md rounded-md border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Hammer size={15} />
            Build Image
          </button>
          <button
            type="button"
            disabled={!write || pruning || danglingImages.length === 0}
            onClick={handlePrune}
            title={
              danglingImages.length === 0
                ? "No dangling images to remove"
                : `Remove ${danglingImages.length} dangling image(s)`
            }
            className="flex items-center gap-space-xs h-9 px-space-md rounded-md border border-outline-variant text-error text-[13px] font-medium hover:bg-error-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Sparkles size={15} />
            {pruning ? "Pruning…" : `Prune Unused (${danglingImages.length})`}
          </button>
        </form>
      </div>
      {/* <!-- Dashboard Stats Row --> */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Total Images
          </span>
          <p className="text-stat text-on-surface mt-space-sm">{images?.length ?? 0}</p>
        </Card>
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Image Storage
          </span>
          <div className="flex items-baseline gap-space-xs mt-space-sm">
            <span className="text-stat text-on-surface">
              {diskUsage ? formatBytes(diskUsage.images.totalBytes) : "—"}
            </span>
            {diskUsage && (
              <span className="font-body-main text-body-main text-on-surface-variant">
                {formatBytes(diskUsage.images.reclaimableBytes)} reclaimable
              </span>
            )}
          </div>
        </Card>
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Unused Images
          </span>
          <div className="flex items-baseline gap-space-xs mt-space-sm">
            <span className="text-stat text-on-surface">{danglingImages.length}</span>
            {danglingImages.length > 0 && (
              <span className="font-body-main text-body-main text-[#e8b458]">Cleanup due</span>
            )}
          </div>
        </Card>
        <Card>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Total Disk Reclaimable
          </span>
          <div className="flex items-baseline gap-space-xs mt-space-sm">
            <span className="text-stat text-on-surface">
              {diskUsage ? formatBytes(diskUsage.reclaimableBytes) : "—"}
            </span>
            {diskUsage && (
              <span className="font-body-main text-body-main text-on-surface-variant">
                of {formatBytes(diskUsage.totalBytes)}
              </span>
            )}
          </div>
        </Card>
      </div>
      {/* <!-- Disk usage breakdown — kept above the table so it's visible without scrolling --> */}
      {diskUsage && (
        <Card className="mb-3">
          <h3 className="font-h2 text-h2 text-on-surface mb-space-md">Disk Usage Breakdown</h3>
          <div className="grid grid-cols-4 gap-space-md">
            {["images", "containers", "volumes", "buildCache"].map((key) => (
              <div key={key} className="flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  {key === "buildCache" ? "Build Cache" : key}
                </span>
                <span className="text-body-large font-medium text-on-surface">
                  {formatBytes(diskUsage[key].totalBytes)}{" "}
                  <span className="text-[12px] text-on-surface-variant font-normal">
                    ({diskUsage[key].count})
                  </span>
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {formatBytes(diskUsage[key].reclaimableBytes)} reclaimable
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {/* <!-- Image List --> */}
      <div className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Repository Name
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Tag
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Image ID
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Size
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Created
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {images &&
                images.map((image) => {
                  const { repository, tag } = parseImageTag(image?.tags);
                  return (
                    <tr
                      className="hover:bg-surface-container-low transition-colors group"
                      key={image?.id}
                    >
                      <td className="px-space-md py-space-md max-w-72">
                        <div className="flex items-center gap-space-sm min-w-0">
                          <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                            <FileText size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-h2 text-[14px] text-on-surface truncate" title={repository}>
                              {repository}
                            </p>
                            <p className="font-label-caps text-label-caps text-on-surface-variant">
                              Local Image
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-space-md py-space-md whitespace-nowrap">
                        <Badge tone="neutral">{tag}</Badge>
                      </td>
                      <td className="px-space-md py-space-md whitespace-nowrap">
                        <span className="font-code text-code text-on-surface-variant">
                          {image?.id}
                        </span>
                      </td>
                      <td className="px-space-md py-space-md whitespace-nowrap text-on-surface">
                        {formatBytes(image?.size)}
                      </td>
                      <td className="px-space-md py-space-md whitespace-nowrap text-on-surface-variant">
                        {timeAgo(image?.created)}
                      </td>
                      <td className="px-space-md py-space-md text-right">
                        <button
                          title="Remove Image"
                          className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                          disabled={!write}
                          onClick={() => handleRemove(image?.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      <BuildImageModal
        open={buildOpen}
        onClose={() => {
          setBuildOpen(false);
          useImageBuildStore.getState().close();
        }}
      />
    </div>
  );
}
