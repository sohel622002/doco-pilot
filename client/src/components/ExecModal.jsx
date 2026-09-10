import { useEffect, useRef } from "react";
import { X, TerminalSquare } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useParams } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { WS_ACTIONS } from "../lib/actions";
import { useExecStore } from "../store/exec";

const STATUS_LABEL = {
  connecting: "Connecting…",
  ready: "Connected",
  exited: "Session ended",
  error: "Error",
};

export default function ExecModal() {
  const { serverId } = useParams();
  const { sendMessage } = useWebSocket();
  const open = useExecStore((state) => state.open);
  const containerId = useExecStore((state) => state.containerId);
  const containerName = useExecStore((state) => state.containerName);
  const sessionId = useExecStore((state) => state.sessionId);
  const status = useExecStore((state) => state.status);
  const error = useExecStore((state) => state.error);
  const close = useExecStore((state) => state.close);

  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);

  // Mount xterm once per open session, tear it down when the modal closes.
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "var(--font-code, monospace)",
      theme: { background: "#0d0f12" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    useExecStore.getState().setDataListener((sid, data) => {
      if (sid === sessionId) term.write(data);
    });

    sendMessage({
      action: WS_ACTIONS.CONTAINER_EXEC_START,
      serverId,
      containerId,
      sessionId,
      cols: term.cols,
      rows: term.rows,
    });

    const onDataDisposable = term.onData((data) => {
      sendMessage({ action: WS_ACTIONS.CONTAINER_EXEC_INPUT, serverId, sessionId, data });
    });

    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      sendMessage({ action: WS_ACTIONS.CONTAINER_EXEC_RESIZE, serverId, sessionId, cols, rows });
    });

    const handleWindowResize = () => fitAddon.fit();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      useExecStore.getState().setDataListener(null);
      sendMessage({ action: WS_ACTIONS.CONTAINER_EXEC_STOP, serverId, sessionId });
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  useEffect(() => {
    if (status === "exited" || status === "error") {
      termRef.current?.write(
        `\r\n\x1b[90m— ${error ? `error: ${error}` : "session ended"} —\x1b[0m\r\n`,
      );
    }
  }, [status, error]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-space-md">
      <div className="w-full max-w-4xl h-[70vh] bg-card border border-outline-variant rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-space-md py-space-sm border-b border-outline-variant">
          <div className="flex items-center gap-space-sm min-w-0">
            <TerminalSquare size={16} className="text-on-surface-variant shrink-0" />
            <h3 className="font-h2 text-h2 text-on-surface truncate">
              Shell — {containerName ?? containerId}
            </h3>
            <span className="text-[11px] font-label-caps text-on-surface-variant uppercase tracking-wider shrink-0">
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          <button
            className="p-1.5 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-[#0d0f12] p-space-sm">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
