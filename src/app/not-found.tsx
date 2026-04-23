import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-[0_14px_30px_rgba(195,10,10,0.12)]">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-lg text-foreground">
          Trang bạn tìm không tồn tại.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
