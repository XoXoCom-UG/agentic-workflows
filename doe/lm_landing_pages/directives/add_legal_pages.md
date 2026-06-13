# Directive: Add Legal Pages (Impressum + Datenschutzerklärung)

## Goal

Add statically-rendered German legal pages — Impressum (§5 DDG) and Datenschutzerklärung (GDPR Art. 13) — to a Next.js landing page site. The pages must be reachable from every page via a footer link, within two clicks, before the site goes live. This is mandatory under German and EU law for any site that collects personal data (including an email waitlist).

## Inputs

Confirm all of these with the user before doing anything:

- **Company name** — full legal name as it appears on the Impressum (e.g. "XoXoCom UG (haftungsbeschränkt)")
- **Registered address** — street, postcode, city, country
- **Contact details** — phone number and email address for the Impressum contact block
- **Commercial register entry** — court (Amtsgericht) and registration number (HRB / HR-Nr.)
- **Managing director(s)** (Geschäftsführer) — name(s)
- **VAT ID** (Umsatzsteuer-Identifikationsnummer) if the company has one
- **Slug** of the target site (matches `sites/<slug>/`)
- **Site display name** — used in the `<title>` tag of the legal pages (e.g. "MAtfIT")

Source files to copy from: `legal/IMPRESSUM.md` and `legal/DATENSCHUTZ.md` at the repo root. These are the canonical XoXoCom UG texts. Copy them into the site's `content/` folder, then update company-specific fields for the campaign if the operator differs from XoXoCom UG.

## Tools / Scripts

No execution scripts are involved — this is entirely a file-creation and component-wiring task.

- `legal/IMPRESSUM.md` — repo-level canonical Impressum text (source to copy from)
- `legal/DATENSCHUTZ.md` — repo-level canonical Datenschutzerklärung text (source to copy from)
- `marked` npm package (version ^14, already listed in `sites/<slug>/package.json` — do not add a second copy)
- `sites/<slug>/components/FooterLinks.tsx` — reusable footer nav; renders Impressum, Datenschutz, and Startseite links
- `sites/<slug>/components/LegalShell.tsx` — shared page chrome that wraps legal content; accepts pre-rendered HTML, renders `SiteHeader` + a "Rechtliches" eyebrow label + a `.legal-prose` article + a footer with `FooterLinks`
- `sites/<slug>/app/impressum/page.tsx` — static server component that reads `content/impressum.md` at build time, parses it with `marked`, and passes the HTML to `LegalShell`
- `sites/<slug>/app/datenschutz/page.tsx` — same pattern for `content/datenschutz.md`
- `sites/<slug>/app/globals.css` — must contain the `.legal-prose` CSS block that styles the rendered Markdown to match the site's brand theme (no @tailwindcss/typography plugin is used or needed)

## Process

1. **Copy legal text files** — Copy `legal/IMPRESSUM.md` to `sites/<slug>/content/impressum.md` and `legal/DATENSCHUTZ.md` to `sites/<slug>/content/datenschutz.md`. Create the `content/` directory if it does not exist. These files are read at build time by `fs.readFile` with `process.cwd()` as the base, so the path `content/<name>.md` relative to the site root is required exactly.

2. **Fill in company-specific fields** — Open both copied files and replace every placeholder with the operator's actual data (company name, address, contact, register entry, managing director, VAT ID). If the campaign operator is XoXoCom UG itself, the canonical texts may need only minor adjustments (e.g. a product-specific sentence). If it is a different legal entity, rewrite the operator section fully.

3. **Create `FooterLinks.tsx`** — Add `sites/<slug>/components/FooterLinks.tsx`. This component renders a `<nav aria-label="Rechtliches">` with three links: `/impressum`, `/datenschutz`, and `/` (Startseite). It accepts an optional `className` prop so callers can control alignment (e.g. `justify-center` on the thank-you page). See `sites/matfit_fakedoor_12062026/components/FooterLinks.tsx` as the reference implementation.

4. **Create `LegalShell.tsx`** — Add `sites/<slug>/components/LegalShell.tsx`. This component accepts a single `html` string prop (pre-rendered Markdown), renders `SiteHeader`, a "Rechtliches" eyebrow label, an `<article className="legal-prose">` that sets the HTML with `dangerouslySetInnerHTML`, and a footer with `FooterLinks`. The content is safe because it comes from in-repo Markdown files rendered at build time, not from user input. See `sites/matfit_fakedoor_12062026/components/LegalShell.tsx` as the reference.

5. **Create `app/impressum/page.tsx`** — Add the Impressum route as a static server component. It must export `dynamic = "force-static"`, read `content/impressum.md` via `fs.promises.readFile` at the path `path.join(process.cwd(), "content", "impressum.md")`, parse it with `marked.parse`, and render `<LegalShell html={html} />`. Add a `metadata` export with a site-specific `title` and `description`. See `sites/matfit_fakedoor_12062026/app/impressum/page.tsx` as the reference.

6. **Create `app/datenschutz/page.tsx`** — Same pattern as step 5, substituting `datenschutz.md` and updating the `metadata` export. See `sites/matfit_fakedoor_12062026/app/datenschutz/page.tsx` as the reference.

7. **Add the `.legal-prose` CSS block** — Open `sites/<slug>/app/globals.css` and add the `.legal-prose` block that styles headings, body text, links, lists, and horizontal rules to match the site's brand palette. This block replaces the need for the `@tailwindcss/typography` plugin, which is not installed and should not be added. See the `.legal-prose` section in `sites/matfit_fakedoor_12062026/app/globals.css` as the reference. Adapt colours to the site's palette if it differs from the MAtfIT dark/lime theme.

8. **Wire `FooterLinks` into every page** — Import and render `<FooterLinks />` in the footer of `app/page.tsx` and `app/thank-you/page.tsx`. These are the two pages a visitor reaches during the normal flow. The legal pages already include `FooterLinks` via `LegalShell`. This ensures legal pages are reachable from every page within one click.

9. **Add consent notice to `LeadForm`** — Below the submit button in `components/LeadForm.tsx`, add a static plain-text notice that links to `/datenschutz`. The notice must not be a checkbox — consent for a waitlist submission is based on the legal basis Art. 6(1)(b) GDPR (steps taken prior to entering into a contract), not on an explicit opt-in. The notice text should read approximately: "Mit dem Absenden akzeptierst du unsere Datenschutzerklärung." with "Datenschutzerklärung" as a link to `/datenschutz`. See `sites/matfit_fakedoor_12062026/components/LeadForm.tsx` lines 132–141 as the reference.

10. **Verify locally** — Start the preview server (`python execution/start_preview_server.py --slug <slug>`). Navigate to `/impressum` and `/datenschutz` and confirm both pages render with content. Confirm the footer links appear on the home page and thank-you page. Confirm the consent notice appears below the submit button on the form.

## Outputs (Deliverables)

After this workflow, the following files exist and are committed in `sites/<slug>/`:

- `content/impressum.md` — operator's Impressum text in Markdown
- `content/datenschutz.md` — operator's Datenschutzerklärung in Markdown
- `components/FooterLinks.tsx` — footer nav component
- `components/LegalShell.tsx` — shared chrome for legal pages
- `app/impressum/page.tsx` — Impressum route (statically rendered)
- `app/datenschutz/page.tsx` — Datenschutzerklärung route (statically rendered)
- `app/globals.css` updated with `.legal-prose` block
- `app/page.tsx` and `app/thank-you/page.tsx` updated with `<FooterLinks />` in the footer
- `components/LeadForm.tsx` updated with consent notice

There is no database change, no new env var, and no change to `site.config.json` or `execution/` scripts.

## Edge Cases

- **The `content/` directory does not exist yet**: Create it. `fs.readFile` will throw at build time if the directory or file is missing, and the build will fail with a clear Node error.
- **Legal text describes features the site does not have** (e.g. the canonical text mentions newsletters, blog comments, or tracking pixels, but the site has none of these): Remove those sections from the copied Markdown. The Datenschutzerklärung must accurately describe what the site actually does — leaving in sections about non-existent features is a legal risk, not just clutter.
- **Datenschutzerklärung does not name processors**: The canonical `legal/DATENSCHUTZ.md` is generic and does not name Netlify, Supabase, or Google as sub-processors, nor does it address the US data transfer these services involve. This is a known gap. The current text is compliant enough to launch but should be updated before scaling. See the "Known follow-ups" note in Error Handling.
- **Site uses a non-dark palette**: The `.legal-prose` CSS block in the MAtfIT reference uses dark backgrounds and a lime accent. Adapt every colour value to the site's actual palette. Do not copy the colours verbatim if the site is light-themed.
- **`marked` is not yet in `package.json`**: Check `sites/<slug>/package.json` before adding it. The MAtfIT site ships `"marked": "^14.1.0"` as a production dependency. If the target site was scaffolded from `sites/_template/` before `marked` was added to the template, run `npm install marked` inside the site directory.
- **`SiteHeader` is not yet a component in this site**: `LegalShell` imports `SiteHeader`. If the site does not have a `SiteHeader` component, either create a minimal one (a header with the logo linking to `/`) or adapt `LegalShell` to use whatever header the site already has.
- **AGB (Allgemeine Geschäftsbedingungen)**: AGB are not required for a free waitlist or lead-magnet page. Do not add them unless the site involves a paid product or contract. Adding unnecessary AGB creates enforceable obligations.
- **Cookie banner**: A cookie banner is not required if the site uses only strictly-necessary cookies (session, form submission). If analytics or marketing scripts are added later, a banner and consent mechanism will be needed. Do not add one pre-emptively.

## Error Handling

- **Build fails with "Cannot find module 'marked'"**: `marked` is not installed. Run `npm install` inside `sites/<slug>/`. If `marked` is not in `package.json`, add it first.
- **Build fails with "ENOENT: no such file or directory ... content/impressum.md"**: The `content/` folder or file was not created. Create the directory and copy the Markdown files before running the build.
- **`/impressum` or `/datenschutz` renders blank or shows raw Markdown**: `marked.parse` was not awaited, or `dangerouslySetInnerHTML` was passed a non-string. Both page components are `async` — confirm `await marked.parse(md)` is present and the result is passed as the `html` prop.
- **Legal pages are not reachable from the home page**: `FooterLinks` was not imported or rendered in `app/page.tsx`. Add the import and render it in the footer section.

### Known follow-ups — not yet done, must be completed before scaling

These gaps exist in the current MAtfIT implementation and apply to all sites built with this pattern:

- **Datenschutzerklärung does not name sub-processors**: Netlify (hosting), Supabase (database), and Google (email delivery via Gmail SMTP) process personal data on behalf of the operator. Art. 13(1)(e) GDPR requires disclosing recipients or categories of recipients. A "Hosting & Auftragsverarbeiter" section naming these services and addressing the US data transfer must be added before operating at scale.
- **Data Processing Agreements (DPAs) not yet signed**: DPAs with Netlify, Supabase, and Google Workspace must be signed before the site is live. Without them, the data transfer to these processors is not lawful under GDPR.
- **Supabase project region**: The Supabase project should be in an EU region (e.g. `eu-central-1`) to avoid a US transfer for the database. Confirm this in the Supabase project settings.
- **Double opt-in for marketing emails**: Sending marketing emails without double opt-in is legally risky in Germany (UWG). The current confirmation email is a transactional message (confirming list enrollment), which is acceptable. Any future promotional sends should use a double opt-in flow.
