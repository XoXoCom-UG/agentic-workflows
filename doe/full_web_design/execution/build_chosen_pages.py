#!/usr/bin/env python3
"""Build the two chosen page directions as *content specs*: About = A3 (founder-led),
Press & Media = P2 (press kit first).

Round 1 (execution/build_page_prototypes.py) showed six layout options and filled them
with drafted prose so the layouts could be judged. This script is the follow-up and it
writes no copy at all. Every piece of text a human must supply renders as a slot showing
the template/formula from website-about-press-checklists.md plus a length spec. Only three
categories appear as real text:

  1. Facts verifiable in this repo — legal name, seat, register, Geschäftsführer, product
     name and URL, service names, team size (see sites/xoxocom/content/impressum.md and
     sites/xoxocom/lib/copy.ts).
  2. Wording the checklist itself dictates — the boilerplate formulae, the product-status
     phrasing, the who-to-quote split, the 24-hour reply line.
  3. Functional UI labels — button text, nav, field labels.

Layout CSS and the page chrome are imported from build_page_prototypes so the two files
cannot drift apart.

Usage:
    python execution/build_chosen_pages.py
    python execution/build_chosen_pages.py --out .tmp/chosen_pages

Outputs:
    .tmp/chosen_pages/index.html     standalone preview (open locally)
    .tmp/chosen_pages/artifact.html  body-only fragment (for publishing)

Deterministic and std-lib only.
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


# =========================================================================
# Slots — the only way text enters these pages
# =========================================================================

def slot(tag: str, template: str, spec: str = "", scale: str = "") -> str:
    """A block of copy somebody still has to write. Shows what goes there, the template,
    and how long it should be — never a guess at the actual words.

    `scale` ("hero" / "head") sets the template at headline size so the layout still reads
    at the right visual weight with the copy missing."""
    spec_html = f'<span class="slot-spec">{spec}</span>' if spec else ""
    cls = f"slot is-{scale}" if scale else "slot"
    return f"""<span class="{cls}">
            <span class="slot-tag">{tag}</span>
            <span class="slot-tpl">{template}</span>
            {spec_html}
          </span>"""


def val(label: str) -> str:
    """A single short value to confirm — a name, a year, a URL."""
    return f'<span class="ph">{label}</span>'


def fact(text: str) -> str:
    """Marks text that is verified in this repo, so it reads differently from a slot."""
    return f'<span class="ok">{text}</span>'


# --- templates lifted verbatim from the checklist appendix ----------------

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

# Verified facts, offered next to the boilerplate slot so the blanks can be filled
# without hunting through the repo.
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

# Service names are real (sites/xoxocom/lib/copy.ts); their one-liners are yours to write.
SERVICE_NAMES = ["AI Transformation", "Business Coaching", "Expert Consulting"]

# The checklist names these three differentiators outright: "AI-native, small team,
# build-it-ourselves". The keys below are its words; the copy is still yours.
HOW_KEYS = ["AI-native", "Build it ourselves", "Small team"]

# Roles the checklist assigns; names stay unconfirmed.
TEAM_SPEC = [
    {
        "initials": "PK",
        "name": fact(FOUNDER),
        "role_slot": val("Founder / CEO / Geschäftsführer — pick one, use it everywhere"),
        "bio_tag": "founder bio",
        "bio_tpl": "[ IT-consulting background · [X] years of experience · specialisation ]",
        "bio_spec": "2–3 sentences · checklist: “the formal-face implementation”",
    },
    {
        "initials": "—",
        "name": val("your full name, spelled as it should appear in print"),
        "role_slot": fact("AI engineering + marketing / workflows"),
        "bio_tag": "bio",
        "bio_tpl": "[ What you build and run, in your words ]",
        "bio_spec": "1–2 sentences",
    },
    {
        "initials": "—",
        "name": val("product lead — full name"),
        "role_slot": val("role title"),
        "bio_tag": "bio",
        "bio_tpl": "[ What they own on the product ]",
        "bio_spec": "1–2 sentences",
    },
]


# =========================================================================
# About — direction A3 (founder-led)
# =========================================================================

def about() -> str:
    services = "".join(
        f"""
              <div class="a3-svc">
                <h4>{fact(name)}</h4>
                {slot("one-liner", "[ what this does for a client ]", "1 line · ≤ 15 words")}
              </div>"""
        for name in SERVICE_NAMES
    )

    bands = ""
    for i, key in enumerate(HOW_KEYS):
        side = "is-right" if i % 2 else ""
        bands += f"""
            <div class="a3-band {side}">
              <div class="a3-band-mark"><span>{key}</span></div>
              <div class="a3-band-body">
                {slot("heading", "[ the claim, in your words ]", "≤ 6 words")}
                {slot("body", "[ why this is true of you specifically — the differentiator, said out loud ]",
                      "1–2 sentences")}
              </div>
            </div>"""

    team = "".join(
        f"""
            <div class="a3-card">
              {avatar(p['initials'], 'md')}
              <p class="a3-card-name">{p['name']}</p>
              <p class="a3-card-role">{p['role_slot']}</p>
              {slot(p['bio_tag'], p['bio_tpl'], p['bio_spec'])}
              <span class="a3-li">LinkedIn ↗ {val("profile URL")}</span>
            </div>"""
        for p in TEAM_SPEC
    )

    bank = "".join(
        f'<div class="bank-row"><span class="bank-k">{k}</span><span class="bank-v">{v}</span></div>'
        for k, v in FACT_BANK
    )

    return f"""
      <main class="a3">
        <section class="a3-hero">
          <div class="a3-hero-portrait">
            {avatar('PK', 'xl')}
            <p class="shot-note">{val("professional photo — founder")}</p>
          </div>
          <div class="a3-hero-copy">
            <p class="eyebrow">About</p>
            {slot("hero statement",
                  "[ One sentence: your position, or a founder quote a journalist could lift verbatim ]",
                  "≤ 20 words · first person if quoted · this is the whole hero, so it has to earn it",
                  scale="hero")}
            <p class="a3-attrib">{fact(FOUNDER)} · {TEAM_SPEC[0]['role_slot']}</p>
          </div>
        </section>

        <section class="a3-boiler">
          <div class="a3-boiler-inner">
            <span class="label">Boilerplate — 2–3 sentences, reused verbatim everywhere</span>
            <p class="formula">{BOILER_FORMULA}</p>
            <p class="formula-note">Checklist appendix offers four variants (straight / product-forward /
              angle-forward / ~100 words). Pick <b>one</b>, then use it word-for-word here, on the press
              page, on LinkedIn and in pitch emails. Only update it when a fact changes.</p>
            <div class="bank">
              <span class="label">Verified facts available to fill it</span>
              <div class="bank-rows">{bank}</div>
            </div>
          </div>
        </section>

        <section class="a3-sec a3-why">
          {slot("section heading", "[ heading for the why section ]", "≤ 8 words", scale="head")}
          {slot("why — the problem you saw",
                "[ The problem you saw that made this worth building. Warm tone, first person plural. ]",
                "1 short paragraph · ~60–90 words · checklist requirement")}
        </section>

        <section class="a3-sec a3-consulting">
          <h2 class="h2">What the consulting side does</h2>
          <p class="section-note">Checklist: business management + IT/AI consulting. Service names are
            live on the site today; the one-liners are yours to write.</p>
          <div class="a3-svcs">{services}</div>
        </section>

        <section class="a3-sec a3-bands">
          <h2 class="h2">How we work</h2>
          <p class="section-note">The three differentiators the checklist names. Keys are fixed;
            the wording is yours.</p>
          {bands}
        </section>

        <section class="a3-sec a3-product">
          <div>
            <span class="label">What we're building</span>
            <h2 class="h2">{fact(PRODUCT)}</h2>
            {slot("one-line product description",
                  "[ What it is, who it's for, in one line ]",
                  "≤ 25 words · must match the press page and the boilerplate exactly · "
                  "a version already exists in lib/copy.ts — reuse or replace it, don't fork it")}
            <div class="btn-row">
              <span class="btn">Join the waitlist</span>
              <span class="pill">In closed testing</span>
            </div>
            <p class="section-note">Waitlist target: {val("landing page / waitlist URL")} ·
              status wording is the checklist's own: “in closed testing with early developer feedback”.</p>
          </div>
          <div class="a3-product-frame">
            <span class="a3-screen"><em>product screenshot</em></span>
            <p class="shot-note">{val("2–3 captures of the real UI")}</p>
          </div>
        </section>

        <section class="a3-sec a3-team">
          <h2 class="h2">Meet the team</h2>
          <p class="section-note">Roles clear enough that a journalist can see who does what.</p>
          <div class="a3-cards">{team}</div>
        </section>

        <section class="a3-sec a3-cred">
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
              <p class="cred-real">{fact("In closed testing with early developer feedback.")}
                <span class="dim">— the checklist's approved wording. Nothing beyond this until there
                are real numbers.</span></p>
            </div>
          </div>
        </section>

        <section class="a3-sec a3-cta">
          <h2 class="h2">Want to learn more?</h2>
          {slot("CTA line", "[ one line inviting the next step ]", "optional · ≤ 15 words")}
          <div class="btn-row">
            <span class="btn">Get in touch</span>
            <span class="btn btn-ghost">Press &amp; Media</span>
          </div>
          <p class="a1-legal">{fact(LEGAL_NAME)} · {fact(CITY)} · <u>Impressum</u> · <u>Datenschutz</u></p>
          <p class="section-note">English version is live; German follows the existing language toggle.</p>
        </section>
      </main>"""


# =========================================================================
# Press & Media — direction P2 (press kit first)
# =========================================================================

PRESS_ASSETS = [
    ("Logo pack", "SVG + PNG, transparent, light &amp; dark", "logo", val("prepare files")),
    (f"{FOUNDER} — headshot", "High-res JPG, print quality", "portrait", val("photo needed")),
    (val("team member") + " — headshot", "High-res JPG, print quality", "portrait", val("photo needed")),
    (f"{PRODUCT} screenshots", "2–3 × PNG, product UI", "screen", val("captures needed")),
    (f"{PRODUCT} demo clip", "MP4, short, no audio", "video", val("optional")),
]

PRESS_FACTS = [
    ("Legal name", fact(LEGAL_NAME)),
    ("Founded", val("year")),
    ("Headquarters", fact(f"{CITY}, Germany")),
    ("Legal form", fact("UG (haftungsbeschränkt)")),
    ("Register", fact(REGISTER)),
    ("Team size", fact("3")),
    ("Product name", fact(PRODUCT) + ' <span class="dim">— confirm exact casing for print</span>'),
    ("Product status", fact("In closed testing with early developer feedback")),
    ("One-line description", val("same line as the About page and the boilerplate")),
    ("Website", fact(SITE_URL)),
]


def press() -> str:
    tiles = "".join(dl_tile(*a) for a in PRESS_ASSETS)
    facts = "".join(f'<div class="p2-fact"><dt>{k}</dt><dd>{v}</dd></div>' for k, v in PRESS_FACTS)
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
        for p in TEAM_SPEC
    )

    return f"""
      <main class="p2">
        <section class="p2-hero">
          <div class="p2-hero-copy">
            <p class="eyebrow">Press &amp; Media</p>
            <h1 class="h1">Press kit</h1>
            {slot("intro line",
                  "[ What's in the kit and how fast you reply ]",
                  "1–2 sentences · ≤ 30 words")}
            <div class="btn-row">
              <span class="btn btn-lg">Download press kit (.zip)</span>
              <span class="btn btn-ghost btn-lg">Email press contact</span>
            </div>
            <p class="p2-hero-meta">{val("file size")} · updated {val("date")} · {fact(LEGAL_NAME)}</p>
            <p class="section-note">Clean URL: <b>{SITE_URL}/press</b> · linked from the footer and from
              the About page · bookmark it, it goes in every pitch email.</p>
          </div>
          <div class="p2-hero-art" aria-hidden="true">
            <span class="p2-logo-tile is-dark"><span class="wordmark"><b>X</b>o<b>X</b>oCom</span></span>
            <span class="p2-logo-tile is-light"><span class="wordmark is-light"><b>X</b>o<b>X</b>oCom</span></span>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Individual assets</h2>
          <p class="section-note">Downloadable files, not embedded images. The zip above bundles all
            of these — build it last.</p>
          <div class="p2-tiles">{tiles}</div>
        </section>

        <section class="p2-split">
          <div>
            <h2 class="h2">Boilerplate</h2>
            <p class="section-note">Marked “for use in articles”. Identical to the About page and
              LinkedIn — same words, no variants.</p>
            {copy_block(BOILER_FORMULA, "Short — 2–3 sentences",
                        "Checklist formula. Fill once, then never paraphrase it.")}
            {copy_block(BOILER_LONG_FORMULA, "Long — ~100 words",
                        "For anyone who wants more than the short version.")}
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
            <p>{fact("Founder")} — business, consulting, company direction.
               {fact("AI engineering")} — AI engineering and building with AI.</p>
            <p class="dim">The checklist's own split. Third person, exact job titles, LinkedIn links
               next to each name.</p>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Topics we can speak to</h2>
          <p class="section-note">3–5 angles. This is the part that turns the page into an inbound
            podcast magnet, so it's worth writing properly.</p>
          <div class="p2-chips">{angles}</div>
        </section>

        <section class="p2-block">
          <div class="p2-contact">
            <div>
              <span class="label">Press contact</span>
              <p class="p2-contact-name">{val("you or the founder — decide now")}</p>
              <p class="p2-contact-mail">{val("press email address")}</p>
              <p class="p2-contact-note">{fact("Podcast and interview requests welcome. We usually reply within 24 hours.")}
                <span class="dim">— checklist wording; drop the promise if you can't keep it.</span></p>
            </div>
            <div class="btn-row"><span class="btn">Email press contact</span></div>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">As featured in</h2>
          <div class="empty">Empty by design — this fills up as reactive-PR quotes and podcast
            appearances land. Past appearances and published research get their own blocks later.</div>
        </section>
      </main>"""


# =========================================================================
# Extra CSS — the slot system and the blocks A3/P2 didn't have in round 1
# =========================================================================

EXTRA_CSS = """
/* ---------- slots: text somebody still has to write ---------- */
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

/* ---------- A3 additions ---------- */
#a3 .a3-hero-copy .slot{margin-bottom:16px}
#a3 .a3-boiler-inner{max-width:880px;margin:0 auto}
/* The round-1 boilerplate band centres its paragraph; a formula and its note read as
   left-aligned text, so override both (the centred rule targets `.a3-boiler p`). */
#a3 .a3-boiler p.formula,#a3 .a3-boiler p.formula-note{text-align:left;margin-left:0;margin-right:0}
#a3 .a3-consulting{padding-top:58px}
#a3 .a3-svcs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
#a3 .a3-svc{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  padding:16px}
#a3 .a3-svc h4{margin:0 0 10px;font-size:.95rem;font-weight:700}
#a3 .a3-cred{padding-top:58px}
#a3 .cred-rows{display:flex;flex-direction:column;gap:20px}
#a3 .cred-row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:22px;padding-top:16px;
  border-top:1px solid var(--border)}
#a3 .cred-real{margin:0;font-size:.94rem;line-height:1.65}
#a3 .a3-product-frame{position:relative}
#a3 .a3-product-frame .shot-note{position:absolute;left:0;right:0;bottom:-30px}
#a3 .a3-band-body .slot{margin-bottom:8px}
#a3 .a3-card .slot{margin-top:4px}

/* ---------- P2 additions ---------- */
#p2 .quote-split{margin-top:22px;border:1px solid var(--border);border-left:2px solid var(--accent);
  border-radius:var(--radius);background:var(--surface);padding:16px 18px}
#p2 .quote-split p{margin:9px 0 0;font-size:.92rem;line-height:1.6}
#p2 .p2-person-role{margin:2px 0 8px;font-size:.8rem;color:var(--accent);font-weight:600}
#p2 .p2-person .slot{margin-top:8px}
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
  #a3 .a3-svcs{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bank-rows{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:720px){
  #a3 .a3-svcs{grid-template-columns:minmax(0,1fr)}
  #a3 .cred-row{grid-template-columns:minmax(0,1fr);gap:10px}
}
"""


# =========================================================================
# Assembly
# =========================================================================

PAGES = [
    {
        "id": "a3", "tag": "About page", "name": "Founder-led",
        "note": "Portrait and a statement carry the hero, then the boilerplate band, why, what the "
                "consulting side does, the three differentiators, the product, the team, and credibility. "
                "Headings renamed as you asked: “Meet the team” and “Want to learn more?”.",
        "active": "About", "build": about,
    },
    {
        "id": "p2", "tag": "Press &amp; Media page", "name": "Press kit first",
        "note": "One prominent .zip download, the logo shown on both light and dark, individual assets, "
                "then the boilerplate formulae beside the fact table, who to talk to, topics, press "
                "contact, and an intentionally empty coverage block.",
        "active": "", "build": press,
    },
]


def page_section(p: dict) -> str:
    return f"""
    <section class="proto" id="{p['id']}">
      <div class="proto-head">
        <span class="tag">{p['tag']}</span>
        <h2>{p['name']}</h2>
        <p class="why">{p['note']}</p>
      </div>
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
    return f"""
  <div class="lab">
    <div class="lab-head">
      <p class="eyebrow">Chosen directions — content spec</p>
      <h1>About page &amp; Press / Media page</h1>
      <p>The two directions you picked, with the copy stripped out. Nothing on these pages is drafted
        prose: every text block is a slot showing what belongs there, the checklist's formula, and how
        long it should be.</p>
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
    </div>
    {pages}
  </div>"""


TITLE = "About &amp; Press — content spec — XoXoCom"


def full_document(body: str, style: str) -> str:
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>{TITLE}</title>\n<style>{style}</style>\n</head>\n<body>{body}\n"
        f"<script>{lab.JS}</script>\n</body>\n</html>\n"
    )


def fragment_document(body: str, style: str) -> str:
    return f"<title>{TITLE}</title>\n<style>{style}</style>\n{body}\n<script>{lab.JS}</script>\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="Build the two chosen page directions as content specs.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output directory")
    args = ap.parse_args()

    face = lab.manrope_face()
    style = lab.css(face) + EXTRA_CSS
    body = page_body()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(full_document(body, style), encoding="utf-8")
    (out / "artifact.html").write_text(fragment_document(body, style), encoding="utf-8")

    print("pages: " + ", ".join(p["id"] for p in PAGES))
    print("font: " + ("Manrope inlined from the Next build" if face else "system stack"))
    print(f"preview  -> {out / 'index.html'}")
    print(f"fragment -> {out / 'artifact.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
