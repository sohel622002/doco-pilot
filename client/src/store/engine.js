import { create } from "zustand";

export const useEngineStore = create((set) => ({
  info: null,
  logs: [],
  setInfo: (info) => set({ info }),
  setLogs: (logs) => set({ logs: logs ?? [] }),
}));
