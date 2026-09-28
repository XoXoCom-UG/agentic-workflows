import { LogoMark } from "@/components/courses/LogoMark";

/**
 * The tools band on a course detail page: the same logos the artwork uses, but named
 * and legible. The artwork sets a mood; this answers "what will I actually touch".
 *
 * Product names are proper nouns, so they are NOT in the bilingual copy tree — only the
 * section's heading is (`courses.stackLabel` / `courses.stackNote`).
 *
 * `primary` marks the two the course is built on; they get the coral treatment, the
 * rest sit in ink. Same hierarchy as the artwork, so the page tells one story twice.
 */
const STACK: { name: string; label: string; primary?: boolean }[] = [
  { name: "n8n", label: "n8n", primary: true },
  { name: "pinecone", label: "Pinecone", primary: true },
  { name: "openai", label: "OpenAI" },
  { name: "claude", label: "Claude" },
  { name: "mcp", label: "MCP" },
  { name: "gmail", label: "Gmail" },
  { name: "drive", label: "Google Drive" },
];

export default function CourseStack({ label, note }: { label: string; note: string }) {
  return (
    <section className="px-6 md:px-10 lg:px-12 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{label}</p>
        <p className="mt-3 max-w-xl text-muted">{note}</p>

        <ul className="mt-8 flex flex-wrap gap-3">
          {STACK.map((tool) => (
            <li
              key={tool.name}
              className={`flex items-center gap-2.5 rounded-[var(--radius-card)] border px-4 py-2.5 transition-colors ${
                tool.primary
                  ? "border-accent/40 bg-accent/[0.07] text-fg"
                  : "border-border bg-surface text-muted hover:border-accent/30"
              }`}
            >
              <LogoMark
                name={tool.name}
                className="h-5 w-5 shrink-0"
                tint={tool.primary ? "bg-accent" : "bg-muted"}
              />
              <span className={`text-sm font-semibold ${tool.primary ? "text-fg" : ""}`}>{tool.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
