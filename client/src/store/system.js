import { create } from "zustand";

const systemStore = (set) => ({
  systemData: {},
  serverData: {},
  setSystemData: (updatedSystemData) =>
    set((state) => ({
      systemData: { ...state.systemData, ...updatedSystemData },
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
