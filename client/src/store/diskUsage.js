import { create } from "zustand";

const diskUsageStore = (set) => ({
  diskUsage: null,
  danglingImages: [],
  setDiskUsage: (diskUsage) => set({ diskUsage }),
  setDanglingImages: (danglingImages) => set({ danglingImages }),
});

export const useDiskUsageStore = create(diskUsageStore);
