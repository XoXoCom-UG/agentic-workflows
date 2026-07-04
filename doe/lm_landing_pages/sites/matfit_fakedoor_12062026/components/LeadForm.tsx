"use client";

import { FormEvent, useState } from "react";
import { useLang } from "@/lib/i18n";

type Props = {
  fields: string[];
  submitLabel?: string;
};

type Status = "idle" | "submitting" | "error";

function inputTypeFor(field: string): string {
  if (field === "email") return "email";
  if (field === "phone") return "tel";
  return "text";
}

export default function LeadForm({ fields, submitLabel }: Props) {
  const { c } = useLang();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const labelFor = (field: string): string =>
    c.form.labels[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

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
          body?.error === "invalid_email" ? c.form.errInvalidEmail : c.form.errGeneric
        );
        return;
      }
      window.location.assign(body.redirect_url);
    } catch {
      setStatus("error");
      setErrorMsg(c.form.errNetwork);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((field) => (
        <div key={field} className="space-y-1.5">
          <label
            htmlFor={field}
            className="block text-sm font-medium text-neutral-700"
          >
            {labelFor(field)}
          </label>
          <input
            id={field}
            name={field}
            type={inputTypeFor(field)}
            placeholder={c.form.placeholders[field] ?? ""}
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
            className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/25"
          />
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
        className="w-full rounded-lg bg-gradient-to-b from-green-500 to-green-600 py-3 font-semibold text-white shadow-[0_12px_30px_-12px_rgba(34,197,94,0.55)] transition hover:from-green-400 hover:to-green-500 disabled:opacity-50"
      >
        {status === "submitting" ? c.form.submitting : submitLabel ?? c.form.submitFallback}
      </button>

      <p className="text-[12px] leading-relaxed text-neutral-500">
        {c.form.privacyPre}
        <a
          href="/datenschutz"
          className="text-green-700 underline underline-offset-2 hover:text-green-600"
        >
          {c.form.privacyLink}
        </a>
        .
      </p>
    </form>
  );
}
