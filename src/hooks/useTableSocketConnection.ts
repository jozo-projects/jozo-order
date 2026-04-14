"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface UseTableSocketConnectionOptions {
  tableCode: string;
  wsUrl?: string;
}

interface UseTableSocketConnectionResult {
  socket: Socket | null;
  canConnect: boolean;
  isConnected: boolean;
  connectionError: string | null;
}

export function useTableSocketConnection({
  tableCode,
  wsUrl,
}: UseTableSocketConnectionOptions): UseTableSocketConnectionResult {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const canConnect = Boolean(wsUrl);

  useEffect(() => {
    if (!canConnect || !wsUrl) {
      return;
    }

    let cancelled = false;
    const nextSocket = io(wsUrl, {
      query: { tableCode },
      transports: ["websocket"],
    });

    queueMicrotask(() => {
      if (!cancelled) {
        setSocket(nextSocket);
      }
    });

    nextSocket.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    nextSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    nextSocket.on("connect_error", (error: Error) => {
      console.error("socket connect_error", error);
      setConnectionError(error.message);
    });

    return () => {
      cancelled = true;
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      queueMicrotask(() => {
        setSocket((current) => (current === nextSocket ? null : current));
        setIsConnected(false);
      });
    };
  }, [canConnect, tableCode, wsUrl]);

  return {
    socket,
    canConnect,
    isConnected,
    connectionError,
  };
}
