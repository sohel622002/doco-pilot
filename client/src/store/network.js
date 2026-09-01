import { create } from "zustand";

const networkStore = (set) => ({
  networks: [],
  setNetworks: (networks) => set({ networks }),
  removeNetwork: (id) =>
    set((state) => ({
      networks: state.networks.filter((network) => network.id !== id),
    })),
});

export const useNetworkStore = create(networkStore);
