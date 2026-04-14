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
      <div className="text-center">
        <div className="text-4xl">⚠️</div>
        <h2 className="mt-4 text-lg font-semibold">Da xay ra loi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Vui long thu lai sau."}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
        >
          Thu lai
        </button>
      </div>
    </div>
  );
}
