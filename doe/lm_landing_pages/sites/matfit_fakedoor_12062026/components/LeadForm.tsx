"use client";

import { FormEvent, useState } from "react";

type Props = {
  fields: string[];
  submitLabel?: string;
};

type Status = "idle" | "submitting" | "error";

const FIELD_LABELS: Record<string, string> = {
  first_name: "Vorname",
  last_name: "Nachname",
  email: "E-Mail",
  phone: "Telefon",
  company: "Firma",
  role: "Rolle",
  country: "Land",
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  first_name: "Max",
  email: "max@firma.de",
  company: "Deine Firma GmbH",
};

function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function inputTypeFor(field: string): string {
  if (field === "email") return "email";
  if (field === "phone") return "tel";
  return "text";
}

export default function LeadForm({ fields, submitLabel }: Props) {
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
        | { ok: boolean; redirect_url?: string; error?: string }
        | null;

      if (!res.ok || !body?.ok || !body.redirect_url) {
        setStatus("error");
        setErrorMsg(
          body?.error === "invalid_email"
            ? "Diese E-Mail sieht nicht richtig aus — bitte prüfe sie."
            : "Etwas ist schiefgelaufen. Bitte versuche es erneut."
        );
        return;
      }
      window.location.assign(body.redirect_url);
    } catch {
      setStatus("error");
      setErrorMsg("Netzwerkfehler. Bitte versuche es erneut.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((field) => (
        <div key={field} className="space-y-1.5">
          <label
            htmlFor={field}
            className="block text-sm font-medium text-neutral-200"
          >
            {labelFor(field)}
          </label>
          <input
            id={field}
            name={field}
            type={inputTypeFor(field)}
            placeholder={FIELD_PLACEHOLDERS[field] ?? ""}
            required={field === "email"}
            autoComplete={
              field === "email"
                ? "email"
                : field === "first_name"
                ? "given-name"
                : field === "last_name"
                ? "family-name"
                : field === "phone"
                ? "tel"
                : field === "company"
                ? "organization"
                : "off"
            }
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-neutral-100 placeholder:text-neutral-600 focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
          />
        </div>
      ))}

      {errorMsg ? (
        <p role="alert" className="text-sm text-red-400">
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-lime-400 py-3 font-semibold text-neutral-950 transition hover:bg-lime-300 disabled:opacity-50"
      >
        {status === "submitting" ? "Wird gesendet…" : submitLabel ?? "Auf die Liste setzen"}
      </button>
    </form>
  );
}
