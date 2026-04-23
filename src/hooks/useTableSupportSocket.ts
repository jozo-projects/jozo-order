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
      setEventStatus("Nhận order mới");
    });

    socket.on("order:support_requested", (payload: SupportEventPayload) => {
      console.log("order:support_requested", payload);
      setEventStatus("Yêu cầu đã được nhận");
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
      setEventStatus("Socket chưa sẵn sàng");
      return;
    }

    setIsSubmitting(true);
    setEventStatus("Đang gửi yêu cầu...");
    socket.emit("order:request_support", { tableCode });
  }, [isConnected, socket, tableCode]);

  const statusText = !canConnect
    ? "Thiếu NEXT_PUBLIC_WS_URL"
    : connectionError
      ? "Không thể kết nối"
      : eventStatus
        ? eventStatus
        : isConnected
          ? "Đã kết nối"
          : "Chưa kết nối";

  return {
    canConnect,
    isConnected,
    isSubmitting: isSubmitting && isConnected && !connectionError,
    statusText,
    requestSupport,
  };
}
