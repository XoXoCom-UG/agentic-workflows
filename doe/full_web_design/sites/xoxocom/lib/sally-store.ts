import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { GenerateRequest, SallyGeneration, SallyPostDraft } from "@/lib/sally-agent";

/**
 * Sally Studio persistence: the `sally` schema (execution/add_sally_studio_tables.py).
 * Every real generation is recorded with its cost, every variant becomes a draft row
 * with a workflow status. Server-only, service key — the tables have RLS on with no
 * policies, so the browser can never reach them directly.
 *
 * Optional by design: without SUPABASE_URL / SUPABASE_SERVICE_KEY (local dev) the
 * studio falls back to keeping saved drafts in the browser.
 */

const SCHEMA = "sally";

export const DRAFT_STATUSES = ["generated", "saved", "approved", "posted", "archived"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

/** What the studio renders for one stored draft. */
export type StoredDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  lang: "de" | "en";
  status: DraftStatus;
  topic: string;
  post: SallyPostDraft;
};

export type UsageSummary = {
  monthGenerations: number;
  monthCostUsd: number;
  monthTokens: number;
  totalGenerations: number;
  totalCostUsd: number;
};

export function storeEnabled(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
}

const db = () => getSupabase().schema(SCHEMA);

export async function recordGeneration(
  input: GenerateRequest,
  result: SallyGeneration,
  usage: { input: number; output: number; costUsd: number },
  model: string,
): Promise<string[]> {
  const { data: gen, error } = await db()
    .from("generations")
    .insert({
      topic: input.topic,
      settings: {
        goal: input.goal,
        format: input.format,
        tone: input.tone,
        language: input.language,
        variants: input.variants,
        notes: input.notes,
      },
      model,
      strategy_note: result.strategyNote,
      input_tokens: usage.input,
      output_tokens: usage.output,
      cost_usd: usage.costUsd,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: rows, error: draftError } = await db()
    .from("drafts")
    .insert(
      result.posts.map((p, position) => ({
        generation_id: gen.id,
        position,
        lang: input.language,
        title: p.title,
        hook: p.hook,
        score: p.analysis.score,
        post: p,
      })),
    )
    .select("id, position");
  if (draftError) throw draftError;
  return [...rows].sort((a, b) => a.position - b.position).map((r) => r.id as string);
}

type DraftRow = {
  id: string;
  created_at: string;
  updated_at: string;
  lang: "de" | "en";
  status: DraftStatus;
  post: SallyPostDraft;
  generation: { topic: string } | null;
};

/** Newest first. `status` "library" = everything a human kept (saved, approved, posted). */
export async function listDrafts(filter: DraftStatus | "library" | "all", limit = 100): Promise<StoredDraft[]> {
  let q = db()
    .from("drafts")
    .select("id, created_at, updated_at, lang, status, post, generation:generations(topic)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filter === "library") q = q.in("status", ["saved", "approved", "posted"]);
  else if (filter === "all") q = q.neq("status", "archived");
  else q = q.eq("status", filter);

  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as DraftRow[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lang: r.lang,
    status: r.status,
    topic: r.generation?.topic ?? "",
    post: r.post,
  }));
}

export async function setDraftStatus(id: string, status: DraftStatus): Promise<void> {
  const { error } = await db()
    .from("drafts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function usageSummary(): Promise<UsageSummary> {
  // Volumes are tiny (a handful of generations a day), so summing in JS is fine and
  // avoids an RPC function in the schema.
  const { data, error } = await db().from("generations").select("created_at, input_tokens, output_tokens, cost_usd");
  if (error) throw error;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const s: UsageSummary = { monthGenerations: 0, monthCostUsd: 0, monthTokens: 0, totalGenerations: 0, totalCostUsd: 0 };
  for (const g of data ?? []) {
    const cost = Number(g.cost_usd) || 0;
    s.totalGenerations++;
    s.totalCostUsd += cost;
    if (new Date(g.created_at) >= monthStart) {
      s.monthGenerations++;
      s.monthCostUsd += cost;
      s.monthTokens += (g.input_tokens ?? 0) + (g.output_tokens ?? 0);
    }
  }
  return s;
}
