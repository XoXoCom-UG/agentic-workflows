"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

// Field order per the brief: Vorname, Nachname, E-Mail, Firma, Nachricht.
const FIELDS: { name: string; label: string; type: string; required?: boolean; textarea?: boolean; autocomplete?: string }[] = [
  { name: "first_name", label: "Vorname", type: "text", autocomplete: "given-name" },
  { name: "last_name", label: "Nachname", type: "text", autocomplete: "family-name" },
  { name: "email", label: "E-Mail", type: "email", required: true, autocomplete: "email" },
  { name: "company", label: "Firma", type: "text", autocomplete: "organization" },
  { name: "message", label: "Deine Nachricht", type: "text", textarea: true },
];

const FIELD_CLASS =
  "w-full px-3.5 py-2.5 rounded-[var(--radius-card)] border border-border bg-bg text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent";

export default function ContactForm() {
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
        setErrorMsg(
          body?.error === "invalid_email"
            ? "Diese E-Mail-Adresse sieht nicht korrekt aus — bitte prüfe sie."
            : "Etwas ist schiefgelaufen. Bitte versuche es erneut."
        );
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMsg("Netzwerkfehler. Bitte versuche es erneut.");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center space-y-2">
        <p className="text-lg font-semibold text-fg">Danke — deine Nachricht ist angekommen.</p>
        <p className="text-sm text-muted">Wir melden uns innerhalb eines Werktags bei dir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.filter((f) => !f.textarea).map((f) => (
          <div key={f.name} className={f.name === "email" || f.name === "company" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <label htmlFor={f.name} className="block text-sm font-medium text-fg">
              {f.label}
              {f.required && <span className="text-accent"> *</span>}
            </label>
            <input id={f.name} name={f.name} type={f.type} required={f.required} autoComplete={f.autocomplete} className={FIELD_CLASS} />
          </div>
        ))}
      </div>

      {FIELDS.filter((f) => f.textarea).map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="block text-sm font-medium text-fg">{f.label}</label>
          <textarea id={f.name} name={f.name} rows={5} className={FIELD_CLASS} />
        </div>
      ))}

      {errorMsg && <p role="alert" className="text-sm text-red-400">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 rounded-[var(--radius-card)] bg-accent font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "Wird gesendet…" : "Nachricht senden"}
      </button>

      <p className="text-xs text-muted">
        Mit dem Absenden akzeptierst du unsere{" "}
        <a href="/datenschutz" className="underline hover:text-fg">Datenschutzerklärung</a>.
      </p>
    </form>
  );
}
