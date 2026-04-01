import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface WSContextType {
  send: (data: any) => void;
  lastMessage: WSMessage | null;
  isConnected: boolean;
}

const ENTITY_KEYS: Record<string, string[][]> = {
  products: [
    ["/api/products"],
    ["/api/products/admin-catalog"],
    ["/api/admin/catalog-store"],
  ],
  stores: [
    ["/api/stores"],
    ["/api/stores/my"],
  ],
  orders: [
    ["/api/orders"],
    ["/api/orders/my"],
  ],
  users: [
    ["/api/users"],
    ["/api/admins"],
    ["/api/auth/me"],
    ["/api/admin/recharge-history"],
  ],
};

const WSContext = createContext<WSContextType | null>(null);

export function WSProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
  if (!userId) return;

  const API_BASE = import.meta.env.VITE_API_URL;
  const WS_BASE = API_BASE.replace("https", "wss").replace("http", "ws");

  const ws = new WebSocket(`${WS_BASE}/ws`);
  wsRef.current = ws;

  ws.onopen = () => {
    setIsConnected(true);
    ws.send(JSON.stringify({ type: "auth", userId }));
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      setLastMessage(data);

      if (data.type === "data_sync") {
        const keys = ENTITY_KEYS[data.entity];
        if (keys) {
          keys.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          );
        } else {
          queryClient.invalidateQueries();
        }
      }
    } catch {}
  };
}, [userId]);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastMessage(data);

        if (data.type === "data_sync") {
          const keys = ENTITY_KEYS[data.entity];
          if (keys) {
            keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
          } else {
            queryClient.invalidateQueries();
          }
        }
      } catch {}
    };

    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [userId]);

  const send = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return (
    <WSContext.Provider value={{ send, lastMessage, isConnected }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWS must be used within WSProvider");
  return ctx;
}
