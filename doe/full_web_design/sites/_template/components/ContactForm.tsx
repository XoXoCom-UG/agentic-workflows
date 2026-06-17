"use client";

import { FormEvent, useState } from "react";

type Props = {
  /** Field names. "email" is always required; "message" renders as a textarea. */
  fields: string[];
};

type Status = "idle" | "submitting" | "success" | "error";

const FIELD_LABELS: Record<string, string> = {
  first_name: "Name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  message: "Message",
};

function labelFor(field: string): string {
  return (
    FIELD_LABELS[field] ??
    field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function inputTypeFor(field: string): string {
  if (field === "email") return "email";
  if (field === "phone") return "tel";
  return "text";
}

const FIELD_CLASS =
  "w-full px-3.5 py-2.5 rounded-[var(--radius-card)] border border-border bg-bg text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent";

export default function ContactForm({ fields }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const values: Record<string, string> = {};
    for (const f of fields) {
      const v = data.get(f);
      if (typeof v === "string" && v.trim()) values[f] = v.trim();
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
      const body = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;

      if (!res.ok || !body?.ok) {
        setStatus("error");
        setErrorMsg(
          body?.error === "invalid_email"
            ? "That email doesn't look right — please check it."
            : "Something went wrong. Please try again."
        );
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center space-y-2"
      >
        <p className="text-lg font-semibold text-fg">Thanks — message received.</p>
        <p className="text-sm text-muted">We&apos;ll get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((field) => (
        <div key={field} className="space-y-1.5">
          <label htmlFor={field} className="block text-sm font-medium text-fg">
            {labelFor(field)}
          </label>
          {field === "message" ? (
            <textarea
              id={field}
              name={field}
              rows={5}
              className={FIELD_CLASS}
            />
          ) : (
            <input
              id={field}
              name={field}
              type={inputTypeFor(field)}
              required={field === "email"}
              autoComplete={
                field === "email"
                  ? "email"
                  : field === "first_name"
                  ? "name"
                  : field === "phone"
                  ? "tel"
                  : field === "company"
                  ? "organization"
                  : "off"
              }
              className={FIELD_CLASS}
            />
          )}
        </div>
      ))}

      {errorMsg ? (
        <p role="alert" className="text-sm text-red-600">
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 rounded-[var(--radius-card)] bg-accent font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>

      {/* Consent notice — Art. 6(1)(b) GDPR; not a checkbox. Links to the privacy policy. */}
      <p className="text-xs text-muted">
        Mit dem Absenden akzeptierst du unsere{" "}
        <a href="/datenschutz" className="underline hover:text-fg">
          Datenschutzerklärung
        </a>
        .
      </p>
    </form>
  );
}
