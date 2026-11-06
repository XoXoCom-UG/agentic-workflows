"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { GenerateRequest, SallyGeneration, SallyPostDraft } from "@/lib/sally-agent";
import type { DraftStatus, StoredDraft, UsageSummary } from "@/lib/sally-store";
import SallyFigure from "@/components/sally/SallyFigure";
import LinkedInPreview from "@/components/sally/admin/LinkedInPreview";

type Idea = { title: string; body: string };
// Browser-only fallback for when the deploy has no database (local dev). Same shape as
// a stored draft minus the workflow.
type Saved = { id: string; savedAt: string; lang: "de" | "en"; topic: string; post: SallyPostDraft };
type LibraryFilter = "library" | DraftStatus | "all";

const SAVED_KEY = "sally-studio-saved";

const FILTER_LABELS: { value: LibraryFilter; label: string }[] = [
  { value: "library", label: "Kept" },
  { value: "saved", label: "Saved" },
  { value: "approved", label: "Approved" },
  { value: "posted", label: "Posted" },
  { value: "all", label: "All generated" },
  { value: "archived", label: "Archived" },
];

const STATUS_STYLE: Record<DraftStatus, string> = {
  generated: "bg-border text-muted",
  saved: "bg-sky-400/15 text-sky-300",
  approved: "bg-emerald-400/15 text-emerald-300",
  posted: "bg-accent/15 text-accent",
  archived: "bg-border text-muted line-through",
};

// What can happen next from each status (LinkedIn publishing will read 'approved').
const NEXT: Record<DraftStatus, { to: DraftStatus; label: string }[]> = {
  generated: [{ to: "saved", label: "Save" }, { to: "archived", label: "Archive" }],
  saved: [{ to: "approved", label: "Approve" }, { to: "archived", label: "Archive" }],
  approved: [{ to: "posted", label: "Mark as posted" }, { to: "saved", label: "Unapprove" }, { to: "archived", label: "Archive" }],
  posted: [{ to: "archived", label: "Archive" }],
  archived: [{ to: "saved", label: "Restore" }],
};

const GOALS: { value: GenerateRequest["goal"]; label: string }[] = [
  { value: "awareness", label: "Awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "leads", label: "Leads" },
  { value: "beta", label: "Beta sign-ups" },
];
const FORMATS: { value: GenerateRequest["format"]; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "list", label: "List / tips" },
  { value: "behind-the-scenes", label: "Behind the scenes" },
  { value: "announcement", label: "Announcement" },
  { value: "insight", label: "Insight" },
  { value: "question", label: "Question" },
];
const TONES: { value: GenerateRequest["tone"]; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "inspiring", label: "Inspiring" },
  { value: "witty", label: "Witty" },
];

// Saved drafts live in this browser only (localStorage) — wrapped, because storage can
// be unavailable (private mode, blocked site data) and the studio must still work.
function loadSaved(): Saved[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]") as Saved[];
  } catch {
    return [];
  }
}
function storeSaved(items: Saved[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — keep the in-memory list */
  }
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-accent bg-accent/15 text-fg" : "border-border text-muted hover:border-accent/50 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      {children}
    </div>
  );
}

/** Mechanical LinkedIn checks, computed from the text itself (not the model's opinion). */
function checks(p: SallyPostDraft) {
  const len = p.text.length;
  const firstLines = p.text.split("\n").slice(0, 2).join(" ");
  return [
    { ok: firstLines.length <= 150, label: `Hook fits before “see more” (${firstLines.length} chars)` },
    { ok: len >= 500 && len <= 1600, label: `Length in the sweet spot (${len} chars, aim 700–1,400)` },
    { ok: p.hashtags.length >= 3 && p.hashtags.length <= 5, label: `${p.hashtags.length} hashtags (aim 3–5)` },
    { ok: !/https?:\/\/|www\./i.test(p.text), label: "No link in the post body" },
    { ok: /\?\s*(👇|⬇️)?\s*$/m.test(p.text.split("#")[0].trim()) || p.cta.includes("?"), label: "Ends with a question / comment CTA" },
    { ok: !/\n[^\n]{280,}/.test(p.text), label: "Short paragraphs, easy to skim" },
  ];
}

function ScoreRing({ score }: { score: number }) {
  const s = Math.max(0, Math.min(10, score));
  const c = 2 * Math.PI * 26;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(s / 10) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-fg">{s}</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-accent/60"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

function PostReview({ post, lang, onSave, saved }: { post: SallyPostDraft; lang: "de" | "en"; onSave?: () => void; saved?: boolean }) {
  const a = post.analysis;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <LinkedInPreview text={post.text} lang={lang} />
        <div className="flex flex-wrap gap-2">
          <CopyButton text={post.text} label="Copy post" />
          <CopyButton text={a.firstComment} label="Copy first comment" />
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saved}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
            >
              {saved ? "Saved ✓" : "Save draft"}
            </button>
          )}
        </div>
        <div className="rounded-xl border border-border bg-bg/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Suggested first comment</p>
          <p className="mt-1.5 text-sm text-fg">{a.firstComment}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <ScoreRing score={a.score} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">{post.title}</p>
            <p className="mt-0.5 text-xs text-muted">{post.format} · Hook: <span className="text-fg">{post.hookType}</span></p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              a.engagement === "high" ? "bg-emerald-400/15 text-emerald-300" : a.engagement === "medium" ? "bg-amber-400/15 text-amber-300" : "bg-border text-muted"
            }`}>
              {a.engagement} engagement expected
            </span>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Why it should work</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-fg">
            {a.whyItWorks.map((w) => <li key={w} className="flex gap-2"><span className="text-accent">✓</span>{w}</li>)}
          </ul>
          <p className="mt-3 text-xs text-muted"><span className="font-semibold text-fg">Audience:</span> {a.audience}</p>
          <p className="mt-1 text-xs text-muted"><span className="font-semibold text-fg">Best time:</span> {a.bestTime}</p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Structure, moment by moment</h4>
          <ol className="mt-3 space-y-3">
            {post.structure.map((s, i) => (
              <li key={i} className="relative border-l-2 border-accent/40 pl-3">
                <p className="text-xs font-bold text-fg">{s.part} <span className="font-normal italic text-muted">“{s.excerpt}”</span></p>
                <p className="mt-0.5 text-xs text-muted">{s.purpose}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">LinkedIn checks</h4>
          <ul className="mt-2 space-y-1 text-xs">
            {checks(post).map((c) => (
              <li key={c.label} className={c.ok ? "text-fg" : "text-amber-300"}>{c.ok ? "✓" : "!"} {c.label}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.principles.map((p) => <span key={p} className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-muted">{p}</span>)}
          </div>
        </section>

        {a.improvements.length > 0 && (
          <section className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">Make it even better</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-fg">
              {a.improvements.map((w) => <li key={w}>→ {w}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

const PLAYBOOK: { title: string; items: string[] }[] = [
  {
    title: "Hooks that stop the scroll",
    items: [
      "Curiosity gap — “I'm an A.I. — and I wrote this post myself.”",
      "Bold / contrarian — “Most A.I. projects fail before the first line of code.”",
      "Specific question — “What would you ask an A.I. consultant first?”",
      "Number promise — “3 things we learned building Agentix Projects:”",
      "Confession / mini story — “Last week our beta broke. Here's why that was good news.”",
      "Keep it under ~140 characters: everything after line 2 hides behind “…see more”.",
    ],
  },
  {
    title: "Structure",
    items: [
      "Hook → re-hook (line 3 gives a reason to keep reading) → value → CTA → hashtags.",
      "Story arc: situation → tension → insight → result.",
      "PAS: problem → agitate → solution. AIDA: attention → interest → desire → action.",
      "One core idea per post. Value for the reader first, product second.",
    ],
  },
  {
    title: "Formatting",
    items: [
      "1–2 sentences per paragraph, lots of white space — most people read on a phone.",
      "Arrows (→) or a few emojis as visual anchors, max ~5.",
      "No links in the body: LinkedIn shows the post to fewer people. Put the link in the first comment.",
      "3–5 hashtags at the end, a mix of broad (#AI) and niche (#AgentixProjects).",
      "700–1,400 characters is the sweet spot for text posts.",
    ],
  },
  {
    title: "Posting & engagement",
    items: [
      "DACH B2B: Tue–Thu, 8–10 am or 12–1 pm work best.",
      "Reply to every comment in the first 60 minutes — that window decides the reach.",
      "End with a question that is easy to answer; avoid “Thoughts?”.",
      "Posting 2–3 times a week beats one big post a month.",
      "Images or a carousel raise dwell time; a picture of Sally makes posts recognisable.",
    ],
  },
  {
    title: "Sally's voice",
    items: [
      "First person, friendly, a little playful — never cringe or salesy.",
      "Always open about being an A.I.: transparency is the brand.",
      "Only facts the team confirmed: no invented numbers, customers or dates.",
      "Every post is reviewed by a human before it goes out.",
    ],
  },
];

export default function SallyStudio({
  ideas,
  hasApiKey,
  hasDatabase,
  signOutButton,
}: {
  ideas: Idea[];
  hasApiKey: boolean;
  hasDatabase: boolean;
  signOutButton: ReactNode;
}) {
  const [tab, setTab] = useState<"generate" | "saved" | "playbook">("generate");
  const [form, setForm] = useState<GenerateRequest>({
    topic: "",
    goal: "awareness",
    format: "story",
    tone: "friendly",
    language: "de",
    variants: 2,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    gen: SallyGeneration;
    demo: boolean;
    lang: "de" | "en";
    topic: string;
    usage?: { input: number; output: number; costUsd: number };
    draftIds: string[];
  } | null>(null);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [openSaved, setOpenSaved] = useState<string | null>(null);
  // Database-backed library (when the deploy has Supabase).
  const [filter, setFilter] = useState<LibraryFilter>("library");
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [libError, setLibError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => setSaved(loadSaved()), []);

  const loadLibrary = useCallback(async (f: LibraryFilter) => {
    if (!hasDatabase) return;
    try {
      const res = await fetch(`/api/sally/drafts?filter=${f}`);
      if (res.status === 401) return window.location.reload();
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Could not load the library.");
      setDrafts(data.drafts);
      setUsage(data.usage);
      setLibError(null);
    } catch (e) {
      setLibError(e instanceof Error ? e.message : "Could not load the library.");
    }
  }, [hasDatabase]);

  useEffect(() => { loadLibrary(filter); }, [filter, loadLibrary]);

  const moveDraft = async (id: string, status: DraftStatus) => {
    const res = await fetch("/api/sally/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    if (!data.ok) {
      setLibError(data.message || "Could not update the draft.");
      return false;
    }
    await loadLibrary(filter);
    return true;
  };

  const set = <K extends keyof GenerateRequest>(k: K, v: GenerateRequest[K]) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sally/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      if (!data.ok) throw new Error(data.message || "Generation failed.");
      setResult({ gen: data.result, demo: data.demo, lang: form.language, topic: form.topic, usage: data.usage, draftIds: data.draftIds ?? [] });
      setActive(0);
      loadLibrary(filter); // refresh the month's cost card
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Stored generations are already in the database as 'generated'; saving promotes the
  // row. Demo results and deploys without a database keep the old browser-only save.
  const save = async (index: number) => {
    if (!result) return;
    const id = result.draftIds[index];
    if (id) {
      if (await moveDraft(id, "saved")) setSavedIds((s) => [...s, id]);
      return;
    }
    const post = result.gen.posts[index];
    const next = [{ id: `${Date.now()}`, savedAt: new Date().toISOString(), lang: result.lang, topic: result.topic, post }, ...saved];
    setSaved(next);
    storeSaved(next);
  };
  const isSaved = (index: number) => {
    if (!result) return false;
    const id = result.draftIds[index];
    return id ? savedIds.includes(id) : saved.some((s) => s.post.text === result.gen.posts[index].text);
  };
  const remove = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    storeSaved(next);
  };

  const tabs = [
    { id: "generate", label: "Generate" },
    { id: "saved", label: hasDatabase ? "Library" : `Saved (${saved.length})` },
    { id: "playbook", label: "Playbook" },
  ] as const;

  return (
    <main className="px-6 md:px-10 lg:px-12 py-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Admin</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-fg">Sally Studio</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted">Model: <span className="font-semibold text-fg">Claude Haiku 5.5</span></span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${hasApiKey ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
              {hasApiKey ? "● Live" : "● Demo mode — no API key"}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${hasDatabase ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
              {hasDatabase ? "● Database" : "● No database — drafts stay in this browser"}
            </span>
            {usage && (
              <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted" title={`All time: ${usage.totalGenerations} generations · $${usage.totalCostUsd.toFixed(4)}`}>
                This month: <span className="font-semibold text-fg">{usage.monthGenerations} generations · ${usage.monthCostUsd.toFixed(4)}</span>
              </span>
            )}
            {signOutButton}
          </div>
        </header>

        <nav className="mt-8 flex gap-1 border-b border-border" aria-label="Studio sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "generate" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <form
              onSubmit={(e) => { e.preventDefault(); generate(); }}
              className="h-fit space-y-5 rounded-[var(--radius-card)] border border-border bg-surface p-5 lg:sticky lg:top-24"
            >
              <Field label="Topic">
                <textarea
                  value={form.topic}
                  onChange={(e) => set("topic", e.target.value)}
                  rows={4}
                  maxLength={600}
                  required
                  placeholder="What should Sally post about? e.g. “Our closed beta is starting — what beta testers get”"
                  className="w-full resize-y rounded-[var(--radius-card)] border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent/70 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ideas.map((i) => (
                    <button
                      key={i.title}
                      type="button"
                      onClick={() => set("topic", `${i.title} — ${i.body}`)}
                      className="rounded-full bg-bg px-2.5 py-1 text-[11px] text-muted transition hover:text-fg"
                    >
                      💡 {i.title}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Goal">
                <div className="flex flex-wrap gap-1.5">{GOALS.map((g) => <Chip key={g.value} active={form.goal === g.value} onClick={() => set("goal", g.value)}>{g.label}</Chip>)}</div>
              </Field>
              <Field label="Format">
                <div className="flex flex-wrap gap-1.5">{FORMATS.map((g) => <Chip key={g.value} active={form.format === g.value} onClick={() => set("format", g.value)}>{g.label}</Chip>)}</div>
              </Field>
              <Field label="Tone">
                <div className="flex flex-wrap gap-1.5">{TONES.map((g) => <Chip key={g.value} active={form.tone === g.value} onClick={() => set("tone", g.value)}>{g.label}</Chip>)}</div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Language">
                  <div className="flex gap-1.5">
                    <Chip active={form.language === "de"} onClick={() => set("language", "de")}>DE</Chip>
                    <Chip active={form.language === "en"} onClick={() => set("language", "en")}>EN</Chip>
                  </div>
                </Field>
                <Field label="Variants">
                  <div className="flex gap-1.5">{[1, 2, 3].map((n) => <Chip key={n} active={form.variants === n} onClick={() => set("variants", n)}>{n}</Chip>)}</div>
                </Field>
              </div>
              <Field label="Notes (optional)">
                <input
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  maxLength={400}
                  placeholder="e.g. mention the new tutorial, keep it short"
                  className="w-full rounded-[var(--radius-card)] border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent/70 focus:outline-none"
                />
              </Field>
              <button
                type="submit"
                disabled={loading || form.topic.trim().length < 3}
                className="w-full rounded-[var(--radius-card)] bg-accent px-4 py-3 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sally is writing…" : "✨ Generate posts"}
              </button>
              {error && <p role="alert" className="text-sm text-accent">{error}</p>}
            </form>

            <section aria-live="polite" className="min-w-0">
              {!result && (
                <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border px-6 py-12 text-center">
                  <SallyFigure talking={loading} className="h-56 w-auto" />
                  <p className="mt-4 text-lg font-bold text-fg">{loading ? "Sally is writing your posts…" : "Pick a topic and let Sally write"}</p>
                  <p className="mt-1 max-w-md text-sm text-muted">
                    You get ready-to-paste LinkedIn drafts plus a breakdown of every moment of the post: the hook, the structure, why it should work and what to improve.
                  </p>
                </div>
              )}

              {result && (
                <div className="space-y-5">
                  <div className={`rounded-xl border p-4 text-sm ${result.demo ? "border-amber-400/40 bg-amber-400/5 text-amber-100" : "border-accent/30 bg-accent/5 text-fg"}`}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Sally&apos;s strategy note</p>
                    <p className="mt-1.5">{result.gen.strategyNote}</p>
                    {result.usage && (
                      <p className="mt-2 text-[11px] text-muted">
                        {result.usage.input.toLocaleString()} input + {result.usage.output.toLocaleString()} output tokens ≈ ${result.usage.costUsd.toFixed(4)}
                        {result.draftIds.length > 0 && " · stored in the library as “generated”"}
                      </p>
                    )}
                  </div>
                  {result.gen.posts.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {result.gen.posts.map((p, i) => (
                        <Chip key={i} active={active === i} onClick={() => setActive(i)}>
                          Variant {i + 1} · {p.title} · {p.analysis.score}/10
                        </Chip>
                      ))}
                    </div>
                  )}
                  {result.gen.posts[active] && (
                    <PostReview
                      post={result.gen.posts[active]}
                      lang={result.lang}
                      onSave={() => save(active)}
                      saved={isSaved(active)}
                    />
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "saved" && hasDatabase && (
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_LABELS.map((f) => (
                <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</Chip>
              ))}
            </div>
            <p className="text-xs text-muted">
              Shared with the whole team. Every generation lands here as “generated”; Save → Approve → Mark as posted.
              LinkedIn publishing (later) will only pick up approved drafts.
            </p>
            {libError && <p role="alert" className="text-sm text-accent">{libError}</p>}
            {!libError && drafts.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
            {drafts.map((d) => (
              <div key={d.id} className="rounded-[var(--radius-card)] border border-border bg-surface">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button type="button" onClick={() => setOpenSaved(openSaved === d.id ? null : d.id)} className="min-w-0 flex-1 text-left">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-fg">
                      {d.post.title}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                      <span className="font-normal text-muted">{d.post.analysis.score}/10 · {d.lang.toUpperCase()}</span>
                    </p>
                    <p className="truncate text-xs text-muted">{d.post.hook}</p>
                  </button>
                  <span className="text-[11px] text-muted">{new Date(d.createdAt).toLocaleString()}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {NEXT[d.status].map((n) => (
                      <button
                        key={n.to}
                        type="button"
                        onClick={() => moveDraft(d.id, n.to)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          n.to === "archived" ? "border-border text-muted hover:text-accent" : "border-accent/50 text-fg hover:bg-accent/10"
                        }`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                {openSaved === d.id && (
                  <div className="border-t border-border p-4">
                    {d.topic && <p className="mb-3 text-xs text-muted"><span className="font-semibold text-fg">Topic:</span> {d.topic}</p>}
                    <PostReview post={d.post} lang={d.lang} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "saved" && !hasDatabase && (
          <div className="mt-8 space-y-4">
            <p className="text-xs text-muted">Saved drafts are kept in this browser only.</p>
            {saved.length === 0 && <p className="text-sm text-muted">No saved drafts yet — generate some and press “Save draft”.</p>}
            {saved.map((s) => (
              <div key={s.id} className="rounded-[var(--radius-card)] border border-border bg-surface">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button type="button" onClick={() => setOpenSaved(openSaved === s.id ? null : s.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-fg">{s.post.title} <span className="font-normal text-muted">· {s.post.analysis.score}/10 · {s.lang.toUpperCase()}</span></p>
                    <p className="truncate text-xs text-muted">{s.post.hook}</p>
                  </button>
                  <span className="text-[11px] text-muted">{new Date(s.savedAt).toLocaleString()}</span>
                  <button type="button" onClick={() => remove(s.id)} className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:text-accent">Delete</button>
                </div>
                {openSaved === s.id && (
                  <div className="border-t border-border p-4">
                    <PostReview post={s.post} lang={s.lang} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "playbook" && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {PLAYBOOK.map((b) => (
              <section key={b.title} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <h3 className="text-sm font-bold text-fg">{b.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {b.items.map((i) => <li key={i} className="flex gap-2"><span className="text-accent">•</span><span>{i}</span></li>)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
