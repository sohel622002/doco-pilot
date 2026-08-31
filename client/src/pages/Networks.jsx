import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useNetworkStore } from "../store/network";
import { WS_ACTIONS } from "../lib/actions";
import { Network as NetworkIcon, Plus, Trash2 } from "lucide-react";

const BUILT_IN_NETWORKS = new Set(["bridge", "host", "none"]);

export default function Networks() {
  const { serverId } = useParams();
  const { sendMessage, isConnected } = useWebSocket();
  const networks = useNetworkStore((state) => state.networks);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", driver: "bridge", subnet: "", gateway: "" });
  const [creating, setCreating] = useState(false);

  const refreshNetworks = () => sendMessage({ action: WS_ACTIONS.NETWORKS_LIST, serverId });

  useEffect(() => {
    refreshNetworks();
  }, [serverId, isConnected]);

  useEffect(() => {
    const handler = () => {
      setCreating(false);
      setCreateOpen(false);
      setForm({ name: "", driver: "bridge", subnet: "", gateway: "" });
      refreshNetworks();
    };
    window.addEventListener("networks:created", handler);
    return () => window.removeEventListener("networks:created", handler);
  }, [serverId]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    sendMessage({
      action: WS_ACTIONS.NETWORKS_CREATE,
      name: form.name.trim(),
      networkDriver: form.driver,
      subnet: form.subnet.trim() || undefined,
      gateway: form.gateway.trim() || undefined,
      serverId,
    });
  };

  const handleRemove = (network) => {
    if (!window.confirm(`Permanently remove network "${network.name}"? This cannot be undone.`)) {
      return;
    }
    sendMessage({ action: WS_ACTIONS.NETWORKS_REMOVE, networkId: network.id, serverId });
  };

  return (
    <div className="max-w-container-max mx-auto p-space-md">
      <div className="flex items-center justify-between mb-space-md">
        <div>
          <h2 className="font-h1 text-h1 text-on-background">Networks</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage Docker networks and container connectivity.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="flex items-center gap-space-xs bg-primary text-on-primary px-space-md py-space-xs rounded-full font-body-main font-bold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Create Network
        </button>
      </div>

      {createOpen && (
        <form
          onSubmit={handleCreate}
          className="mb-space-md p-space-md bg-surface border border-outline-variant rounded-xl grid grid-cols-1 md:grid-cols-4 gap-space-sm items-end"
        >
          <div className="flex flex-col gap-space-xs">
            <label className="text-xs text-on-surface-variant">Name</label>
            <input
              required
              className="px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-full font-code text-code"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="my-network"
            />
          </div>
          <div className="flex flex-col gap-space-xs">
            <label className="text-xs text-on-surface-variant">Driver</label>
            <select
              className="px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-full font-code text-code"
              value={form.driver}
              onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
            >
              <option value="bridge">bridge</option>
              <option value="overlay">overlay</option>
              <option value="macvlan">macvlan</option>
            </select>
          </div>
          <div className="flex flex-col gap-space-xs">
            <label className="text-xs text-on-surface-variant">Subnet (optional)</label>
            <input
              className="px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-full font-code text-code"
              value={form.subnet}
              onChange={(e) => setForm((f) => ({ ...f, subnet: e.target.value }))}
              placeholder="172.20.0.0/16"
            />
          </div>
          <div className="flex items-end gap-space-sm">
            <div className="flex flex-col gap-space-xs flex-1">
              <label className="text-xs text-on-surface-variant">Gateway (optional)</label>
              <input
                className="px-space-sm py-space-xs bg-surface-container-low border border-outline-variant rounded-full font-code text-code"
                value={form.gateway}
                onChange={(e) => setForm((f) => ({ ...f, gateway: e.target.value }))}
                placeholder="172.20.0.1"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="bg-primary text-on-primary px-space-md py-space-xs rounded-full font-body-main font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

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
                  Subnet
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant">
                  Connected Containers
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-on-surface-variant text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {networks.map((network) => {
                const isBuiltIn = BUILT_IN_NETWORKS.has(network.name);
                return (
                  <tr
                    className="hover:bg-surface-container-lowest transition-colors group"
                    key={network.id}
                  >
                    <td className="px-space-md py-space-sm">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center text-primary">
                          <NetworkIcon size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{network.name}</p>
                          <p className="text-xs text-on-surface-variant">ID: {network.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className="px-space-xs py-0.5 bg-secondary-container text-on-secondary-container rounded font-code text-xs">
                        {network.driver}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className="font-code text-xs text-on-surface-variant">
                        {network.subnet ?? "-"}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm text-on-surface-variant">
                      {network.connectedContainers.length > 0
                        ? network.connectedContainers.join(", ")
                        : "-"}
                    </td>
                    <td className="px-space-md py-space-sm text-right">
                      <button
                        title={isBuiltIn ? "Built-in network cannot be removed" : "Remove Network"}
                        className="p-1 text-on-surface-variant hover:text-error transition-colors disabled:opacity-40"
                        disabled={isBuiltIn || network.connectedContainers.length > 0}
                        onClick={() => handleRemove(network)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {networks.length === 0 && (
                <tr>
                  <td className="px-space-md py-space-md text-on-surface-variant" colSpan={5}>
                    No networks found.
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
