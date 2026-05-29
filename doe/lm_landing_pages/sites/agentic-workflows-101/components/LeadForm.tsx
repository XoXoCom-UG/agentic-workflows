"use client";

import { FormEvent, useState } from "react";

type Props = {
  fields: string[];
  submitLabel?: string;
};

type Status = "idle" | "submitting" | "error";

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  role: "Role",
  country: "Country",
};

function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function inputTypeFor(field: string): string {
  if (field === "email") return "email";
  if (field === "phone") return "tel";
  return "text";
}

export default function LeadForm({ fields, submitLabel = "Get the download" }: Props) {
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
            ? "That email doesn't look right — please check it."
            : "Something went wrong. Please try again."
        );
        return;
      }
      window.location.assign(body.redirect_url);
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((field) => (
        <div key={field} className="space-y-1.5">
          <label htmlFor={field} className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {labelFor(field)}
          </label>
          <input
            id={field}
            name={field}
            type={inputTypeFor(field)}
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
                : "off"
            }
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
      ))}

      {errorMsg ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        {status === "submitting" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
