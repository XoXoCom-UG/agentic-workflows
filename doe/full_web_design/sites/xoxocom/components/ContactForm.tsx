"use client";

import { FormEvent, useState } from "react";
import type { Copy } from "@/lib/copy";
import SmartLink from "@/components/SmartLink";

type Status = "idle" | "submitting" | "success" | "error";

// Field order per the brief: first name, last name, email, company, message.
// Labels come from the bilingual copy tree (keyed by `labelKey`) at render time.
type FieldMeta = { name: string; labelKey: keyof Copy["contact"]; type: string; required?: boolean; textarea?: boolean; autocomplete?: string };
const FIELDS: FieldMeta[] = [
  { name: "first_name", labelKey: "firstName", type: "text", autocomplete: "given-name" },
  { name: "last_name", labelKey: "lastName", type: "text", autocomplete: "family-name" },
  { name: "email", labelKey: "email", type: "email", required: true, autocomplete: "email" },
  { name: "company", labelKey: "company", type: "text", autocomplete: "organization" },
  { name: "message", labelKey: "message", type: "text", textarea: true },
];

const FIELD_CLASS =
  "w-full px-3.5 py-2.5 rounded-[var(--radius-card)] border border-border bg-bg text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent";

// Labels/messages arrive as props from the server-rendered KontaktContent, so the
// bilingual copy tree stays out of the client bundle (see lib/server-copy.ts).
export default function ContactForm({ t }: { t: Copy["contact"] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    // Capture the form node now: React nulls e.currentTarget after the await below,
    // so reusing it later (e.g. .reset()) would throw and be misreported as an error.
    const form = e.currentTarget;
    const data = new FormData(form);
    const values: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = data.get(f.name);
      if (typeof v === "string" && v.trim()) values[f.name] = v.trim();
    }
    const email = values.email ?? "";
    const { email: _drop, ...rest } = values;
    void _drop;

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fields: rest }),
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
      <div role="status" className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center space-y-2">
        <p className="text-lg font-semibold text-fg">{t.successTitle}</p>
        <p className="text-sm text-muted">{t.successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.filter((f) => !f.textarea).map((f) => (
          <div key={f.name} className={f.name === "email" || f.name === "company" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <label htmlFor={f.name} className="block text-sm font-medium text-fg">
              {t[f.labelKey]}
              {f.required && <span className="text-accent"> *</span>}
            </label>
            <input id={f.name} name={f.name} type={f.type} required={f.required} autoComplete={f.autocomplete} className={FIELD_CLASS} />
          </div>
        ))}
      </div>

      {FIELDS.filter((f) => f.textarea).map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="block text-sm font-medium text-fg">{t[f.labelKey]}</label>
          <textarea id={f.name} name={f.name} rows={5} className={FIELD_CLASS} />
        </div>
      ))}

      {errorMsg && <p role="alert" className="text-sm text-red-400">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 rounded-[var(--radius-card)] bg-accent font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? t.submitting : t.submit}
      </button>

      <p className="text-xs text-muted">
        {t.privacyPre}
        <SmartLink href="/datenschutz" className="underline hover:text-fg">{t.privacyLink}</SmartLink>.
      </p>
    </form>
  );
}
