import { create } from "zustand";

const MAX_HISTORY = 30;

const systemStore = (set) => ({
  systemData: {},
  serverData: {},
  history: [],
  setSystemData: (updatedSystemData) =>
    set((state) => ({
      systemData: { ...state.systemData, ...updatedSystemData },
      history: [
        ...state.history,
        {
          ts: Date.now(),
          cpu: Number(updatedSystemData?.cpu?.usagePercent ?? 0),
          memory: Number(updatedSystemData?.memory?.usagePercent ?? 0),
        },
      ].slice(-MAX_HISTORY),
    })),
  setAgentState: (agentState) =>
    set((state) => ({
      systemData: { ...state.systemData, agentState },
    })),
  setServerData: (data) =>
    set((state) => ({
      serverData: { ...state.serverData, ...data },
    }))
});

export const useSystemStore = create(systemStore);
