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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="w-full max-w-3xl max-h-[80vh] bg-surface border border-outline-variant rounded-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">
            Logs — {containerId}
          </h3>
          <button
            className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-md bg-inverse-surface text-inverse-on-surface font-code text-code">
          {loading ? (
            <div className="flex justify-center py-lg">
              <Spinner />
            </div>
          ) : lines.length === 0 ? (
            <p className="opacity-60">No log output.</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
