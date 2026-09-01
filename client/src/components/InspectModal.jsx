import { X } from "lucide-react";
import { useInspectStore } from "../store/inspect";
import Spinner from "./Spinner";

function Row({ label, value }) {
  return (
    <div className="py-space-sm border-b border-outline-variant last:border-b-0">
      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="font-code text-code text-on-surface break-all whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}

export default function InspectModal() {
  const containerId = useInspectStore((state) => state.containerId);
  const data = useInspectStore((state) => state.data);
  const loading = useInspectStore((state) => state.loading);
  const close = useInspectStore((state) => state.close);

  if (!containerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-2xl max-h-[80vh] bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <h3 className="font-h2 text-h2 text-on-surface">
            Inspect — {containerId}
          </h3>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-space-md">
          {loading ? (
            <div className="flex justify-center py-space-lg">
              <Spinner />
            </div>
          ) : !data ? (
            <p className="text-on-surface-variant">No data.</p>
          ) : (
            <div>
              <Row label="Name" value={data.name} />
              <Row label="Image" value={data.image} />
              <Row label="Status" value={data.state?.Status} />
              <Row label="Network Mode" value={data.networkMode} />
              <Row
                label="Restart Policy"
                value={data.restartPolicy?.Name || "none"}
              />
              <Row label="Created" value={data.created} />
              <Row
                label="Ports"
                value={JSON.stringify(data.ports, null, 2) || "-"}
              />
              <Row
                label="Mounts"
                value={JSON.stringify(data.mounts, null, 2) || "-"}
              />
              <Row
                label="Environment"
                value={(data.env || []).join("\n") || "-"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
