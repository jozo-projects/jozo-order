import Image from "next/image";
import jozoLogo from "@/assets/images/jozo-logo.png";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-[0_16px_36px_rgba(195,10,10,0.14)]">
        <div className="mx-auto w-fit rounded-2xl bg-white p-2 shadow-sm">
          <Image
            src={jozoLogo}
            alt="Logo Jozo"
            priority
            className="h-auto w-44"
          />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-primary">
          Jozo Order
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng quét mã QR trên bàn để bắt đầu gọi món.
        </p>
      </div>
    </div>
  );
}
