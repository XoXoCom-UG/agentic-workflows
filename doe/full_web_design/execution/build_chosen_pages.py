#!/usr/bin/env python3
"""Build the two chosen page directions — About = A2 (company dossier), Press & Media = P2
(press kit first), i.e. Option 2 in both rounds of build_page_prototypes.py. The About page
keeps A2's layout but takes its closing CTA heading from A1 ("Tell us what you're trying to
change."), as the owner asked.

Two modes, same layouts:

  --mode present   (default) A clean prototype to show someone. No slots, no templates, no
                   process notes, no provenance — just the pages. Every sentence on them is
                   copy that is already live and approved on www.xoxocom.net (see LIVE COPY
                   below), or a fact from sites/xoxocom/content/impressum.md. Where a fact is
                   genuinely unknown (founding year, two of the three names, press-kit size
                   and date, a consulting track record) the element is left out rather than
                   filled with a guess — nothing on the page is invented.

  --mode spec      The internal content spec. Every text block a human must still supply
                   renders as a slot showing the checklist's own template and a length spec,
                   plus the notes and fact bank that say what is still needed. This is the
                   working document, not the thing you present.

The layout CSS and page chrome are imported from build_page_prototypes so the two files
cannot drift apart.

Usage:
    python execution/build_chosen_pages.py                      # presentation build
    python execution/build_chosen_pages.py --mode spec          # internal content spec
    python execution/build_chosen_pages.py --out .tmp/whatever

Outputs:
    <out>/index.html     standalone preview (open locally)
    <out>/artifact.html  body-only fragment (for publishing)

Deterministic and std-lib only (aside from importing the sibling script).
"""

from __future__ import annotations

import argparse
from pathlib import Path

import build_page_prototypes as lab

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / ".tmp" / "chosen_pages"

# Verified facts, re-exported from the round-1 module (single source).
COMPANY = lab.COMPANY
LEGAL_NAME = lab.LEGAL_NAME
CITY = lab.CITY
REGISTER = lab.REGISTER
FOUNDER = lab.FOUNDER
PRODUCT = lab.PRODUCT
PRODUCT_URL = lab.PRODUCT_URL
SITE_URL = lab.SITE_URL
EMAIL = lab.EMAIL

avatar = lab.avatar
chrome = lab.chrome
footer_bar = lab.footer_bar
copy_block = lab.copy_block
dl_tile = lab.dl_tile

# Set from --mode in main(). True = presentation build.
PRESENT = True


# =========================================================================
# LIVE COPY — every sentence below is already published on www.xoxocom.net
# (sites/xoxocom/lib/copy.ts, English tree) or verified in
# sites/xoxocom/content/impressum.md. Nothing here was written for these
# pages; it is the company's own approved wording, re-used.
# =========================================================================

HEADLINE = "People, methodology and A.I."                      # ueberUns.title
LEAD = ("We combine agile methodology with artificial intelligence — so teams and organizations "
        "work faster, smarter and measurably better.")          # home.heroSub

ABOUT_BODY = [                                                  # ueberUns.body
    ("We're a young team specialized in the business and technical consulting of A.I. implementation. "
     "We combine agile ways of working with artificial intelligence — and close the gap between "
     "technological innovation and human action."),
    ("Whether as a strategic partner for companies or a personal mentor for professionals: we empower "
     "people and organizations not just to keep up in the new world of work, but to lead — individual, "
     "disruptive and measurably superior."),
]

DELIBERATE_TITLE = "A.I. implementation, done deliberately"     # home.aboutTitle

SERVICES_LIVE = [                                               # nav labels + home.leistungen bodies
    ("A.I. Transformation",
     "Where classic agility reaches its limits, we combine methodology with the power of A.I. — into a "
     "measurably superior model for success."),
    ("Expert Consulting",
     "Specialists for your critical key roles — from Agile Coach to Software Architect, exactly when "
     "your project needs them."),
    ("Business Coaching",
     "We close the gap between innovation and people — as a strategic partner for your company and a "
     "mentor for your career."),
]

PRODUCT_TAGLINE = "Train your AI Project-Agents"                # produkte.products[0].tagline
PRODUCT_DESC = ("AI project-agents you train yourself, enriching every dev team with time savings, "
                "optimization ideas and guidance on innovations and market trends.")
PRODUCT_CTA = "Try it now"                                      # produkte.products[0].ctaLabel

REPLY = "We read every message and reply within one business day."   # kontakt.intro

# Assembled from the facts above and nothing else: legal name and seat (Impressum), the
# specialisation and framing (ueberUns.body), team size (site), the product and its
# description (produkte). No founding year, because it is not confirmed anywhere.
BOILER_SHORT = (
    "XoXoCom UG (haftungsbeschränkt) is a consultancy based in Monheim am Rhein, Germany, specialising "
    "in the business and technical side of A.I. implementation. The three-person team combines agile "
    "ways of working with artificial intelligence for companies and professionals, and builds Agentix "
    "Projects — A.I. project-agents that development teams train themselves."
)

BOILER_LONG = (
    "XoXoCom UG (haftungsbeschränkt) is a consultancy based in Monheim am Rhein, Germany. The "
    "three-person team specialises in the business and technical consulting of A.I. implementation, "
    "combining agile ways of working with artificial intelligence to close the gap between technological "
    "innovation and human action. Its client work spans three areas: A.I. Transformation for "
    "organisations, Expert Consulting that fills critical key roles with specialists, and Business "
    "Coaching for teams and individuals. Alongside that, the company builds Agentix Projects — A.I. "
    "project-agents that development teams train themselves, for time savings, optimisation ideas and "
    "guidance on innovations and market trends."
)

# The three differentiators. Each claim restates something the site already says or a fact
# from the Impressum — the team size, the combination of method and A.I., and the fact that
# the product is the company's own software.
HOW_LIVE = [
    ("Method and A.I. in one workflow",
     "Agile ways of working and artificial intelligence in the same workflow, not two separate "
     "conversations — that combination is the basis of everything we do."),
    ("We build our own product",
     f"{PRODUCT} is our own software, not a badge on someone else's platform. The team advising on "
     "implementation is the team building it."),
    ("Small enough to stay accountable",
     "Three people. The person you meet is the person who does the work."),
]

# Only one name is on the public record (Geschäftsführer, per the Impressum). The other two
# cards lead with the role instead of inventing a name.
TEAM_LIVE = [
    {"initials": "PK", "name": FOUNDER, "role": "Geschäftsführer",
     "line": "Business and technical consulting on A.I. implementation, and the direction of the company."},
    {"initials": "", "name": "", "role": "A.I. Engineering &amp; Marketing",
     "line": "Builds the A.I. workflows the company runs on, and the marketing around them."},
    {"initials": "", "name": "", "role": "Product Lead",
     "line": f"Leads {PRODUCT} — what it does, who it is for, and what ships next."},
]

FACTS_LIVE = [
    ("Legal name", LEGAL_NAME),
    ("Headquarters", f"{CITY}, Germany"),
    ("Legal form", "UG (haftungsbeschränkt)"),
    ("Register", REGISTER),
    ("Team size", "3"),
    ("Website", SITE_URL),
]

PRESS_INTRO = (f"Logos, headshots, product screenshots and a ready-to-use company description — "
               f"everything you need to write about {COMPANY} and {PRODUCT}. {REPLY}")

# Topic labels, each naming work the company actually does.
ANGLES_LIVE = [
    "Bringing A.I. into how a team works day to day",
    "Where classic agility reaches its limits",
    "Filling critical key roles with specialists",
    "Building your own A.I. product as a three-person consultancy",
]

QUOTE_SPLIT_LIVE = [
    ("Geschäftsführer", "the company, consulting engagements and direction"),
    ("A.I. Engineering", "building with A.I. and the workflows behind it"),
    ("Product Lead", f"{PRODUCT} — what it does and where it goes next"),
]


# =========================================================================
# Mode-aware helpers — the only way text enters these pages
# =========================================================================

def slot(tag: str, template: str, spec: str = "", scale: str = "", real: str | None = None) -> str:
    """In spec mode: a block of copy somebody still has to write, shown as its name, the
    checklist's template and a length spec — never a guess at the actual words.
    In presentation mode: the live, approved copy passed as `real`, or nothing at all if
    there is none, so an unknown never renders as a visible gap."""
    if PRESENT:
        if not real:
            return ""
        cls = f"copy is-{scale}" if scale else "copy"
        return f'<p class="{cls}">{real}</p>'
    spec_html = f'<span class="slot-spec">{spec}</span>' if spec else ""
    cls = f"slot is-{scale}" if scale else "slot"
    return f"""<span class="{cls}">
            <span class="slot-tag">{tag}</span>
            <span class="slot-tpl">{template}</span>
            {spec_html}
          </span>"""


def val(label: str, real: str = "") -> str:
    """A single short value: the thing to confirm in spec mode, the confirmed value (or
    nothing) in presentation mode."""
    if PRESENT:
        return real
    return f'<span class="ph">{label}</span>'


def fact(text: str) -> str:
    """Text verified in this repo. Marked in spec mode so it reads differently from a slot;
    plain copy in presentation mode."""
    return text if PRESENT else f'<span class="ok">{text}</span>'


def note(text: str, cls: str = "section-note") -> str:
    """Guidance for whoever fills the page in. Never present on a page meant to be shown."""
    return "" if PRESENT else f'<p class="{cls}">{text}</p>'


def spec_only(html: str) -> str:
    """A whole block that exists only to explain what is still needed."""
    return "" if PRESENT else html


# --- templates lifted verbatim from the checklist appendix (spec mode) ----

BOILER_FORMULA = (
    "[Company], founded in [year] and based in [city], is a [what kind of company] that "
    "[what you do] for [who]. The company is currently building [Product], a [one-line "
    "description] for [audience]. [Optional: one factual credibility line.]"
)

BOILER_LONG_FORMULA = (
    "[Company], founded in [year] in [city], Germany, is a [what kind of company] specialising in "
    "[specialisation]. Founded by [Founder name], who brings [X] years of experience in [field], the "
    "[N]-person team works as [how you work], building [what you build with AI]. The company is "
    "currently developing [Product], a [longer description] that supports [audience] through "
    "[what it does for them]. [Product] is [status]."
)

FACT_BANK = [
    ("Company", LEGAL_NAME),
    ("City", CITY),
    ("Register", REGISTER),
    ("Geschäftsführer", FOUNDER),
    ("Product", f"{PRODUCT} — {PRODUCT_URL}"),
    ("Team size", "3"),
    ("Website", SITE_URL),
    ("Contact", EMAIL),
]

SERVICE_NAMES = [name for name, _ in SERVICES_LIVE]
HOW_KEYS = ["AI-native", "Build it ourselves", "Small team"]

def team_spec() -> list[dict]:
  return [
    {
        "initials": "PK",
        "name": fact(FOUNDER),
        "role_slot": val("Founder / CEO / Geschäftsführer — pick one, use it everywhere", "Geschäftsführer"),
        "bio_tag": "founder bio",
        "bio_tpl": "[ IT-consulting background · [X] years of experience · specialisation ]",
        "bio_spec": "2–3 sentences · checklist: “the formal-face implementation”",
        "real": TEAM_LIVE[0]["line"],
    },
    {
        "initials": "AI",
        "name": val("your full name, spelled as it should appear in print"),
        "role_slot": fact("A.I. Engineering &amp; Marketing"),
        "bio_tag": "bio",
        "bio_tpl": "[ What you build and run, in your words ]",
        "bio_spec": "1–2 sentences",
        "real": TEAM_LIVE[1]["line"],
    },
    {
        "initials": "PL",
        "name": val("product lead — full name"),
        "role_slot": val("role title", "Product Lead"),
        "bio_tag": "bio",
        "bio_tpl": "[ What they own on the product ]",
        "bio_spec": "1–2 sentences",
        "real": TEAM_LIVE[2]["line"],
    },
  ]


# =========================================================================
# About — direction A2 (company dossier)
# =========================================================================

RAIL = ["Company", "People", "How we work", "Contact"]


def about() -> str:
    rail = "".join(
        f'<span class="a2-rail-item{" is-active" if i == 0 else ""}">{n}</span>'
        for i, n in enumerate(RAIL)
    )

    services = "".join(
        f"""
                <div class="a2-svc">
                  <h4>{fact(name)}</h4>
                  {slot("one-liner", "[ what this does for a client ]", "1 line · &le; 15 words", real=line)}
                </div>"""
        for name, line in SERVICES_LIVE
    )

    hows = ""
    for i, key in enumerate(HOW_KEYS):
        head, body = HOW_LIVE[i]
        label = "" if PRESENT else f'<span class="label">{key}</span>'
        hows += f"""
              <div class="a2-how">
                {label}
                {slot("heading", "[ the claim, in your words ]", "&le; 6 words", scale="head", real=head)}
                {slot("body", "[ why this is true of you specifically — the differentiator, said out loud ]",
                      "1–2 sentences", real=body)}
              </div>"""

    if PRESENT:
        people = "".join(
            f"""
              <article class="card a2-person">
                {avatar(p['initials'], 'md')}
                {f'<h3>{p["name"]}</h3>' if p['name'] else ''}
                <p class="a2-role{'' if p['name'] else ' is-lead'}">{p['role']}</p>
                <p class="copy">{p['line']}</p>
              </article>"""
            for p in TEAM_LIVE
        )
    else:
        people = "".join(
            f"""
              <article class="card a2-person">
                {avatar(p['initials'], 'md')}
                <h3>{p['name']}</h3>
                <p class="a2-role">{p['role_slot']}</p>
                {slot(p['bio_tag'], p['bio_tpl'], p['bio_spec'])}
                <span class="a2-li">LinkedIn ↗ {val("profile URL")}</span>
              </article>"""
            for p in team_spec()
        )

    facts = "".join(
        f'<div class="a2-fact"><dt>{k}</dt><dd>{v}</dd></div>'
        for k, v in (FACTS_LIVE if PRESENT else
                     [("Legal name", fact(LEGAL_NAME)), ("Founded", val("year")),
                      ("Headquarters", fact(f"{CITY}, Germany")), ("Register", fact(REGISTER)),
                      ("Team size", fact("3")), ("Website", fact(SITE_URL))])
    )

    bank = "".join(
        f'<div class="bank-row"><span class="bank-k">{k}</span><span class="bank-v">{v}</span></div>'
        for k, v in FACT_BANK
    )

    headline = (f'<h1 class="h1">{HEADLINE}</h1>' if PRESENT else
                slot("page headline", "[ What this company is, in one line a journalist could reuse ]",
                     "&le; 8 words · a page title, not a sentence", scale="hero"))

    lead = f'<p class="a2-lead">{LEAD}</p>' if PRESENT else ""

    # In presentation mode the boilerplate is simply the company's opening statement; the
    # "reuse this verbatim" label and the formula belong to the spec.
    boiler = f"""
              <div class="a2-boiler">
                {spec_only('<span class="label">Boilerplate — 2–3 sentences, reused verbatim everywhere</span>')}
                <p class="formula">{BOILER_SHORT if PRESENT else BOILER_FORMULA}</p>
                {note("Checklist appendix offers four variants (straight / product-forward / angle-forward / "
                      "~100 words). Pick <b>one</b>, then use it word-for-word here, on the press page, on "
                      "LinkedIn and in pitch emails. Only update it when a fact changes.", cls="formula-note")}
                {spec_only(f'''<div class="bank">
                  <span class="label">Verified facts available to fill it</span>
                  <div class="bank-rows">{bank}</div>
                </div>''')}
              </div>"""

    why_title = DELIBERATE_TITLE if PRESENT else "Why we built it"
    why_body = ("".join(f'<p class="copy">{para}</p>' for para in ABOUT_BODY) if PRESENT else
                slot("why — the problem you saw",
                     "[ The problem you saw that made this worth building. Warm tone, first person plural. ]",
                     "1 short paragraph · ~60–90 words · checklist requirement"))

    product_side = f"""
                <div class="a2-product-side">
                  {'' if PRESENT else '<span class="pill">In closed testing</span>'}
                  <span class="a2-link">{fact(PRODUCT_URL)} ↗</span>
                  <span class="a2-screen"><em>product screenshot</em></span>
                  {note(val("2–3 captures of the real UI"), cls="shot-note")}
                </div>"""

    credibility = spec_only(f"""
            <section class="a2-block">
              <h2 class="h2">Credibility</h2>
              <p class="section-note">Honest only. No invented user or revenue numbers, no unverifiable
                superlatives, and the developer tester is not named without explicit permission.</p>
              <div class="cred-rows">
                <div class="cred-row">
                  <span class="label">Consulting track record</span>
                  {slot("track record",
                        "[ years active · types of clients · client logos only where permission is granted ]",
                        "1–2 lines · names on request is a valid answer")}
                </div>
                <div class="cred-row">
                  <span class="label is-brand">{PRODUCT}</span>
                  <p class="cred-real">In closed testing with early developer feedback.
                    <span class="dim">— the checklist's approved wording. Nothing beyond this until there
                    are real numbers.</span></p>
                </div>
              </div>
              <p class="a2-foot-note">Client names on request; logos published only with written
                permission. No user or revenue figures until there are audited ones.</p>
            </section>""")

    return f"""
      <main class="a2">
        <div class="a2-grid">
          <aside class="a2-rail">
            <p class="label">On this page</p>
            {rail}
            <div class="a2-rail-cta"><span class="btn btn-sm">Get in touch</span></div>
          </aside>

          <div class="a2-body">
            <section>
              <p class="eyebrow">About</p>
              {headline}
              {lead}
              {boiler}
            </section>

            <section class="a2-block">
              <h2 class="h2">What we do</h2>
              {note("Checklist: business management + IT/AI consulting. Service names are live on the "
                    "site today; the one-liners are yours to write.")}
              <div class="a2-svcs">{services}</div>
              <div class="a2-product">
                <div>
                  <span class="label">What we're building</span>
                  <h3>{fact(PRODUCT)}</h3>
                  {f'<p class="a2-tagline">{PRODUCT_TAGLINE}</p>' if PRESENT else ''}
                  {slot("one-line product description", "[ What it is, who it's for, in one line ]",
                        "&le; 25 words · must match the press page and the boilerplate exactly · "
                        "a version already exists in lib/copy.ts — reuse or replace it, don't fork it",
                        real=PRODUCT_DESC)}
                  <div class="btn-row">
                    <span class="btn btn-ghost">{PRODUCT_CTA if PRESENT else 'Join the waitlist'}</span>
                  </div>
                  {note(f'Waitlist target: {val("landing page / waitlist URL")} · status wording is the '
                        f'checklist\'s own: “in closed testing with early developer feedback”.')}
                </div>
                {product_side}
              </div>
            </section>

            <section class="a2-block">
              <h2 class="h2">{why_title}</h2>
              {why_body}
            </section>

            <section class="a2-block">
              <h2 class="h2">Meet the team</h2>
              {note("Three equal cards — roles clear enough that a journalist can see who does what.")}
              <div class="a2-people">{people}</div>
            </section>

            <section class="a2-block">
              <h2 class="h2">How we work</h2>
              {note("The three differentiators the checklist names. Keys are fixed; the wording is yours.")}
              <div class="a2-hows">{hows}</div>
            </section>

            <section class="a2-block">
              <h2 class="h2">Company facts</h2>
              {note("The same table the press page carries — one set of numbers, two places, no variants.")}
              <dl class="a2-facts">{facts}</dl>
            </section>
            {credibility}

            <section class="a2-block a2-end">
              <h2 class="h2">Tell us what you're trying to change.</h2>
              <div class="btn-row">
                <span class="btn">Get in touch</span>
                <span class="btn btn-ghost">Press &amp; Media</span>
                <span class="btn btn-ghost">Join the {PRODUCT} waitlist</span>
              </div>
              {note(f"Three exits: talk to us, take the press kit, or join the product waitlist. The "
                    f"waitlist button links to {PRODUCT_URL} — the product was renamed to {PRODUCT}, "
                    f"the domain was not.")}
            </section>
            {spec_only(f'<p class="a2-legal">{LEGAL_NAME} · {CITY} · <u>Impressum</u> · <u>Datenschutz</u></p>')}
            {note("English version is live; German follows the existing language toggle.")}
          </div>
        </div>
      </main>"""


# =========================================================================
# Press & Media — direction P2 (press kit first)
# =========================================================================

PRESS_ASSETS_LIVE = [
    ("Logo pack", "SVG + PNG, transparent, light &amp; dark", "logo"),
    (f"{FOUNDER} — headshot", "High-res JPG, print quality", "portrait"),
    ("Team headshots", "High-res JPG, print quality", "portrait"),
    (f"{PRODUCT} screenshots", "PNG, product UI", "screen"),
    (f"{PRODUCT} demo clip", "MP4, short, no audio", "video"),
]

def press_assets_spec() -> list[tuple]:
  return [
    ("Logo pack", "SVG + PNG, transparent, light &amp; dark", "logo", val("prepare files")),
    (f"{FOUNDER} — headshot", "High-res JPG, print quality", "portrait", val("photo needed")),
    (val("team member") + " — headshot", "High-res JPG, print quality", "portrait", val("photo needed")),
    (f"{PRODUCT} screenshots", "2–3 × PNG, product UI", "screen", val("captures needed")),
    (f"{PRODUCT} demo clip", "MP4, short, no audio", "video", val("optional")),
  ]

PRESS_FACTS_LIVE = [
    ("Legal name", LEGAL_NAME),
    ("Headquarters", f"{CITY}, Germany"),
    ("Legal form", "UG (haftungsbeschränkt)"),
    ("Register", REGISTER),
    ("Team size", "3"),
    ("Product name", PRODUCT),
    ("One-line description", PRODUCT_DESC),
    ("Website", SITE_URL),
]

def press_facts_spec() -> list[tuple]:
  return [
    ("Legal name", fact(LEGAL_NAME)),
    ("Founded", val("year")),
    ("Headquarters", fact(f"{CITY}, Germany")),
    ("Legal form", fact("UG (haftungsbeschränkt)")),
    ("Register", fact(REGISTER)),
    ("Team size", fact("3")),
    ("Product name", fact(PRODUCT) + ' <span class="dim">— renamed from MAtfIT; domain still matfit.ai</span>'),
    ("Product status", fact("In closed testing with early developer feedback")),
    ("One-line description", val("same line as the About page and the boilerplate")),
    ("Website", fact(SITE_URL)),
  ]


def press() -> str:
    tiles = "".join(dl_tile(t, m, k, "") for t, m, k in PRESS_ASSETS_LIVE) if PRESENT else \
            "".join(dl_tile(*a) for a in press_assets_spec())

    facts = "".join(f'<div class="p2-fact"><dt>{k}</dt><dd>{v}</dd></div>'
                    for k, v in (PRESS_FACTS_LIVE if PRESENT else press_facts_spec()))

    if PRESENT:
        angles = "".join(f'<span class="p2-chip">{a}</span>' for a in ANGLES_LIVE)
        people = "".join(
            f"""
            <div class="p2-person">
              {avatar(p['initials'], 'sm')}
              <div>
                {f'<p class="p2-person-name">{p["name"]}</p>' if p['name'] else ''}
                <p class="p2-person-role{'' if p['name'] else ' is-lead'}">{p['role']}</p>
                <p class="copy">{p['line']}</p>
              </div>
            </div>"""
            for p in TEAM_LIVE
        )
        quote_split = "".join(
            f'<p class="quote-line"><b>{who}</b> — {what}.</p>' for who, what in QUOTE_SPLIT_LIVE
        )
        hero_meta = f'<p class="p2-hero-meta">{LEGAL_NAME} · {CITY}</p>'
    else:
        angles = "".join(
            f'<span class="p2-chip">{val(f"angle {i} — suggested topic")}</span>' for i in range(1, 5)
        )
        people = "".join(
            f"""
            <div class="p2-person">
              {avatar(p['initials'], 'sm')}
              <div>
                <p class="p2-person-name">{p['name']}</p>
                <p class="p2-person-role">{p['role_slot']}</p>
                {slot("bio for attribution", "[ one sentence, third person ]", "journalists paste this as-is")}
              </div>
            </div>"""
            for p in team_spec()
        )
        quote_split = ('<p>Founder — business, consulting, company direction. A.I. engineering — AI '
                       'engineering and building with AI.</p>'
                       '<p class="dim">The checklist\'s own split. Third person, exact job titles, '
                       'LinkedIn links next to each name.</p>')
        hero_meta = (f'<p class="p2-hero-meta">{val("file size")} · updated {val("date")} · '
                     f'{fact(LEGAL_NAME)}</p>')

    intro = slot("intro line", "[ What's in the kit and how fast you reply ]",
                 "1–2 sentences · &le; 30 words", real=PRESS_INTRO)

    featured = spec_only("""
        <section class="p2-block">
          <h2 class="h2">As featured in</h2>
          <div class="empty">Empty by design — this fills up as reactive-PR quotes and podcast
            appearances land. Past appearances and published research get their own blocks later.</div>
        </section>""")

    return f"""
      <main class="p2">
        <section class="p2-hero">
          <div class="p2-hero-copy">
            <p class="eyebrow">Press &amp; Media</p>
            <h1 class="h1">Press kit</h1>
            {intro}
            <div class="btn-row">
              <span class="btn btn-lg">Download press kit (.zip)</span>
              <span class="btn btn-ghost btn-lg">Email press contact</span>
            </div>
            {hero_meta}
            {note(f"Clean URL: <b>{SITE_URL}/press</b> · linked from the footer and from the About page · "
                  f"bookmark it, it goes in every pitch email.")}
          </div>
          <div class="p2-hero-art" aria-hidden="true">
            <span class="p2-logo-tile is-dark"><span class="wordmark"><b>X</b>o<b>X</b>oCom</span></span>
            <span class="p2-logo-tile is-light"><span class="wordmark is-light"><b>X</b>o<b>X</b>oCom</span></span>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Individual assets</h2>
          {note("Downloadable files, not embedded images. The zip above bundles all of these — build "
                "it last.")}
          <div class="p2-tiles">{tiles}</div>
        </section>

        <section class="p2-split">
          <div>
            <h2 class="h2">{"About the company" if PRESENT else "Boilerplate"}</h2>
            {note("Marked “for use in articles”. Identical to the About page and LinkedIn — same words, "
                  "no variants.")}
            {copy_block(BOILER_SHORT if PRESENT else BOILER_FORMULA,
                        "Short version" if PRESENT else "Short — 2–3 sentences",
                        "" if PRESENT else "Checklist formula. Fill once, then never paraphrase it.")}
            {copy_block(BOILER_LONG if PRESENT else BOILER_LONG_FORMULA,
                        "Long version — ~100 words" if PRESENT else "Long — ~100 words",
                        "" if PRESENT else "For anyone who wants more than the short version.")}
          </div>
          <div>
            <h2 class="h2">The facts</h2>
            <dl class="p2-facts">{facts}</dl>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Who to talk to</h2>
          <div class="p2-people">{people}</div>
          <div class="quote-split">
            <span class="label">Who to quote for what</span>
            {quote_split}
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Topics we can speak to</h2>
          {note("3–5 angles. This is the part that turns the page into an inbound podcast magnet, so "
                "it's worth writing properly.")}
          <div class="p2-chips">{angles}</div>
        </section>

        <section class="p2-block">
          <div class="p2-contact">
            <div>
              <span class="label">Press contact</span>
              <p class="p2-contact-name">{val("you or the founder — decide now", COMPANY)}</p>
              <p class="p2-contact-mail">{val("press email address", EMAIL)}</p>
              <p class="p2-contact-note">Podcast and interview requests welcome. {REPLY}</p>
            </div>
            <div class="btn-row"><span class="btn">Email press contact</span></div>
          </div>
        </section>
        {featured}
      </main>"""


# =========================================================================
# Extra CSS — the slot system, presentation copy, and the blocks A2/P2
# didn't have in round 1
# =========================================================================

EXTRA_CSS = """
/* ---------- slots: text somebody still has to write (spec mode) ---------- */
.slot{display:block;border:1px dashed rgba(251,107,76,.42);border-radius:10px;
  background:rgba(251,107,76,.045);padding:11px 13px;margin:0 0 4px}
.slot-tag{display:block;font-size:.6rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--accent);margin-bottom:6px}
.slot-tpl{display:block;font-size:.95rem;line-height:1.55;color:#d8b3a7}
.slot-spec{display:block;margin-top:7px;font-size:.74rem;line-height:1.5;color:var(--muted)}
.ok{color:var(--fg)}
/* Headline-scale slots keep the layout's visual weight while the copy is missing. */
.slot.is-hero .slot-tpl{font-size:clamp(1.35rem,2.3vw,2.05rem);line-height:1.22;
  letter-spacing:-.02em;font-weight:700}
.slot.is-head .slot-tpl{font-size:clamp(1.15rem,1.6vw,1.45rem);line-height:1.25;
  letter-spacing:-.015em;font-weight:700}
.formula{margin:9px 0 0;font-size:1rem;line-height:1.6;color:#d8b3a7}
.formula-note{margin:12px 0 0;font-size:.8rem;line-height:1.6;color:var(--muted);max-width:70ch}
.formula-note b{color:var(--fg)}
.section-note{margin:-4px 0 16px;font-size:.8rem;line-height:1.6;color:var(--muted);max-width:76ch}
.section-note b{color:var(--fg)}
.shot-note{margin:10px 0 0;font-size:.74rem;line-height:1.5;color:var(--muted);text-align:center}
.bank{margin-top:18px;border-top:1px solid var(--border);padding-top:14px}
.bank-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 24px;margin-top:10px}
.bank-row{display:flex;gap:10px;font-size:.82rem;padding:3px 0}
.bank-k{color:var(--muted);flex:none;min-width:118px}
.bank-v{color:var(--fg)}
.tile-status:empty{display:none}

/* ---------- copy (presentation mode) ---------- */
.copy{margin:0 0 12px;font-size:.98rem;line-height:1.72;color:var(--muted);max-width:70ch}
.copy:last-child{margin-bottom:0}
.copy.is-head{margin:0 0 8px;font-size:1.06rem;line-height:1.3;letter-spacing:-.01em;
  font-weight:700;color:var(--fg)}

/* ---------- A2 ---------- */
#a2 .a2-lead{margin:14px 0 24px;font-size:1.12rem;line-height:1.6;color:var(--fg);max-width:62ch}
#a2 .a2-boiler p.formula{font-size:1rem;line-height:1.68;color:var(--fg)}
#a2 .a2-boiler p.formula-note{font-size:.8rem;line-height:1.6;color:var(--muted)}
#a2 .a2-body .slot.is-hero{margin:4px 0 22px}
#a2 .a2-svc .slot,#a2 .a2-svc .copy{margin:0}
#a2 .a2-svc .slot-tpl,#a2 .a2-svc .copy{font-size:.86rem;line-height:1.6}
#a2 .a2-product{align-items:flex-start}
#a2 .a2-product .slot,#a2 .a2-product .copy{margin:8px 0 0;max-width:52ch}
#a2 .a2-tagline{margin:2px 0 10px;font-size:.84rem;font-weight:600;color:var(--accent)}
#a2 .a2-product .btn-row{margin-top:16px}
/* `.section-note` carries a negative top margin for sitting under a heading; under the
   product slot it needs a positive one or the two blocks collide. */
#a2 .a2-product .section-note{margin:12px 0 0}
#a2 .a2-product-side{align-items:flex-end;max-width:250px}
#a2 .a2-screen{display:flex;align-items:center;justify-content:center;width:100%;height:104px;
  border:1px dashed var(--border);border-radius:10px;background:var(--bg)}
#a2 .a2-screen em{font-style:normal;font-size:.74rem;color:var(--muted)}
#a2 .a2-product-side .shot-note{margin:8px 0 0;text-align:right}
#a2 .a2-person .slot{margin:0}
#a2 .a2-person .copy{margin:0;font-size:.88rem;line-height:1.65}
#a2 .a2-role.is-lead{margin:14px 0 8px;font-size:1rem;font-weight:700;color:var(--fg)}
/* The round-1 `.a2-how h3` carried the accent top rule; presentation mode has no h3 there,
   so the rule moves onto the column itself. */
#a2 .a2-how{padding-top:14px;border-top:2px solid var(--accent)}
#a2 .a2-how .label{display:block;margin-bottom:9px}
#a2 .a2-how .slot{margin-bottom:8px}
#a2 .cred-rows{display:flex;flex-direction:column;gap:20px}
#a2 .cred-row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:22px;padding-top:16px;
  border-top:1px solid var(--border)}
#a2 .cred-real{margin:0;font-size:.94rem;line-height:1.65}
/* Round F's `.a2-end` is a heading-left / buttons-right flex row; the closing CTA stacks. */
#a2 .a2-end{display:block}
#a2 .a2-end .btn-row{margin-top:22px}
#a2 .a2-end .section-note{margin-top:16px}
#a2 .a2-legal{margin:34px 0 0;font-size:.78rem;color:var(--muted)}
#a2 .a2-legal + .section-note{margin-top:10px}

/* ---------- P2 ---------- */
#p2 .quote-split{margin-top:22px;border:1px solid var(--border);border-left:2px solid var(--accent);
  border-radius:var(--radius);background:var(--surface);padding:16px 18px}
#p2 .quote-split p{margin:9px 0 0;font-size:.92rem;line-height:1.6}
#p2 .quote-line b{color:var(--fg);font-weight:700}
#p2 .p2-person-role{margin:2px 0 8px;font-size:.8rem;color:var(--accent);font-weight:600}
#p2 .p2-person-role.is-lead{margin:0 0 8px;font-size:.95rem;color:var(--fg);font-weight:700}
#p2 .p2-person .slot{margin-top:8px}
#p2 .p2-person .copy{margin:0;font-size:.86rem;line-height:1.65}
#p2 .p2-hero .copy{max-width:56ch}
#p2 .p2-contact{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;
  border:1px solid var(--border);border-left:2px solid var(--accent);border-radius:var(--radius);
  background:var(--surface);padding:24px}
#p2 .p2-contact-name{margin:10px 0 6px;font-size:1.1rem;font-weight:700;line-height:1.4}
#p2 .p2-contact-mail{margin:0 0 10px;font-size:.95rem;font-weight:600}
#p2 .p2-contact-note{margin:0;font-size:.86rem;color:var(--muted);line-height:1.6;max-width:56ch}
#p2 .p2-chips .ph{font-size:.86rem}
/* .section-note carries a negative top margin for use under a heading; under the hero
   meta line it needs a positive one or the two lines collide. */
#p2 .p2-hero .section-note{margin-top:12px}

@media (max-width:1080px){
  .bank-rows{grid-template-columns:minmax(0,1fr)}
  #a2 .a2-product{flex-direction:column}
  #a2 .a2-product-side{align-items:flex-start;max-width:none}
  #a2 .a2-product-side .shot-note{text-align:left}
}
@media (max-width:720px){
  #a2 .cred-row{grid-template-columns:minmax(0,1fr);gap:10px}
}
"""


# =========================================================================
# Assembly
# =========================================================================

PAGES = [
    {
        "id": "a2", "tag": "About page", "name": "Company dossier",
        "note": "A section rail, a headline slot, then the boilerplate labelled as reusable, what we do "
                "with the product beside it, why we built it, three equal team cards, the three "
                "differentiators, the fact table, credibility, and the closing CTA. The closing heading "
                "is Option 1's — “Tell us what you're trying to change.” — as you asked, in place of "
                "Option 2's original “Work with us”.",
        "active": "About", "build": about,
    },
    {
        "id": "p2", "tag": "Press &amp; Media page", "name": "Press kit first",
        "note": "One prominent .zip download, the logo shown on light and dark, individual assets, "
                "then the boilerplate formulae beside the fact table, who to talk to, topics, press "
                "contact, and an intentionally empty coverage block.",
        "active": "", "build": press,
    },
]


def page_section(p: dict) -> str:
    head = f"""
      <div class="proto-head">
        <span class="tag">{p['tag']}</span>
        {'' if PRESENT else f"<h2>{p['name']}</h2>"}
        {note(p['note'], cls="why")}
      </div>"""
    return f"""
    <section class="proto" id="{p['id']}">
      {head}
      <div class="frame">
        <div class="page" data-page="{p['id']}">
          {chrome(p['active'])}
          {p['build']()}
          {footer_bar(True)}
        </div>
      </div>
    </section>"""


def page_body() -> str:
    pages = "".join(page_section(p) for p in PAGES)
    if PRESENT:
        head = """
    <div class="lab-head">
      <p class="eyebrow">Prototype</p>
      <h1>About page &amp; Press / Media page</h1>
      <p>Two new pages for xoxocom.net, shown at full width in the site's own header, footer and
        type.</p>
    </div>"""
    else:
        head = f"""
    <div class="lab-head">
      <p class="eyebrow">Chosen directions — content spec</p>
      <h1>About page &amp; Press / Media page</h1>
      <p><b>Option 2 on both</b>: About = “Company dossier”, Press &amp; Media = “Press kit first”. The
        one change to Option 2's About page is its closing call to action — it now uses Option 1's
        heading, “Tell us what you're trying to change.”, instead of “Work with us”.</p>
      <p>Both pages have the copy stripped out. Nothing here is drafted prose: every text block is a slot
        showing what belongs there, the checklist's formula, and how long it should be.</p>
      <div class="legend">
        <span><span class="slot-tag" style="display:inline">dashed block</span> = you write this; the
          template and length are given</span>
        <span>·</span>
        <span><span class="ph">like this</span> = one value to confirm</span>
        <span>·</span>
        <span>Plain white text = verified in this repo, or wording the checklist itself dictates</span>
      </div>
      <p>Verified from <code>content/impressum.md</code> and <code>lib/copy.ts</code>: legal name, seat,
        register, Geschäftsführer, {PRODUCT} and its URL, the three service names, team size. Everything
        else is a blank.</p>
    </div>"""
    return f"""
  <div class="lab">
    {head}
    {pages}
  </div>"""


def title() -> str:
    return "XoXoCom Dossier &amp; Press Kit"


def full_document(body: str, style: str) -> str:
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>{title()}</title>\n<style>{style}</style>\n</head>\n<body>{body}\n"
        f"<script>{lab.JS}</script>\n</body>\n</html>\n"
    )


def fragment_document(body: str, style: str) -> str:
    return f"<title>{title()}</title>\n<style>{style}</style>\n{body}\n<script>{lab.JS}</script>\n"


def main() -> int:
    global PRESENT
    ap = argparse.ArgumentParser(description="Build the two chosen page directions.")
    ap.add_argument("--mode", choices=("present", "spec"), default="present",
                    help="present = clean prototype to show (default); spec = internal content spec")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output directory")
    args = ap.parse_args()

    PRESENT = args.mode == "present"

    face = lab.manrope_face()
    style = lab.css(face) + EXTRA_CSS
    body = page_body()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(full_document(body, style), encoding="utf-8")
    (out / "artifact.html").write_text(fragment_document(body, style), encoding="utf-8")

    print(f"mode:  {args.mode}")
    print("pages: " + ", ".join(p["id"] for p in PAGES))
    print("font:  " + ("Manrope inlined from the Next build" if face else "system stack"))
    print(f"preview  -> {out / 'index.html'}")
    print(f"fragment -> {out / 'artifact.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
