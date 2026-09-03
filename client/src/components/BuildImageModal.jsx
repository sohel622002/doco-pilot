import { useState } from "react";
import { useParams } from "react-router-dom";
import { X, Hammer } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { WS_ACTIONS } from "../lib/actions";
import { useImageBuildStore } from "../store/imageBuild";
import { Button } from "./ui";

const DEFAULT_DOCKERFILE = "FROM alpine:latest\n\nCMD [\"echo\", \"hello from your build\"]\n";

function parseBuildArgs(text) {
  const args = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    args[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return args;
}

export default function BuildImageModal({ open, onClose }) {
  const { serverId } = useParams();
  const { sendMessage } = useWebSocket();
  const [tag, setTag] = useState("");
  const [dockerfile, setDockerfile] = useState(DEFAULT_DOCKERFILE);
  const [buildArgsText, setBuildArgsText] = useState("");

  const sessionId = useImageBuildStore((state) => state.sessionId);
  const status = useImageBuildStore((state) => state.status);
  const lines = useImageBuildStore((state) => state.lines);
  const error = useImageBuildStore((state) => state.error);

  if (!open) return null;

  const building = status === "building";

  const handleClose = () => {
    if (building) return; // let the build finish; log stream keeps appending regardless
    onClose();
  };

  const handleBuild = (e) => {
    e.preventDefault();
    if (!tag.trim() || !dockerfile.trim()) return;
    const newSessionId = globalThis.crypto?.randomUUID?.() ?? `build-${Date.now()}`;
    useImageBuildStore.getState().startBuild(newSessionId, tag.trim());
    sendMessage({
      action: WS_ACTIONS.IMAGES_BUILD_START,
      serverId,
      sessionId: newSessionId,
      imageName: tag.trim(),
      dockerfile,
      buildArgs: parseBuildArgs(buildArgsText),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-2xl max-h-[85vh] bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface flex items-center gap-space-xs">
            <Hammer size={16} />
            Build Image
          </h3>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors disabled:opacity-40"
            onClick={handleClose}
            disabled={building}
            title={building ? "Build in progress…" : "Close"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-md">
          {!sessionId ? (
            <form onSubmit={handleBuild} className="flex flex-col gap-space-md">
              <div>
                <label className="block text-[12px] font-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
                  Image tag
                </label>
                <input
                  className="w-full h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-outline"
                  placeholder="e.g. myapp:latest"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
                  Dockerfile
                </label>
                <textarea
                  className="w-full h-48 px-space-sm py-space-xs bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline resize-y"
                  value={dockerfile}
                  onChange={(e) => setDockerfile(e.target.value)}
                  spellCheck={false}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-label-caps text-on-surface-variant uppercase tracking-wider mb-space-xs">
                  Build args (optional, one KEY=value per line)
                </label>
                <textarea
                  className="w-full h-16 px-space-sm py-space-xs bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline resize-y"
                  value={buildArgsText}
                  onChange={(e) => setBuildArgsText(e.target.value)}
                  placeholder="NODE_ENV=production"
                  spellCheck={false}
                />
              </div>
              <Button type="submit">Start Build</Button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-space-sm text-[13px]">
                <span className="text-on-surface-variant">Building</span>
                <span className="font-code text-code text-on-surface">{tag}</span>
                <span className="ml-auto font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                  {status === "building" ? "In progress…" : status === "done" ? "Success" : "Failed"}
                </span>
              </div>
              <div className="flex-1 min-h-56 bg-surface-container-lowest border border-outline-variant rounded-md p-space-sm overflow-y-auto font-code text-code text-on-surface-variant">
                {lines.length === 0 ? (
                  <p>Waiting for build output…</p>
                ) : (
                  lines.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all">
                      {line}
                    </div>
                  ))
                )}
                {status === "error" && (
                  <div className="text-error mt-space-sm">Build failed: {error}</div>
                )}
              </div>
              {status !== "building" && (
                <Button onClick={onClose}>Close</Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
