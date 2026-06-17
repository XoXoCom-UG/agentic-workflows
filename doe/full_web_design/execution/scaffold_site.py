#!/usr/bin/env python3
"""Scaffold a new multi-page website under sites/<slug>/ by cloning sites/_template/.

Usage:
    python execution/scaffold_site.py \
        --slug acme \
        --company "Acme Inc" \
        --tagline "Industrial robotics for small shops" \
        --design-source stripe \
        --pages home,about,services,contact \
        --has-contact-form \
        --contact-email "hello@acme.com" \
        --signature web-acme-7f3a2c

Notes:
    - `--design-source` is the awesome-design-md brand whose DESIGN.md the design step
      will translate into the site's tokens (recorded in site.config.json; tokens are
      applied later by the design_website directive). Optional at scaffold time.
    - `--pages` lists the routes to keep. The template ships home/about/services/contact;
      pages you list that the template does not provide must be created by hand afterwards,
      and pages the template has but you omit can be deleted from app/.
    - `--contact-email` is required when `--has-contact-form` is set.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = REPO_ROOT / "sites" / "_template"
SITES = REPO_ROOT / "sites"

# Pages the template ships with. Listing a page outside this set is allowed but the
# corresponding app/ route must be authored manually after scaffolding.
TEMPLATE_PAGES = {"home", "about", "services", "contact"}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--slug", required=True)
    p.add_argument("--company", required=True)
    p.add_argument("--tagline", required=True, help="one-line value proposition")
    p.add_argument("--design-source", default=None, help="awesome-design-md brand name, e.g. stripe")
    p.add_argument("--pages", default="home,about,services,contact", help="CSV of route slugs to keep")
    p.add_argument("--has-contact-form", action="store_true", help="wire the Supabase + Gmail contact flow")
    p.add_argument("--contact-email", default=None, help="operator inbox; required if --has-contact-form")
    p.add_argument("--signature", required=True, help="visible build token, e.g. web-<slug>-<6char>")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    slug = args.slug.strip().lower()
    target = SITES / slug

    if target.exists():
        print(f"refusing to overwrite existing site at {target}", file=sys.stderr)
        return 2
    if not TEMPLATE.is_dir():
        print(f"template not found at {TEMPLATE}", file=sys.stderr)
        return 2

    pages = [p.strip() for p in args.pages.split(",") if p.strip()]
    if "home" not in pages:
        pages.insert(0, "home")
    if "contact" not in pages and args.has_contact_form:
        print("`--has-contact-form` set but 'contact' is not in --pages; add it.", file=sys.stderr)
        return 2
    if args.has_contact_form and not args.contact_email:
        print("`--contact-email` is required when --has-contact-form is set", file=sys.stderr)
        return 2

    unknown = [p for p in pages if p not in TEMPLATE_PAGES]

    shutil.copytree(TEMPLATE, target)

    config = {
        "slug": slug,
        "company": args.company,
        "tagline": args.tagline,
        "design_source": args.design_source,
        "pages": pages,
        "has_contact_form": bool(args.has_contact_form),
        "contact_email": args.contact_email or "",
        "signature": args.signature,
        "visual_fingerprint": {
            "palette": None,
            "layout": None,
            "motion": None,
            "typography": None,
        },
    }
    (target / "site.config.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")

    print(f"scaffolded {target}")
    print(f"  slug:             {slug}")
    print(f"  company:          {args.company}")
    print(f"  pages:            {','.join(pages)}")
    print(f"  design_source:    {args.design_source or '(choose during design step)'}")
    print(f"  has_contact_form: {bool(args.has_contact_form)}")
    print(f"  contact_email:    {args.contact_email or '(none)'}")
    print(f"  signature:        {args.signature}")
    if unknown:
        print()
        print(f"  NOTE: these pages are not in the template and need manual app/ routes: {unknown}")
    print()
    print("next: follow directives/design_website.md to translate the chosen DESIGN.md")
    print(f"      into sites/{slug}/app/globals.css, then `cd sites/{slug} && npm install`")
    return 0


if __name__ == "__main__":
    sys.exit(main())
