import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Sally's LinkedIn agent: one Claude call that writes 1–3 post variants AND a marketing
 * breakdown of each (hook, structure, why it should work, what to improve), returned as
 * schema-validated JSON for Sally Studio (/sally/admin) to render.
 *
 * Cost: Claude Haiku 5.5 — the cheapest current model ($0.10 / $0.50 per million input /
 * output tokens). One generation is roughly 3k tokens in and up to ~6k out, i.e. well
 * under a cent. The route in app/api/sally/generate caps how often it can be called.
 *
 * Nothing is posted anywhere: the studio only shows the drafts. Publishing to LinkedIn
 * is a later step.
 */

export const SALLY_MODEL = "claude-haiku-5-5";

/** List price of SALLY_MODEL in USD per million tokens — used for the studio's cost ledger. */
const PRICE_PER_MTOK = { input: 0.1, output: 0.5 };

export function costUsd(usage: { input: number; output: number }): number {
  return (usage.input * PRICE_PER_MTOK.input + usage.output * PRICE_PER_MTOK.output) / 1_000_000;
}

export const GOALS = ["awareness", "engagement", "leads", "beta"] as const;
export const FORMATS = ["story", "list", "behind-the-scenes", "announcement", "insight", "question"] as const;
export const TONES = ["friendly", "professional", "inspiring", "witty"] as const;

export const GenerateRequest = z.object({
  topic: z.string().trim().min(3).max(600),
  goal: z.enum(GOALS),
  format: z.enum(FORMATS),
  tone: z.enum(TONES),
  language: z.enum(["de", "en"]),
  variants: z.number().int().min(1).max(3),
  notes: z.string().trim().max(400).optional().default(""),
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;

const PostSchema = z.object({
  title: z.string().describe("Short internal name for this variant, max 6 words, in the post language."),
  format: z.string().describe("The format actually used, e.g. 'Story', 'Listicle', 'Behind the scenes'."),
  hook: z.string().describe("The first 1-2 lines exactly as they appear at the top of the post."),
  hookType: z.string().describe("Name of the hook technique, e.g. 'Curiosity gap', 'Bold statement', 'Question', 'Number', 'Contrarian'."),
  text: z.string().describe("The complete post, ready to paste into LinkedIn: hook, body, CTA, hashtags at the end. Use line breaks."),
  cta: z.string().describe("The call to action sentence used in the post."),
  hashtags: z.array(z.string()).describe("3-5 hashtags used at the end of the post, each starting with #."),
  structure: z
    .array(
      z.object({
        part: z.string().describe("Name of the section, e.g. 'Hook', 'Re-hook', 'Story', 'Value', 'CTA'."),
        excerpt: z.string().describe("The first words of that section in the post (max ~12 words)."),
        purpose: z.string().describe("Why this section is there and what it does for the reader."),
      }),
    )
    .describe("The post broken into its sections, top to bottom."),
  analysis: z.object({
    score: z.number().describe("Honest quality score from 1 to 10 as a LinkedIn post."),
    engagement: z.enum(["low", "medium", "high"]).describe("Expected engagement compared with a typical company post."),
    audience: z.string().describe("Who exactly this post is written for."),
    whyItWorks: z.array(z.string()).describe("3-5 concrete marketing reasons this post should perform."),
    principles: z.array(z.string()).describe("LinkedIn copywriting principles applied, as short labels."),
    improvements: z.array(z.string()).describe("1-3 concrete ideas to make it even stronger before posting."),
    bestTime: z.string().describe("Recommended day/time window to post for a DACH B2B audience, with a short reason."),
    firstComment: z.string().describe("A suggested first comment by the author (e.g. with the link), since links in the post body reduce reach."),
  }),
});

const OutputSchema = z.object({
  posts: z.array(PostSchema),
  strategyNote: z.string().describe("2-3 sentences on how these variants differ and which one to post first, and why."),
});

export type SallyPostDraft = z.infer<typeof PostSchema>;
export type SallyGeneration = z.infer<typeof OutputSchema>;

// Stable system prompt (cached prefix-friendly: no dates, no per-request values).
const SYSTEM = `You are Sally, the A.I. assistant of XoXoCom UG, and you write LinkedIn posts for the XoXoCom company page and team. You are also a senior B2B social-media strategist who explains your choices.

# Who you are
- Sally: the electronic assistant of XoXoCom. Friendly, curious, a little playful, never cringe. You write in the first person as Sally and are open about being an A.I. — that transparency is part of the brand ("an A.I. that speaks for an A.I. team").
- Your mission on LinkedIn: keep the page alive with regular, genuine updates about Agentix Projects and the XoXoCom team, and show how A.I. consultants help people turn business ideas into reality.

# Facts you may use (and ONLY these — never invent numbers, customers, testimonials, dates, prices or features)
- XoXoCom UG is a young, three-person team combining agile ways of working with artificial intelligence. Services: A.I. Transformation, Expert Consulting (specialists for key roles such as Product Owner, Scrum Master, Software Engineer, A.I. Specialist), Business Coaching. Website: xoxocom.net.
- XoXoCom offers hands-on A.I. courses, bookable for yourself or for your whole team.
- Agentix Projects (agentix-projects.com) is XoXoCom's own product, tagline "Train your AI Project-Agents". You work on your business idea together with an A.I. Consultant (execution & growth) and an A.I. Coach (process & support).
- In Agentix Projects you go station by station through your idea in the Transformation Concept, always see your progress, and finish with a complete concept including transformation costs.
- Every account has its own private agents — what you create, only you see. The A.I. gives every new project a fitting name and description.
- Agentix Projects is starting as a closed beta; registration works with a beta key. A free entry tier is planned; prices are announced at launch.
If the requested topic needs facts that are not listed, stay general and honest rather than making things up.

# LinkedIn craft — apply all of it
1. Hook: the first 1-2 lines (max ~140 characters) must stop the scroll before "…see more". Use a proven technique: curiosity gap, bold or contrarian statement, specific question, surprising confession, number/list promise, mini-story opener. No greetings, no "I'm excited to announce".
2. Re-hook: line 3 gives a reason to keep reading.
3. One core idea per post. Value for the reader first, product second.
4. Formatting: short paragraphs (1-2 sentences), lots of white space, line breaks, optional arrows or emojis as visual anchors (max ~5 emojis), easy to skim on mobile.
5. Structure frameworks to pick from: story arc (situation → tension → insight → result), PAS (problem → agitate → solution), AIDA, listicle with a promise, behind-the-scenes.
6. Concrete over abstract: a scene, an example, a before/after. No corporate jargon or buzzword salad.
7. End with a CTA that invites comments (a specific question works best) or a clear next step that fits the goal.
8. No external links in the post body (they cut reach) — put them in the suggested first comment instead.
9. 3-5 relevant hashtags at the very end, mixing broad and niche.
10. Length: about 700-1,400 characters unless the format asks for shorter.

# Output
- Write every post in the requested language (German posts use "du"-form unless the tone is professional, then "Sie" is allowed). Analysis texts are in the same language as the posts.
- Make the variants genuinely different (different hook technique and structure), not rewordings.
- Be an honest critic in the analysis: the score and improvements must be useful, not flattering.`;

const LABELS = {
  goal: {
    awareness: "brand awareness — people should remember XoXoCom and Sally",
    engagement: "engagement — comments and discussion",
    leads: "leads — people should contact XoXoCom about services or courses",
    beta: "beta sign-ups for Agentix Projects",
  },
  format: {
    story: "personal story",
    list: "list / tips",
    "behind-the-scenes": "behind the scenes of the team",
    announcement: "announcement / news",
    insight: "insight / opinion",
    question: "question to the community",
  },
} as const;

function userPrompt(r: GenerateRequest): string {
  return [
    `Write ${r.variants} LinkedIn post variant${r.variants > 1 ? "s" : ""}.`,
    `Topic: ${r.topic}`,
    `Goal: ${LABELS.goal[r.goal]}`,
    `Preferred format: ${LABELS.format[r.format]}`,
    `Tone: ${r.tone}`,
    `Language: ${r.language === "de" ? "German" : "English"}`,
    r.notes ? `Extra notes from the team: ${r.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export class SallyAgentError extends Error {
  constructor(
    public code: "refusal" | "truncated" | "invalid_output" | "auth" | "rate_limited" | "api",
    message: string,
  ) {
    super(message);
  }
}

export async function generatePosts(r: GenerateRequest): Promise<{ result: SallyGeneration; usage: { input: number; output: number } }> {
  const client = new Anthropic();
  let response;
  try {
    response = await client.messages.parse({
      model: SALLY_MODEL,
      max_tokens: 12000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(r) }],
      output_config: { format: zodOutputFormat(OutputSchema), effort: "medium" },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new SallyAgentError("auth", "The Anthropic API key was rejected.");
    if (err instanceof Anthropic.RateLimitError) throw new SallyAgentError("rate_limited", "Anthropic rate limit reached — try again in a minute.");
    if (err instanceof Anthropic.APIError) throw new SallyAgentError("api", `Anthropic API error ${err.status ?? ""}: ${err.message}`);
    throw err;
  }

  if (response.stop_reason === "refusal") throw new SallyAgentError("refusal", "The model declined this topic. Try rephrasing it.");
  if (response.stop_reason === "max_tokens") throw new SallyAgentError("truncated", "The answer was cut off. Try fewer variants.");
  if (!response.parsed_output) throw new SallyAgentError("invalid_output", "The model returned no usable result. Try again.");

  return {
    result: response.parsed_output,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}

/** Shown when no ANTHROPIC_API_KEY is configured, so the studio can be tried before the key exists. */
export function demoGeneration(r: GenerateRequest): SallyGeneration {
  const de = r.language === "de";
  const text = de
    ? `Ich bin eine A.I. – und ich schreibe diesen Post selbst. 🤖

Hi, ich bin Sally, die elektronische Assistentin der XoXoCom.

Warum es mich gibt?
Weil unser Team A.I. nicht nur berät, sondern selbst einsetzt.

Was du hier ab jetzt findest:
→ News zu Agentix Projects
→ Einblicke aus unserem Team
→ Wie A.I. Consultants Business-Ideen Schritt für Schritt umsetzen

Mein Versprechen: ehrlich, kurz und ohne Buzzword-Salat.

Und jetzt du: Was würdest du eine A.I.-Assistentin als Erstes fragen? 👇

#KünstlicheIntelligenz #AgentixProjects #AIConsulting #Startup`
    : `I'm an A.I. — and I wrote this post myself. 🤖

Hi, I'm Sally, the electronic assistant of XoXoCom.

Why do I exist?
Because our team doesn't just advise on A.I. — it uses it.

What you'll find here from now on:
→ News about Agentix Projects
→ Glimpses behind the scenes of our team
→ How A.I. consultants turn business ideas into reality, step by step

My promise: honest, short and no buzzword salad.

Your turn: what would you ask an A.I. assistant first? 👇

#ArtificialIntelligence #AgentixProjects #AIConsulting #Startups`;
  return {
    strategyNote: de
      ? "DEMO – kein ANTHROPIC_API_KEY gesetzt. Dieser Beispiel-Post zeigt, wie Ergebnis und Analyse aussehen. Mit API-Key schreibt Sally echte Varianten zu deinem Thema."
      : "DEMO — no ANTHROPIC_API_KEY set. This sample shows what a result and its analysis look like. With an API key Sally writes real variants for your topic.",
    posts: [
      {
        title: de ? "Sally stellt sich vor" : "Sally introduces herself",
        format: de ? "Vorstellung / Liste" : "Introduction / list",
        hook: text.split("\n")[0],
        hookType: de ? "Überraschendes Geständnis" : "Surprising confession",
        text,
        cta: de ? "Was würdest du eine A.I.-Assistentin als Erstes fragen?" : "What would you ask an A.I. assistant first?",
        hashtags: text.split("\n").pop()!.split(" "),
        structure: [
          { part: "Hook", excerpt: text.split("\n")[0], purpose: de ? "Paradox (A.I. schreibt über sich) stoppt den Scroll." : "The paradox (an A.I. writing about itself) stops the scroll." },
          { part: "Re-hook", excerpt: de ? "Hi, ich bin Sally …" : "Hi, I'm Sally …", purpose: de ? "Löst die Neugier auf und stellt die Absenderin vor." : "Resolves the curiosity and introduces the sender." },
          { part: "Value", excerpt: de ? "Was du hier ab jetzt findest" : "What you'll find here", purpose: de ? "Skimmbare Liste mit klarem Nutzen für Follower." : "Skimmable list with a clear benefit for followers." },
          { part: "CTA", excerpt: de ? "Und jetzt du …" : "Your turn …", purpose: de ? "Einfache, persönliche Frage senkt die Hürde zu kommentieren." : "An easy, personal question lowers the bar to comment." },
        ],
        analysis: {
          score: 8,
          engagement: "high",
          audience: de ? "Gründer:innen und Tech-Interessierte in der DACH-Region" : "Founders and tech-curious professionals in DACH",
          whyItWorks: de
            ? ["Der Hook ist ein Paradox und erzeugt sofort Neugier.", "Transparenz („ich bin eine A.I.“) schafft Vertrauen.", "Die Liste macht den Nutzen in 3 Sekunden erfassbar.", "Die Schlussfrage ist leicht zu beantworten → Kommentare."]
            : ["The hook is a paradox and creates instant curiosity.", "Transparency (“I'm an A.I.”) builds trust.", "The list makes the benefit clear in 3 seconds.", "The closing question is easy to answer → comments."],
          principles: ["Curiosity gap", "White space", "One core idea", "Comment CTA", "No link in body"],
          improvements: de
            ? ["Ein Bild von Sally erhöht die Verweildauer.", "In den ersten 60 Minuten auf jeden Kommentar antworten."]
            : ["An image of Sally increases dwell time.", "Reply to every comment in the first 60 minutes."],
          bestTime: de ? "Di–Do, 8–10 Uhr – B2B-Publikum liest vor dem ersten Meeting." : "Tue–Thu, 8–10 am — B2B readers scroll before their first meeting.",
          firstComment: de ? "Mehr über mich und Agentix Projects: xoxocom.net/sally" : "More about me and Agentix Projects: xoxocom.net/sally",
        },
      },
    ],
  };
}
