import type { SallyIntent } from "@/lib/copy";

/**
 * Sally's "brain": picks a canned answer for what the visitor typed. Runs entirely in
 * the browser — no LLM, no API route, no network — so the chat has zero running cost
 * and cannot be abused to run one up. The answers themselves live in lib/copy.ts.
 *
 * Matching: input and keywords are lower-cased and stripped of diacritics (so
 * "grunder" finds "gründer"). A one-word keyword hits when any word of the input
 * starts with it ("kurs" → "kurse"); a keyword with a space must appear as a phrase.
 * The intent with the most hits wins; on a tie the earlier one in the list does.
 */

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function answerFor(input: string, intents: SallyIntent[], fallback: SallyIntent): SallyIntent {
  const text = normalize(input);
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);

  let best: SallyIntent | null = null;
  let bestScore = 0;
  for (const intent of intents) {
    let score = 0;
    for (const raw of intent.keywords) {
      const kw = normalize(raw);
      const hit = kw.includes(" ") ? text.includes(kw) : words.some((w) => w.startsWith(kw));
      if (hit) score++;
    }
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best ?? fallback;
}
