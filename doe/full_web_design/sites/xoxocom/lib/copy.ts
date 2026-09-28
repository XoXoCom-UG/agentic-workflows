/**
 * Bilingual content dictionary (German + English) for the XoXoCom site.
 *
 * `de` is the source of truth; `en` is typed as `typeof de`, so TypeScript
 * forces the English tree to mirror the German one exactly — a missing or
 * misnamed key is a compile error, not a silent untranslated string.
 *
 * Consumed through the language context in `lib/i18n.tsx` (`useLang().c`).
 * Legal pages (Impressum/AGB/Datenschutz) are intentionally NOT here — they
 * stay German for legal validity.
 */

import { COURSES_ENABLED } from "@/lib/features";

export type Lang = "de" | "en";

/** Cookie that persists the language choice. Defined here (a server-safe module,
 *  no "use client") so both the server layout and the client provider can import
 *  the real string value — a constant exported from a "use client" module would
 *  arrive at the server as a client-reference stub, not the string. */
export const LANG_COOKIE = "xoxocom-lang";

/** Legal pages are German-only (Impressum/Datenschutz/AGB) — excluded from the
 *  bilingual toggle for legal validity. Their `<html lang>` must always be "de"
 *  regardless of the chosen chrome language, so a cookieless crawler never sees
 *  German legal content mislabelled as English. Defined here (server-safe module)
 *  so both the server layout and the client provider can share the same list. */
export const LEGAL_ROUTES = ["/impressum", "/datenschutz", "/agb"] as const;

export function isLegalPath(pathname: string): boolean {
  return LEGAL_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export type NavChild = { label: string; href: string; external?: boolean; desc?: string };
export type NavItem = { label: string; href?: string; children?: NavChild[] };

const de = {
  langToggle: { aria: "Sprache wählen", de: "DE", en: "EN" },

  nav: [
    {
      label: "Produkte",
      href: "/produkte",
      children: [
        { label: "Agentix Projects", href: "https://matfit.ai", external: true, desc: "Train your AI Project-Agents" },
      ],
    },
    {
      label: "Leistungen",
      children: [
        { label: "A.I. Transformation", href: "/leistungen/ai-transformation", desc: "Agile A.I. Transformation für Unternehmen" },
        { label: "Expert Consulting", href: "/leistungen/expert-consulting", desc: "Spezialisten für kritische Schlüsselrollen" },
        { label: "Business Coaching", href: "/leistungen/business-coaching", desc: "Wachstum für Teams und Einzelpersonen" },
      ],
    },
    { label: "Über uns", href: "/ueber-uns" },
    // Hidden while the courses section is parked (lib/features.ts).
    ...(COURSES_ENABLED ? [{ label: "Kurse", href: "/courses" }] : []),
    { label: "Blog", href: "/blog" },
  ] as NavItem[],

  cta: { label: "Kontaktiere uns", href: "/kontakt" },

  header: {
    homeAria: "Startseite",
    navAria: "Hauptnavigation",
    mobileNavAria: "Mobile Navigation",
    menuOpen: "Menü öffnen",
    menuClose: "Menü schließen",
  },

  footer: {
    rights: "Alle Rechte vorbehalten.",
    legalAria: "Rechtliches",
  },

  contact: {
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    company: "Firma",
    message: "Deine Nachricht",
    submit: "Nachricht senden",
    submitting: "Wird gesendet…",
    successTitle: "Danke — deine Nachricht ist angekommen.",
    successBody: "Wir melden uns innerhalb eines Werktags bei dir.",
    errInvalidEmail: "Diese E-Mail-Adresse sieht nicht korrekt aus — bitte prüfe sie.",
    errGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    errNetwork: "Netzwerkfehler. Bitte versuche es erneut.",
    privacyPre: "Mit dem Absenden akzeptierst du unsere ",
    privacyLink: "Datenschutzerklärung",
  },

  home: {
    eyebrow: "XoXoCom UG",
    heroTitlePre: "Moderne Arbeitsweisen und ",
    heroTitleAccent: "A.I.",
    heroTitlePost: " gewinnbringend vereinen",
    heroSub: "Wir verbinden agile Methodik mit künstlicher Intelligenz – damit Teams und Unternehmen schneller, klüger und messbar überlegen arbeiten.",
    ctaPrimary: "Kontakt aufnehmen",
    ctaSecondary: "Unsere Leistungen",
    servicesEyebrow: "Was wir tun",
    servicesTitle: "Unsere Leistungen",
    servicesSub: "Ein Überblick über die Bereiche, in denen wir Teams und Unternehmen begleiten.",
    learnMore: "Mehr erfahren →",
    // Order = display order: A.I. Transformation (left), Projekteinsätze (middle),
    // Business Coaching (right). Bodies are short teasers — a hook that invites the
    // click; the full copy lives on each Leistung's own page.
    leistungen: [
      {
        title: "A.I. Transformation",
        lede: "Individuell, disruptiv und messbar überlegen",
        body: "Wo klassische Agilität an ihre Grenzen stößt, verbinden wir Methodik mit der Power der A.I. – zu einem messbar überlegenen Erfolgsmodell.",
        href: "/leistungen/ai-transformation",
      },
      {
        title: "Projekteinsätze",
        lede: "Die passenden Puzzleteile für Ihren Projekterfolg",
        body: "Spezialisten für Ihre kritischen Schlüsselrollen – von Agile Coach bis Software Architect, genau dann, wenn Ihr Projekt sie braucht.",
        href: "/leistungen/expert-consulting",
      },
      {
        title: "Business Coaching",
        lede: "Wachstum auf allen Ebenen",
        body: "Wir schließen die Lücke zwischen Innovation und Mensch – als strategischer Partner für Ihr Unternehmen und Mentor für Ihre Karriere.",
        href: "/leistungen/business-coaching",
      },
    ],
    newsEyebrow: "Aktuelles",
    newsTitle: "Agentix Projects",
    newsTagline: "Train your AI Project-Agents",
    newsBody: "Trainiere deine eigenen A.I. Projekt-Agenten – und bereichere dein Dev-Team mit Zeitersparnis, Optimierungsideen sowie Beratung zu Innovationen und Markttrends.",
    newsCta: "Jetzt probieren",
    aboutTitle: "A.I.-Implementierung, mit Bedacht umgesetzt",
    aboutBody: "Strategie, Architektur, Umsetzung: Wir begleiten den ganzen Weg vom Business Case bis zur Produktion.",
    aboutCta: "Lerne uns kennen",
    finalTitle: "Lass uns zusammenarbeiten",
    finalBody: "Erzähl uns von deinem Vorhaben – wir melden uns innerhalb eines Werktags.",
    finalCta: "Lass uns zusammenarbeiten",
  },

  leistungenEyebrow: "Leistungen",
  leistungenHeroCta: "Kontakt aufnehmen",

  businessCoaching: {
    title: "Business Coaching",
    sub: "Wachstum auf allen Ebenen.",
    body: "Wir coachen Teams und Einzelpersonen, um die Lücke zwischen technologischer Innovation und menschlichem Handeln zu schließen. Ob als strategischer Partner für Ihr Unternehmen oder als persönlicher Mentor für Ihre Karriere – wir befähigen Sie, in der neuen Arbeitswelt nicht nur mitzuhalten, sondern voranzugehen.",
  },

  aiTransformation: {
    title: "A.I. Transformation",
    sub: "Individuell, disruptiv und messbar überlegen.",
    body: [
      "Wer heute noch nach starren Lehrbüchern arbeitet, hat morgen schon verloren. Wir bieten keine Lösungen von der Stange, sondern einzigartige Konzepte, die dort ansetzen, wo klassische Agilität an ihre Grenzen stößt.",
      "Unsere Agile A.I. Transformation verbindet tiefgreifende Methodik mit der Power künstlicher Intelligenz zu einem hybriden Erfolgsmodell. Wir befähigen Unternehmen, echte Wettbewerbsvorteile durch exklusive Strategien zu erlangen, und begleiten Professionals dabei, sich mit Tools und Skills zu bewaffnen, die kein gewöhnliches Training bietet. Individuell, disruptiv und messbar überlegen.",
    ],
  },

  expertConsulting: {
    title: "Expert Consulting",
    sub: "Projekteinsätze – die passenden Puzzleteile für Ihren Projekterfolg.",
    body: "Wir finden nicht nur Experten, sondern die passenden Puzzleteile für Ihren Projekterfolg. Wir unterstützen Sie bei der Besetzung kritischer Schlüsselrollen mit Spezialisten, die methodische Exzellenz und technisches Know-how vereinen:",
    roles: ["Product Owner", "Scrum Master", "Software Engineer", "A.I. Specialist", "Team Coach", "Transformation Agent"],
  },

  produkte: {
    eyebrow: "Produkte",
    title: "Was wir bauen",
    sub: "Eigene Produkte und Projekte, mit denen wir A.I. in den Arbeitsalltag bringen.",
    products: [
      {
        title: "Agentix Projects",
        tagline: "Train your AI Project-Agents",
        desc: "Trainierbare A.I. Projekt-Agenten, die jedes Dev-Team mit Zeitersparnis, Optimierungsideen sowie Beratung zu Innovationen und Markttrends bereichern.",
        ctaLabel: "Jetzt probieren",
        href: "https://matfit.ai",
        external: true,
      },
    ],
  },

  /**
   * Courses. `catalog` is the single source of truth for both surfaces: the card on
   * /courses and the whole detail page at /courses/<slug>. Adding a course means adding
   * one entry here (in BOTH language trees — `en: typeof de` makes a missing one a
   * compile error) and one artwork case in components/courses/CourseArtwork.tsx.
   *
   * `slug` MUST be identical in the German and English entries: it is the URL, not copy.
   * `lib/courses.ts` asserts this at module load so a translated slug fails loudly
   * instead of silently 404-ing for half the visitors.
   *
   * ⚠ DRAFT EDITORIAL COPY — the course title, price and level are the user's; the
   * headline, subheadline and highlights are written to launch the page and are meant
   * to be reviewed. They deliberately make no claim the course can't keep: no job
   * outcomes, no durations, no cohort sizes, no metrics.
   */
  courses: {
    // --- index page chrome ---
    eyebrow: "Kurse",
    title: "Lerne zu bauen, was wir bauen",
    sub: "Praxisnahe Kurse, die A.I. in die tägliche Arbeit bringen — aus echter Projekterfahrung, nicht von der Folie.",
    metaTitle: "Kurse — A.I.-Agenten selbst bauen | XoXoCom",
    metaDescription:
      "Praxisnahe A.I.-Kurse von XoXoCom UG. Den Anfang macht: Baue deinen eigenen RAG-Agenten mit n8n und Pinecone — jetzt auf die Warteliste.",
    viewCourse: "Kurs ansehen",
    carouselAria: "Kurse",
    scrollPrev: "Vorheriger Kurs",
    scrollNext: "Nächster Kurs",
    // --- detail page chrome ---
    comingSoon: "Demnächst",
    backToCourses: "Zurück zu den Kursen",
    breadcrumbHome: "Startseite",
    priceLabel: "Preis",
    levelLabel: "Level",
    stackLabel: "Stack",
    stackNote: "Die Werkzeuge, mit denen du in diesem Kurs arbeitest.",
    // --- waiting-list form ---
    waitlist: {
      eyebrow: "Warteliste",
      title: "Sei dabei, wenn die Türen aufgehen",
      body: "Wir stellen den Kurs gerade fertig und öffnen ihn für eine kleine erste Gruppe. Trag deine E-Mail ein und du erfährst den Starttermin vor allen anderen — kein Spam, keine Verpflichtung.",
      firstName: "Vorname",
      email: "E-Mail",
      note: "Was willst du damit bauen? (optional)",
      submit: "Kurs jetzt buchen",
      submitting: "Wird gesendet…",
      successTitle: "Du stehst auf der Liste.",
      successBody: "Wir melden uns per E-Mail, sobald die erste Gruppe einen Termin hat.",
      errInvalidEmail: "Diese E-Mail-Adresse sieht nicht korrekt aus — bitte prüfe sie.",
      errGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
      errNetwork: "Netzwerkfehler. Bitte versuche es erneut.",
      privacyPre: "Mit dem Absenden akzeptierst du unsere ",
      privacyLink: "Datenschutzerklärung",
    },
    catalog: [
      {
        slug: "rag-agent-n8n-pinecone",
        title: "Baue deinen eigenen RAG-Agenten mit n8n und Pinecone",
        level: "Einsteiger bis Fortgeschrittene",
        price: "1.099 €",
        tags: ["n8n", "Pinecone", "RAG"],
        cardSummary:
          "Vom leeren n8n-Canvas zum Retrieval-Agenten, der aus deinen eigenen Dokumenten antwortet.",
        headline: "Baue einen A.I.-Agenten, der aus deinen Dokumenten antwortet — statt zu raten.",
        subheadline:
          "Ein Praxiskurs, der dich vom leeren n8n-Canvas zum funktionierenden Retrieval-Agenten führt: deine Dokumente in Pinecone eingebettet, bei Bedarf abgerufen und vom Modell deiner Wahl beantwortet. Keine A.I.-Engineering-Vorkenntnisse nötig — wer einem Workflow folgen kann, baut das.",
        metaTitle: "RAG-Agent-Kurs — n8n & Pinecone | XoXoCom",
        metaDescription:
          "Baue deinen eigenen Retrieval-Agenten mit n8n und Pinecone. Einsteiger bis Fortgeschrittene, 1.099 €. Jetzt auf die Warteliste für die erste Gruppe.",
        highlights: [
          {
            title: "Abrufen statt halluzinieren",
            body: "Du zerlegst deine eigenen Dokumente, bettest sie ein und legst sie in Pinecone ab — damit der Agent zur Frage die passenden Stellen holt und seine Antwort auf deinem Material steht.",
          },
          {
            title: "Gebaut in n8n, nicht im Notebook",
            body: "Jeder Schritt ist ein Node, den du siehst, debuggst und übergibst — ein Workflow, den dein Team ohne Python-Umgebung betreiben und verändern kann.",
          },
          {
            title: "Verbunden mit deinen Werkzeugen",
            body: "Du hängst den Agenten an die Modelle und Dienste, mit denen du ohnehin arbeitest — damit er dort landet, wo die Arbeit passiert, und nicht im Demo-Tab.",
          },
        ],
      },
    ],
  },

  ueberUns: {
    eyebrow: "Über uns",
    title: "Menschen, Methodik und A.I.",
    body: [
      "Wir sind ein junges Team, das sich auf die wirtschaftliche und technische Beratung von A.I.-Implementierung spezialisiert hat. Wir verbinden agile Arbeitsweisen mit künstlicher Intelligenz – und schließen die Lücke zwischen technologischer Innovation und menschlichem Handeln.",
      "Ob als strategischer Partner für Unternehmen oder als persönlicher Mentor für Professionals: Wir befähigen Menschen und Organisationen, in der neuen Arbeitswelt nicht nur mitzuhalten, sondern voranzugehen – individuell, disruptiv und messbar überlegen.",
    ],
    cta: "Jetzt Kontakt aufnehmen",
  },

  kontakt: {
    eyebrow: "Kontakt",
    title: "Lass uns sprechen",
    intro: "Erzähl uns von deinem Vorhaben – ob Coaching, Projekteinsatz oder A.I. Transformation. Wir lesen jede Nachricht und antworten innerhalb eines Werktags.",
    emailLabel: "E-Mail:",
    impressumPre: "Vollständige Anschrift und rechtliche Angaben findest du im ",
    impressumLink: "Impressum",
  },

  /**
   * Blog chrome. Per-post copy (title, excerpt) lives in the database, not here.
   *
   * ⚠ DRAFT COPY — written to unblock the build, at the user's explicit request, and
   * intended to be replaced. It deliberately makes no factual claim that isn't already
   * on the site (no client names, no years, no headcount beyond the three-person team,
   * no metrics). Safe to overwrite wholesale; nothing else depends on the wording.
   *
   * `metaTitle` (30-60 chars) and `metaDescription` (120-160) are length-checked per
   * route by execution/autoresearch/score/score_seo.py, and both must stay unique
   * against every other route or title_unique / desc_unique fail. Keep those budgets
   * if you rewrite them. Full brief: .tmp/blog_copy_spec.md
   */
  blog: {
    // --- functional labels ---
    eyebrow: "Blog",
    filterLabel: "Nach Thema filtern",
    filterClear: "Zurücksetzen",
    minRead: "{n} Min. Lesezeit",
    showOtherLanguage: "Alle Sprachen anzeigen",
    backToBlog: "Zurück zum Blog",
    byAuthor: "Von {name}",
    breadcrumbHome: "Startseite",
    languageName: { de: "Deutsch", en: "Englisch" },

    // --- draft editorial copy ---
    title: "Einblicke in A.I.-Transformation",
    sub: "Was wir lernen, wenn Teams künstliche Intelligenz in ihren Arbeitsalltag bringen — geschrieben von denen, die es tun.",
    metaTitle: "Blog — A.I.-Transformation | XoXoCom UG",
    metaDescription: "Praxisnahe Beiträge zu A.I.-Transformation, agilen Methoden und IT-Beratung von XoXoCom UG — dem dreiköpfigen Team hinter Agentix Projects.",
    emptyEyebrow: "Demnächst",
    emptyTitle: "Die ersten Beiträge entstehen gerade",
    empty: "Wir schreiben an unseren ersten Artikeln zu A.I.-Transformation, agilen Methoden und dem, was wir dabei lernen. Schau bald wieder vorbei.",
    emptyCta: "Sprich uns direkt an",
    emptyFiltered: "Keine Beiträge zu den gewählten Themen. Entferne ein Thema oder setze die Filter zurück.",
    emptyForLang: "Auf Deutsch ist noch nichts erschienen — auf Englisch gibt es aber schon Beiträge.",
    langNotice: "Dieser Artikel ist auf {language}.",
    notFoundTitle: "Beitrag nicht gefunden",
    notFoundBody: "Der Link ist vielleicht veraltet oder der Beitrag wurde entfernt. Alles Veröffentlichte findest du in der Blog-Übersicht.",
  },
};

const en: typeof de = {
  langToggle: { aria: "Select language", de: "DE", en: "EN" },

  nav: [
    {
      label: "Products",
      href: "/produkte",
      children: [
        { label: "Agentix Projects", href: "https://matfit.ai", external: true, desc: "Train your AI Project-Agents" },
      ],
    },
    {
      label: "Services",
      children: [
        { label: "A.I. Transformation", href: "/leistungen/ai-transformation", desc: "Agile A.I. transformation for organizations" },
        { label: "Expert Consulting", href: "/leistungen/expert-consulting", desc: "Specialists for critical key roles" },
        { label: "Business Coaching", href: "/leistungen/business-coaching", desc: "Growth for teams and individuals" },
      ],
    },
    { label: "About", href: "/ueber-uns" },
    // Hidden while the courses section is parked (lib/features.ts).
    ...(COURSES_ENABLED ? [{ label: "Courses", href: "/courses" }] : []),
    { label: "Blog", href: "/blog" },
  ] as NavItem[],

  cta: { label: "Get in touch", href: "/kontakt" },

  header: {
    homeAria: "Home",
    navAria: "Main navigation",
    mobileNavAria: "Mobile navigation",
    menuOpen: "Open menu",
    menuClose: "Close menu",
  },

  footer: {
    rights: "All rights reserved.",
    legalAria: "Legal",
  },

  contact: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    company: "Company",
    message: "Your message",
    submit: "Send message",
    submitting: "Sending…",
    successTitle: "Thanks — your message has arrived.",
    successBody: "We'll get back to you within one business day.",
    errInvalidEmail: "That email address doesn't look right — please check it.",
    errGeneric: "Something went wrong. Please try again.",
    errNetwork: "Network error. Please try again.",
    privacyPre: "By submitting you accept our ",
    privacyLink: "privacy policy",
  },

  home: {
    eyebrow: "XoXoCom UG",
    heroTitlePre: "Uniting modern ways of working and ",
    heroTitleAccent: "A.I.",
    heroTitlePost: " for measurable advantage",
    heroSub: "We combine agile methodology with artificial intelligence — so teams and organizations work faster, smarter and measurably better.",
    ctaPrimary: "Get in touch",
    ctaSecondary: "Our services",
    servicesEyebrow: "What we do",
    servicesTitle: "Our services",
    servicesSub: "An overview of the areas where we support teams and organizations.",
    learnMore: "Learn more →",
    // Same display order as the German tree: A.I. Transformation, Projekteinsätze,
    // Business Coaching — teaser bodies only; full copy lives on each service page.
    leistungen: [
      {
        title: "A.I. Transformation",
        lede: "Individual, disruptive and measurably superior",
        body: "Where classic agility reaches its limits, we combine methodology with the power of A.I. — into a measurably superior model for success.",
        href: "/leistungen/ai-transformation",
      },
      {
        title: "Project Staffing",
        lede: "The right puzzle pieces for your project success",
        body: "Specialists for your critical key roles — from Agile Coach to Software Architect, exactly when your project needs them.",
        href: "/leistungen/expert-consulting",
      },
      {
        title: "Business Coaching",
        lede: "Growth on every level",
        body: "We close the gap between innovation and people — as a strategic partner for your company and a mentor for your career.",
        href: "/leistungen/business-coaching",
      },
    ],
    newsEyebrow: "Latest",
    newsTitle: "Agentix Projects",
    newsTagline: "Train your AI Project-Agents",
    newsBody: "Train your own AI project-agents — and enrich your dev team with time savings, optimization ideas and guidance on innovations and market trends.",
    newsCta: "Try it now",
    aboutTitle: "A.I. implementation, done deliberately",
    aboutBody: "Strategy, architecture, delivery: we cover the full path from business case to production.",
    aboutCta: "Get to know us",
    finalTitle: "Let's work together",
    finalBody: "Tell us about your project — we'll get back to you within one business day.",
    finalCta: "Let's work together",
  },

  leistungenEyebrow: "Services",
  leistungenHeroCta: "Get in touch",

  businessCoaching: {
    title: "Business Coaching",
    sub: "Growth on every level.",
    body: "We coach teams and individuals to close the gap between technological innovation and human action. Whether as a strategic partner for your company or a personal mentor for your career — we empower you not just to keep up in the new world of work, but to lead.",
  },

  aiTransformation: {
    title: "A.I. Transformation",
    sub: "Individual, disruptive and measurably superior.",
    body: [
      "Anyone still working from rigid textbooks today has already lost tomorrow. We don't offer off-the-shelf solutions, but unique concepts that pick up where classic agility reaches its limits.",
      "Our Agile A.I. Transformation combines deep methodology with the power of artificial intelligence into a hybrid model for success. We enable companies to gain real competitive advantages through exclusive strategies, and we help professionals arm themselves with tools and skills no ordinary training provides. Individual, disruptive and measurably superior.",
    ],
  },

  expertConsulting: {
    title: "Expert Consulting",
    sub: "Project staffing — the right puzzle pieces for your project success.",
    body: "We don't just find experts — we find the right puzzle pieces for your project success. We support you in filling critical key roles with specialists who combine methodological excellence with technical know-how:",
    roles: ["Product Owner", "Scrum Master", "Software Engineer", "A.I. Specialist", "Team Coach", "Transformation Agent"],
  },

  produkte: {
    eyebrow: "Products",
    title: "What we build",
    sub: "Our own products and projects that bring A.I. into everyday work.",
    products: [
      {
        title: "Agentix Projects",
        tagline: "Train your AI Project-Agents",
        desc: "AI project-agents you train yourself, enriching every dev team with time savings, optimization ideas and guidance on innovations and market trends.",
        ctaLabel: "Try it now",
        href: "https://matfit.ai",
        external: true,
      },
    ],
  },

  // English is the site default, so THIS half is what a cookieless visitor and
  // Googlebot see. `slug` must match the German entry exactly — it is the URL.
  courses: {
    eyebrow: "Courses",
    title: "Learn to build what we build",
    sub: "Hands-on courses that put A.I. into everyday work — taught from real delivery experience, not from slideware.",
    metaTitle: "Courses — Build A.I. Agents Yourself | XoXoCom",
    metaDescription:
      "Hands-on A.I. courses from XoXoCom UG. First up: Build Your Own RAG Agent with n8n and Pinecone — join the waitlist for the first cohort.",
    viewCourse: "View course",
    carouselAria: "Courses",
    scrollPrev: "Previous course",
    scrollNext: "Next course",
    comingSoon: "Coming soon",
    backToCourses: "Back to courses",
    breadcrumbHome: "Home",
    priceLabel: "Price",
    levelLabel: "Level",
    stackLabel: "Stack",
    stackNote: "The tools you'll be working with on this course.",
    waitlist: {
      eyebrow: "Waitlist",
      title: "Be first in line when the doors open",
      body: "We're finishing the course now and opening it to a small first cohort. Leave your email and you'll hear the start date before anyone else — no spam, no commitment.",
      firstName: "First name",
      email: "Email",
      note: "What do you want to build with it? (optional)",
      submit: "Book the course now",
      submitting: "Sending…",
      successTitle: "You're on the list.",
      successBody: "We'll email you as soon as the first cohort has a date.",
      errInvalidEmail: "That email address doesn't look right — please check it.",
      errGeneric: "Something went wrong. Please try again.",
      errNetwork: "Network error. Please try again.",
      privacyPre: "By submitting you accept our ",
      privacyLink: "privacy policy",
    },
    catalog: [
      {
        slug: "rag-agent-n8n-pinecone",
        title: "Build Your Own RAG Agent with n8n and Pinecone",
        level: "Beginner to intermediate",
        price: "€1,099",
        tags: ["n8n", "Pinecone", "RAG"],
        cardSummary:
          "Go from an empty n8n canvas to a retrieval agent that answers from your own documents.",
        headline: "Build an A.I. agent that answers from your documents — instead of guessing.",
        subheadline:
          "A hands-on course that takes you from an empty n8n canvas to a working retrieval agent: your documents embedded in Pinecone, pulled back on demand, and answered by the model of your choice. No A.I. engineering background needed — if you can follow a workflow, you can build this.",
        metaTitle: "RAG Agent Course — n8n & Pinecone | XoXoCom",
        metaDescription:
          "Build your own retrieval agent with n8n and Pinecone. Beginner to intermediate, €1,099. Join the waitlist for the first cohort of the course.",
        highlights: [
          {
            title: "Retrieval, not hallucination",
            body: "You chunk, embed and store your own documents in Pinecone, so the agent pulls the passages that actually answer the question and its reply stands on your material.",
          },
          {
            title: "Built in n8n, not in a notebook",
            body: "Every step is a node you can see, debug and hand over — a workflow your team can run and change without a Python environment.",
          },
          {
            title: "Wired into the tools you already use",
            body: "You connect the agent to the models and services you work with anyway, so it ends up where the work happens rather than in a demo tab.",
          },
        ],
      },
    ],
  },

  ueberUns: {
    eyebrow: "About",
    title: "People, methodology and A.I.",
    body: [
      "We're a young team specialized in the business and technical consulting of A.I. implementation. We combine agile ways of working with artificial intelligence — and close the gap between technological innovation and human action.",
      "Whether as a strategic partner for companies or a personal mentor for professionals: we empower people and organizations not just to keep up in the new world of work, but to lead — individual, disruptive and measurably superior.",
    ],
    cta: "Get in touch now",
  },

  kontakt: {
    eyebrow: "Contact",
    title: "Let's talk",
    intro: "Tell us about your project — whether coaching, project staffing or A.I. transformation. We read every message and reply within one business day.",
    emailLabel: "Email:",
    impressumPre: "You'll find the full address and legal details in the ",
    impressumLink: "Impressum",
  },

  blog: {
    // --- functional labels ---
    eyebrow: "Blog",
    filterLabel: "Filter by topic",
    filterClear: "Clear",
    minRead: "{n} min read",
    showOtherLanguage: "Show all languages",
    backToBlog: "Back to blog",
    byAuthor: "By {name}",
    breadcrumbHome: "Home",
    languageName: { de: "German", en: "English" },

    // --- draft editorial copy. English is the site default, so THIS is what a
    //     cookieless visitor and Googlebot see. Rewrite this half first. ---
    title: "Insights on A.I. transformation",
    sub: "What we learn helping teams put artificial intelligence into their daily work — written by the people doing it.",
    metaTitle: "Blog — A.I. Transformation Insights | XoXoCom UG",
    metaDescription: "Practical articles on A.I. transformation, agile methods and IT consulting from XoXoCom UG — the three-person team building Agentix Projects.",
    emptyEyebrow: "Coming soon",
    emptyTitle: "The first articles are on their way",
    empty: "We’re writing our first pieces on A.I. transformation, agile methods and what we learn along the way. Check back soon.",
    emptyCta: "Talk to us directly",
    emptyFiltered: "No articles match the topics you selected. Remove one, or clear the filters to see everything.",
    emptyForLang: "Nothing in English yet — but there are already articles in German.",
    langNotice: "This article is in {language}.",
    notFoundTitle: "We can't find that article",
    notFoundBody: "The link may be out of date, or the article was removed. Everything we've published is on the blog index.",
  },
};

export const COPY = { de, en };
export type Copy = typeof de;

/** One course, in one language — everything both the card and the detail page render. */
export type CourseEntry = Copy["courses"]["catalog"][number];
