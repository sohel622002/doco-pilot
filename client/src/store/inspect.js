import { create } from "zustand";

const inspectStore = (set) => ({
  containerId: null,
  data: null,
  loading: false,
  openFor: (containerId) => set({ containerId, data: null, loading: true }),
  setData: (data) =>
    set((state) => (state.containerId ? { data, loading: false } : state)),
  close: () => set({ containerId: null, data: null, loading: false }),
});

export const useInspectStore = create(inspectStore);
