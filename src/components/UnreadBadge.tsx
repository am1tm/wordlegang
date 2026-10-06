export function UnreadBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`rounded-full bg-hit font-bold text-white ${compact ? "px-1.5 text-[10px] leading-4" : "px-2 py-0.5 text-xs"}`}
      aria-label={`${count} unread`}
    >
      {compact ? label : `💬 ${label}`}
    </span>
  );
}
