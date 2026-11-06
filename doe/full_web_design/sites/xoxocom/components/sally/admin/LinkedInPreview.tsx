"use client";

import { useState } from "react";
import BrandMark from "@/components/BrandMark";

// LinkedIn shows roughly this much (or three lines) before "…see more" in the feed.
const FOLD_CHARS = 210;
const FOLD_LINES = 3;

function foldIndex(text: string): number {
  let idx = 0;
  for (let line = 0; line < FOLD_LINES; line++) {
    const next = text.indexOf("\n", idx);
    if (next === -1) return Math.min(text.length, FOLD_CHARS);
    idx = next + 1;
  }
  return Math.min(idx - 1, FOLD_CHARS);
}

/** Renders a hashtag-highlighted text the way the feed does. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="font-semibold text-[#0a66c2]">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * A light-theme mock of a LinkedIn feed card, so the team judges a draft the way a
 * reader meets it — including where the "…see more" fold cuts the hook.
 */
export default function LinkedInPreview({ text, lang }: { text: string; lang: "de" | "en" }) {
  const [open, setOpen] = useState(false);
  const cut = foldIndex(text);
  const folded = !open && cut < text.length;
  const de = lang === "de";

  return (
    <article className="overflow-hidden rounded-xl border border-[#e0dfdc] bg-white text-[#191919] shadow-sm" style={{ fontFamily: "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif" }}>
      <header className="flex items-start gap-2.5 px-4 pt-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0b0e11]">
          <BrandMark className="h-6 w-auto text-[#fb6b4c]" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold">Sally <span className="font-normal text-[#666]">· {de ? "1." : "1st"}</span></p>
          <p className="truncate text-xs text-[#666]">{de ? "A.I.-Assistentin bei XoXoCom" : "A.I. assistant at XoXoCom"}</p>
          <p className="text-xs text-[#666]">{de ? "Jetzt" : "Now"} · 🌐</p>
        </div>
        <span className="ml-auto text-sm font-semibold text-[#0a66c2]">+ {de ? "Folgen" : "Follow"}</span>
      </header>

      <div className="whitespace-pre-line px-4 pt-3 pb-2 text-[14px] leading-[1.45]">
        <Rich text={folded ? text.slice(0, cut) : text} />
        {folded && (
          <button type="button" onClick={() => setOpen(true)} className="text-[#666] hover:text-[#0a66c2] hover:underline">
            …{de ? "mehr" : "see more"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 px-4 pb-2 text-xs text-[#666]">
        <span>👍❤️💡</span>
        <span>{de ? "Vorschau" : "Preview"}</span>
      </div>
      <footer className="grid grid-cols-4 border-t border-[#e0dfdc] text-xs font-semibold text-[#666]">
        {(de ? ["Gefällt mir", "Kommentieren", "Reposten", "Senden"] : ["Like", "Comment", "Repost", "Send"]).map((a) => (
          <span key={a} className="py-3 text-center">{a}</span>
        ))}
      </footer>
    </article>
  );
}
