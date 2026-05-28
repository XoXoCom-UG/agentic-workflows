#!/usr/bin/env python3
"""Scaffold a new site under sites/<slug>/ by cloning sites/_template/.

Usage:
    python execution/scaffold_site.py \
        --slug acme \
        --company "Acme Inc" \
        --fields first_name,last_name,email \
        --drive-link "https://drive.google.com/file/d/.../view" \
        --lead-magnet-title "The 2026 Acme Playbook" \
        --hero acme.mp4 \
        --signature lm-acme-7f3a
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
EXPLODED_VIEWS = REPO_ROOT / "exploded_views"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--slug", required=True)
    p.add_argument("--company", required=True)
    p.add_argument("--fields", required=True, help="CSV of form field names, e.g. first_name,last_name,email")
    p.add_argument("--drive-link", required=True)
    p.add_argument("--lead-magnet-title", required=True)
    p.add_argument("--hero", default="none", help="mp4 filename in exploded_views/, or 'none'")
    p.add_argument("--signature", required=True)
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

    fields = [f.strip() for f in args.fields.split(",") if f.strip()]
    if "email" not in fields:
        fields.append("email")

    shutil.copytree(TEMPLATE, target)

    hero_relative = None
    if args.hero and args.hero.lower() != "none":
        src = EXPLODED_VIEWS / args.hero
        if not src.is_file():
            print(f"hero asset not found: {src}", file=sys.stderr)
            shutil.rmtree(target)
            return 2
        (target / "public").mkdir(exist_ok=True)
        shutil.copyfile(src, target / "public" / "hero.mp4")
        hero_relative = "/hero.mp4"

    config = {
        "slug": slug,
        "company": args.company,
        "lead_magnet_title": args.lead_magnet_title,
        "drive_link": args.drive_link,
        "fields": fields,
        "hero_video": hero_relative,
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
    print(f"  fields:           {','.join(fields)}")
    print(f"  hero:             {hero_relative or '(none)'}")
    print(f"  signature:        {args.signature}")
    print()
    print("next: invoke design-taste-frontend skill scoped to this directory,")
    print("      then `cd sites/{slug} && npm install && npm run dev`".format(slug=slug))
    return 0


if __name__ == "__main__":
    sys.exit(main())
