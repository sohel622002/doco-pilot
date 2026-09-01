import { useState } from "react";
import { X } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { WS_ACTIONS } from "../lib/actions";
import { Button } from "./ui";

const modalInputClass =
  "w-full h-10 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface outline-none focus:border-outline";

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
      <div className="w-full max-w-lg bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">Deploy Container</h3>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-space-md space-y-space-md">
          <div className="space-y-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Image
            </label>
            <input
              required
              className={modalInputClass}
              placeholder="nginx:latest"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <div className="space-y-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Name (optional)
            </label>
            <input
              className={modalInputClass}
              placeholder="my-nginx"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Port Mappings (comma-separated, hostPort:containerPort)
            </label>
            <input
              className={modalInputClass}
              placeholder="8080:80, 8443:443"
              value={ports}
              onChange={(e) => setPorts(e.target.value)}
            />
          </div>
          <div className="space-y-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Environment Variables (one KEY=VALUE per line)
            </label>
            <textarea
              rows={3}
              className="w-full px-space-sm py-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface outline-none focus:border-outline"
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
              className="h-9 px-space-md rounded-md border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <Button type="submit">Deploy</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
