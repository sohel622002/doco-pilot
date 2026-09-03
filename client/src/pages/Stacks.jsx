import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Play, Square, Pencil, Trash2, RefreshCw } from "lucide-react";
import api from "../lib/axios";
import { useWebSocket } from "../context/WebSocketContext";
import { WS_ACTIONS } from "../lib/actions";
import { useStackStore } from "../store/stack";
import { Card, Badge, Button } from "../components/ui";
import StackEditorModal from "../components/StackEditorModal";
import StackOpModal from "../components/StackOpModal";
import { useServers } from "../hooks/useServers";
import { canWrite, isOwner } from "../lib/roles";

// Kept as a standalone (non-component) helper — generating a random session
// id is inherently impure, and factoring it out here keeps the compiler's
// purity check on the component body itself meaningful.
function genSessionId(prefix) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Math.random().toString(36).slice(2)}`;
}

const ACTION_BTN =
  "p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant";

export default function Stacks() {
  const { serverId } = useParams();
  const { sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const runningStacks = useStackStore((state) => state.runningStacks);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStack, setEditingStack] = useState(null);

  const { data: serversData } = useServers();
  const role = serversData?.servers?.find((s) => s.id === serverId)?.role;
  const write = canWrite(role);
  const owner = isOwner(role);

  const { data, isLoading } = useQuery({
    queryKey: ["stacks", serverId],
    queryFn: async () => (await api.get(`/api/servers/${serverId}/stacks`)).data,
    enabled: !!serverId,
  });

  const refreshRunning = () => sendMessage({ action: WS_ACTIONS.STACKS_LIST, serverId });

  useEffect(() => {
    refreshRunning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, isConnected]);

  useEffect(() => {
    const handler = () => refreshRunning();
    window.addEventListener("stacks:changed", handler);
    return () => window.removeEventListener("stacks:changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const savedStacks = data?.stacks ?? [];
  const runningByName = new Map(runningStacks.map((s) => [s.name, s]));
  const untracked = runningStacks.filter((r) => !savedStacks.some((s) => s.name === r.name));

  const handleDeploy = (stack) => {
    const sessionId = genSessionId("deploy");
    useStackStore.getState().startOp("deploy", sessionId, stack.name);
    sendMessage({
      action: WS_ACTIONS.STACKS_DEPLOY_START,
      serverId,
      sessionId,
      stackName: stack.name,
      composeYaml: stack.compose_yaml,
    });
  };

  const handleDown = (name) => {
    if (!window.confirm(`Stop and remove all containers for stack "${name}"?`)) return;
    const sessionId = genSessionId("down");
    useStackStore.getState().startOp("down", sessionId, name);
    sendMessage({ action: WS_ACTIONS.STACKS_DOWN_START, serverId, sessionId, stackName: name });
  };

  const handleDelete = async (stack) => {
    if (
      !window.confirm(
        `Delete saved stack "${stack.name}"? This only removes the saved YAML — it does not stop a running deployment.`,
      )
    )
      return;
    await api.delete(`/api/servers/${serverId}/stacks/${stack.id}`);
    queryClient.invalidateQueries({ queryKey: ["stacks", serverId] });
  };

  const handleSaved = () => {
    setEditorOpen(false);
    queryClient.invalidateQueries({ queryKey: ["stacks", serverId] });
  };

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface mb-space-xs">Stacks</h2>
          <p className="text-on-surface-variant font-body-main">
            Deploy and manage multi-container stacks with Docker Compose.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={refreshRunning}
            className="flex items-center gap-space-xs h-9 px-space-sm rounded-md border border-outline-variant text-on-surface-variant text-[13px] font-medium hover:bg-surface-container transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {write && (
            <Button
              onClick={() => {
                setEditingStack(null);
                setEditorOpen(true);
              }}
            >
              <Plus size={16} />
              New Stack
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>Loading stacks…</Card>
      ) : savedStacks.length === 0 ? (
        <Card>
          <p className="text-on-surface-variant">
            No stacks saved yet. Create one to deploy a docker-compose file to this server.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {savedStacks.map((stack) => {
            const running = runningByName.get(stack.name);
            return (
              <Card key={stack.id} className="flex items-center justify-between gap-space-md">
                <div className="min-w-0 flex items-center gap-space-sm">
                  <Boxes size={18} className="text-on-surface-variant shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-h2 text-[14px] text-on-surface truncate">{stack.name}</span>
                      {running ? (
                        <Badge tone="success">{running.status}</Badge>
                      ) : (
                        <Badge tone="neutral">Not running</Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-on-surface-variant">
                      Updated {new Date(stack.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs shrink-0">
                  <button
                    title="Deploy"
                    className={ACTION_BTN}
                    disabled={!write}
                    onClick={() => handleDeploy(stack)}
                  >
                    <Play size={17} />
                  </button>
                  <button
                    title="Down"
                    className={ACTION_BTN}
                    disabled={!write || !running}
                    onClick={() => handleDown(stack.name)}
                  >
                    <Square size={17} />
                  </button>
                  <button
                    title="Edit"
                    className={ACTION_BTN}
                    disabled={!write}
                    onClick={() => {
                      setEditingStack(stack);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    title={owner ? "Delete saved stack" : "Only the owner can delete a saved stack"}
                    className={`${ACTION_BTN} hover:text-error hover:bg-error-container`}
                    disabled={!owner}
                    onClick={() => handleDelete(stack)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {untracked.length > 0 && (
        <Card className="mt-3">
          <h3 className="font-h2 text-h2 text-on-surface mb-space-sm">
            Other stacks running on this host
          </h3>
          <p className="text-[12px] text-on-surface-variant mb-space-md">
            Deployed outside doco-pilot, or not yet saved here.
          </p>
          <div className="flex flex-col gap-space-sm">
            {untracked.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="font-code text-code text-on-surface">{s.name}</span>
                <div className="flex items-center gap-space-sm">
                  <Badge tone="success">{s.status}</Badge>
                  <button
                    title="Down"
                    className={ACTION_BTN}
                    disabled={!write}
                    onClick={() => handleDown(s.name)}
                  >
                    <Square size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <StackEditorModal
        open={editorOpen}
        stack={editingStack}
        serverId={serverId}
        onSaved={handleSaved}
        onClose={() => setEditorOpen(false)}
      />
      <StackOpModal />
    </div>
  );
}
