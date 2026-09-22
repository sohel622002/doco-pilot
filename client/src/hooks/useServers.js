import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios";

export function useServers() {
  return useQuery({
    queryKey: ["servers"],
    queryFn: async () => {
      const response = await api.get("/api/servers");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Agent connection is pushed to the backend, not to us — there's no
    // WebSocket event that tells this page "a server just came online", so
    // poll while this page is mounted. React Query only runs this while an
    // observer is active, so it stops the moment you navigate away.
    refetchInterval: 1000 * 10,
    retry: (failureCount, error) =>
      error?.response?.status !== 429 && failureCount < 3,
  });
}
