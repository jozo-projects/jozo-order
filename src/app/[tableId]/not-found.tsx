import Link from "next/link";

export default function TableNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-[0_14px_30px_rgba(195,10,10,0.12)]">
        <div className="text-4xl">🔍</div>
        <h2 className="mt-4 text-lg font-semibold">Bàn không tồn tại</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng kiểm tra lại mã QR hoặc liên hệ nhân viên.
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
