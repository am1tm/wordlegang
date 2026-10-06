// 2x2 tile mark rendered by ImageResponse (Satori), so inline styles only.
export function AppIcon({ size, padded = false }: { size: number; padded?: boolean }) {
  const inner = padded ? size * 0.62 : size * 0.78;
  const gap = inner * 0.08;
  const tile = (inner - gap) / 2;
  const colors = ["#538d4e", "#b59f3b", "#538d4e", "#538d4e"];
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#121213",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: padded ? 0 : size * 0.2,
      }}
    >
      <div style={{ width: inner, height: inner, display: "flex", flexWrap: "wrap", gap }}>
        {colors.map((c, i) => (
          <div key={i} style={{ width: tile, height: tile, background: c, borderRadius: tile * 0.12 }} />
        ))}
      </div>
    </div>
  );
}
