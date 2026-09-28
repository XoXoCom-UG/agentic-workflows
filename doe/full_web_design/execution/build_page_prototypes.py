#!/usr/bin/env python3
"""Build side-by-side design prototypes for new XoXoCom pages, so a direction can be
chosen before any Next.js route is written.

Currently ships six prototypes — three for the About page, three for a new Press &
Media page — each driven by the checklists in website-about-press-checklists.md and
painted with the site's real design tokens (sites/xoxocom/app/globals.css) and the
site's real typeface (Manrope, inlined as a data URI from the Next build output, so
the preview needs no network access).

Facts that are already known (legal name, seat, register, Geschäftsführer, product)
are rendered as real content. Everything still unconfirmed renders as a visually
marked placeholder, so the gaps are impossible to miss.

Usage:
    python execution/build_page_prototypes.py
    python execution/build_page_prototypes.py --out .tmp/page_prototypes

Outputs:
    .tmp/page_prototypes/index.html     standalone preview (open locally)
    .tmp/page_prototypes/artifact.html  body-only fragment (for publishing)

Deterministic and std-lib only.
"""

from __future__ import annotations

import argparse
import base64
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = REPO_ROOT / "sites" / "xoxocom"
DEFAULT_OUT = REPO_ROOT / ".tmp" / "page_prototypes"

# --- design tokens (mirrors sites/xoxocom/app/globals.css) ----------------
BG = "#0b0e11"
FG = "#eaecef"
MUTED = "#8c8f92"
SURFACE = "#1e2329"
BORDER = "#2b3139"
ACCENT = "#fb6b4c"
ACCENT_FG = "#ffffff"
RADIUS = "0.75rem"


# =========================================================================
# Font — inline the site's own Manrope subset so the prototypes are faithful
# =========================================================================

def manrope_face() -> str:
    """Return an @font-face rule with Manrope inlined, or "" if the Next build
    output isn't present (then the prototypes fall back to the system stack)."""
    media = SITE_DIR / ".next" / "static" / "media"
    # `-s.p.woff2` is the preloaded latin subset; Manrope ships as a variable font,
    # so one file covers the whole 200–800 weight range the site uses.
    hits = sorted(media.glob("*-s.p.woff2")) if media.is_dir() else []
    if not hits:
        return ""
    b64 = base64.b64encode(hits[0].read_bytes()).decode("ascii")
    return (
        "@font-face{font-family:'Manrope';font-style:normal;font-weight:200 800;"
        f"font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
    )


# =========================================================================
# Content — real where confirmed, marked placeholders where not
# =========================================================================

COMPANY = "XoXoCom UG"
LEGAL_NAME = "XoXoCom UG (haftungsbeschränkt)"
CITY = "Monheim am Rhein"
REGISTER = "Amtsgericht Düsseldorf, HRB 110495"
FOUNDER = "Patryk Kwitowski"
PRODUCT = "Agentix Projects"  # renamed from MAtfIT 2026-09-02; the domain is still matfit.ai
PRODUCT_URL = "matfit.ai"
SITE_URL = "xoxocom.net"
EMAIL = "info@xoxocom.net"


def ph(label: str) -> str:
    """A visually marked placeholder — everything still to be confirmed."""
    return f'<span class="ph">{label}</span>'


BOILERPLATE = (
    f"{COMPANY} is a business management and IT consultancy based in {CITY}, Germany, "
    f"founded in {ph('year')}. The three-person team advises companies on IT and AI "
    f"implementation, and is currently building {PRODUCT}, an AI coach that guides "
    "developers, product managers and founders from idea to shipped product."
)

BOILERPLATE_LONG = (
    f"{COMPANY}, founded in {ph('year')} in {CITY}, Germany, is a business management and IT "
    f"consultancy specialising in IT and AI implementation. Founded by {FOUNDER}, who brings "
    f"{ph('X')} years of experience in IT consulting, the three-person team works as an AI-native "
    f"operation, building its own software, content and internal workflows with AI. The company is "
    f"currently developing {PRODUCT}, an AI coach that supports developers, product owners, product "
    "managers and independent builders through the full path from idea to working product — covering "
    f"technical implementation and AI integration at each step. {PRODUCT} is in closed testing."
)

WHY = (
    "Every company we walked into had the same shape of problem. Not a shortage of AI tools — a "
    "shortage of anyone able to turn them into how the team actually works on a Tuesday. Strategy "
    "decks landed, pilots ran, and then the work went back to normal. We started building the thing "
    "we kept wishing existed: guidance that sits next to the person doing the work, at the moment "
    "they're deciding what to do next."
)

# (key, title, description) — the key is the principle in two words, not an index.
# These three are parallel claims, not a sequence, so nothing here gets numbered.
HOW_WE_WORK = [
    ("AI-native", "AI-native, not AI-curious",
     "Our own consulting, marketing and internal operations run with AI in the loop. We advise from "
     "what we actually operate, not from a vendor deck."),
    ("Own product", "We build it ourselves",
     f"{PRODUCT} is our own product, not a reseller badge. The team that advises you on implementation "
     "is the team shipping software."),
    ("Three people", "Small enough to stay accountable",
     "Three people. The person you meet is the person who does the work — no handover to a delivery "
     "unit you never spoke to."),
]

SERVICES = [
    ("AI Transformation", "Bringing AI into how a team works day to day — not as a pilot."),
    ("Business Coaching", "Agile methodology and leadership coaching for teams and individuals."),
    ("Expert Consulting", "Project staffing: Product Owners, Scrum Masters, engineers, AI specialists."),
]

PEOPLE = [
    {
        "name": FOUNDER,
        "initials": "PK",
        "role": ph("Founder / CEO / Geschäftsführer — pick one"),
        "bio": (
            f"Founder and Geschäftsführer of {COMPANY}. {ph('X')} years in IT consulting, specialising in "
            f"{ph('specialisation')}. Advises companies on IT and AI implementation and sets the company's direction."
        ),
        "quote_for": "Business, consulting, company direction",
        "linkedin": ph("linkedin.com/in/…"),
    },
    {
        "name": ph("full name, as it should appear in print"),
        "initials": "AI",
        "role": "AI Engineering & Marketing / Workflows",
        "bio": (
            "Builds the AI engineering side of the product and runs marketing and internal workflows as "
            "AI-native operations — the automation behind how a three-person company ships like a larger one."
        ),
        "quote_for": "AI engineering, building with AI, workflow automation",
        "linkedin": ph("linkedin.com/in/…"),
    },
    {
        "name": ph("full name"),
        "initials": "PL",
        "role": ph("Product Lead"),
        "bio": (
            f"Leads product for {PRODUCT} — shaping what the coach does, who it is for, and what ships next, "
            "from early developer feedback."
        ),
        "quote_for": f"{PRODUCT} product decisions, user feedback",
        "linkedin": ph("linkedin.com/in/…"),
    },
]

FACTS = [
    ("Legal name", LEGAL_NAME),
    ("Founded", ph("year")),
    ("Headquarters", f"{CITY}, Germany"),
    ("Legal form", "UG (haftungsbeschränkt)"),
    ("Register", REGISTER),
    ("Team size", "3"),
    ("Product", f"{PRODUCT} <span class=\"dim\">— domain is still matfit.ai</span>"),
    ("Product status", "In closed testing with early developer feedback"),
    ("What it is", "An AI coach that guides developers, product owners and founders from idea to shipped product"),
    ("Website", SITE_URL),
]

ANGLES = [
    ("What an AI-native three-person company actually looks like",
     "Consulting, marketing, and our own product — all run with AI in the loop. Concrete workflows, "
     "not predictions.",
     "Founder + AI engineering"),
    ("Why AI pilots stall before they reach daily work",
     "The gap between a successful pilot and a changed Tuesday, from inside client engagements.",
     "Founder"),
    ("Building your own tool instead of reselling someone else's",
     f"Why a consultancy chose to ship {PRODUCT} rather than badge a platform — and what that costs.",
     "Founder + Product"),
    ("Coaching developers with an AI coach",
     "What early testers actually change about how they work, and what the coach gets wrong.",
     "AI engineering + Product"),
]

DOWNLOADS = [
    ("Logo pack", "SVG + PNG, transparent, light & dark", "logo", ph("prepare files")),
    (f"{FOUNDER} — headshot", "High-res JPG, print quality", "portrait", ph("photo needed")),
    (ph("Team member") + " — headshot", "High-res JPG, print quality", "portrait", ph("photo needed")),
    (f"{PRODUCT} screenshots", "3 × PNG, product UI", "screen", ph("captures needed")),
    (f"{PRODUCT} demo clip", "MP4, ~30 s, no audio", "video", ph("optional")),
    ("Full press kit", "Everything above, zipped", "zip", ph("bundle last")),
]


# =========================================================================
# Shared building blocks
# =========================================================================

NAV = ["Services", "Products", "About", "Contact"]


def chrome(active: str) -> str:
    """The site's real header, rebuilt in plain CSS so each prototype reads as a page."""
    items = "".join(
        f'<span class="nav-item{" is-active" if n == active else ""}">{n}</span>' for n in NAV
    )
    return f"""
      <header class="chrome">
        <span class="wordmark"><b>X</b>o<b>X</b>oCom</span>
        <nav class="chrome-nav">{items}</nav>
        <div class="chrome-right">
          <span class="lang">EN</span>
          <span class="btn btn-sm">Get in touch</span>
        </div>
      </header>"""


def footer_bar(press_link: bool = True) -> str:
    press = '<span class="foot-link is-accent">Press &amp; Media</span>' if press_link else ""
    return f"""
      <footer class="foot">
        <span class="wordmark sm"><b>X</b>o<b>X</b>oCom</span>
        <div class="foot-links">
          <span class="foot-link">Impressum</span>
          <span class="foot-link">Datenschutz</span>
          <span class="foot-link">AGB</span>
          {press}
        </div>
      </footer>"""


def avatar(initials: str, size: str = "md") -> str:
    return f'<span class="avatar av-{size}" aria-hidden="true"><i>{initials}</i><em>photo</em></span>'


def copy_block(text: str, label: str, note: str = "") -> str:
    """Paste-ready text with a working copy button — the core of a press page."""
    note_html = f'<p class="copy-note">{note}</p>' if note else ""
    return f"""
        <div class="copyblock">
          <div class="copyblock-head">
            <span class="label">{label}</span>
            <button class="copy-btn" type="button" data-copy>Copy<span class="copied" aria-live="polite"></span></button>
          </div>
          <p class="copyblock-text">{text}</p>
          {note_html}
        </div>"""


# =========================================================================
# About prototypes
# =========================================================================

def about_a1() -> str:
    """A1 — Founder letter. One column, wide measure, story carries the page."""
    how = "".join(
        f"""
            <div class="a1-how-row">
              <h3>{t}</h3>
              <p>{d}</p>
            </div>"""
        for _, t, d in HOW_WE_WORK
    )
    team = "".join(
        f"""
            <li class="a1-person">
              {avatar(p['initials'], 'sm')}
              <div>
                <p class="a1-person-name">{p['name']} <span class="dim">— {p['role']}</span></p>
                <p class="a1-person-bio">{p['bio']}</p>
                <span class="a1-li">LinkedIn ↗ <span class="dim">{p['linkedin']}</span></span>
              </div>
            </li>"""
        for p in PEOPLE[1:]
    )
    return f"""
      <main class="a1">
        <section class="a1-open">
          <p class="eyebrow">About</p>
          <h1 class="h1">We close the gap between an AI tool and how your team actually works.</h1>
          <p class="a1-boiler">{BOILERPLATE}</p>
        </section>

        <section class="a1-why">
          <span class="rule"></span>
          <h2 class="h2">Why we built this</h2>
          <p class="a1-prose">{WHY}</p>
        </section>

        <section class="a1-how">
          <h2 class="h2">How we work</h2>
          <div class="a1-how-rows">{how}</div>
        </section>

        <section class="a1-founder">
          <div class="a1-founder-portrait">{avatar('PK', 'lg')}</div>
          <div class="a1-founder-body">
            <p class="label">Founder</p>
            <h2 class="h2">{FOUNDER}</h2>
            <p class="a1-founder-role">{PEOPLE[0]['role']}</p>
            <p class="a1-prose">{PEOPLE[0]['bio']}</p>
            <span class="a1-li">LinkedIn ↗ <span class="dim">{PEOPLE[0]['linkedin']}</span></span>
          </div>
        </section>

        <section class="a1-team">
          <h2 class="h2">The rest of the team</h2>
          <ul class="a1-people">{team}</ul>
        </section>

        <section class="a1-cred">
          <h2 class="h2">Where we stand today</h2>
          <div class="a1-cred-rows">
            <div class="a1-cred-row"><span class="label">Consulting</span>
              <p>Active since {ph('year')}. {ph('client types — e.g. mid-size industrial, public sector')}.
              Client names on request; logos published only where permission is granted.</p></div>
            <div class="a1-cred-row"><span class="label is-brand">{PRODUCT}</span>
              <p>In closed testing with early developer feedback. No public user or revenue figures —
              we'll publish numbers when there are real ones to publish.</p></div>
          </div>
        </section>

        <section class="a1-cta">
          <h2 class="h2">Tell us what you're trying to change.</h2>
          <div class="btn-row">
            <span class="btn">Get in touch</span>
            <span class="btn btn-ghost">Join the {PRODUCT} waitlist</span>
          </div>
          <p class="a1-legal">{LEGAL_NAME} · {CITY} · <u>Impressum</u> · <u>Datenschutz</u></p>
        </section>
      </main>"""


def about_a2() -> str:
    """A2 — Company dossier. Structured, scannable, press-ready by construction."""
    rail = "".join(
        f'<span class="a2-rail-item{" is-active" if i == 0 else ""}">{n}</span>'
        for i, n in enumerate(["Company", "People", "How we work", "Credibility", "Contact"])
    )
    people = "".join(
        f"""
            <article class="card a2-person">
              {avatar(p['initials'], 'md')}
              <h3>{p['name']}</h3>
              <p class="a2-role">{p['role']}</p>
              <p class="a2-bio">{p['bio']}</p>
              <span class="a2-li">LinkedIn ↗</span>
            </article>"""
        for p in PEOPLE
    )
    how = "".join(
        f"""
            <div class="a2-how">
              <h3>{t}</h3>
              <p>{d}</p>
            </div>"""
        for _, t, d in HOW_WE_WORK
    )
    services = "".join(
        f'<div class="a2-svc"><h4>{t}</h4><p>{d}</p></div>' for t, d in SERVICES
    )
    # Six facts, so the two-column grid has no orphan cell.
    facts = "".join(
        f'<div class="a2-fact"><dt>{k}</dt><dd>{v}</dd></div>'
        for k, v in [FACTS[0], FACTS[1], FACTS[2], FACTS[4], FACTS[5], FACTS[7]]
    )
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
              <h1 class="h1">People, methodology and A.I.</h1>
              <div class="a2-boiler">
                <span class="label">Boilerplate — reused verbatim everywhere</span>
                <p>{BOILERPLATE}</p>
              </div>
            </section>

            <section class="a2-block">
              <h2 class="h2">What we do</h2>
              <div class="a2-svcs">{services}</div>
              <div class="a2-product">
                <div>
                  <span class="label">What we're building</span>
                  <h3>{PRODUCT}</h3>
                  <p>An AI coach for developers, product owners, product managers and independent
                     builders — from first idea to shipped product and first revenue.</p>
                </div>
                <div class="a2-product-side">
                  <span class="pill">In closed testing</span>
                  <span class="a2-link">{PRODUCT_URL} ↗</span>
                </div>
              </div>
            </section>

            <section class="a2-block">
              <h2 class="h2">Why we built it</h2>
              <p class="a2-prose">{WHY}</p>
            </section>

            <section class="a2-block">
              <h2 class="h2">Who does what</h2>
              <div class="a2-people">{people}</div>
            </section>

            <section class="a2-block">
              <h2 class="h2">How we work</h2>
              <div class="a2-hows">{how}</div>
            </section>

            <section class="a2-block">
              <h2 class="h2">Company facts</h2>
              <dl class="a2-facts">{facts}</dl>
              <p class="a2-foot-note">Client names on request; logos published only with written
                 permission. No user or revenue figures until there are audited ones.</p>
            </section>

            <section class="a2-block a2-end">
              <div>
                <h2 class="h2">Work with us</h2>
                <p class="a2-prose">Consulting engagement, project staffing, or early access to {PRODUCT}.</p>
              </div>
              <div class="btn-row">
                <span class="btn">Get in touch</span>
                <span class="btn btn-ghost">Press &amp; Media</span>
              </div>
            </section>
          </div>
        </div>
      </main>"""


def about_a3() -> str:
    """A3 — Founder-led. Portrait hero, alternating bands, personality forward."""
    bands = ""
    for i, (key, t, d) in enumerate(HOW_WE_WORK):
        side = "is-right" if i % 2 else ""
        bands += f"""
            <div class="a3-band {side}">
              <div class="a3-band-mark"><span>{key}</span></div>
              <div class="a3-band-body">
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>"""
    strip = "".join(
        f"""
            <div class="a3-card">
              {avatar(p['initials'], 'md')}
              <p class="a3-card-name">{p['name']}</p>
              <p class="a3-card-role">{p['role']}</p>
              <p class="a3-card-bio">{p['bio']}</p>
              <span class="a3-li">LinkedIn ↗</span>
            </div>"""
        for p in PEOPLE
    )
    return f"""
      <main class="a3">
        <section class="a3-hero">
          <div class="a3-hero-portrait">{avatar('PK', 'xl')}</div>
          <div class="a3-hero-copy">
            <p class="eyebrow">About</p>
            <h1 class="h1">“Nobody needed another AI strategy deck. They needed the work to change.”</h1>
            <p class="a3-attrib">{FOUNDER} · <span class="dim">{PEOPLE[0]['role']}</span></p>
          </div>
        </section>

        <section class="a3-boiler">
          <p>{BOILERPLATE}</p>
        </section>

        <section class="a3-sec a3-why">
          <h2 class="h2">The problem we kept walking into</h2>
          <p class="a3-prose">{WHY}</p>
        </section>

        <section class="a3-sec a3-bands">
          <h2 class="h2">How we work</h2>
          {bands}
        </section>

        <section class="a3-sec a3-product">
          <div>
            <span class="label">What we're building</span>
            <h2 class="h2">{PRODUCT}</h2>
            <p class="a3-prose">An AI coach that guides developers, product owners and founders from
               idea to shipped product — covering the technical implementation and the AI integration
               at each step.</p>
            <div class="btn-row">
              <span class="btn">Join the waitlist</span>
              <span class="pill">In closed testing</span>
            </div>
          </div>
          <div class="a3-product-frame" aria-hidden="true">
            <span class="a3-screen"><em>product screenshot</em></span>
          </div>
        </section>

        <section class="a3-sec a3-team">
          <h2 class="h2">Three people</h2>
          <div class="a3-cards">{strip}</div>
        </section>

        <section class="a3-sec a3-cta">
          <h2 class="h2">Let's talk about your team.</h2>
          <div class="btn-row">
            <span class="btn">Get in touch</span>
            <span class="btn btn-ghost">Press &amp; Media</span>
          </div>
          <p class="a1-legal">{LEGAL_NAME} · {CITY} · <u>Impressum</u> · <u>Datenschutz</u></p>
        </section>
      </main>"""


# =========================================================================
# Press prototypes
# =========================================================================

def dl_tile(title: str, meta: str, kind: str, status: str) -> str:
    art = {
        "logo": '<span class="thumb thumb-logo"><span class="wordmark sm"><b>X</b>o<b>X</b>oCom</span></span>',
        "portrait": '<span class="thumb thumb-portrait"><i>photo</i></span>',
        "screen": '<span class="thumb thumb-screen"><i>UI</i></span>',
        "video": '<span class="thumb thumb-video"><i>▶</i></span>',
        "zip": '<span class="thumb thumb-zip"><i>ZIP</i></span>',
    }[kind]
    return f"""
        <article class="tile">
          {art}
          <div class="tile-body">
            <h3>{title}</h3>
            <p>{meta}</p>
            <span class="tile-status">{status}</span>
          </div>
        </article>"""


def press_p1() -> str:
    """P1 — Newsroom. Facts and downloads in one authoritative column."""
    facts = "".join(f'<div class="p1-fact"><dt>{k}</dt><dd>{v}</dd></div>' for k, v in FACTS)
    angles = "".join(
        f"""
            <li class="p1-angle">
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
              <span class="chip">{who}</span>
            </li>"""
        for t, d, who in ANGLES
    )
    people = "".join(
        f"""
            <div class="p1-person">
              {avatar(p['initials'], 'sm')}
              <div>
                <p class="p1-person-name">{p['name']}</p>
                <p class="p1-person-role">{p['role']}</p>
                <p class="p1-person-bio">{p['bio']}</p>
                <p class="p1-quote-for"><span class="label">Quote for</span> {p['quote_for']}</p>
              </div>
            </div>"""
        for p in PEOPLE
    )
    tiles = "".join(dl_tile(*d) for d in DOWNLOADS)
    return f"""
      <main class="p1">
        <section class="p1-head">
          <p class="eyebrow">Press &amp; Media</p>
          <h1 class="h1">Everything you need to write about us.</h1>
          <p class="lede">Facts, assets and people — paste-ready. If something's missing,
             email {EMAIL} and we'll send it the same day.</p>
        </section>

        <section class="p1-block">
          <h2 class="h2">Boilerplate</h2>
          <p class="p1-hint">For use in articles. Please use verbatim — this wording is identical on
             our website, LinkedIn and in pitch emails.</p>
          {copy_block(BOILERPLATE, "Short — 2 sentences")}
          {copy_block(BOILERPLATE_LONG, "Long — ~100 words")}
        </section>

        <section class="p1-block">
          <h2 class="h2">Company facts</h2>
          <dl class="p1-facts">{facts}</dl>
        </section>

        <section class="p1-block">
          <h2 class="h2">Assets</h2>
          <p class="p1-hint">Downloadable files, not embedded images. Logos in light and dark.</p>
          <div class="p1-tiles">{tiles}</div>
        </section>

        <section class="p1-block">
          <h2 class="h2">People, for correct attribution</h2>
          <div class="p1-people">{people}</div>
        </section>

        <section class="p1-block">
          <h2 class="h2">Suggested topics</h2>
          <p class="p1-hint">What we can speak to on a podcast or in an interview.</p>
          <ul class="p1-angles">{angles}</ul>
        </section>

        <section class="p1-contact">
          <div>
            <span class="label">Press contact</span>
            <h2 class="h2">{ph('name — decide: founder or AI engineering')}</h2>
            <p class="p1-contact-mail">{ph('press@xoxocom.net')}</p>
            <p class="p1-contact-note">Podcast and interview requests welcome. We usually reply
               within 24 hours on business days.</p>
          </div>
          <div class="btn-row"><span class="btn">Email press contact</span></div>
        </section>

        <section class="p1-featured">
          <h2 class="h2">As featured in</h2>
          <div class="empty">Nothing here yet — this fills up as coverage lands.</div>
        </section>
      </main>"""


def press_p2() -> str:
    """P2 — Press kit first. One big download, assets as the hero, facts compact."""
    tiles = "".join(dl_tile(*d) for d in DOWNLOADS[:5])
    facts = "".join(f'<div class="p2-fact"><dt>{k}</dt><dd>{v}</dd></div>' for k, v in FACTS)
    chips = "".join(f'<span class="p2-chip">{t}</span>' for t, _, _ in ANGLES)
    people = "".join(
        f"""
            <div class="p2-person">
              {avatar(p['initials'], 'sm')}
              <div>
                <p class="p2-person-name">{p['name']} <span class="dim">· {p['role']}</span></p>
                <p class="p2-person-bio">{p['bio']}</p>
              </div>
            </div>"""
        for p in PEOPLE
    )
    return f"""
      <main class="p2">
        <section class="p2-hero">
          <div class="p2-hero-copy">
            <p class="eyebrow">Press &amp; Media</p>
            <h1 class="h1">Press kit</h1>
            <p class="lede">Logos, headshots, screenshots and the approved boilerplate — one download,
               everything print-ready.</p>
            <div class="btn-row">
              <span class="btn btn-lg">Download press kit (.zip)</span>
              <span class="btn btn-ghost btn-lg">Email press contact</span>
            </div>
            <p class="p2-hero-meta">{ph('~18 MB')} · updated {ph('date')} · {LEGAL_NAME}</p>
          </div>
          <div class="p2-hero-art" aria-hidden="true">
            <span class="p2-logo-tile is-dark"><span class="wordmark"><b>X</b>o<b>X</b>oCom</span></span>
            <span class="p2-logo-tile is-light"><span class="wordmark is-light"><b>X</b>o<b>X</b>oCom</span></span>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Individual assets</h2>
          <div class="p2-tiles">{tiles}</div>
        </section>

        <section class="p2-split">
          <div>
            <h2 class="h2">Boilerplate</h2>
            {copy_block(BOILERPLATE, "Short — use verbatim")}
            {copy_block(BOILERPLATE_LONG, "Long — ~100 words")}
          </div>
          <div>
            <h2 class="h2">The facts</h2>
            <dl class="p2-facts">{facts}</dl>
          </div>
        </section>

        <section class="p2-block">
          <h2 class="h2">Who to talk to</h2>
          <div class="p2-people">{people}</div>
          <p class="p2-note">Quote the founder on business, consulting and company direction;
             quote AI engineering on building with AI and workflow automation.</p>
        </section>

        <section class="p2-block">
          <h2 class="h2">Topics we can speak to</h2>
          <div class="p2-chips">{chips}</div>
          <p class="p2-note">Podcast and interview requests welcome — {ph('press@xoxocom.net')}.
             We usually reply within 24 hours.</p>
        </section>
      </main>"""


def press_p3() -> str:
    """P3 — Reporter's cheat sheet. Utilitarian, monospace keys, quote-ready."""
    facts = "".join(
        f'<div class="p3-row"><span class="p3-key">{k}</span><span class="p3-val">{v}</span></div>'
        for k, v in FACTS
    )
    angles = "".join(
        f"""
            <div class="p3-angle">
              <h3>{t}</h3>
              <p>{d}</p>
              <p class="p3-who"><span class="p3-key">quote</span> {who}</p>
            </div>"""
        for t, d, who in ANGLES
    )
    quotes = f"""
        <blockquote class="p3-quote">
          <p>“The hard part was never picking a model. It's that nothing in a team's week changes
             unless the guidance shows up where the work happens.”</p>
          <footer>{FOUNDER}, {PEOPLE[0]['role']} <span class="p3-draft">draft — needs sign-off</span></footer>
        </blockquote>
        <blockquote class="p3-quote">
          <p>“We run a three-person company on AI-native workflows. {PRODUCT} is the same idea pointed
             at the people who build software.”</p>
          <footer>{PEOPLE[1]['name']}, {PEOPLE[1]['role']} <span class="p3-draft">draft — needs sign-off</span></footer>
        </blockquote>"""
    # Asset names carry a person's name and the product name, so this column keeps its
    # own casing instead of reusing the lowercased mono key style.
    assets = "".join(
        f'<div class="p3-row"><span class="p3-name">{k}</span>'
        f'<span class="p3-val">{m} <span class="tile-status">{s}</span></span></div>'
        for k, m, _, s in DOWNLOADS
    )
    return f"""
      <main class="p3">
        <div class="p3-grid">
          <div class="p3-body">
            <section>
              <p class="eyebrow">Press &amp; Media</p>
              <h1 class="h1">Press facts</h1>
              <p class="lede">Written for people on deadline. Everything on this page is approved for
                 publication and kept current.</p>
            </section>

            <section class="p3-block">
              <h2 class="h2">Boilerplate</h2>
              {copy_block(BOILERPLATE, "Short", "Use verbatim — identical on our site, LinkedIn and pitch emails.")}
              {copy_block(BOILERPLATE_LONG, "Long, ~100 words")}
            </section>

            <section class="p3-block">
              <h2 class="h2">Facts</h2>
              <div class="p3-rows">{facts}</div>
            </section>

            <section class="p3-block">
              <h2 class="h2">Quote-ready</h2>
              {quotes}
            </section>

            <section class="p3-block">
              <h2 class="h2">Suggested topics</h2>
              <div class="p3-angles">{angles}</div>
            </section>

            <section class="p3-block">
              <h2 class="h2">Assets</h2>
              <div class="p3-rows">{assets}</div>
              <p class="p2-note">All files downloadable; logo pack includes SVG and transparent PNG,
                 light and dark.</p>
            </section>

            <section class="p3-block">
              <h2 class="h2">Coverage</h2>
              <div class="empty">No published coverage yet.</div>
            </section>
          </div>

          <aside class="p3-rail">
            <div class="p3-rail-card">
              <span class="label">Press contact</span>
              <p class="p3-rail-name">{ph('founder or AI engineering — decide')}</p>
              <p class="p3-rail-mail">{ph('press@xoxocom.net')}</p>
              <span class="btn btn-sm">Email us</span>
              <p class="p3-rail-note">Reply within 24 h on business days. Podcast and interview
                 requests welcome.</p>
            </div>
            <div class="p3-rail-card">
              <span class="label">Fast facts</span>
              <p class="p3-rail-fact">{LEGAL_NAME}</p>
              <p class="p3-rail-fact">{CITY}, Germany · founded {ph('year')}</p>
              <p class="p3-rail-fact">3 people · {PRODUCT} in closed testing</p>
            </div>
            <div class="p3-rail-card">
              <span class="label">Download</span>
              <span class="btn btn-sm btn-ghost">Press kit (.zip)</span>
            </div>
          </aside>
        </div>
      </main>"""


# =========================================================================
# CSS
# =========================================================================

def css(font_face: str) -> str:
    body_font = ("'Manrope', ui-sans-serif, system-ui, sans-serif" if font_face
                 else "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif")
    return font_face + """
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:%(bg)s; --fg:%(fg)s; --muted:%(muted)s; --surface:%(surface)s;
  --border:%(border)s; --accent:%(accent)s; --accent-fg:%(afg)s; --radius:%(radius)s;
  --font:%(font)s;
  --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
}
body{margin:0;background:#07090b;color:var(--fg);font-family:var(--font);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}

/* ---------- lab shell ---------- */
.lab{max-width:1320px;margin:0 auto;padding:52px 24px 120px}
.lab-head h1{font-size:clamp(1.9rem,4vw,2.6rem);line-height:1.05;letter-spacing:-.025em;
  font-weight:800;margin:0 0 14px;text-wrap:balance}
.lab-head .eyebrow{margin-bottom:14px}
.lab-head p{color:var(--muted);max-width:70ch;line-height:1.65;margin:0 0 10px;font-size:.95rem}
.legend{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:24px;
  border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;
  background:var(--surface);font-size:.8rem;color:var(--muted)}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.jump a{border:1px solid var(--border);border-radius:999px;padding:7px 14px;font-size:.78rem;
  color:var(--muted);text-decoration:none;transition:color .15s,border-color .15s}
.jump a:hover,.jump a:focus-visible{color:var(--fg);border-color:var(--accent)}
.proto{margin-top:64px;scroll-margin-top:24px}
.proto-head{margin-bottom:16px}
.proto-head .tag{display:inline-block;font-size:.68rem;font-weight:700;letter-spacing:.18em;
  text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.proto-head h2{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 8px}
.proto-head .why{color:var(--muted);font-size:.9rem;line-height:1.6;max-width:78ch;margin:0}
.proto-head .trade{color:var(--muted);font-size:.82rem;line-height:1.6;max-width:78ch;margin:8px 0 0}
.proto-head .trade b{color:var(--fg);font-weight:600}
.frame{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--bg)}

/* ---------- shared page components ---------- */
.page{background:var(--bg);color:var(--fg);font-size:16px}
.eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--accent);margin:0 0 14px}
.label{display:block;font-size:.66rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted)}
/* Brand and person names never get text-transformed — the checklist asks for exact spelling. */
.label.is-brand{text-transform:none;letter-spacing:.06em;font-size:.72rem}
.h1{font-size:clamp(2rem,3.4vw,3rem);line-height:1.06;letter-spacing:-.028em;font-weight:800;
  margin:0 0 20px;text-wrap:balance}
.h2{font-size:clamp(1.25rem,1.7vw,1.6rem);line-height:1.2;letter-spacing:-.02em;font-weight:700;
  margin:0 0 16px;text-wrap:balance}
.lede{color:var(--muted);font-size:1.05rem;line-height:1.65;margin:0;max-width:62ch}
.dim{color:var(--muted);font-weight:400}
.rule{display:block;width:56px;height:2px;background:var(--accent);margin-bottom:22px}
.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius);
  background:var(--accent);color:var(--accent-fg);font-weight:700;font-size:.92rem;
  padding:12px 22px;border:1px solid var(--accent);cursor:default}
.btn-ghost{background:transparent;color:var(--fg);border-color:var(--border)}
.btn-sm{padding:8px 16px;font-size:.82rem}
.btn-lg{padding:14px 26px;font-size:1rem}
.btn-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.pill{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:999px;
  padding:6px 13px;font-size:.75rem;color:var(--muted);background:var(--surface)}
.pill::before{content:"";width:6px;height:6px;border-radius:999px;background:var(--accent)}
.chip{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;
  padding:5px 12px;font-size:.72rem;color:var(--muted);white-space:nowrap}
.card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:22px}
.empty{border:1px dashed var(--border);border-radius:var(--radius);padding:26px;color:var(--muted);
  font-size:.88rem;text-align:center}
.ph{color:var(--accent);background:rgba(251,107,76,.09);border-bottom:1px dashed rgba(251,107,76,.55);
  padding:0 4px;border-radius:3px;font-weight:600;font-size:.94em}
.ph::before{content:"[ "}
.ph::after{content:" ]"}

/* wordmark + chrome */
.wordmark{font-weight:800;letter-spacing:-.02em;font-size:1.1rem;color:var(--fg)}
.wordmark b{color:var(--accent);font-weight:800}
.wordmark.sm{font-size:.95rem}
.wordmark.is-light{color:#0b0e11}
.chrome{display:flex;align-items:center;justify-content:space-between;gap:24px;
  padding:16px 34px;border-bottom:1px solid var(--border)}
.chrome-nav{display:flex;gap:26px}
.nav-item{font-size:.85rem;font-weight:500;color:var(--muted)}
.nav-item.is-active{color:var(--fg)}
.chrome-right{display:flex;align-items:center;gap:12px}
.lang{font-size:.75rem;color:var(--muted);border:1px solid var(--border);border-radius:999px;
  padding:5px 11px}
.foot{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;
  padding:26px 34px;border-top:1px solid var(--border);margin-top:8px}
.foot-links{display:flex;gap:20px;flex-wrap:wrap}
.foot-link{font-size:.8rem;color:var(--muted)}
.foot-link.is-accent{color:var(--accent)}

/* portrait placeholders */
.avatar{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  border:1px solid var(--border);border-radius:var(--radius);
  background:linear-gradient(155deg,#252b32,#171c21);color:var(--muted);flex:none}
.avatar i{font-style:normal;font-weight:800;letter-spacing:.02em;color:#5f666d}
.avatar em{font-style:normal;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;
  color:#4c5257}
.av-sm{width:56px;height:56px;border-radius:999px}
.av-sm i{font-size:.9rem}.av-sm em{display:none}
.av-md{width:100%%;aspect-ratio:4/5;max-width:none}
.av-md i{font-size:1.6rem}
.av-lg{width:100%%;aspect-ratio:1/1}
.av-lg i{font-size:2.2rem}
.av-xl{width:100%%;aspect-ratio:3/4}
.av-xl i{font-size:2.8rem}

/* copy blocks */
.copyblock{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  padding:16px 18px 18px}
.copyblock + .copyblock{margin-top:12px}
.copyblock-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}
.copyblock-text{margin:0;color:var(--fg);line-height:1.6;font-size:.94rem}
.copy-note{margin:10px 0 0;color:var(--muted);font-size:.78rem;line-height:1.5}
.copy-btn{font:inherit;font-size:.76rem;font-weight:700;letter-spacing:.04em;color:var(--accent);
  background:transparent;border:1px solid var(--border);border-radius:999px;padding:6px 14px;
  cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.copy-btn:hover,.copy-btn:focus-visible{border-color:var(--accent)}
.copied{color:var(--muted);font-weight:500}

/* asset tiles */
.tile{display:flex;gap:14px;border:1px solid var(--border);border-radius:var(--radius);
  background:var(--surface);padding:14px}
.tile h3{margin:0 0 3px;font-size:.92rem;font-weight:700}
.tile p{margin:0 0 7px;font-size:.78rem;color:var(--muted);line-height:1.45}
.tile-status{font-size:.7rem;color:var(--muted)}
.thumb{flex:none;width:64px;height:64px;border-radius:8px;border:1px solid var(--border);
  display:grid;place-items:center;background:var(--bg);overflow:hidden}
.thumb i{font-style:normal;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:#5f666d}
.thumb-logo{background:linear-gradient(150deg,#1a1f25,#101418)}
.thumb-logo .wordmark{font-size:.62rem}
.thumb-portrait{background:linear-gradient(155deg,#252b32,#171c21)}
.thumb-screen{background:linear-gradient(150deg,#1c2b33,#12181d)}
.thumb-video i{font-size:1rem;color:var(--accent)}
.thumb-zip i{color:var(--accent)}

/* ---------- A1 · founder letter ---------- */
#a1 .a1{padding:0}
#a1 section{padding:0 34px;max-width:820px;margin:0 auto}
#a1 .a1-open{padding-top:74px}
#a1 .a1-boiler{font-size:1.18rem;line-height:1.6;color:var(--fg);margin:0;
  border-left:2px solid var(--accent);padding-left:20px}
#a1 .a1-why{padding-top:64px}
#a1 .a1-prose{color:var(--muted);font-size:1.02rem;line-height:1.75;margin:0}
#a1 .a1-how{padding-top:58px}
#a1 .a1-how-rows{display:flex;flex-direction:column}
#a1 .a1-how-row{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:28px;
  padding:20px 0;border-top:1px solid var(--border)}
#a1 .a1-how-row h3{margin:0;font-size:1rem;font-weight:700;letter-spacing:-.01em}
#a1 .a1-how-row p{margin:0;color:var(--muted);font-size:.94rem;line-height:1.65}
#a1 .a1-founder{margin-top:64px;padding-top:44px;padding-bottom:44px;
  display:grid;grid-template-columns:220px minmax(0,1fr);gap:34px;align-items:start;
  background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border);
  max-width:none}
#a1 .a1-founder-body .h2{margin:6px 0 4px}
#a1 .a1-founder-role{margin:0 0 14px;color:var(--accent);font-size:.9rem;font-weight:600}
#a1 .a1-li{display:inline-block;margin-top:14px;font-size:.84rem;color:var(--fg);
  border-bottom:1px solid var(--border)}
#a1 .a1-team{padding-top:58px}
#a1 .a1-people{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:26px}
#a1 .a1-person{display:grid;grid-template-columns:56px minmax(0,1fr);gap:18px;align-items:start}
#a1 .a1-person-name{margin:0 0 6px;font-size:.98rem;font-weight:700}
#a1 .a1-person-bio{margin:0;color:var(--muted);font-size:.92rem;line-height:1.65}
#a1 .a1-cred{padding-top:58px}
#a1 .a1-cred-rows{display:flex;flex-direction:column;gap:18px}
#a1 .a1-cred-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:22px;
  padding-top:16px;border-top:1px solid var(--border)}
#a1 .a1-cred-row p{margin:0;color:var(--muted);font-size:.92rem;line-height:1.65}
#a1 .a1-cta{padding-top:64px;padding-bottom:70px;text-align:center}
#a1 .a1-cta .btn-row{justify-content:center}
#a1 .a1-legal{margin:26px 0 0;font-size:.78rem;color:var(--muted)}

/* ---------- A2 · dossier ---------- */
#a2 .a2-grid{display:grid;grid-template-columns:210px minmax(0,1fr);gap:44px;
  padding:62px 34px 70px;max-width:1160px;margin:0 auto}
#a2 .a2-rail{display:flex;flex-direction:column;gap:2px;align-self:start}
#a2 .a2-rail .label{margin-bottom:12px}
#a2 .a2-rail-item{font-size:.88rem;color:var(--muted);padding:7px 0 7px 14px;
  border-left:2px solid var(--border)}
#a2 .a2-rail-item.is-active{color:var(--fg);border-left-color:var(--accent);font-weight:600}
#a2 .a2-rail-cta{margin-top:22px}
#a2 .a2-body{min-width:0}
#a2 .a2-boiler{border:1px solid var(--border);border-left:2px solid var(--accent);
  border-radius:var(--radius);background:var(--surface);padding:18px 20px}
#a2 .a2-boiler p{margin:9px 0 0;font-size:1.02rem;line-height:1.6}
#a2 .a2-block{margin-top:56px}
#a2 .a2-prose{color:var(--muted);font-size:.98rem;line-height:1.75;margin:0;max-width:70ch}
#a2 .a2-svcs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;
  background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
#a2 .a2-svc{background:var(--bg);padding:18px}
#a2 .a2-svc h4{margin:0 0 6px;font-size:.92rem;font-weight:700}
#a2 .a2-svc p{margin:0;font-size:.84rem;color:var(--muted);line-height:1.55}
#a2 .a2-product{margin-top:16px;display:flex;justify-content:space-between;gap:26px;
  border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:20px}
#a2 .a2-product h3{margin:8px 0 8px;font-size:1.18rem;font-weight:800;letter-spacing:-.02em}
#a2 .a2-product p{margin:0;color:var(--muted);font-size:.92rem;line-height:1.6;max-width:52ch}
#a2 .a2-product-side{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex:none}
#a2 .a2-link{font-size:.84rem;color:var(--accent)}
#a2 .a2-people{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
#a2 .a2-person h3{margin:14px 0 3px;font-size:1rem;font-weight:700}
#a2 .a2-role{margin:0 0 10px;font-size:.8rem;color:var(--accent);font-weight:600}
#a2 .a2-bio{margin:0;font-size:.86rem;color:var(--muted);line-height:1.6}
#a2 .a2-li{display:inline-block;margin-top:12px;font-size:.8rem;color:var(--fg)}
#a2 .a2-hows{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
#a2 .a2-how h3{margin:0 0 7px;font-size:.95rem;font-weight:700;padding-top:14px;
  border-top:2px solid var(--accent)}
#a2 .a2-how p{margin:0;font-size:.88rem;color:var(--muted);line-height:1.6}
#a2 .a2-facts{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;
  background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
#a2 .a2-fact{background:var(--bg);padding:14px 16px}
#a2 .a2-fact dt{font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);margin-bottom:5px}
#a2 .a2-fact dd{margin:0;font-size:.92rem;font-weight:600}
#a2 .a2-foot-note{margin:14px 0 0;font-size:.8rem;color:var(--muted);line-height:1.6}
#a2 .a2-end{display:flex;align-items:center;justify-content:space-between;gap:26px;flex-wrap:wrap;
  border-top:1px solid var(--border);padding-top:34px}
#a2 .a2-end .h2{margin-bottom:8px}

/* ---------- A3 · founder-led ---------- */
#a3 .a3-hero{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:44px;
  align-items:center;padding:62px 34px 54px;max-width:1120px;margin:0 auto}
#a3 .a3-hero-copy .h1{font-size:clamp(1.7rem,2.9vw,2.5rem);line-height:1.18;letter-spacing:-.02em}
#a3 .a3-attrib{margin:0;font-size:.92rem;font-weight:600}
#a3 .a3-boiler{background:var(--surface);border-top:1px solid var(--border);
  border-bottom:1px solid var(--border);padding:26px 34px}
#a3 .a3-boiler p{margin:0 auto;max-width:76ch;font-size:1.02rem;line-height:1.65;color:var(--fg);
  text-align:center}
/* Scoped by class, not by :not() — a :not() chain outranks the per-section rules below
   and silently swallows their padding-top. */
#a3 .a3-sec{max-width:1000px;margin:0 auto;padding:0 34px}
#a3 .a3-why{padding-top:58px}
#a3 .a3-prose{color:var(--muted);font-size:1.02rem;line-height:1.75;margin:0;max-width:68ch}
#a3 .a3-bands{padding-top:58px}
#a3 .a3-band{display:grid;grid-template-columns:130px minmax(0,1fr);gap:28px;align-items:center;
  border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  padding:22px;margin-bottom:12px}
#a3 .a3-band.is-right{grid-template-columns:minmax(0,1fr) 130px}
#a3 .a3-band.is-right .a3-band-mark{order:2}
#a3 .a3-band-mark{display:grid;place-items:center;aspect-ratio:1/1;border-radius:var(--radius);
  background:linear-gradient(150deg,rgba(251,107,76,.16),rgba(251,107,76,.03));
  border:1px solid rgba(251,107,76,.28);padding:10px;text-align:center}
#a3 .a3-band-mark span{font-size:.82rem;font-weight:700;color:var(--accent);letter-spacing:.04em;
  text-transform:uppercase;line-height:1.3}
#a3 .a3-band-body h3{margin:0 0 7px;font-size:1.05rem;font-weight:700}
#a3 .a3-band-body p{margin:0;color:var(--muted);font-size:.94rem;line-height:1.65}
#a3 .a3-product{padding-top:62px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:40px;align-items:center}
#a3 .a3-product .h2{margin:8px 0 12px;font-size:1.7rem}
#a3 .a3-product .btn-row{margin-top:20px}
#a3 .a3-product-frame{border:1px solid var(--border);border-radius:var(--radius);
  background:linear-gradient(150deg,#1c2b33,#12181d);aspect-ratio:16/10;display:grid;place-items:center}
#a3 .a3-screen em{font-style:normal;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;
  color:#5f666d}
#a3 .a3-team{padding-top:62px}
#a3 .a3-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
#a3 .a3-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  padding:18px}
#a3 .a3-card-name{margin:14px 0 3px;font-size:.98rem;font-weight:700}
#a3 .a3-card-role{margin:0 0 10px;font-size:.8rem;color:var(--accent);font-weight:600}
#a3 .a3-card-bio{margin:0;font-size:.86rem;color:var(--muted);line-height:1.6}
#a3 .a3-li{display:inline-block;margin-top:12px;font-size:.8rem}
#a3 .a3-cta{padding-top:64px;padding-bottom:70px;text-align:center}
#a3 .a3-cta .btn-row{justify-content:center}
#a3 .a1-legal{margin:26px 0 0;font-size:.78rem;color:var(--muted)}

/* ---------- P1 · newsroom ---------- */
#p1 main{padding:0 34px 70px;max-width:900px;margin:0 auto}
#p1 .p1-head{padding-top:70px}
#p1 .p1-block{margin-top:56px}
#p1 .p1-hint{margin:-6px 0 16px;color:var(--muted);font-size:.86rem;line-height:1.6;max-width:66ch}
#p1 .p1-facts{margin:0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
#p1 .p1-fact{display:grid;grid-template-columns:190px minmax(0,1fr);gap:20px;padding:12px 16px;
  border-bottom:1px solid var(--border);background:var(--bg)}
#p1 .p1-fact:last-child{border-bottom:0}
#p1 .p1-fact:nth-child(odd){background:var(--surface)}
#p1 .p1-fact dt{font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);padding-top:2px}
#p1 .p1-fact dd{margin:0;font-size:.94rem;line-height:1.5}
#p1 .p1-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#p1 .p1-people{display:flex;flex-direction:column;gap:24px}
#p1 .p1-person{display:grid;grid-template-columns:56px minmax(0,1fr);gap:18px;align-items:start;
  padding-top:20px;border-top:1px solid var(--border)}
#p1 .p1-person-name{margin:0;font-size:1rem;font-weight:700}
#p1 .p1-person-role{margin:2px 0 8px;font-size:.82rem;color:var(--accent);font-weight:600}
#p1 .p1-person-bio{margin:0;font-size:.9rem;color:var(--muted);line-height:1.65}
#p1 .p1-quote-for{margin:10px 0 0;font-size:.85rem}
#p1 .p1-quote-for .label{display:inline;margin-right:8px}
#p1 .p1-angles{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
#p1 .p1-angle{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;
  padding:18px 0;border-top:1px solid var(--border)}
#p1 .p1-angle h3{margin:0 0 5px;font-size:1rem;font-weight:700}
#p1 .p1-angle p{margin:0;font-size:.88rem;color:var(--muted);line-height:1.6;max-width:62ch}
#p1 .p1-contact{margin-top:56px;display:flex;justify-content:space-between;align-items:center;
  gap:28px;flex-wrap:wrap;border:1px solid var(--border);border-left:2px solid var(--accent);
  border-radius:var(--radius);background:var(--surface);padding:24px}
#p1 .p1-contact .h2{margin:9px 0 4px;font-size:1.3rem}
#p1 .p1-contact-mail{margin:0 0 10px;font-size:.95rem;color:var(--accent);font-weight:600}
#p1 .p1-contact-note{margin:0;font-size:.85rem;color:var(--muted);line-height:1.6;max-width:52ch}
#p1 .p1-featured{margin-top:56px}

/* ---------- P2 · press kit ---------- */
#p2 main{padding:0 34px 70px}
#p2 .p2-hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:44px;
  align-items:center;padding:66px 0 56px;max-width:1120px;margin:0 auto}
#p2 .p2-hero .h1{font-size:clamp(2.2rem,4vw,3.4rem)}
#p2 .p2-hero .btn-row{margin-top:26px}
#p2 .p2-hero-meta{margin:18px 0 0;font-size:.8rem;color:var(--muted)}
#p2 .p2-hero-art{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#p2 .p2-logo-tile{display:grid;place-items:center;aspect-ratio:4/3;border-radius:var(--radius);
  border:1px solid var(--border)}
#p2 .p2-logo-tile.is-dark{background:#101418}
#p2 .p2-logo-tile.is-light{background:#f5f6f7}
#p2 .p2-block,#p2 .p2-split{max-width:1120px;margin:0 auto;padding-top:56px}
#p2 .p2-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#p2 .p2-split{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:40px;
  align-items:start}
#p2 .p2-facts{margin:0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
#p2 .p2-fact{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;padding:11px 15px;
  border-bottom:1px solid var(--border)}
#p2 .p2-fact:last-child{border-bottom:0}
#p2 .p2-fact dt{font-size:.66rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);padding-top:2px}
#p2 .p2-fact dd{margin:0;font-size:.9rem;line-height:1.5}
#p2 .p2-people{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
#p2 .p2-person{display:grid;grid-template-columns:56px minmax(0,1fr);gap:14px;align-items:start}
#p2 .p2-person-name{margin:0 0 6px;font-size:.92rem;font-weight:700}
#p2 .p2-person-bio{margin:0;font-size:.84rem;color:var(--muted);line-height:1.6}
#p2 .p2-note{margin:18px 0 0;font-size:.85rem;color:var(--muted);line-height:1.65;max-width:74ch}
#p2 .p2-chips{display:flex;flex-wrap:wrap;gap:10px}
#p2 .p2-chip{border:1px solid var(--border);border-radius:999px;padding:9px 16px;font-size:.86rem;
  color:var(--fg);background:var(--surface)}

/* ---------- P3 · reporter's cheat sheet ---------- */
#p3 .p3-grid{display:grid;grid-template-columns:minmax(0,1fr) 288px;gap:44px;
  padding:66px 34px 70px;max-width:1160px;margin:0 auto}
#p3 .p3-body{min-width:0}
#p3 .p3-block{margin-top:52px}
#p3 .p3-rows{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
#p3 .p3-row{display:grid;grid-template-columns:170px minmax(0,1fr);gap:20px;padding:11px 15px;
  border-bottom:1px solid var(--border)}
#p3 .p3-row:last-child{border-bottom:0}
#p3 .p3-key{font-family:var(--mono);font-size:.74rem;color:var(--muted);text-transform:lowercase;
  letter-spacing:0;padding-top:2px}
#p3 .p3-name{font-size:.84rem;color:var(--muted);padding-top:2px;line-height:1.45}
#p3 .p3-val{font-size:.92rem;line-height:1.5}
#p3 .p3-quote{margin:0 0 14px;border-left:2px solid var(--accent);padding:2px 0 2px 20px}
#p3 .p3-quote p{margin:0 0 9px;font-size:1.05rem;line-height:1.6;color:var(--fg)}
#p3 .p3-quote footer{font-size:.82rem;color:var(--muted)}
#p3 .p3-draft{color:var(--accent);border:1px solid rgba(251,107,76,.4);border-radius:999px;
  padding:2px 9px;font-size:.68rem;margin-left:8px;white-space:nowrap}
#p3 .p3-angles{display:flex;flex-direction:column}
#p3 .p3-angle{padding:16px 0;border-top:1px solid var(--border)}
#p3 .p3-angle h3{margin:0 0 5px;font-size:.98rem;font-weight:700}
#p3 .p3-angle p{margin:0;font-size:.88rem;color:var(--muted);line-height:1.6;max-width:64ch}
#p3 .p3-who{margin-top:8px !important;font-size:.82rem !important;color:var(--fg) !important}
#p3 .p3-rail{display:flex;flex-direction:column;gap:12px;align-self:start}
#p3 .p3-rail-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  padding:18px}
#p3 .p3-rail-name{margin:10px 0 4px;font-size:.95rem;font-weight:700;line-height:1.4}
#p3 .p3-rail-mail{margin:0 0 14px;font-size:.88rem;color:var(--accent);font-weight:600}
#p3 .p3-rail-note{margin:14px 0 0;font-size:.78rem;color:var(--muted);line-height:1.6}
#p3 .p3-rail-fact{margin:10px 0 0;font-size:.85rem;line-height:1.5}
#p3 .p3-rail-card .label + .btn{margin-top:12px}

/* ---------- responsive ---------- */
@media (max-width:1080px){
  #a2 .a2-grid,#p3 .p3-grid{grid-template-columns:minmax(0,1fr)}
  #a2 .a2-rail,#p3 .p3-rail{flex-direction:row;flex-wrap:wrap;gap:10px}
  #a2 .a2-rail-item{border-left:0;border-bottom:2px solid var(--border);padding:0 0 7px}
  #a2 .a2-people,#a2 .a2-hows,#a2 .a2-svcs,#a3 .a3-cards,#p2 .p2-tiles,#p2 .p2-people{
    grid-template-columns:repeat(2,minmax(0,1fr))}
  #a3 .a3-hero,#a3 .a3-product,#p2 .p2-hero,#p2 .p2-split{grid-template-columns:minmax(0,1fr)}
  #a1 .a1-founder{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:720px){
  .chrome-nav{display:none}
  #a1 section,#p1 main,#p2 main{padding-left:20px;padding-right:20px}
  #a2 .a2-grid,#p3 .p3-grid,#a3 .a3-hero{padding-left:20px;padding-right:20px}
  #a1 .a1-how-row,#a1 .a1-cred-row,#p1 .p1-fact,#p2 .p2-fact,#p3 .p3-row{
    grid-template-columns:minmax(0,1fr);gap:8px}
  #a2 .a2-people,#a2 .a2-hows,#a2 .a2-svcs,#a3 .a3-cards,#p2 .p2-tiles,#p2 .p2-people,
  #p1 .p1-tiles,#a2 .a2-facts{grid-template-columns:minmax(0,1fr)}
  #a3 .a3-band,#a3 .a3-band.is-right{grid-template-columns:minmax(0,1fr)}
  #a3 .a3-band.is-right .a3-band-mark{order:0}
  #a3 .a3-band-mark{max-width:110px}
}
@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
""" % {"bg": BG, "fg": FG, "muted": MUTED, "surface": SURFACE, "border": BORDER,
       "accent": ACCENT, "afg": ACCENT_FG, "radius": RADIUS, "font": body_font}


JS = """
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var block = btn.closest('.copyblock');
    var text = block.querySelector('.copyblock-text').innerText;
    var flag = btn.querySelector('.copied');
    var done = function () { flag.textContent = 'Copied'; setTimeout(function () { flag.textContent = ''; }, 1600); };
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done, done); } else { done(); }
  });
});
"""


# =========================================================================
# Assembly
# =========================================================================

PROTOTYPES = [
    {
        "id": "a1", "tag": "About · Option 1", "name": "Founder letter",
        "why": "One column, wide measure, story first. The boilerplate opens the page as a pull-quote, "
               "then why → how → founder → team → where we stand. Reads like a person wrote it, which is "
               "what the checklist's 'warm tone' asks for.",
        "trade": "<b>Strong at:</b> trust, tone, a journalist reading top to bottom. "
                 "<b>Weak at:</b> scanning for a specific fact — there is no index and no fact table.",
        "active": "About", "build": about_a1,
    },
    {
        "id": "a2", "tag": "About · Option 2", "name": "Company dossier",
        "why": "Structured and scannable: a section rail, the boilerplate explicitly labelled as reusable, "
               "people as equal cards, and a real fact table at the end. Built so a journalist can lift "
               "anything without emailing you.",
        "trade": "<b>Strong at:</b> credibility, press-readiness, three equal team members. "
                 "<b>Weak at:</b> warmth — it reads corporate, and the 'why we built this' story gets less air.",
        "active": "About", "build": about_a2,
    },
    {
        "id": "a3", "tag": "About · Option 3", "name": "Founder-led",
        "why": "A portrait and a quote carry the hero, then alternating bands for how we work, the product "
               "with a screenshot, and three equal team cards. The formal face the checklist asks for, "
               "made the page's centre of gravity.",
        "trade": "<b>Strong at:</b> personality, memorability, a founder-brand pitch. "
                 "<b>Weak at:</b> it needs a genuinely good professional photo to work at all, and it "
                 "leans on one person while the checklist wants three visible roles.",
        "active": "About", "build": about_a3,
    },
    {
        "id": "p1", "tag": "Press · Option 1", "name": "Newsroom",
        "why": "The conventional press page, done properly: boilerplate with working copy buttons, a full "
               "fact table, asset tiles, people with an explicit 'quote for' line, suggested topics, then "
               "the press contact. Covers every checklist item in reading order.",
        "trade": "<b>Strong at:</b> completeness — nothing on the checklist is missing. "
                 "<b>Weak at:</b> length; the download CTA sits below a lot of text.",
        "active": "", "build": press_p1,
    },
    {
        "id": "p2", "tag": "Press · Option 2", "name": "Press kit first",
        "why": "Assets lead. One prominent .zip download, logo tiles shown on both light and dark, then "
               "individual files, then facts and boilerplate side by side. Treats the page as a brand-asset "
               "hub that also happens to carry the facts.",
        "trade": "<b>Strong at:</b> designers and editors who just need files, fast. "
                 "<b>Weak at:</b> it implies the kit already exists — until the zip is real, the hero "
                 "is writing a cheque you can't cash.",
        "active": "", "build": press_p2,
    },
    {
        "id": "p3", "tag": "Press · Option 3", "name": "Reporter's cheat sheet",
        "why": "Written for someone on deadline: monospace fact keys, pre-written quotes marked as drafts "
               "pending sign-off, each topic paired with who to quote, and a sticky rail holding the press "
               "contact and the kit download. Utilitarian on purpose.",
        "trade": "<b>Strong at:</b> speed, and the quote-ready block is what actually gets you into "
                 "articles. <b>Weak at:</b> it looks like a document, not a brand page — and pre-written "
                 "quotes need real sign-off before they go live.",
        "active": "", "build": press_p3,
    },
]


def proto_section(p: dict) -> str:
    press_link = p["id"].startswith("p") or p["id"] in ("a2", "a3")
    return f"""
    <section class="proto" id="{p['id']}">
      <div class="proto-head">
        <span class="tag">{p['tag']}</span>
        <h2>{p['name']}</h2>
        <p class="why">{p['why']}</p>
        <p class="trade">{p['trade']}</p>
      </div>
      <div class="frame">
        <div class="page" data-page="{p['id']}">
          {chrome(p['active'])}
          {p['build']()}
          {footer_bar(press_link)}
        </div>
      </div>
    </section>"""


def page_body() -> str:
    jump = "".join(f'<a href="#{p["id"]}">{p["tag"]} — {p["name"]}</a>' for p in PROTOTYPES)
    # Each prototype's layout CSS is scoped under its wrapper id (#a1, #p3, …), which
    # is what keeps six page designs in one document from colliding.
    protos = "".join(proto_section(p) for p in PROTOTYPES)
    return f"""
  <div class="lab">
    <div class="lab-head">
      <p class="eyebrow">Page prototypes — round 1</p>
      <h1>About page &amp; Press / Media page</h1>
      <p>Six prototypes: three directions for the About page, three for a new Press &amp; Media page.
        Built on the live site's tokens (<code>#0b0e11</code> canvas, Coral <code>#fb6b4c</code>, Manrope)
        with the real header and footer, so what you see is what the page would look like.</p>
      <p>Content follows the two checklists. Confirmed facts — legal name, seat, register,
        Geschäftsführer, {PRODUCT} — are real. Everything unconfirmed is a marked placeholder.</p>
      <div class="legend">
        <span><span class="ph">like this</span> = needs your input before build</span>
        <span>·</span>
        <span>Copy buttons on the boilerplate blocks actually work</span>
        <span>·</span>
        <span>Portraits and screenshots are framed placeholders, not stock photos</span>
      </div>
      <div class="jump">{jump}</div>
    </div>
    {protos}
  </div>"""


def full_document(body: str, style: str) -> str:
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<title>About &amp; Press page prototypes — XoXoCom</title>\n"
        f"<style>{style}</style>\n</head>\n<body>{body}\n<script>{JS}</script>\n</body>\n</html>\n"
    )


def fragment_document(body: str, style: str) -> str:
    return (
        "<title>About &amp; Press page prototypes — XoXoCom</title>\n"
        f"<style>{style}</style>\n{body}\n<script>{JS}</script>\n"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Build About / Press page prototypes.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output directory")
    args = ap.parse_args()

    face = manrope_face()
    style = css(face)
    body = page_body()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(full_document(body, style), encoding="utf-8")
    (out / "artifact.html").write_text(fragment_document(body, style), encoding="utf-8")

    print(f"{len(PROTOTYPES)} prototypes: " + ", ".join(p["id"] for p in PROTOTYPES))
    print("font: " + ("Manrope inlined from the Next build" if face else "system stack (no .next build found)"))
    print(f"preview  -> {out / 'index.html'}")
    print(f"fragment -> {out / 'artifact.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
