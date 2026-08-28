import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useServers } from "../hooks/useServers";
import api from "../lib/axios";
import { Plus, Server as ServerIcon, Trash2, Copy } from "lucide-react";

function AddServerForm({ onCreated }) {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/servers", { name, ip });
      setName("");
      setIp("");
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col md:flex-row gap-sm md:items-end mb-md"
    >
      <div className="flex-1 space-y-xs">
        <label className="text-label-caps text-on-surface-variant uppercase">Name</label>
        <input
          required
          className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main outline-none focus:ring-1 focus:ring-primary"
          placeholder="prod-01"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex-1 space-y-xs">
        <label className="text-label-caps text-on-surface-variant uppercase">IP / Hostname</label>
        <input
          required
          className="w-full h-10 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-main outline-none focus:ring-1 focus:ring-primary"
          placeholder="203.0.113.10"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-10 px-md flex items-center gap-xs bg-primary text-on-primary rounded-lg font-body-main font-bold hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={16} />
        {loading ? "Creating…" : "Add Server"}
      </button>
      {error && <p className="text-error text-body-main md:ml-sm">{error}</p>}
    </form>
  );
}

export default function Servers() {
  const { data, isLoading } = useServers();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newServer, setNewServer] = useState(null);

  const servers = data?.servers || [];

  const handleCreated = (created) => {
    setNewServer(created);
    queryClient.invalidateQueries({ queryKey: ["servers"] });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this server? This cannot be undone.")) return;
    await api.delete(`/api/servers/${id}`);
    queryClient.invalidateQueries({ queryKey: ["servers"] });
  };

  return (
    <div className="max-w-container-max mx-auto p-md">
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-background mb-xs">Your Servers</h1>
        <p className="text-body-large text-on-surface-variant">
          All servers registered to your account.
        </p>
      </div>

      <AddServerForm onCreated={handleCreated} />

      {newServer?.dockerCommand && (
        <div className="mb-md p-md bg-inverse-surface text-inverse-on-surface rounded-lg font-code text-code overflow-x-auto border border-white/10 relative">
          <p className="mb-xs opacity-70">
            Server created — run this on the target host to connect its agent:
          </p>
          <pre>{newServer.dockerCommand}</pre>
          <button
            className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded"
            onClick={() => navigator.clipboard.writeText(newServer.dockerCommand)}
          >
            <Copy size={16} />
          </button>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : servers.length === 0 ? (
        <p className="text-on-surface-variant">
          No servers yet — add one above to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex flex-col gap-sm hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate(`/${server.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <div className="h-8 w-8 rounded bg-primary-container/20 flex items-center justify-center text-primary">
                    <ServerIcon size={18} />
                  </div>
                  <div>
                    <p className="font-h2 text-[14px] text-on-surface">{server.name}</p>
                    <p className="text-label-caps text-on-surface-variant font-code">
                      {server.ip}
                    </p>
                  </div>
                </div>
                <button
                  title="Delete server"
                  className="p-1 text-on-surface-variant hover:text-error transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(server.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    server.agent_connected ? "bg-primary" : "bg-outline"
                  }`}
                ></span>
                <span className="text-label-caps text-on-surface-variant">
                  {server.agent_connected ? "Agent Online" : "Agent Offline"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
