import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SALLY_ADMIN_COOKIE, isValidSession, rateLimit } from "@/lib/sally-admin";
import { GenerateRequest, SALLY_MODEL, SallyAgentError, costUsd, demoGeneration, generatePosts } from "@/lib/sally-agent";
import { recordGeneration, storeEnabled } from "@/lib/sally-store";

export const runtime = "nodejs";
// Several variants with analysis can take a while on a cold start.
export const maxDuration = 60;

// Per-instance caps (see lib/sally-admin.ts rateLimit): bursts and a daily ceiling.
// The real budget guard is the monthly spend limit on the Anthropic workspace.
const PER_MINUTE = 6;
const PER_DAY = Number(process.env.SALLY_DAILY_LIMIT || 150);

export async function POST(req: NextRequest) {
  // The page is gated too, but this route is what spends money, so it checks on its own.
  if (!isValidSession((await cookies()).get(SALLY_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let input: GenerateRequest;
  try {
    input = GenerateRequest.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input", message: "Check the topic (3–600 characters) and options." }, { status: 422 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, demo: true, result: demoGeneration(input) });
  }

  if (!rateLimit("gen:minute", PER_MINUTE, 60_000) || !rateLimit("gen:day", PER_DAY, 24 * 3600_000)) {
    return NextResponse.json({ ok: false, error: "limit", message: "Generation limit reached — please wait a bit." }, { status: 429 });
  }

  try {
    const { result, usage } = await generatePosts(input);
    const cost = costUsd(usage);

    // Record the generation and its drafts. A database hiccup must not throw away a
    // result that has already been paid for, so failure only means "not stored".
    let draftIds: string[] = [];
    if (storeEnabled()) {
      try {
        draftIds = await recordGeneration(input, result, { ...usage, costUsd: cost }, SALLY_MODEL);
      } catch (err) {
        console.error("[sally/generate] could not store generation", err);
      }
    }
    return NextResponse.json({ ok: true, demo: false, result, usage: { ...usage, costUsd: cost }, draftIds });
  } catch (err) {
    if (err instanceof SallyAgentError) {
      const status = err.code === "rate_limited" ? 429 : err.code === "auth" ? 500 : 502;
      return NextResponse.json({ ok: false, error: err.code, message: err.message }, { status });
    }
    console.error("[sally/generate]", err);
    return NextResponse.json({ ok: false, error: "server", message: "Something went wrong. Try again." }, { status: 500 });
  }
}
