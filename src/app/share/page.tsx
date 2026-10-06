"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { submitResult } from "@/components/PasteResult";
import { getKey, useBrowser, useRefreshAll } from "@/lib/client";

// Android share target: Wordle → Share → WordleGang lands here with ?text=…
export default function SharePage() {
  const router = useRouter();
  const refreshAll = useRefreshAll();
  const [submitError, setSubmitError] = useState("");
  const hasKey = useBrowser(() => !!getKey(), true);
  const started = useRef(false);
  const error = hasKey ? submitError : "Set up WordleGang first, then share your result again.";

  useEffect(() => {
    if (started.current || !getKey()) return;
    started.current = true;
    const params = new URLSearchParams(location.search);
    const text = ["title", "text", "url"].map((k) => params.get(k) ?? "").join("\n");
    submitResult(text)
      .then((r) => {
        refreshAll();
        router.replace(`/?posted=${encodeURIComponent(r.message)}`);
      })
      .catch((e) => setSubmitError(e.message));
  }, [router, refreshAll]);

  if (!error) return <Spinner />;
  return (
    <div className="space-y-4 pt-24 text-center">
      <p className="text-lg">{error}</p>
      <Link href="/" className="btn-primary">
        Open WordleGang
      </Link>
    </div>
  );
}
