"use client";

import { useCallback, useEffect, useState } from "react";
import { useTableSocketConnection } from "./useTableSocketConnection";

type SupportEventPayload = Record<string, unknown>;

interface UseTableSupportSocketOptions {
  tableCode: string;
  wsUrl?: string;
}

interface UseTableSupportSocketResult {
  canConnect: boolean;
  isConnected: boolean;
  isSubmitting: boolean;
  statusText: string;
  requestSupport: VoidFunction;
}

export function useTableSupportSocket({
  tableCode,
  wsUrl,
}: UseTableSupportSocketOptions): UseTableSupportSocketResult {
  const { socket, canConnect, isConnected, connectionError } =
    useTableSocketConnection({
      tableCode,
      wsUrl,
    });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventStatus, setEventStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !canConnect) {
      return;
    }

    socket.on("connect", () => {
      setIsSubmitting(false);
      setEventStatus(null);
    });

    socket.on("disconnect", () => {
      setIsSubmitting(false);
      setEventStatus(null);
    });

    socket.on("order:created", (payload: SupportEventPayload) => {
      console.log("order:created", payload);
      setEventStatus("Nhan order moi");
    });

    socket.on("order:support_requested", (payload: SupportEventPayload) => {
      console.log("order:support_requested", payload);
      setEventStatus("Yeu cau da duoc nhan");
      setIsSubmitting(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("order:created");
      socket.off("order:support_requested");
    };
  }, [canConnect, socket]);

  const requestSupport = useCallback(() => {
    if (!socket || !isConnected) {
      setEventStatus("Socket chua san sang");
      return;
    }

    setIsSubmitting(true);
    setEventStatus("Dang gui yeu cau...");
    socket.emit("order:request_support", { tableCode });
  }, [isConnected, socket, tableCode]);

  const statusText = !canConnect
    ? "Thieu NEXT_PUBLIC_WS_URL"
    : connectionError
      ? "Khong the ket noi"
      : eventStatus
        ? eventStatus
        : isConnected
          ? "Da ket noi"
          : "Chua ket noi";

  return {
    canConnect,
    isConnected,
    isSubmitting: isSubmitting && isConnected && !connectionError,
    statusText,
    requestSupport,
  };
}
