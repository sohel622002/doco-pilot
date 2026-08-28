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
  });
}
