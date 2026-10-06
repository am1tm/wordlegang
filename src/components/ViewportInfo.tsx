"use client";

import { useState } from "react";

/** Tap-to-show screen measurements, for debugging iPhone layout issues. */
export function ViewportInfo() {
  const [info, setInfo] = useState("");
  function measure() {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const vv = window.visualViewport;
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInfo(
      [
        `screen ${screen.width}×${screen.height}`,
        `window ${innerWidth}×${innerHeight}`,
        `visible ${vv ? `${Math.round(vv.width)}×${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : "n/a"}`,
        `safe area top ${cs.top} · bottom ${cs.bottom}`,
        `home-screen app: ${standalone ? "yes" : "no"}`,
      ].join("\n"),
    );
    probe.remove();
  }
  return (
    <button className="w-full whitespace-pre-line pt-4 text-center font-mono text-[11px] text-muted" onClick={measure}>
      {info || "Tap for screen info"}
    </button>
  );
}
