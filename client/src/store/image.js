import { create } from "zustand";

const imageStore = (set) => ({
  images: [],
  setImages: (images) => set({ images }),
  // updateContainer: (key, value, updates) =>
  //   set((state) => ({
  //     containers: state.containers.map((container) =>
  //       container[key] === value ? { ...container, ...updates } : container,
  //     ),
  //   }))
});

export const useImageStore = create(imageStore);
