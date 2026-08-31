import { create } from "zustand";

const containerStore = (set) => ({
  containers: [],
  setContainers: (containers) => set({ containers }),
  updateContainer: (key, value, updates) =>
    set((state) => ({
      containers: state.containers.map((container) =>
        container[key] === value ? { ...container, ...updates } : container,
      ),
    })),
  removeContainer: (key, value) =>
    set((state) => ({
      containers: state.containers.filter((container) => container[key] !== value),
    })),
  setStats: (stats) =>
    set((state) => {
      const statsList = Array.isArray(stats) ? stats : [stats];
      const byId = new Map(statsList.filter(Boolean).map((s) => [s.shortId, s]));
      return {
        containers: state.containers.map((container) =>
          byId.has(container.shortId)
            ? { ...container, stats: byId.get(container.shortId) }
            : container,
        ),
      };
    }),
});

export const useContainerStore = create(containerStore);
