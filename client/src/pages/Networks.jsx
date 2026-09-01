import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { useNetworkStore } from "../store/network";
import { WS_ACTIONS } from "../lib/actions";
import { Network as NetworkIcon, Plus, Trash2 } from "lucide-react";
import { Card, Badge, Button } from "../components/ui";

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
    <div className="max-w-container-max mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">Networks</h2>
          <p className="text-on-surface-variant font-body-main">
            Manage Docker networks and container connectivity.
          </p>
        </div>
        <Button onClick={() => setCreateOpen((v) => !v)}>
          <Plus size={16} />
          Create Network
        </Button>
      </div>

      {createOpen && (
        <Card
          as="form"
          onSubmit={handleCreate}
          className="mb-3 grid grid-cols-4 gap-space-sm items-end"
        >
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Name
            </label>
            <input
              required
              className="h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="my-network"
            />
          </div>
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Driver
            </label>
            <select
              className="h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline"
              value={form.driver}
              onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
            >
              <option value="bridge">bridge</option>
              <option value="overlay">overlay</option>
              <option value="macvlan">macvlan</option>
            </select>
          </div>
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Subnet (optional)
            </label>
            <input
              className="h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline"
              value={form.subnet}
              onChange={(e) => setForm((f) => ({ ...f, subnet: e.target.value }))}
              placeholder="172.20.0.0/16"
            />
          </div>
          <div className="flex items-end gap-space-sm">
            <div className="flex flex-col gap-space-xs flex-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Gateway (optional)
              </label>
              <input
                className="h-9 px-space-sm bg-surface-container border border-outline-variant rounded-md font-code text-code text-on-surface focus:outline-none focus:border-outline"
                value={form.gateway}
                onChange={(e) => setForm((f) => ({ ...f, gateway: e.target.value }))}
                placeholder="172.20.0.1"
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </Card>
      )}

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
                  Subnet
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Connected Containers
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {networks.map((network) => {
                const isBuiltIn = BUILT_IN_NETWORKS.has(network.name);
                return (
                  <tr
                    className="hover:bg-surface-container-low transition-colors group"
                    key={network.id}
                  >
                    <td className="px-space-md py-space-md max-w-56">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                          <NetworkIcon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-h2 text-[14px] text-on-surface truncate"
                            title={network.name}
                          >
                            {network.name}
                          </p>
                          <p className="font-label-caps text-label-caps text-on-surface-variant truncate">
                            ID: {network.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md whitespace-nowrap">
                      <Badge tone="neutral">{network.driver}</Badge>
                    </td>
                    <td className="px-space-md py-space-md whitespace-nowrap">
                      <span className="font-code text-code text-on-surface-variant">
                        {network.subnet ?? "-"}
                      </span>
                    </td>
                    <td className="px-space-md py-space-md max-w-48">
                      <span
                        className="block truncate text-on-surface-variant"
                        title={network.connectedContainers.join(", ")}
                      >
                        {network.connectedContainers.length > 0
                          ? network.connectedContainers.join(", ")
                          : "-"}
                      </span>
                    </td>
                    <td className="px-space-md py-space-md text-right">
                      <button
                        title={isBuiltIn ? "Built-in network cannot be removed" : "Remove Network"}
                        className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                        disabled={isBuiltIn || network.connectedContainers.length > 0}
                        onClick={() => handleRemove(network)}
                      >
                        <Trash2 size={16} />
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
