export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Category tabs skeleton */}
      <div className="sticky top-14 z-30 border-b border-border bg-background">
        <div className="flex gap-2 px-4 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-muted" />
          ))}
        </div>
      </div>

      {/* Menu items skeleton */}
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <div className="h-20 w-20 shrink-0 rounded-lg bg-muted" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-4 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
