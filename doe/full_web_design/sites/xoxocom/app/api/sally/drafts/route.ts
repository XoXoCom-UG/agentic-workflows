import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSallyAdmin } from "@/lib/sally-admin";
import { DRAFT_STATUSES, listDrafts, setDraftStatus, storeEnabled, usageSummary } from "@/lib/sally-store";

export const runtime = "nodejs";

/**
 * Sally Studio library: GET lists stored drafts (+ the month's cost summary), PATCH moves
 * a draft through its workflow (saved → approved → posted, or archived). Same password
 * session as the studio page; checked here independently.
 */

const FILTERS = [...DRAFT_STATUSES, "library", "all"] as const;

export async function GET(req: NextRequest) {
  if (!(await isSallyAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!storeEnabled()) return NextResponse.json({ ok: false, error: "no_database" }, { status: 503 });

  const raw = req.nextUrl.searchParams.get("filter") ?? "library";
  const filter = (FILTERS as readonly string[]).includes(raw) ? (raw as (typeof FILTERS)[number]) : "library";
  try {
    const [drafts, usage] = await Promise.all([listDrafts(filter), usageSummary()]);
    return NextResponse.json({ ok: true, drafts, usage });
  } catch (err) {
    console.error("[sally/drafts GET]", err);
    return NextResponse.json({ ok: false, error: "database", message: "Could not load drafts from the database." }, { status: 502 });
  }
}

const Patch = z.object({ id: z.string().uuid(), status: z.enum(DRAFT_STATUSES) });

export async function PATCH(req: NextRequest) {
  if (!(await isSallyAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!storeEnabled()) return NextResponse.json({ ok: false, error: "no_database" }, { status: 503 });

  let body: z.infer<typeof Patch>;
  try {
    body = Patch.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 422 });
  }
  try {
    await setDraftStatus(body.id, body.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sally/drafts PATCH]", err);
    return NextResponse.json({ ok: false, error: "database", message: "Could not update the draft." }, { status: 502 });
  }
}
