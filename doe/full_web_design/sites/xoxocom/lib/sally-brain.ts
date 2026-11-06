import type { SallyIntent } from "@/lib/copy";

/**
 * Sally's "brain": picks canned answers for what the visitor typed. Runs entirely in
 * the browser — no LLM, no API route, no network — so the chat has zero running cost
 * and cannot be abused to run one up. The answers themselves live in lib/copy.ts.
 *
 * Matching: input and keywords are lower-cased and stripped of diacritics (so
 * "grunder" finds "gründer"). A one-word keyword hits when any word of the input
 * starts with it ("kurs" → "kurse"); a keyword with a space must appear as a phrase.
 *
 * Every intent that reaches the best score is answered (up to MAX_ANSWERS, in list
 * order), so "Wer bist du und was ist Agentix?" gets both answers, while "Was kostet
 * Agentix?" only gets the price — the more specific intent scores higher.
 */

const MAX_ANSWERS = 3;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function score(intent: SallyIntent, text: string, words: string[]): number {
  let hits = 0;
  for (const raw of intent.keywords) {
    const kw = normalize(raw);
    const hit = kw.includes(" ") ? text.includes(kw) : words.some((w) => w.startsWith(kw));
    if (hit) hits++;
  }
  return hits;
}

export function answersFor(input: string, intents: SallyIntent[], fallback: SallyIntent): SallyIntent[] {
  const text = normalize(input);
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);

  const scored = intents.map((intent) => ({ intent, s: score(intent, text, words) }));
  const best = Math.max(0, ...scored.map((x) => x.s));
  if (best === 0) return [fallback];
  const top = scored.filter((x) => x.s === best).map((x) => x.intent);
  // A broad intent steps aside for a specific one of the same topic (see SallyIntent.broad).
  const kept = top.filter((i) => !i.broad || !top.some((o) => !o.broad && o.topic === i.topic));
  return kept.slice(0, MAX_ANSWERS);
}
