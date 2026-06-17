# Directive: Add Legal Pages (Impressum + Datenschutzerklärung)

## Goal

Ensure a website ships statically-rendered German legal pages — Impressum (§5 DDG) and
Datenschutzerklärung (GDPR Art. 13) — reachable from every page via the footer, before it
goes live. Mandatory under German/EU law for any site that collects personal data
(including a contact form). In this workspace the **page wiring already exists in the
template**, so this directive is mostly: fill in the operator's real data, prune sections,
and verify.

## What the template already provides

Every site scaffolded from `sites/_template/` ships these, so you do **not** create them:

- `app/impressum/page.tsx` + `app/datenschutz/page.tsx` — static (`force-static`) routes that read `content/*.md` at build time and render with `marked`
- `components/LegalShell.tsx` — the "Rechtliches" eyebrow + `.legal-prose` article wrapper
- `components/FooterLinks.tsx` + `components/Footer.tsx` — legal nav rendered site-wide via `app/layout.tsx`, so legal pages are one click from every route automatically
- `.legal-prose` CSS in `app/globals.css` — pulls from the design tokens, so it matches the brand theme
- `content/impressum.md` + `content/datenschutz.md` — placeholder copies of the canonical XoXoCom UG texts
- Consent notice in `components/ContactForm.tsx` linking to `/datenschutz`

## Inputs

Confirm all of these before editing:

- **Company name** — full legal name (e.g. "XoXoCom UG (haftungsbeschränkt)")
- **Registered address** — street, postcode, city, country
- **Contact details** — phone + email for the Impressum
- **Commercial register entry** — court (Amtsgericht) and number (HRB)
- **Managing director(s)** (Geschäftsführer)
- **VAT ID** (USt-IdNr.) if any
- **Slug** of the target site (`sites/<slug>/`)

## Tools / Scripts

No execution scripts. This is editing + verification only.

- `sites/<slug>/content/impressum.md`, `content/datenschutz.md` — the files to edit (already present)
- `legal/IMPRESSUM.md`, `legal/DATENSCHUTZ.md` at repo root — canonical source texts if you need to re-copy

## Process

1. **Fill operator data** — Open `sites/<slug>/content/impressum.md` and `content/datenschutz.md` and replace every placeholder with the operator's real data. If the operator is XoXoCom UG, the canonical texts may need only minor edits; if a different entity, rewrite the operator sections fully.

2. **Prune to reality** — Remove any Datenschutz sections describing features the site does not have (newsletter, tracking pixels, comments). The privacy policy must describe what the site actually does — leaving in irrelevant sections is a legal risk, not just clutter. A contact form that writes to Supabase and emails via Gmail **does** process personal data — keep/extend the relevant section.

3. **Verify locally** — Start the preview (`python execution/start_preview_server.py --slug <slug>`). Confirm:
   - `/impressum` and `/datenschutz` render with the operator's content (not raw Markdown, not blank)
   - The footer legal links appear on the home page and every content page
   - On a contact-form site, the consent notice appears below the submit button and links to `/datenschutz`

### Optional: AGB — only when the site sells a paid product or service

The template does NOT ship AGB. Unlike Impressum and Datenschutz, these three files must be created from scratch. Add them only when the site involves a contract or payment (see the AGB edge case below for the trigger). Sites that just have a contact form and no paid offering do not need AGB.

1. **Create the route** — Create `sites/<slug>/app/agb/page.tsx`. Mirror the exact pattern of the impressum and datenschutz routes: mark the route `force-static`, read `content/agb.md` with Node's `fs.promises.readFile`, parse it with `await marked.parse(md)`, and render the result via `LegalShell`. Export a `metadata` object with a descriptive title and description.

2. **Create the content file** — Create `sites/<slug>/content/agb.md`. At minimum cover: Geltungsbereich (scope), Vertragsgegenstand (subject matter), Leistungen und Mitwirkung (services and client obligations), Vergütung und Zahlungsbedingungen (fees and payment), Haftung (liability), and Schlussbestimmungen (governing law and severability). If the final copy has not been reviewed by a lawyer, ship it clearly marked as a draft placeholder pending legal sign-off. Do not publish as final until approved.

3. **Add the footer link** — Open `sites/<slug>/components/FooterLinks.tsx` and insert an AGB link between Impressum and Datenschutz, so the footer reads "Impressum · AGB · Datenschutz".

4. **Verify locally** — Start the preview and confirm `/agb` renders the terms correctly (not raw Markdown, not blank) and is reachable from the footer alongside `/impressum` and `/datenschutz`.

## Outputs (Deliverables)

Updated, operator-accurate `sites/<slug>/content/impressum.md` and `content/datenschutz.md`, committed with the site. If the optional AGB step applies, also committed: `sites/<slug>/app/agb/page.tsx`, `sites/<slug>/content/agb.md`, and the updated `sites/<slug>/components/FooterLinks.tsx`. No DB change, no env var, no `site.config.json` change.

## Edge Cases

- **Different palette**: `.legal-prose` reads the design tokens, so it follows the brand automatically — no per-site color edits needed unless the design step hard-coded colors.
- **Datenschutz doesn't name processors**: the canonical text is generic and does not name Netlify, Supabase, or Google as sub-processors or address the US transfer. Compliant enough to launch, but see "Known follow-ups".
- **AGB**: not required for a brochure/contact site with no paid product. Don't add unless there's a contract/payment. When the trigger IS met (the site sells coaching, consulting, project work, or any paid offering), follow the "Optional: AGB" step in the Process section above. The copy must be lawyer-reviewed before going live.
- **Cookie banner**: not required if the site uses only strictly-necessary cookies. The template adds no analytics/marketing scripts. If any are added later, a consent banner becomes necessary.
- **`marked` missing**: `_template/package.json` ships `marked ^14`. If a customized site dropped it, run `npm install marked` in the site dir.

## Error Handling

- **Build fails "ENOENT ... content/impressum.md"**: the `content/` file was deleted. Re-copy from `legal/` and edit.
- **`/impressum` renders blank or shows raw Markdown**: the page component must `await marked.parse(md)` and pass the string to `LegalShell` — both routes are `async`. The template already does this; check for an accidental edit.
- **Legal pages not reachable**: `Footer` (with `FooterLinks`) is rendered in `app/layout.tsx`, so this should never happen. If it does, confirm the layout wasn't stripped during the design step.

### Known follow-ups — complete before scaling

Inherited from the shared legal pattern and applicable to every site:

- **Name sub-processors**: Netlify (hosting), Supabase (database), Google (Gmail SMTP) process personal data on the operator's behalf. Art. 13(1)(e) GDPR requires disclosing recipients. Add a "Hosting & Auftragsverarbeiter" section addressing these and the US transfer before operating at scale.
- **Sign DPAs** with Netlify, Supabase, and Google Workspace before going live.
- **Supabase region**: use an EU region (e.g. `eu-central-1`) to avoid a US transfer for the database.
