import { create } from "zustand";

export const useStackStore = create((set) => ({
  runningStacks: [],
  setRunningStacks: (stacks) => set({ runningStacks: stacks ?? [] }),

  // Transient deploy/down operation log — one at a time, mirrors the image
  // build modal's session pattern (agent streams lines, then a done event).
  opType: null, // 'deploy' | 'down' | null
  sessionId: null,
  targetName: null,
  lines: [],
  status: "idle", // idle | running | done | error
  error: null,

  startOp: (opType, sessionId, targetName) =>
    set({ opType, sessionId, targetName, lines: [], status: "running", error: null }),
  appendLine: (sessionId, line) =>
    set((state) =>
      state.sessionId === sessionId ? { lines: [...state.lines, line] } : state,
    ),
  finishOp: (sessionId, ok, error) =>
    set((state) =>
      state.sessionId === sessionId
        ? { status: ok ? "done" : "error", error: error ?? null }
        : state,
    ),
  clearOp: () =>
    set({ opType: null, sessionId: null, targetName: null, lines: [], status: "idle", error: null }),
}));
