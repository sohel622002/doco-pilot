import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useImageStore } from "../store/image";
import { useEffect, useState } from "react";
import { WS_ACTIONS } from "../lib/actions";
import { formatBytes, timeAgo } from "../lib/utils";
import { Trash2, Download } from "lucide-react";

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
  const [pullValue, setPullValue] = useState("");
  const [pulling, setPulling] = useState(false);

  const refreshImages = () => sendMessage({ action: WS_ACTIONS.IMAGES_LIST, serverId });

  useEffect(() => {
    refreshImages();
  }, [serverId, isConnected]);

  const handlePull = (e) => {
    e.preventDefault();
    if (!pullValue.trim()) return;
    setPulling(true);
    sendMessage({ action: WS_ACTIONS.IMAGES_PULL, imageName: pullValue.trim(), serverId });
    setPullValue("");
    setTimeout(() => {
      setPulling(false);
      refreshImages();
    }, 3000);
  };

  const handleRemove = (imageId) => {
    sendMessage({ action: WS_ACTIONS.IMAGES_REMOVE, imageId, serverId });
    setTimeout(refreshImages, 1000);
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
            className="px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-lg font-code text-code text-on-surface"
            placeholder="e.g. nginx:latest"
            value={pullValue}
            onChange={(e) => setPullValue(e.target.value)}
          />
          <button
            type="submit"
            disabled={pulling}
            className="flex items-center gap-space-xs bg-primary text-on-primary px-space-md py-space-xs rounded-lg font-body-main font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download size={16} />
            {pulling ? "Pulling…" : "Pull Image"}
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
            <span className="text-primary font-body-main pb-1 flex items-center">
              <span
                className="material-symbols-outlined text-[14px]"
                data-icon="trending_up"
              >
                trending_up
              </span>
              12%
            </span>
          </div>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Storage Used
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">12.4 GB</span>
            <span className="text-on-surface-variant font-body-main pb-1">
              of 50GB
            </span>
          </div>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Unused Images
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">8</span>
            <span className="text-error font-body-main pb-1">Cleanup due</span>
          </div>
        </div>
        <div className="p-space-sm bg-surface border border-outline-variant rounded-xl flex flex-col gap-space-xs">
          <span className="text-on-surface-variant font-label-caps uppercase tracking-wider font-bold text-xs">
            Registry Sync
          </span>
          <div className="flex items-end gap-space-sm">
            <span className="text-stat font-h1">Active</span>
            <span className="text-primary font-body-main pb-1">Docker Hub</span>
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
      {/* <!-- Visual Feature: Bento Style Grid for Details --> */}
      <div className="mt-space-md grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="md:col-span-2 p-space-md bg-surface border border-outline-variant rounded-xl">
          <div className="flex items-center justify-between mb-space-sm">
            <h3 className="font-h2 text-h2 text-on-surface">
              Recent Registry Events
            </h3>
            <span className="text-xs text-primary font-medium cursor-pointer">
              View full history
            </span>
          </div>
          <div className="space-y-space-sm">
            <div className="flex items-start gap-space-sm p-space-sm bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors border border-transparent hover:border-outline-variant">
              <span
                className="material-symbols-outlined text-primary bg-primary-fixed p-space-xs rounded"
                data-icon="cloud_download"
              >
                cloud_download
              </span>
              <div className="flex-1">
                <p className="text-body-main font-bold">Image Pull Success</p>
                <p className="text-xs text-on-surface-variant">
                  `nginx:latest` was pulled successfully from Docker Hub.
                </p>
              </div>
              <span className="text-xs text-on-surface-variant">2m ago</span>
            </div>
            <div className="flex items-start gap-space-sm p-space-sm bg-surface-container-low hover:bg-surface-container rounded-lg transition-colors border border-transparent hover:border-outline-variant">
              <span
                className="material-symbols-outlined text-error bg-error-container p-space-xs rounded"
                data-icon="warning"
              >
                warning
              </span>
              <div className="flex-1">
                <p className="text-body-main font-bold">
                  Vulnerability Detected
                </p>
                <p className="text-xs text-on-surface-variant">
                  `node:14` contains 12 critical security vulnerabilities.
                </p>
              </div>
              <span className="text-xs text-on-surface-variant">1h ago</span>
            </div>
          </div>
        </div>
        <div className="p-0 bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col">
          <div className="p-space-md flex-1">
            <h3 className="font-h2 text-h2 text-on-surface mb-space-xs">
              Registry Health
            </h3>
            <p className="text-on-surface-variant text-xs mb-space-md">
              Connected to central hub
            </p>
            <div className="flex items-center justify-center py-space-md">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-surface-container-high"
                    cx="64"
                    cy="64"
                    fill="transparent"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                  ></circle>
                  <circle
                    className="text-primary"
                    cx="64"
                    cy="64"
                    fill="transparent"
                    r="58"
                    stroke="currentColor"
                    strokeDasharray="364.4"
                    strokeDashoffset="72.8"
                    strokeWidth="8"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-stat font-h1">80%</span>
                  <span className="text-[10px] uppercase font-label-caps">
                    Optimal
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-space-sm bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs font-medium">Auto-cleanup enabled</span>
            <div className="w-8 h-4 bg-primary rounded-full relative">
              <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
