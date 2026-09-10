import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import api from "../lib/axios";
import { Badge } from "../components/ui";
import { timeAgo } from "../lib/utils";

const LIMIT = 50;

function useAuditLogs(offset) {
  return useQuery({
    queryKey: ["audit-logs", offset],
    queryFn: async () =>
      (await api.get("/api/audit-logs", { params: { limit: LIMIT, offset } })).data,
    staleTime: 1000 * 30,
  });
}

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useAuditLogs(offset);
  const logs = data?.logs ?? [];

  return (
    <div className="max-w-container-max mx-auto space-y-3">
      <div>
        <h1 className="font-h1 text-h1 text-on-surface mb-space-xs">Audit Log</h1>
        <p className="font-body-main text-body-main text-on-surface-variant">
          Every action taken on your account and the servers you have access to.
        </p>
      </div>

      <div className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Action
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Target
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  By
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  Result
                </th>
                <th className="px-space-md py-space-sm font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-space-md py-space-md">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                        <ScrollText size={15} />
                      </div>
                      <span className="font-code text-code text-on-surface">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-space-md py-space-md text-on-surface-variant text-body-main max-w-64 truncate" title={log.target ?? ""}>
                    {log.target ?? "—"}
                  </td>
                  <td className="px-space-md py-space-md text-on-surface-variant text-body-main">
                    {log.email ?? "—"}
                  </td>
                  <td className="px-space-md py-space-md whitespace-nowrap">
                    <Badge tone={log.result === "ok" ? "success" : "error"}>{log.result}</Badge>
                  </td>
                  <td className="px-space-md py-space-md whitespace-nowrap text-on-surface-variant">
                    {timeAgo(log.ts)}
                  </td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-space-md py-space-lg text-center text-on-surface-variant font-body-main">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="h-9 px-space-md rounded-md border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container transition-colors disabled:opacity-40"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
        >
          Newer
        </button>
        <button
          className="h-9 px-space-md rounded-md border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container transition-colors disabled:opacity-40"
          disabled={logs.length < LIMIT}
          onClick={() => setOffset((o) => o + LIMIT)}
        >
          Older
        </button>
      </div>
    </div>
  );
}
