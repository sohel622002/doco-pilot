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
});

export const useContainerStore = create(containerStore);
