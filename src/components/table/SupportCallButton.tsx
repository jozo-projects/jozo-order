"use client";

import { Button } from "@/components/ui/Button";
import { useTableSupportSocket } from "@/hooks/useTableSupportSocket";

interface SupportCallButtonProps {
  tableCode: string;
}

export function SupportCallButton({ tableCode }: SupportCallButtonProps) {
  const { isConnected, isSubmitting, statusText, requestSupport } =
    useTableSupportSocket({
      tableCode,
      wsUrl: process.env.NEXT_PUBLIC_WS_URL,
    });

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {statusText}
      </span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={requestSupport}
        disabled={!isConnected || isSubmitting}
        aria-label="Gọi nhân viên hỗ trợ"
        title="Gọi nhân viên hỗ trợ"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.56 3.6.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.3 21 3 13.7 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.56 3.6a1 1 0 0 1-.24 1z"
            fill="currentColor"
          />
        </svg>
      </Button>
    </div>
  );
}
