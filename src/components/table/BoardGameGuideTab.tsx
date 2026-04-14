"use client";

const MOCK_GAMES = [
  {
    id: "1",
    name: "Catan",
    players: "3–4 nguoi",
    duration: "~60 phut",
    summary:
      "Xay lang duong va giao dich tai nguyen. Ai dat 10 diem truoc se thang.",
    steps: [
      "Dat nha va duong theo luat mo dau.",
      "Phieu xuc xac: thu hoach tai nguyen theo gia tri xuc xac.",
      "Doi 5 tai nguyen cung loai lay 1 the phat trien.",
      "Diem tu nha, duong, the dac quyen va quan doi (neu co).",
    ],
    tip: "Nam gan cang va giao dich tot giup ban mo rong nhanh hon.",
  },
  {
    id: "2",
    name: "Ticket to Ride",
    players: "2–5 nguoi",
    duration: "~45 phut",
    summary: "Noi cac thanh pho bang duong tau, hoan thanh ve hanh trinh bi mat.",
    steps: [
      "Rut the tau va the hanh trinh.",
      "Dung the mau de chiem tuyen duong tren ban do.",
      "Hoan thanh ve de cong diem; tu choi khi het the.",
    ],
    tip: "Giu mot tuyen dai co the lat nguoc the co.",
  },
  {
    id: "3",
    name: "Exploding Kittens",
    players: "2–5 nguoi",
    duration: "~15 phut",
    summary: "Rut bai cho den khi het meo no — hoac dung the cuu minh.",
    steps: [
      "Choi luot: rut 1 bai hoac dung the hanh dong.",
      "Gap meo no: phai co Defuse hoac thua.",
      "Cac the dac biet xao bai tay va thu tu rut.",
    ],
    tip: "Giu Defuse den khi that can thiet.",
  },
] as const;

export function BoardGameGuideTab() {
  return (
    <div className="px-4 pt-3 pb-2">
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Huong dan board game
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Du lieu mau — sau nay noi CMS hoac API
        </p>
      </header>

      <div className="mb-4 overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-primary/5 to-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Meo nhanh
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          Doc luat 1 lan truoc khi choi, chia vai tro setup cho nguoi doc nhanh
          nhat.
        </p>
      </div>

      <ul className="space-y-4">
        {MOCK_GAMES.map((game) => (
          <li
            key={game.id}
            className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
          >
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <h2 className="text-base font-bold text-foreground">{game.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {game.players} · {game.duration}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                {game.summary}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-foreground">Cach choi</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                {game.steps.map((s, i) => (
                  <li key={i} className="leading-snug">
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-xs text-foreground">
                <span className="font-semibold text-primary">Tip: </span>
                {game.tip}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
