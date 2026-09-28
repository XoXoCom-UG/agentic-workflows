"use client";

import { useState, type FormEvent } from "react";
import type { Copy } from "@/lib/copy";
import SmartLink from "@/components/SmartLink";

type Status = "idle" | "submitting" | "success" | "error";

const FIELD_CLASS =
  "w-full rounded-[var(--radius-card)] border border-border bg-bg px-3.5 py-2.5 text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent";

/**
 * Waiting-list signup for one course. Mirrors ContactForm's shape on purpose — same
 * field styling, same status machine, same "labels arrive as props" rule that keeps the
 * bilingual copy tree out of the client bundle — but posts to /api/course-waitlist,
 * which writes to leads.course_waitlist rather than leads.prospects.
 *
 * Only the email is required. Every extra required field on a "tell me when it's ready"
 * form costs signups, and the signup is the whole point of the page.
 */
export default function WaitlistForm({
  t,
  courseSlug,
  lang,
}: {
  t: Copy["courses"]["waitlist"];
  courseSlug: string;
  lang: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    // Capture the form node now: React nulls e.currentTarget across the await below.
    const form = e.currentTarget;
    const data = new FormData(form);
    const read = (name: string) => {
      const v = data.get(name);
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };

    try {
      const res = await fetch("/api/course-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: read("email") ?? "",
          course_slug: courseSlug,
          lang,
          fields: { first_name: read("first_name"), note: read("note") },
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) {
        setStatus("error");
        setErrorMsg(body?.error === "invalid_email" ? t.errInvalidEmail : t.errGeneric);
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMsg(t.errNetwork);
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-card)] border border-accent/40 bg-surface p-8 text-center"
      >
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-lg font-semibold text-fg">{t.successTitle}</p>
        <p className="mt-2 text-sm text-muted">{t.successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="wl-first-name" className="block text-sm font-medium text-fg">
            {t.firstName}
          </label>
          <input id="wl-first-name" name="first_name" type="text" autoComplete="given-name" className={FIELD_CLASS} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="wl-email" className="block text-sm font-medium text-fg">
            {t.email}
            <span className="text-accent"> *</span>
          </label>
          <input id="wl-email" name="email" type="email" required autoComplete="email" className={FIELD_CLASS} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="wl-note" className="block text-sm font-medium text-fg">
          {t.note}
        </label>
        <textarea id="wl-note" name="note" rows={3} className={FIELD_CLASS} />
      </div>

      {errorMsg && <p role="alert" className="text-sm text-red-400">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-[var(--radius-card)] bg-accent py-3.5 font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? t.submitting : t.submit}
      </button>

      <p className="text-xs text-muted">
        {t.privacyPre}
        <SmartLink href="/datenschutz" className="underline hover:text-fg">
          {t.privacyLink}
        </SmartLink>
        .
      </p>
    </form>
  );
}
