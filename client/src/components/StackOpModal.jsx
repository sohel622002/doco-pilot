import { X } from "lucide-react";
import { useStackStore } from "../store/stack";
import { Button } from "./ui";

const TITLE = { deploy: "Deploying", down: "Bringing down" };

export default function StackOpModal() {
  const opType = useStackStore((state) => state.opType);
  const targetName = useStackStore((state) => state.targetName);
  const status = useStackStore((state) => state.status);
  const lines = useStackStore((state) => state.lines);
  const error = useStackStore((state) => state.error);
  const clearOp = useStackStore((state) => state.clearOp);

  if (!opType) return null;

  const running = status === "running";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-2xl max-h-[80vh] bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">
            {TITLE[opType]} — {targetName}
          </h3>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors disabled:opacity-40"
            onClick={clearOp}
            disabled={running}
            title={running ? "Operation in progress…" : "Close"}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-56 overflow-y-auto p-space-md bg-surface-container-lowest font-code text-code text-on-surface-variant">
          {lines.length === 0 ? (
            <p>Waiting for output…</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
          {status === "error" && <div className="text-error mt-space-sm">Failed: {error}</div>}
          {status === "done" && (
            <div className="text-[#5fd696] mt-space-sm">
              {opType === "deploy" ? "Stack deployed." : "Stack stopped and removed."}
            </div>
          )}
        </div>
        {!running && (
          <div className="p-space-md border-t border-outline-variant">
            <Button onClick={clearOp}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
