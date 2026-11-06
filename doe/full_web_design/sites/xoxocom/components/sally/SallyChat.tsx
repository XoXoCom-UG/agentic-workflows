"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Copy, SallyIntent } from "@/lib/copy";
import { answerFor } from "@/lib/sally-brain";
import SmartLink from "@/components/SmartLink";
import BrandMark from "@/components/BrandMark";

type ChatCopy = Copy["sally"]["chat"];
type Message = { id: number; from: "sally" | "you"; text: string; href?: string; linkLabel?: string };

const TYPE_MS = 16; // per character while Sally "speaks"
const MAX_INPUT = 200;

/**
 * Sally's chat panel. Fully client-side (see lib/sally-brain.ts) — nothing typed here
 * is sent anywhere. `onTalkingChange` lets the page animate Sally's mouth while a
 * reply is being written out.
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
  // How many characters of the newest Sally message are visible; Infinity = all.
  const [revealed, setRevealed] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const last = messages[messages.length - 1];
  const writing = last.from === "sally" && revealed < last.text.length;

  // Typewriter for the newest Sally message.
  useEffect(() => {
    if (!writing) return;
    const timer = setTimeout(() => setRevealed((n) => n + 2), TYPE_MS);
    return () => clearTimeout(timer);
  }, [writing, revealed]);

  useEffect(() => {
    onTalkingChange(writing);
  }, [writing, onTalkingChange]);

  // Keep the newest message in view without scrolling the page itself.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, revealed, thinking]);

  const ask = (raw: string) => {
    const text = raw.trim().slice(0, MAX_INPUT);
    if (!text || thinking || writing) return;
    setMessages((m) => [...m, { id: nextId.current++, from: "you", text }]);
    setInput("");
    setThinking(true);
    const reply: SallyIntent = answerFor(text, t.intents, t.fallback);
    setTimeout(() => {
      setThinking(false);
      setRevealed(0);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, from: "sally", text: reply.answer, href: reply.href, linkLabel: reply.linkLabel },
      ]);
    }, 550 + Math.random() * 500);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const busy = thinking || writing;

  return (
    <section
      aria-label={t.aria}
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface/85 shadow-[0_0_60px_-25px_rgba(251,107,76,0.5)] backdrop-blur-sm"
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
      </header>

      <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-5 py-4 min-h-[220px] max-h-[360px]">
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const text = m.from === "sally" && isLast ? m.text.slice(0, revealed) : m.text;
          const done = !(m.from === "sally" && isLast && writing);
          return (
            <div key={m.id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
          {t.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => ask(s)}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-accent/60 hover:text-fg disabled:opacity-50"
            >
              {s}
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
    </section>
  );
}
