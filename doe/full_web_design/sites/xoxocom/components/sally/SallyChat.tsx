"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Copy, SallyIntent, SallyTopic } from "@/lib/copy";
import { answersFor } from "@/lib/sally-brain";
import SmartLink from "@/components/SmartLink";
import BrandMark from "@/components/BrandMark";

type ChatCopy = Copy["sally"]["chat"];
type Message = { id: number; from: "sally" | "you"; text: string; href?: string; linkLabel?: string };

const TYPE_MS = 16; // per tick while Sally "speaks" (two characters a tick)
const MAX_INPUT = 200;
const TOPIC_ORDER: SallyTopic[] = ["sally", "agentix", "xoxocom", "courses", "contact"];

/**
 * Sally's chat panel. Fully client-side (see lib/sally-brain.ts) — nothing typed here
 * is sent anywhere. One question can produce several answers (typed text that hits
 * several intents, or several questions picked in the catalog); they wait in `queue`
 * and are written out one after the other. `onTalkingChange` lets the page animate
 * Sally's mouth while a reply is being written.
 */
export default function SallyChat({
  t,
  greeting,
  onTalkingChange,
}: {
  t: ChatCopy;
  greeting: string;
  onTalkingChange: (talking: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "sally", text: greeting }]);
  // How many characters of the newest Sally message are visible.
  const [revealed, setRevealed] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [queue, setQueue] = useState<SallyIntent[]>([]);
  const [input, setInput] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const last = messages[messages.length - 1];
  const writing = last.from === "sally" && revealed < last.text.length;
  const busy = thinking || writing || queue.length > 0;

  const byId = useMemo(() => new Map(t.intents.map((i) => [i.id, i])), [t.intents]);
  const catalog = useMemo(
    () =>
      TOPIC_ORDER.map((topic) => ({
        topic,
        items: t.intents.filter((i) => i.topic === topic && i.question),
      })),
    [t.intents],
  );
  const chips = t.suggestions.map((id) => byId.get(id)).filter((i): i is SallyIntent => !!i?.question);

  // Typewriter for the newest Sally message.
  useEffect(() => {
    if (!writing) return;
    const timer = setTimeout(() => setRevealed((n) => n + 2), TYPE_MS);
    return () => clearTimeout(timer);
  }, [writing, revealed]);

  // Once a reply is fully written, "think" briefly and post the next queued one.
  useEffect(() => {
    if (writing || thinking || queue.length === 0) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const [next, ...rest] = queue;
      setThinking(false);
      setQueue(rest);
      setRevealed(0);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, from: "sally", text: next.answer, href: next.href, linkLabel: next.linkLabel },
      ]);
    }, 450 + Math.random() * 450);
    return () => clearTimeout(timer);
    // `thinking` is deliberately left out: setting it here must not cancel this timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writing, queue]);

  useEffect(() => {
    onTalkingChange(writing);
  }, [writing, onTalkingChange]);

  // Keep the newest message in view without scrolling the page itself.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, revealed, thinking]);

  const ask = (text: string, replies: SallyIntent[]) => {
    if (busy || replies.length === 0) return;
    setMessages((m) => [...m, { id: nextId.current++, from: "you", text }]);
    setQueue(replies);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim().slice(0, MAX_INPUT);
    if (!text) return;
    ask(text, answersFor(text, t.intents, t.fallback));
    setInput("");
  };

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const askSelected = () => {
    // Answer in catalog order, not click order, so related answers stay together.
    const picked = catalog.flatMap((g) => g.items).filter((i) => selected.includes(i.id));
    ask(picked.map((i) => i.question).join("\n"), picked);
    setSelected([]);
    setCatalogOpen(false);
  };

  return (
    <section
      aria-label={t.aria}
      className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface/85 shadow-[0_0_60px_-25px_rgba(251,107,76,0.5)] backdrop-blur-sm"
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-bg">
          <BrandMark className="h-5 w-auto text-accent" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-400" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-fg">Sally</p>
          <p className="text-xs text-muted">XoXoCom · A.I.</p>
        </div>
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-accent/60"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 3h8M2 6h8M2 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {t.catalogOpen}
          <span className="rounded-full bg-accent/15 px-1.5 text-[10px] text-accent">
            {catalog.reduce((n, g) => n + g.items.length, 0)}
          </span>
        </button>
      </header>

      <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-5 py-4 min-h-[260px] max-h-[380px]">
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const text = m.from === "sally" && isLast ? m.text.slice(0, revealed) : m.text;
          const done = !(m.from === "sally" && isLast && writing);
          return (
            <div key={m.id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.from === "you"
                    ? "rounded-br-md bg-accent text-accent-fg"
                    : "rounded-bl-md border border-border bg-bg text-fg"
                }`}
              >
                <span className="sr-only">{m.from === "you" ? `${t.you}: ` : "Sally: "}</span>
                {text}
                {!done && <span aria-hidden className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-accent" />}
                {done && m.href && m.linkLabel && (
                  <SmartLink
                    href={m.href}
                    target={m.href.startsWith("http") ? "_blank" : undefined}
                    rel={m.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="mt-2 flex w-fit items-center gap-1 text-sm font-semibold text-accent hover:underline"
                  >
                    {m.linkLabel} →
                  </SmartLink>
                )}
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="flex justify-start" aria-label={t.typing}>
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-border bg-bg px-4 py-3.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="sally-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5 pt-3 pb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => ask(c.question!, [c])}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-accent/60 hover:text-fg disabled:opacity-50"
            >
              {c.question}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_INPUT}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            className="min-w-0 flex-1 rounded-[var(--radius-card)] border border-border bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-[var(--radius-card)] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {t.send}
          </button>
        </form>
        <p className="mt-2.5 text-[11px] text-muted">{t.disclaimer}</p>
      </div>

      {/* Question catalog: every catalog question grouped by topic, multi-select. */}
      {catalogOpen && (
        <div role="dialog" aria-label={t.catalogTitle} className="absolute inset-0 z-10 flex flex-col bg-surface">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-bold text-fg">{t.catalogTitle}</p>
              <p className="mt-0.5 text-xs text-muted">{t.catalogHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setCatalogOpen(false)}
              aria-label={t.catalogClose}
              className="rounded-lg p-1.5 text-muted transition hover:bg-bg hover:text-fg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {catalog.map((g) => (
              <fieldset key={g.topic}>
                <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{t.topics[g.topic]}</legend>
                <div className="space-y-1.5">
                  {g.items.map((q) => {
                    const on = selected.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          on ? "border-accent/70 bg-accent/10 text-fg" : "border-border text-muted hover:border-accent/40 hover:text-fg"
                        }`}
                      >
                        <input type="checkbox" checked={on} onChange={() => toggle(q.id)} className="h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
                        {q.question}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              disabled={selected.length === 0 || busy}
              onClick={askSelected}
              className="w-full rounded-[var(--radius-card)] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              {t.catalogAsk}
              {selected.length > 0 && ` (${selected.length})`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
