import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { handleSocketMessages } from "../lib/websocket-handlers";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsURL = import.meta.env.VITE_BACKEND_WS;

  useEffect(() => {
    const ws = new WebSocket(`${wsURL}?type=client`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      handleSocketMessages(event.data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        isConnected,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
