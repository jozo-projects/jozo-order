import Link from "next/link";

export default function TableNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <div className="text-4xl">🔍</div>
        <h2 className="mt-4 text-lg font-semibold">Ban khong ton tai</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui long kiem tra lai ma QR hoac lien he nhan vien.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Ve trang chu
        </Link>
      </div>
    </div>
  );
}
