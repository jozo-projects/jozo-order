"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-[0_14px_30px_rgba(195,10,10,0.12)]">
        <div className="text-4xl">⚠️</div>
        <h2 className="mt-4 text-lg font-semibold">Đã xảy ra lỗi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Vui lòng thử lại sau."}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
