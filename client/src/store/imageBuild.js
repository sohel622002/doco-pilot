import { create } from "zustand";

export const useImageBuildStore = create((set) => ({
  open: false,
  sessionId: null,
  tag: null,
  lines: [],
  status: "idle", // idle | building | done | error
  error: null,

  openModal: () => set({ open: true, sessionId: null, tag: null, lines: [], status: "idle", error: null }),
  close: () => set({ open: false }),

  startBuild: (sessionId, tag) =>
    set({ sessionId, tag, lines: [], status: "building", error: null }),

  appendLine: (sessionId, line) =>
    set((state) =>
      state.sessionId === sessionId ? { lines: [...state.lines, line] } : state,
    ),

  finishBuild: (sessionId, ok, error) =>
    set((state) =>
      state.sessionId === sessionId
        ? { status: ok ? "done" : "error", error: error ?? null }
        : state,
    ),
}));
