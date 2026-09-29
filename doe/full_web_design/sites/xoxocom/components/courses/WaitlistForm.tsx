"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Copy } from "@/lib/copy";
import SmartLink from "@/components/SmartLink";

type Status = "idle" | "submitting" | "success" | "error";
type BookingType = "self" | "team";

// Same range the API route and the course_waitlist_booking_shape CHECK enforce.
const MIN_TEAM_PLACES = 2;
const MAX_TEAM_PLACES = 20;

const FIELD_CLASS =
  "w-full rounded-[var(--radius-card)] border border-border bg-bg px-3.5 py-2.5 text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent";

/**
 * Booking request for one course (vocabulary in CONTEXT.md). A "For myself" / "For my
 * team" toggle decides which fields show: the team variant adds company (required),
 * last name (optional) and number of participants (2-20). Beyond that it is the
 * waiting-list form it grew out of. Mirrors ContactForm's shape on purpose — same
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
  const [bookingType, setBookingType] = useState<BookingType>("self");
  const team = bookingType === "team";
  const radioRefs = useRef<Record<BookingType, HTMLButtonElement | null>>({ self: null, team: null });

  function chooseType(value: BookingType) {
    setBookingType(value);
    setErrorMsg(null);
  }

  // ARIA radiogroup keyboard pattern: one tab stop for the group, arrow keys move the
  // selection. With only two options every arrow simply flips to the other one.
  function onRadioKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next: BookingType = bookingType === "self" ? "team" : "self";
    chooseType(next);
    radioRefs.current[next]?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    // Capture the form node now: React nulls e.currentTarget across the await below.
    const form = e.currentTarget;
    const data = new FormData(form);
    const read = (name: string) => {
      const v = data.get(name);
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };

    // Checked here first so the visitor gets the message without a round trip; the
    // route re-checks both, since a client check is only a convenience.
    const places = team ? Number(read("places")) : 1;
    if (team && !read("company")) {
      setStatus("error");
      setErrorMsg(t.errCompany);
      return;
    }
    if (team && (!Number.isInteger(places) || places < MIN_TEAM_PLACES || places > MAX_TEAM_PLACES)) {
      setStatus("error");
      setErrorMsg(t.errPlaces);
      return;
    }
    setStatus("submitting");

    try {
      const res = await fetch("/api/course-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: read("email") ?? "",
          course_slug: courseSlug,
          lang,
          fields: {
            booking_type: bookingType,
            first_name: read("first_name"),
            note: read("note"),
            ...(team && { company: read("company"), last_name: read("last_name"), places }),
          },
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) {
        setStatus("error");
        const byCode: Record<string, string> = {
          invalid_email: t.errInvalidEmail,
          invalid_company: t.errCompany,
          invalid_places: t.errPlaces,
        };
        setErrorMsg((body?.error && byCode[body.error]) || t.errGeneric);
        return;
      }
      setStatus("success");
      form.reset();
      setBookingType("self");
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
      <fieldset>
        <legend id="wl-booking-for" className="mb-2 block text-sm font-medium text-fg">{t.bookingFor}</legend>
        <div role="radiogroup" aria-labelledby="wl-booking-for" className="grid grid-cols-2 gap-2">
          {(
            [
              ["self", t.forMyself],
              ["team", t.forMyTeam],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              ref={(el) => {
                radioRefs.current[value] = el;
              }}
              type="button"
              role="radio"
              aria-checked={bookingType === value}
              tabIndex={bookingType === value ? 0 : -1}
              onClick={() => chooseType(value)}
              onKeyDown={onRadioKey}
              className={`rounded-[var(--radius-card)] border px-3 py-2.5 text-sm font-semibold transition ${
                bookingType === value
                  ? "border-accent bg-accent/12 text-fg"
                  : "border-border bg-bg text-muted hover:border-accent/60 hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

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

      {team && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="wl-last-name" className="block text-sm font-medium text-fg">
                {t.lastName}
              </label>
              <input id="wl-last-name" name="last_name" type="text" autoComplete="family-name" className={FIELD_CLASS} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wl-company" className="block text-sm font-medium text-fg">
                {t.company}
                <span className="text-accent"> *</span>
              </label>
              <input id="wl-company" name="company" type="text" required autoComplete="organization" className={FIELD_CLASS} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="wl-places" className="block text-sm font-medium text-fg">
              {t.participants}
              <span className="text-accent"> *</span>
            </label>
            <input
              id="wl-places"
              name="places"
              type="number"
              inputMode="numeric"
              min={MIN_TEAM_PLACES}
              max={MAX_TEAM_PLACES}
              defaultValue={MIN_TEAM_PLACES}
              required
              aria-describedby="wl-places-hint"
              className={`${FIELD_CLASS} sm:max-w-[10rem]`}
            />
            <p id="wl-places-hint" className="text-xs text-muted">
              {t.participantsHint}
              <SmartLink href="/kontakt" className="underline hover:text-fg">
                {t.participantsHintLink}
              </SmartLink>
              .
            </p>
          </div>
        </>
      )}

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
