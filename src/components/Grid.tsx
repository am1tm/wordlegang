const COLOR: Record<string, string> = { G: "bg-hit", Y: "bg-near", B: "bg-miss" };

export function Grid({ grid, size = "sm" }: { grid: string; size?: "xs" | "sm" | "md" }) {
  const tile = size === "xs" ? "h-2.5 w-2.5 rounded-[2px]" : size === "sm" ? "h-3.5 w-3.5 rounded-[3px]" : "h-6 w-6 rounded";
  return (
    <div className="inline-flex flex-col gap-[3px]" aria-label="Wordle grid">
      {grid.split("\n").map((row, i) => (
        <div key={i} className="flex gap-[3px]">
          {Array.from(row).map((c, j) => (
            <span key={j} className={`${tile} ${COLOR[c] ?? "bg-miss"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HiddenGrid({ rows }: { rows: number }) {
  return (
    <div className="inline-flex flex-col gap-[3px]" aria-label="Hidden until you play">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-[3px]">
          {Array.from({ length: 5 }, (_, j) => (
            <span key={j} className="h-3.5 w-3.5 rounded-[3px] bg-surface-2" />
          ))}
        </div>
      ))}
    </div>
  );
}
