import { create } from "zustand";

// The terminal's data listener is registered imperatively by the open
// ExecModal instance rather than kept in state — routing every stdout
// chunk through a React state update would re-render on every keystroke.
let dataListener = null;

export const useExecStore = create((set) => ({
  open: false,
  containerId: null,
  containerName: null,
  sessionId: null,
  status: "idle", // idle | connecting | ready | error | exited
  error: null,

  openFor: (containerId, containerName, sessionId) =>
    set({
      open: true,
      containerId,
      containerName,
      sessionId,
      status: "connecting",
      error: null,
    }),

  setStatus: (sessionId, status, error = null) =>
    set((state) => (state.sessionId === sessionId ? { status, error } : state)),

  close: () =>
    set({
      open: false,
      containerId: null,
      containerName: null,
      sessionId: null,
      status: "idle",
      error: null,
    }),

  setDataListener: (fn) => {
    dataListener = fn;
  },
  emitData: (sessionId, data) => {
    dataListener?.(sessionId, data);
  },
}));
