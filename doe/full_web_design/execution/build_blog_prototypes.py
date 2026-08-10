#!/usr/bin/env python3
"""Build side-by-side layout prototypes for the XoXoCom blog, so a direction can be
chosen before any Next.js route is written.

Ships five prototypes — three for the /blog index, two for the /blog/[slug] article —
plus a states panel showing the tag filter in every state it can be in. Each is painted
with the site's real design tokens (sites/xoxocom/app/globals.css) and the site's real
typeface (Manrope, inlined as a data URI from the Next build output, so the preview
needs no network access) and wrapped in the site's real header and footer.

Content discipline — the repo's hard rule is that nothing here is invented prose:

  * Every editorial string (headline, subtitle, excerpt, tag label, empty state) is a
    visually marked slot carrying a length spec, so the gaps are impossible to miss and
    the copy spec falls out of the prototype directly.
  * Article body text is Latin filler, loudly labelled as such. It exists to show
    typographic measure, rhythm and the .post-prose stylesheet under real Manrope — it
    is not a suggestion about content.
  * Dates, reading times and functional UI labels ("Read more", "Filter by topic") are
    rendered for real, because they are system-generated or already specified.

Usage:
    python execution/build_blog_prototypes.py
    python execution/build_blog_prototypes.py --out .tmp/blog_prototypes

Outputs:
    .tmp/blog_prototypes/index.html     standalone preview (open locally)
    .tmp/blog_prototypes/artifact.html  body-only fragment (for publishing)

Deterministic and std-lib only.
"""

from __future__ import annotations

import argparse
import base64
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = REPO_ROOT / "sites" / "xoxocom"
DEFAULT_OUT = REPO_ROOT / ".tmp" / "blog_prototypes"

# --- design tokens (mirrors sites/xoxocom/app/globals.css @theme) ---------
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
    # so one file covers the whole 200-800 weight range the site uses.
    hits = sorted(media.glob("*-s.p.woff2")) if media.is_dir() else []
    if not hits:
        return ""
    b64 = base64.b64encode(hits[0].read_bytes()).decode("ascii")
    return (
        "@font-face{font-family:'Manrope';font-style:normal;font-weight:200 800;"
        f"font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
    )


# =========================================================================
# Slots — every editorial string on this page is one of these
# =========================================================================

def ph(label: str) -> str:
    """Inline slot. Renders as [ label ] in coral."""
    return f'<span class="ph">{label}</span>'


def slot(label: str, spec: str) -> str:
    """Block-level slot with a length spec, for anything longer than a few words."""
    return (
        f'<span class="slot"><span class="slot-label">{label}</span>'
        f'<span class="slot-spec">{spec}</span></span>'
    )


# Latin filler for article bodies. Not content — it is here so the prose
# stylesheet can be judged at a real measure. Kept short and reused, because
# the point is typography, not volume.
LOREM_1 = (
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor "
    "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud "
    "exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
)
LOREM_2 = (
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu "
    "fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa "
    "qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste "
    "natus error sit voluptatem accusantium doloremque laudantium."
)
LOREM_3 = (
    "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia "
    "consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt."
)
LOREM_4 = "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere."
LOREM_5 = "Curabitur sodales ligula in libero, sed dignissim lacinia nunc."

# Shown in place, inside each article prototype, directly above the body. The legend at
# the top of the lab is not enough: a reviewer screenshotting one article prototype in
# isolation must still be able to tell filler from proposed copy at a glance.
FILLER_NOTE = (
    '<p class="filler-note">Latin filler below &mdash; it is here to show typographic '
    "measure and the <code>.post-prose</code> stylesheet. It is not proposed content.</p>"
)


# =========================================================================
# Structural fixtures — shape only, never copy
# =========================================================================

# Varied widths so chip wrapping and the filter row can actually be judged.
TAGS = [
    "tag one",
    "a longer tag name",
    "tag 3",
    "tag four",
    "tag 5",
    "another long tag",
]

# (date, reading time, tag indices, has_cover) — dates and reading times are
# system-generated values, so they render for real to show the format.
POSTS = [
    ("12 August 2026", 7, [0, 2], True),
    ("4 August 2026", 4, [1], True),
    ("28 July 2026", 11, [0, 3, 4], False),
    ("19 July 2026", 6, [2, 5], True),
    ("11 July 2026", 3, [1, 3], False),
    ("2 July 2026", 9, [4], True),
]

TITLE_SPEC = "50-70 chars"
EXCERPT_SPEC = "120-160 chars — also used as the meta description"


def tag_pill(i: int, small: bool = False) -> str:
    cls = "tpill tpill-sm" if small else "tpill"
    return f'<span class="{cls}">{ph(TAGS[i])}</span>'


def cover(ratio: str = "16/9", label: str = "cover image") -> str:
    return f'<span class="cover" style="aspect-ratio:{ratio}" aria-hidden="true"><i>{label}</i></span>'


# =========================================================================
# Shared chrome — the site's real header and footer
# =========================================================================

NAV = ["Products", "Services", "About", "Blog"]


def chrome(active: str = "Blog") -> str:
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


def footer_bar() -> str:
    return """
      <footer class="foot">
        <span class="wordmark sm"><b>X</b>o<b>X</b>oCom</span>
        <div class="foot-links">
          <span class="foot-link">Impressum</span>
          <span class="foot-link">Datenschutz</span>
          <span class="foot-link">AGB</span>
        </div>
      </footer>"""


def filter_row(active: list[int] | None = None, counts: bool = True) -> str:
    """The tag filter. Chips are links in the real build (server-rendered, zero JS)."""
    active = active or []
    chips = ""
    for i, _ in enumerate(TAGS):
        on = i in active
        n = f'<em>{[8, 5, 12, 3, 6, 2][i]}</em>' if counts else ""
        chips += f'<span class="chip{" is-on" if on else ""}">{ph(TAGS[i])}{n}</span>'
    clear = '<span class="chip chip-clear">Clear</span>' if active else ""
    return f"""
        <div class="filter">
          <span class="filter-label">Filter by topic</span>
          <div class="chips">{chips}{clear}</div>
        </div>"""


# =========================================================================
# Index prototypes
# =========================================================================

def index_b1() -> str:
    """B1 - Dense card grid. Three columns, uniform cards, volume-friendly."""
    cards = ""
    for date, mins, tags, has_cover in POSTS:
        pills = "".join(tag_pill(t, small=True) for t in tags)
        cards += f"""
            <article class="b1-card">
              {cover("16/9") if has_cover else '<span class="cover cover-none" aria-hidden="true"><i>no cover</i></span>'}
              <div class="b1-card-body">
                <div class="pills">{pills}</div>
                <h2 class="b1-title">{slot("post title", TITLE_SPEC)}</h2>
                <p class="b1-excerpt">{slot("excerpt", EXCERPT_SPEC)}</p>
                <p class="card-meta">{date} <span class="sep">·</span> {mins} min read</p>
              </div>
            </article>"""
    return f"""
      <main class="b1">
        <header class="b1-head">
          <p class="eyebrow">Blog</p>
          <h1 class="h1">{slot("index H1", "40-60 chars")}</h1>
          <p class="b1-sub">{slot("index subtitle", "one line, 80-120 chars")}</p>
        </header>
        {filter_row()}
        <div class="b1-grid">{cards}</div>
      </main>"""


def index_b2() -> str:
    """B2 - Feature + grid. Newest post leads at full width, rest in two columns."""
    lead_date, lead_mins, lead_tags, _ = POSTS[0]
    lead_pills = "".join(tag_pill(t, small=True) for t in lead_tags)
    rest = ""
    for date, mins, tags, has_cover in POSTS[1:]:
        pills = "".join(tag_pill(t, small=True) for t in tags)
        rest += f"""
            <article class="b2-card">
              {cover("16/9") if has_cover else '<span class="cover cover-none" aria-hidden="true"><i>no cover</i></span>'}
              <div class="b2-card-body">
                <div class="pills">{pills}</div>
                <h3 class="b2-title">{slot("post title", TITLE_SPEC)}</h3>
                <p class="b2-excerpt">{slot("excerpt", EXCERPT_SPEC)}</p>
                <p class="card-meta">{date} <span class="sep">·</span> {mins} min read</p>
              </div>
            </article>"""
    return f"""
      <main class="b2">
        <header class="b2-head">
          <p class="eyebrow">Blog</p>
          <h1 class="h1">{slot("index H1", "40-60 chars")}</h1>
          <p class="b1-sub">{slot("index subtitle", "one line, 80-120 chars")}</p>
        </header>
        {filter_row(active=[0])}
        <article class="b2-lead">
          <div class="b2-lead-art">{cover("3/2")}</div>
          <div class="b2-lead-body">
            <div class="pills">{lead_pills}</div>
            <h2 class="b2-lead-title">{slot("featured post title", TITLE_SPEC)}</h2>
            <p class="b2-lead-excerpt">{slot("featured excerpt", "longer here — 200-260 chars")}</p>
            <p class="card-meta">{lead_date} <span class="sep">·</span> {lead_mins} min read</p>
            <span class="readmore">Read more &rarr;</span>
          </div>
        </article>
        <div class="b2-grid">{rest}</div>
      </main>"""


def index_b3() -> str:
    """B3 - Editorial list. No covers in the list; rules, measure and hierarchy carry it."""
    rows = ""
    for date, mins, tags, _ in POSTS:
        pills = "".join(tag_pill(t, small=True) for t in tags)
        rows += f"""
            <article class="b3-row">
              <div class="b3-rail">
                <p class="b3-date">{date}</p>
                <p class="b3-mins">{mins} min read</p>
              </div>
              <div class="b3-body">
                <h2 class="b3-title">{slot("post title", TITLE_SPEC)}</h2>
                <p class="b3-excerpt">{slot("excerpt", EXCERPT_SPEC)}</p>
                <div class="pills">{pills}</div>
              </div>
            </article>"""
    return f"""
      <main class="b3">
        <header class="b3-head">
          <p class="eyebrow">Blog</p>
          <h1 class="h1">{slot("index H1", "40-60 chars")}</h1>
          <p class="b1-sub">{slot("index subtitle", "one line, 80-120 chars")}</p>
        </header>
        {filter_row(active=[1, 3])}
        <div class="b3-rows">{rows}</div>
      </main>"""


# =========================================================================
# Article prototypes
# =========================================================================

def prose_demo() -> str:
    """The .post-prose stylesheet exercised across every element marked-down text
    can produce, so the typography can be judged before it is written."""
    return f"""
          <p>{LOREM_1}</p>
          <h2>{ph("H2 section heading")}</h2>
          <p>{LOREM_2}</p>
          <ul>
            <li>{LOREM_3}</li>
            <li>{LOREM_4}</li>
            <li>{LOREM_5}</li>
          </ul>
          <h3>{ph("H3 sub-heading")}</h3>
          <p>{LOREM_3} Inline <code>code</code> sits in the run of text, and a
             <a href="#">link looks like this</a>.</p>
          <blockquote><p>{ph("pull quote — 1-2 sentences, optional")}</p></blockquote>
          <figure>
            {cover("16/9", "in-body image")}
            <figcaption>{ph("image caption — optional, but alt text is required")}</figcaption>
          </figure>
          <pre><code>// fenced code block: styled, not syntax-highlighted
const posts = await listPosts({{ lang, tags }});</code></pre>
          <table>
            <thead><tr><th>{ph("column")}</th><th>{ph("column")}</th></tr></thead>
            <tbody>
              <tr><td>Lorem ipsum</td><td>dolor sit amet</td></tr>
              <tr><td>Consectetur</td><td>adipiscing elit</td></tr>
            </tbody>
          </table>
          <p>{LOREM_1}</p>"""


def article_c1() -> str:
    """C1 - Centered column. One measure, everything stacked. The classic."""
    pills = "".join(tag_pill(t) for t in [0, 2])
    return f"""
      <main class="c1">
        <article class="c1-wrap">
          <nav class="crumbs"><span>Home</span> <i>/</i> <span>Blog</span> <i>/</i>
            <span class="is-here">{ph("post title")}</span></nav>

          <header class="c1-head">
            <p class="eyebrow">{ph(TAGS[0])}</p>
            <h1 class="h1">{slot("article title", TITLE_SPEC)}</h1>
            <p class="c1-stand">{slot("standfirst / excerpt", EXCERPT_SPEC)}</p>
            <div class="byline">
              <span class="avatar" aria-hidden="true"><i>AB</i></span>
              <span>By {ph("author name")}</span>
              <span class="sep">·</span><span>12 August 2026</span>
              <span class="sep">·</span><span>7 min read</span>
            </div>
          </header>

          <div class="c1-cover">{cover("21/9")}</div>

          {FILLER_NOTE}
          <div class="post-prose">{prose_demo()}</div>

          <footer class="c1-foot">
            <div class="pills">{pills}</div>
            <span class="backlink">&larr; Back to blog</span>
          </footer>
        </article>
      </main>"""


def article_c2() -> str:
    """C2 - Sticky meta rail. Metadata lives left and follows the reader down."""
    pills = "".join(tag_pill(t, small=True) for t in [1, 3, 4])
    return f"""
      <main class="c2">
        <div class="c2-grid">
          <aside class="c2-rail">
            <span class="backlink">&larr; Back to blog</span>
            <div class="c2-rail-card">
              <span class="avatar" aria-hidden="true"><i>AB</i></span>
              <p class="c2-rail-name">{ph("author name")}</p>
              <p class="c2-rail-meta">12 August 2026</p>
              <p class="c2-rail-meta">7 min read</p>
            </div>
            <div class="c2-rail-block">
              <span class="label">Topics</span>
              <div class="pills">{pills}</div>
            </div>
            <div class="c2-rail-block">
              <span class="label">Language</span>
              <p class="c2-rail-meta">English</p>
            </div>
          </aside>

          <article class="c2-body">
            <header class="c2-head">
              <h1 class="h1">{slot("article title", TITLE_SPEC)}</h1>
              <p class="c1-stand">{slot("standfirst / excerpt", EXCERPT_SPEC)}</p>
            </header>
            <div class="c2-cover">{cover("2/1")}</div>
            {FILLER_NOTE}
            <div class="post-prose">{prose_demo()}</div>
          </article>
        </div>
      </main>"""


# =========================================================================
# States panel — the things a single screenshot of a happy path never shows
# =========================================================================

def states_panel() -> str:
    return f"""
      <div class="states">
        <div class="state">
          <p class="state-cap">Filter — nothing selected</p>
          <div class="state-box">{filter_row()}</div>
        </div>
        <div class="state">
          <p class="state-cap">Filter — two selected, AND-narrowed, Clear appears</p>
          <div class="state-box">{filter_row(active=[1, 3])}</div>
        </div>
        <div class="state">
          <p class="state-cap">Empty — no posts published yet</p>
          <div class="state-box"><div class="empty">{slot("empty state", "1 sentence")}</div></div>
        </div>
        <div class="state">
          <p class="state-cap">Empty — filter matches nothing</p>
          <div class="state-box"><div class="empty">{slot("filtered empty state", "1 sentence")}
            <span class="chip chip-clear">Clear filters</span></div></div>
        </div>
        <div class="state">
          <p class="state-cap">Empty — posts exist, but none in the reader's language</p>
          <div class="state-box"><div class="empty">{slot("wrong-language empty state", "1 sentence")}
            <span class="chip">Show all languages</span></div></div>
        </div>
        <div class="state">
          <p class="state-cap">Article in the other language — notice above the title</p>
          <div class="state-box"><div class="langnote">{slot("language notice", "1 short sentence")}</div></div>
        </div>
      </div>"""


# =========================================================================
# CSS
# =========================================================================

def css(font_face: str) -> str:
    body_font = ("'Manrope', ui-sans-serif, system-ui, sans-serif" if font_face
                 else "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif")
    # Two sets of names on purpose.
    #
    # The --color-* / --radius-card / --font-mono names mirror the site's @theme block
    # (sites/xoxocom/app/globals.css) *exactly*, so the .post-prose rules further down —
    # which are destined for that file — are copy-paste portable with no renaming.
    #
    # The short --bg / --fg / --accent aliases are this lab's own shorthand, used only by
    # the review chrome (frames, jump links, slot markers). They never ship anywhere.
    root = (
        ":root{"
        f"--color-bg:{BG};--color-fg:{FG};--color-muted:{MUTED};--color-surface:{SURFACE};"
        f"--color-border:{BORDER};--color-accent:{ACCENT};--color-accent-fg:{ACCENT_FG};"
        f"--radius-card:{RADIUS};"
        f"--font-sans:{body_font};"
        "--font-mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;"
        "--bg:var(--color-bg);--fg:var(--color-fg);--muted:var(--color-muted);"
        "--surface:var(--color-surface);--border:var(--color-border);"
        "--accent:var(--color-accent);--accent-fg:var(--color-accent-fg);"
        "--radius:var(--radius-card);--font:var(--font-sans);--mono:var(--font-mono);}"
    )
    return font_face + root + CSS_BODY


CSS_BODY = """
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#07090b;color:var(--fg);font-family:var(--font);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}

/* ---------- lab shell ---------- */
.lab{max-width:1320px;margin:0 auto;padding:52px 24px 120px}
.lab-head h1{font-size:clamp(1.9rem,4vw,2.6rem);line-height:1.05;letter-spacing:-.025em;
  font-weight:800;margin:0 0 14px;text-wrap:balance}
.lab-head p{color:var(--muted);max-width:74ch;line-height:1.65;margin:0 0 10px;font-size:.95rem}
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

/* ---------- shared ---------- */
.page{background:var(--bg);color:var(--fg);font-size:16px}
.eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--accent);margin:0 0 14px}
.label{display:block;font-size:.66rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);margin-bottom:10px}
.h1{font-size:clamp(2rem,3.4vw,3rem);line-height:1.06;letter-spacing:-.028em;font-weight:800;
  margin:0 0 18px;text-wrap:balance}
.sep{color:var(--border)}
.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius);
  background:var(--accent);color:var(--accent-fg);font-weight:700;font-size:.92rem;
  padding:12px 22px;border:1px solid var(--accent);cursor:default}
.btn-sm{padding:8px 16px;font-size:.82rem}
.empty{border:1px dashed var(--border);border-radius:var(--radius);padding:26px;color:var(--muted);
  font-size:.88rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}
.readmore{display:inline-block;margin-top:16px;font-size:.88rem;font-weight:600;color:var(--accent)}
.backlink{display:inline-block;font-size:.86rem;color:var(--muted)}

/* slots — every editorial string */
.ph{color:var(--accent);background:rgba(251,107,76,.09);border-bottom:1px dashed rgba(251,107,76,.55);
  padding:0 4px;border-radius:3px;font-weight:600;font-size:.94em}
.ph::before{content:"[ "}
.ph::after{content:" ]"}
.slot{display:block;border:1px dashed rgba(251,107,76,.5);background:rgba(251,107,76,.06);
  border-radius:6px;padding:8px 11px}
.slot-label{display:block;color:var(--accent);font-weight:700;font-size:.86rem;letter-spacing:-.01em}
.slot-spec{display:block;color:var(--muted);font-size:.72rem;font-weight:500;margin-top:2px;
  letter-spacing:.02em}

/* wordmark + chrome */
.wordmark{font-weight:800;letter-spacing:-.02em;font-size:1.1rem;color:var(--fg)}
.wordmark b{color:var(--accent);font-weight:800}
.wordmark.sm{font-size:.95rem}
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

/* covers */
.cover{display:grid;place-items:center;width:100%;border-radius:var(--radius);
  border:1px solid var(--border);background:linear-gradient(150deg,#1c2b33,#12181d)}
.cover i{font-style:normal;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;
  color:#5f666d}
.cover-none{background:repeating-linear-gradient(45deg,#12161a,#12161a 8px,#161b20 8px,#161b20 16px);
  aspect-ratio:16/9}

/* avatar */
.avatar{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:999px;flex:none;
  border:1px solid var(--border);background:linear-gradient(155deg,#252b32,#171c21)}
.avatar i{font-style:normal;font-weight:800;font-size:.78rem;color:#5f666d}

/* tag pills (display) and filter chips (interactive) */
.tpill{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;
  padding:4px 11px;font-size:.74rem;color:var(--muted);background:var(--surface)}
.tpill-sm{padding:3px 9px;font-size:.68rem}
/* Deliberately global, not scoped under #b1/#c2 — these are shared by every prototype.
   Anything named after a single prototype belongs in that prototype's #id block below. */
.pills{display:flex;flex-wrap:wrap;gap:6px}
.card-meta{margin:0;font-size:.76rem;color:var(--muted);font-variant-numeric:tabular-nums}
.filler-note{margin:26px 0 -6px;font-size:.74rem;letter-spacing:.04em;color:var(--muted);
  border-left:2px solid var(--border);padding-left:10px}
.filler-note code{font-family:var(--mono);font-size:.95em;color:var(--fg)}
.filter{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;
  padding:18px 0 22px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.filter-label{font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);flex:none;padding-top:4px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);
  border-radius:999px;padding:6px 13px;font-size:.78rem;color:var(--muted);background:transparent;
  transition:border-color .15s,color .15s}
.chip em{font-style:normal;font-size:.68rem;color:#5f666d;font-variant-numeric:tabular-nums}
.chip:hover{border-color:rgba(251,107,76,.6);color:var(--fg)}
.chip.is-on{border-color:var(--accent);background:rgba(251,107,76,.12);color:var(--fg);font-weight:600}
.chip.is-on em{color:var(--accent)}
.chip-clear{color:var(--accent);border-style:dashed}

/* breadcrumbs + byline */
.crumbs{display:flex;gap:8px;align-items:center;font-size:.78rem;color:var(--muted);margin-bottom:26px;
  flex-wrap:wrap}
.crumbs i{font-style:normal;color:var(--border)}
.crumbs .is-here{color:var(--fg)}
.byline{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.85rem;color:var(--muted);
  margin-top:22px}

/* ---------- B1 · dense grid ---------- */
#b1 .b1{padding:66px 34px 24px;max-width:1160px;margin:0 auto}
#b1 .b1-head{max-width:62ch;margin-bottom:34px}
#b1 .b1-sub{margin:0;color:var(--muted);font-size:1.02rem;line-height:1.6}
#b1 .b1-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:34px}
#b1 .b1-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s}
#b1 .b1-card:hover{border-color:rgba(251,107,76,.6)}
#b1 .b1-card .cover{border:0;border-radius:0;border-bottom:1px solid var(--border)}
#b1 .b1-card-body{padding:18px;display:flex;flex-direction:column;gap:11px;flex:1}
#b1 .b1-title{margin:0;font-size:1.05rem;font-weight:700;letter-spacing:-.015em;line-height:1.3}
#b1 .b1-excerpt{margin:0;flex:1}

/* ---------- B2 · feature + grid ---------- */
#b2 .b2{padding:66px 34px 24px;max-width:1160px;margin:0 auto}
#b2 .b2-head{max-width:62ch;margin-bottom:34px}
#b2 .b2-lead{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:32px;
  align-items:center;margin-top:34px;padding:26px;border:1px solid var(--border);
  border-radius:var(--radius);background:var(--surface)}
#b2 .b2-lead-body{display:flex;flex-direction:column;gap:13px}
#b2 .b2-lead-title{margin:0;font-size:1.7rem;font-weight:800;letter-spacing:-.025em;line-height:1.15}
#b2 .b2-lead-excerpt{margin:0}
#b2 .b2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:22px}
#b2 .b2-card{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;
  display:grid;grid-template-columns:180px minmax(0,1fr);transition:border-color .15s}
#b2 .b2-card:hover{border-color:rgba(251,107,76,.6)}
#b2 .b2-card .cover{border:0;border-radius:0;height:100%;aspect-ratio:auto;
  border-right:1px solid var(--border)}
#b2 .b2-card-body{padding:17px;display:flex;flex-direction:column;gap:10px}
#b2 .b2-title{margin:0;font-size:1rem;font-weight:700;letter-spacing:-.015em;line-height:1.3}
#b2 .b2-excerpt{margin:0;flex:1}

/* ---------- B3 · editorial list ---------- */
#b3 .b3{padding:66px 34px 24px;max-width:960px;margin:0 auto}
#b3 .b3-head{max-width:62ch;margin-bottom:34px}
#b3 .b3-rows{display:flex;flex-direction:column}
#b3 .b3-row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:30px;
  padding:28px 0;border-bottom:1px solid var(--border)}
#b3 .b3-rail{padding-top:3px}
#b3 .b3-date{margin:0 0 4px;font-size:.82rem;color:var(--fg);font-variant-numeric:tabular-nums}
#b3 .b3-mins{margin:0;font-size:.76rem;color:var(--muted)}
#b3 .b3-body{display:flex;flex-direction:column;gap:12px}
#b3 .b3-title{margin:0;font-size:1.4rem;font-weight:700;letter-spacing:-.022em;line-height:1.22}
#b3 .b3-excerpt{margin:0}

/* ---------- C1 · centered article ---------- */
#c1 .c1{padding:56px 34px 30px}
#c1 .c1-wrap{max-width:720px;margin:0 auto}
#c1 .c1-head .h1{margin-bottom:16px}
#c1 .c1-stand{margin:0}
#c1 .c1-cover{margin:34px 0 8px}
#c1 .c1-foot{margin-top:44px;padding-top:24px;border-top:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}

/* ---------- C2 · sticky meta rail ---------- */
#c2 .c2{padding:56px 34px 30px}
#c2 .c2-grid{display:grid;grid-template-columns:210px minmax(0,1fr);gap:52px;
  max-width:1020px;margin:0 auto}
#c2 .c2-rail{align-self:start;position:sticky;top:24px;display:flex;flex-direction:column;gap:22px}
#c2 .c2-rail-card{display:flex;flex-direction:column;gap:4px;padding-top:18px;
  border-top:1px solid var(--border)}
#c2 .c2-rail-card .avatar{margin-bottom:8px}
#c2 .c2-rail-name{margin:0;font-size:.9rem;font-weight:700}
#c2 .c2-rail-meta{margin:0;font-size:.8rem;color:var(--muted)}
#c2 .c2-rail-block{padding-top:18px;border-top:1px solid var(--border)}
#c2 .c2-body{min-width:0}
#c2 .c2-head .h1{margin-bottom:16px}
#c2 .c2-cover{margin:30px 0 8px}

/* ---------- .post-prose — the candidate article stylesheet ----------
   PORTABLE BLOCK. Every rule below uses the site's real @theme token names
   (--color-fg, --radius-card, --font-mono …), so this can be pasted into
   sites/xoxocom/app/globals.css verbatim, with no renaming.

   In the real build, the rules that .legal-prose already defines get folded into a
   shared selector list (.legal-prose, .post-prose { … }) rather than duplicated, so
   the legal pages stay byte-identical and there is one source of truth. What is
   genuinely new is the article-only half: measure, scroll-margin, figure, pre,
   table, blockquote. */
.post-prose{color:var(--color-fg);line-height:1.75;font-size:1.05rem;margin-top:30px}
.post-prose > *:first-child{margin-top:0}
.post-prose p{margin:0 0 1.15rem}
.post-prose h2{font-size:1.45rem;font-weight:700;letter-spacing:-.018em;line-height:1.25;
  margin:2.6rem 0 .85rem;scroll-margin-top:5rem}
.post-prose h3{font-size:1.12rem;font-weight:600;margin:1.9rem 0 .5rem;scroll-margin-top:5rem}
.post-prose a{color:var(--color-accent);text-decoration:underline;text-underline-offset:2px}
.post-prose strong{color:var(--color-fg);font-weight:600}
.post-prose ul{list-style:disc;padding-left:1.5rem;margin:1.15rem 0}
.post-prose ol{list-style:decimal;padding-left:1.5rem;margin:1.15rem 0}
.post-prose li{margin-bottom:.5rem}
.post-prose hr{border:0;border-top:1px solid var(--color-border);margin:2.5rem 0}
.post-prose blockquote{border-left:3px solid var(--color-accent);padding-left:1.15rem;
  margin:1.7rem 0;color:var(--color-muted)}
.post-prose blockquote p{margin:0}
.post-prose figure{margin:2rem 0}
.post-prose figcaption{margin-top:.65rem;font-size:.82rem;color:var(--color-muted);
  text-align:center}
.post-prose img,.post-prose .cover{border-radius:var(--radius-card);
  border:1px solid var(--color-border);max-width:100%;height:auto}
.post-prose pre{background:var(--color-surface);border:1px solid var(--color-border);
  border-radius:var(--radius-card);padding:1rem 1.15rem;overflow-x:auto;margin:1.7rem 0;
  font-size:.88rem;line-height:1.6}
.post-prose pre code{background:none;border:0;padding:0;font-family:var(--font-mono)}
.post-prose :not(pre) > code{font-family:var(--font-mono);font-size:.9em;
  background:var(--color-surface);border:1px solid var(--color-border);
  border-radius:.375rem;padding:.1em .4em}
.post-prose table{width:100%;border-collapse:collapse;margin:1.7rem 0;font-size:.94rem}
.post-prose th,.post-prose td{border:1px solid var(--color-border);padding:.55rem .75rem;
  text-align:left}
.post-prose th{background:var(--color-surface);font-weight:600}

/* language notice */
.langnote{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);
  padding:12px 16px;font-size:.86rem;color:var(--muted);width:100%}

/* ---------- states panel ---------- */
.states{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:22px}
.state-cap{margin:0 0 10px;font-size:.76rem;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted)}
.state-box{border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);
  padding:20px 22px}
.state-box .filter{border-top:0;border-bottom:0;padding:0}

/* ---------- responsive ---------- */
@media (max-width:1080px){
  #b1 .b1-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  #b2 .b2-lead,#b2 .b2-grid{grid-template-columns:minmax(0,1fr)}
  #c2 .c2-grid{grid-template-columns:minmax(0,1fr);gap:30px}
  #c2 .c2-rail{position:static;flex-direction:row;flex-wrap:wrap;gap:26px}
  .states{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:720px){
  .chrome-nav{display:none}
  #b1 .b1,#b2 .b2,#b3 .b3,#c1 .c1,#c2 .c2{padding-left:20px;padding-right:20px}
  #b1 .b1-grid{grid-template-columns:minmax(0,1fr)}
  #b2 .b2-card{grid-template-columns:minmax(0,1fr)}
  #b2 .b2-card .cover{aspect-ratio:16/9;border-right:0;border-bottom:1px solid var(--border)}
  #b3 .b3-row{grid-template-columns:minmax(0,1fr);gap:12px}
  .post-prose{font-size:1rem}
}
@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
"""


# =========================================================================
# Assembly
# =========================================================================

PROTOTYPES = [
    {
        "id": "b1", "tag": "Index · Option 1", "name": "Dense card grid",
        "why": "Three uniform columns, cover on top, tags / title / excerpt / meta below. The "
               "conventional blog index, and the one that scales best as the archive grows — six "
               "posts and sixty posts look equally deliberate.",
        "trade": "<b>Strong at:</b> volume, scanning, equal treatment of every post. "
                 "<b>Weak at:</b> nothing leads — with three posts published it will look thin, and "
                 "posts without a cover leave a visible hole.",
        "build": index_b1,
    },
    {
        "id": "b2", "tag": "Index · Option 2", "name": "Feature + grid",
        "why": "The newest post takes a full-width slot with a large cover and a longer excerpt; "
               "everything after it drops into a two-column list with horizontal cards. Gives the "
               "page a clear entry point on every visit.",
        "trade": "<b>Strong at:</b> looking intentional from post one, and steering readers to the "
                 "latest piece. <b>Weak at:</b> it needs a good cover image every single time, and "
                 "the featured excerpt is a second, longer piece of copy to write per post.",
        "build": index_b2,
    },
    {
        "id": "b3", "tag": "Index · Option 3", "name": "Editorial list",
        "why": "No cover images in the list at all. A date-and-reading-time rail on the left, title "
               "and excerpt on the right, hairline rules between. Typography does the work.",
        "trade": "<b>Strong at:</b> reads as a publication rather than a marketing page; fastest to "
                 "load; no cover image needed to publish. <b>Weak at:</b> visually quiet, and it "
                 "gives you nowhere to use a good graphic.",
        "build": index_b3,
    },
    {
        "id": "c1", "tag": "Article · Option 1", "name": "Centered column",
        "why": "One 720px measure, everything stacked: breadcrumbs, eyebrow tag, title, standfirst, "
               "byline, cover, body, then tags and a back link. Matches the measure the legal pages "
               "already use, so it inherits a proven reading width.",
        "trade": "<b>Strong at:</b> reading comfort, mobile parity, simplicity to build. "
                 "<b>Weak at:</b> metadata scrolls away — a reader deep in a long post has no "
                 "persistent sense of where they are.",
        "build": article_c1,
    },
    {
        "id": "c2", "tag": "Article · Option 2", "name": "Sticky meta rail",
        "why": "Author, date, reading time, topics and the back link live in a left rail that follows "
               "the reader down the page; the body keeps its own measure beside it.",
        "trade": "<b>Strong at:</b> orientation in long posts, and it gives tags a permanent home. "
                 "<b>Weak at:</b> the rail collapses to a header block on mobile so the benefit is "
                 "desktop-only, and it narrows the usable body width.",
        "build": article_c2,
    },
]


def proto_section(p: dict) -> str:
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
          {chrome()}
          {p['build']()}
          {footer_bar()}
        </div>
      </div>
    </section>"""


def page_body() -> str:
    jump = "".join(f'<a href="#{p["id"]}">{p["tag"]} — {p["name"]}</a>' for p in PROTOTYPES)
    jump += '<a href="#states">States — filter &amp; empty</a>'
    # Each prototype's layout CSS is scoped under its wrapper id (#b1, #c2, ...), which
    # is what keeps five page designs in one document from colliding.
    protos = "".join(proto_section(p) for p in PROTOTYPES)
    return f"""
  <div class="lab">
    <div class="lab-head">
      <p class="eyebrow">Blog prototypes — round 1</p>
      <h1>Blog index &amp; article page</h1>
      <p>Five prototypes: three directions for the <code>/blog</code> index, two for the
        <code>/blog/[slug]</code> article page. Built on the live site's tokens
        (<code>#0b0e11</code> canvas, Coral <code>#fb6b4c</code>, Manrope) with the real header
        and footer, so what you see is what the page would look like.</p>
      <p>Pick <strong>one index</strong> and <strong>one article</strong>. The states panel at the
        bottom shows the tag filter and every empty state — worth a look before you decide, because
        those are the screens a happy-path mockup never shows.</p>
      <div class="legend">
        <span><span class="ph">like this</span> = a string you write before build</span>
        <span>·</span>
        <span>Dashed coral blocks carry a length spec</span>
        <span>·</span>
        <span>Latin filler = typography demo, not proposed content</span>
        <span>·</span>
        <span>Dates and reading times are real, to show the format</span>
      </div>
      <div class="jump">{jump}</div>
    </div>
    {protos}
    <section class="proto" id="states">
      <div class="proto-head">
        <span class="tag">States</span>
        <h2>Filter states &amp; empty states</h2>
        <p class="why">These apply to whichever index you pick. The filter is server-rendered — each
          chip is a link that toggles itself into the URL (<code>/blog?tags=a,b</code>), selected
          chips narrow by AND, and the whole thing ships zero JavaScript.</p>
        <p class="trade">The three empty states are distinct on purpose: nothing published yet,
          nothing matching the current filter, and nothing in the reader's language. Each needs its
          own sentence — the last one also needs an escape hatch, or a German reader hits a dead end.</p>
      </div>
      {states_panel()}
    </section>
  </div>"""


def full_document(body: str, style: str) -> str:
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<title>Blog prototypes — XoXoCom</title>\n"
        f"<style>{style}</style>\n</head>\n<body>{body}\n</body>\n</html>\n"
    )


def fragment_document(body: str, style: str) -> str:
    return f"<title>Blog prototypes — XoXoCom</title>\n<style>{style}</style>\n{body}\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="Build /blog index and article layout prototypes.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output directory")
    args = ap.parse_args()

    face = manrope_face()
    style = css(face)
    body = page_body()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(full_document(body, style), encoding="utf-8")
    (out / "artifact.html").write_text(fragment_document(body, style), encoding="utf-8")

    print(f"{len(PROTOTYPES)} prototypes: " + ", ".join(p["id"] for p in PROTOTYPES) + ", states")
    print("font: " + ("Manrope inlined from the Next build" if face else "system stack (no .next build found)"))
    print(f"preview  -> {out / 'index.html'}")
    print(f"fragment -> {out / 'artifact.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
