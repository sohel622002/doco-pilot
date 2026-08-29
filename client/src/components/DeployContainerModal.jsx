import { useState } from "react";
import { X } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { WS_ACTIONS } from "../lib/actions";

export default function DeployContainerModal({ serverId, open, onClose }) {
  const { sendMessage } = useWebSocket();
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [ports, setPorts] = useState("");
  const [env, setEnv] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!image.trim()) {
      return setError("Image is required");
    }

    const portsList = ports
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const envList = env
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    sendMessage({
      action: WS_ACTIONS.CONTAINER_CREATE,
      image: image.trim(),
      name: name.trim() || undefined,
      ports: portsList,
      env: envList,
      serverId,
    });

    setImage("");
    setName("");
    setPorts("");
    setEnv("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">Deploy Container</h3>
          <button
            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-space-md space-y-space-sm">
          <div className="space-y-space-xs">
            <label className="text-label-caps text-on-surface-variant uppercase">
              Image
            </label>
            <input
              required
              className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg font-code text-code outline-none focus:ring-1 focus:ring-primary"
              placeholder="nginx:latest"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <div className="space-y-space-xs">
            <label className="text-label-caps text-on-surface-variant uppercase">
              Name (optional)
            </label>
            <input
              className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg font-code text-code outline-none focus:ring-1 focus:ring-primary"
              placeholder="my-nginx"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-space-xs">
            <label className="text-label-caps text-on-surface-variant uppercase">
              Port Mappings (comma-separated, hostPort:containerPort)
            </label>
            <input
              className="w-full h-10 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg font-code text-code outline-none focus:ring-1 focus:ring-primary"
              placeholder="8080:80, 8443:443"
              value={ports}
              onChange={(e) => setPorts(e.target.value)}
            />
          </div>
          <div className="space-y-space-xs">
            <label className="text-label-caps text-on-surface-variant uppercase">
              Environment Variables (one KEY=VALUE per line)
            </label>
            <textarea
              rows={3}
              className="w-full px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-lg font-code text-code outline-none focus:ring-1 focus:ring-primary"
              placeholder={"NODE_ENV=production\nPORT=3000"}
              value={env}
              onChange={(e) => setEnv(e.target.value)}
            />
          </div>
          {error && <p className="text-error text-body-main">{error}</p>}
          <div className="flex justify-end gap-space-sm pt-space-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-space-md py-space-xs rounded-full border border-outline-variant text-on-surface font-body-main hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-space-md py-space-xs rounded-full bg-primary text-on-primary font-body-main hover:opacity-90 transition-opacity"
            >
              Deploy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
