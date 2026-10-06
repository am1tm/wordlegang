import Link from "next/link";

export function Header({ back, title, right }: { back?: string; title?: string; right?: React.ReactNode }) {
  return (
    <header className="mb-5 flex h-11 items-center gap-3">
      {back ? (
        <Link href={back} className="-ml-2 rounded-lg px-2 py-1 text-2xl text-muted" aria-label="Back">
          ‹
        </Link>
      ) : (
        <Logo />
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title ?? (back ? "" : "WordleGang")}</h1>
      {right}
    </header>
  );
}

export function Logo({ large = false }: { large?: boolean }) {
  const tile = large ? "h-5 w-5 rounded" : "h-3 w-3 rounded-[2px]";
  return (
    <span className={`inline-grid grid-cols-2 ${large ? "gap-1" : "gap-0.5"}`} aria-hidden>
      {["bg-hit", "bg-near", "bg-hit", "bg-hit"].map((c, i) => (
        <span key={i} className={`${tile} ${c}`} />
      ))}
    </span>
  );
}
