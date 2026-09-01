import { create } from "zustand";

const volumeStore = (set) => ({
  volumes: [],
  setVolumes: (volumes) => set({ volumes }),
  removeVolume: (name) =>
    set((state) => ({
      volumes: state.volumes.filter((volume) => volume.name !== name),
    })),
});

export const useVolumeStore = create(volumeStore);
