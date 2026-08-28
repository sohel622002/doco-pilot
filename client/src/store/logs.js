import { create } from "zustand";

const logsStore = (set) => ({
  containerId: null,
  lines: [],
  loading: false,
  openFor: (containerId) => set({ containerId, lines: [], loading: true }),
  setLines: (containerId, lines) =>
    set((state) =>
      state.containerId === containerId ? { lines, loading: false } : state,
    ),
  close: () => set({ containerId: null, lines: [], loading: false }),
});

export const useLogsStore = create(logsStore);
