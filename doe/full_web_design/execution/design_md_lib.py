#!/usr/bin/env python3
"""Shared parsing + color-role derivation for the awesome-design-md library.

Used by:
  - execution/preview_design_systems.py  (the full 74-brand catalog gallery)
  - execution/build_brand_preview.py      (standalone full-page preview per brand)

Pure helpers, standard library only. Not a CLI — import it.
"""

from __future__ import annotations

import colorsys
import html
import re
from pathlib import Path

HOME = Path.home()
DEFAULT_LIBRARY = HOME / ".claude" / "awesome-design-md" / "design-md"
DEFAULT_SKILL = HOME / ".claude" / "skills" / "awesome-design-md" / "SKILL.md"

HEX_RE = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b")
RGBA_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", re.I)
FONTFAMILY_RE = re.compile(r"fontFamily:\s*\"?([^\"\n]+)\"?", re.I)
BG_WORD_RE = re.compile(r"(?:canvas|background|backdrop|ground|page background|base surface)[^\n]{0,80}", re.I)

DARK_WORDS = ("near-black", "near black", "black canvas", "dark canvas", "midnight",
              "near-pure black", "jet-black", "noir", "dark, ", "darkness",
              "nocturnal", "void", "almost black", "almost-black", "near-charcoal")

# Token-name fragments that signal a derived/variant color, not a base role.
ROLE_AVOID = ("subdued", "hover", "press", "soft", "mute", "secondary", "deep",
              "hairline", "input", "shadow", "alt", "gradient", "on-", "disabled",
              "active", "focus", "cream", "tint", "overlay", "ring", "inverse")


# ---------------------------------------------------------------------------
# color helpers
# ---------------------------------------------------------------------------

def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def luminance(rgb: tuple[int, int, int]) -> float:
    def chan(c: int) -> float:
        s = c / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = (chan(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def chroma(rgb: tuple[int, int, int]) -> int:
    """Absolute colorfulness (max-min channel). Reliable for near-black/white."""
    return max(rgb) - min(rgb)


def is_neutral(h: str, thresh: int = 30) -> bool:
    return chroma(hex_to_rgb(h)) <= thresh


def blend(a: str, b: str, t: float) -> str:
    """Linear blend from hex a to hex b by t in [0,1]."""
    ar, ag, ab = hex_to_rgb(a)
    br, bg, bb = hex_to_rgb(b)
    return rgb_to_hex((
        round(ar + (br - ar) * t),
        round(ag + (bg - ag) * t),
        round(ab + (bb - ab) * t),
    ))


def contrast_text(rgb: tuple[int, int, int]) -> str:
    return "#ffffff" if luminance(rgb) < 0.45 else "#0a0a0a"


# ---------------------------------------------------------------------------
# parsing
# ---------------------------------------------------------------------------

def parse_skill_catalog(skill_path: Path) -> dict[str, str]:
    """Map brand-id -> curated one-line description from the SKILL.md catalog."""
    out: dict[str, str] = {}
    if not skill_path.is_file():
        return out
    line_re = re.compile(r"^- \*\*(.+?)\*\*\s+[—-]\s+(.*)$")
    for line in skill_path.read_text(encoding="utf-8").splitlines():
        m = line_re.match(line.strip())
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return out


def extract_colors(text: str) -> list[str]:
    """Ordered, de-duplicated palette hexes found anywhere in the file."""
    seen: dict[str, None] = {}
    for m in HEX_RE.finditer(text):
        seen.setdefault(rgb_to_hex(hex_to_rgb(m.group(0))), None)
    for m in RGBA_RE.finditer(text):
        try:
            rgb = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
            if all(0 <= c <= 255 for c in rgb):
                seen.setdefault(rgb_to_hex(rgb), None)
        except ValueError:
            pass
    return list(seen.keys())


def keyed_colors(text: str) -> dict[str, str]:
    """For YAML-frontmatter files: map color token name -> hex (lowercased keys)."""
    out: dict[str, str] = {}
    in_colors = False
    for line in text.splitlines():
        if re.match(r"^colors:\s*$", line):
            in_colors = True
            continue
        if in_colors:
            if line and not line.startswith((" ", "\t")):
                break
            m = re.match(r"\s+([\w-]+):\s*\"?(#[0-9a-fA-F]{3,8})\"?", line)
            if m:
                out[m.group(1).lower()] = rgb_to_hex(hex_to_rgb(m.group(2)[:7]))
    return out


def prose_canvas(text: str) -> str | None:
    """First near-neutral hex next to a background/canvas word (prose-format files)."""
    for m in BG_WORD_RE.finditer(text):
        for hm in HEX_RE.finditer(m.group(0)):
            h = rgb_to_hex(hex_to_rgb(hm.group(0)))
            if is_neutral(h):
                return h
    return None


def pick_role(keyed: dict[str, str], patterns: tuple[str, ...], *,
              neutral_only: bool = False, prefer: str = "none") -> str | None:
    matches: list[str] = []
    for key, hx in keyed.items():
        if any(a in key for a in ROLE_AVOID):
            continue
        if any(p in key for p in patterns):
            if not neutral_only or is_neutral(hx):
                matches.append(hx)
    if not matches:
        return None
    if prefer == "light":
        return max(matches, key=lambda h: luminance(hex_to_rgb(h)))
    if prefer == "dark":
        return min(matches, key=lambda h: luminance(hex_to_rgb(h)))
    return matches[0]


def derive_roles(text: str, palette: list[str], keyed: dict[str, str], desc: str = "") -> dict:
    """Derive canvas / ink / accent (+ surface / border / muted) for a preview."""
    if not palette:
        base = {"canvas": "#ffffff", "ink": "#0a0a0a", "accent": "#635bff", "dark": False}
        return _fill_neutrals(base, keyed)

    lum = {h: luminance(hex_to_rgb(h)) for h in palette}
    chr_ = {h: chroma(hex_to_rgb(h)) for h in palette}
    val = {h: max(hex_to_rgb(h)) / 255.0 for h in palette}

    neutrals = [h for h in palette if is_neutral(h)] or palette
    light_neutral = max(neutrals, key=lambda h: lum[h])
    dark_neutral = min(neutrals, key=lambda h: lum[h])
    scan = (desc + " " + text[:1400]).lower()
    desc_is_dark = any(w in scan for w in DARK_WORDS)
    has_light = any(lum[h] > 0.85 for h in neutrals)

    # canvas: keyed token → stated prose background → light/dark neutral
    canvas = pick_role(keyed, ("canvas", "background", "page", "base"),
                       neutral_only=True, prefer="dark" if desc_is_dark else "light")
    if canvas is None:
        canvas = prose_canvas(text)
    if canvas is None:
        canvas = dark_neutral if (desc_is_dark or not has_light) else light_neutral
    canvas_dark = lum[canvas] < 0.4

    # ink: high-contrast color opposite canvas, mildly chromatic ok, not an accent hue
    INK_MAX_CHROMA = 140
    def ok_ink(h: str | None) -> bool:
        return bool(h) and abs(lum[h] - lum[canvas]) > 0.4 and chr_[h] <= INK_MAX_CHROMA
    ink = pick_role(keyed, ("ink", "text", "foreground", "-fg", "body", "heading"),
                    prefer="light" if canvas_dark else "dark")
    if not ok_ink(ink):
        pool = [h for h in palette if chr_[h] <= INK_MAX_CHROMA and h != canvas] or \
               [h for h in palette if h != canvas] or [canvas]
        ink = max(pool, key=lambda h: lum[h]) if canvas_dark else min(pool, key=lambda h: lum[h])

    # accent: most chromatic color that is neither canvas nor ink
    primary = pick_role(keyed, ("primary", "accent", "brand", "cta", "voltage", "signal"))
    candidates = [h for h in palette if h not in (canvas, ink)]
    accent = None
    if primary and primary not in (canvas, ink) and chr_[primary] > 40:
        accent = primary
    if accent is None and candidates:
        accent = max(candidates, key=lambda h: chr_[h] * (0.5 + 0.5 * val[h]))
    if accent is None or chr_[accent] < 20:
        accent = primary or (candidates[0] if candidates else ("#ffffff" if canvas_dark else "#0a0a0a"))

    roles = {"canvas": canvas, "ink": ink, "accent": accent, "dark": canvas_dark}
    return _fill_neutrals(roles, keyed)


def _fill_neutrals(roles: dict, keyed: dict[str, str]) -> dict:
    """Add surface / border / muted, from keyed tokens when present else blended."""
    canvas, ink, dark = roles["canvas"], roles["ink"], roles["dark"]

    surface = pick_role(keyed, ("surface", "panel", "card", "elevated"), neutral_only=True)
    if surface is None or surface == canvas:
        surface = blend(canvas, ink, 0.06 if not dark else 0.10)

    border = pick_role(keyed, ("hairline", "border", "line", "divider", "stroke"), neutral_only=True)
    if border is None:
        border = blend(canvas, ink, 0.16)

    muted = pick_role(keyed, ("muted", "subtle", "tertiary"))
    if muted is None or chroma(hex_to_rgb(muted)) > 140:
        muted = blend(ink, canvas, 0.42)

    roles.update({"surface": surface, "border": border, "muted": muted})
    return roles


def extract_fonts(text: str) -> str:
    """Best-effort display font-family label."""
    for m in FONTFAMILY_RE.finditer(text):
        fam = m.group(1).split(",")[0].strip().strip("\"'")
        if fam and fam.lower() not in ("system-ui", "-apple-system", "sans-serif", "serif"):
            return fam
    m = re.search(r"\b([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+)?\s(?:Sans|Serif|Mono|Display|Grotesk|Variable|VF))\b", text)
    if m:
        return m.group(1)
    return "system-ui"


def first_paragraph(text: str) -> str:
    body = re.sub(r"^---.*?---", "", text, count=1, flags=re.S)
    for para in re.split(r"\n\s*\n", body):
        p = " ".join(para.split())
        p = re.sub(r"^#+\s*", "", p)
        if len(p) > 40 and not p.startswith(("colors", "typography", "version", "name")):
            return p
    return ""


def resolve_brand(name: str, library: Path) -> str | None:
    """Resolve a user-typed brand to an exact library folder name.
    Matches exact, then prefix (linear → linear.app), then substring (mistral → mistral.ai)."""
    name = name.strip().lower()
    dirs = [d.name for d in library.iterdir() if d.is_dir()]
    if name in dirs:
        return name
    pref = [d for d in dirs if d.startswith(name)]
    if len(pref) == 1:
        return pref[0]
    sub = [d for d in dirs if name in d]
    if len(sub) == 1:
        return sub[0]
    if pref:
        return sorted(pref)[0]
    return None


def parse_brand(brand_dir: Path, catalog: dict[str, str]) -> dict | None:
    design = brand_dir / "DESIGN.md"
    if not design.is_file():
        return None
    text = design.read_text(encoding="utf-8", errors="replace")
    brand = brand_dir.name
    palette = extract_colors(text)
    keyed = keyed_colors(text)
    desc = catalog.get(brand) or first_paragraph(text)
    roles = derive_roles(text, palette, keyed, desc)
    return {
        "brand": brand,
        "desc": desc,
        "palette": palette,
        "roles": roles,
        "font": extract_fonts(text),
        "n_colors": len(palette),
    }


# ---------------------------------------------------------------------------
# html helpers
# ---------------------------------------------------------------------------

def esc(s: str) -> str:
    return html.escape(s, quote=True)


def truncate(s: str, n: int) -> str:
    s = s.strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"
