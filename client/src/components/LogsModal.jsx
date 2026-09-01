import { X } from "lucide-react";
import { useLogsStore } from "../store/logs";
import Spinner from "./Spinner";

export default function LogsModal() {
  const containerId = useLogsStore((state) => state.containerId);
  const lines = useLogsStore((state) => state.lines);
  const loading = useLogsStore((state) => state.loading);
  const close = useLogsStore((state) => state.close);

  if (!containerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-3xl max-h-[80vh] bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">
            Logs — {containerId}
          </h3>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-space-md bg-surface-container-lowest text-on-surface font-code text-code">
          {loading ? (
            <div className="flex justify-center py-space-lg">
              <Spinner />
            </div>
          ) : lines.length === 0 ? (
            <p className="text-on-surface-variant">No log output.</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all text-on-surface-variant">
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
