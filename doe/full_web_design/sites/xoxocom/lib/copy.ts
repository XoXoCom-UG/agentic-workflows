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

export type Lang = "de" | "en";

/** Cookie that persists the language choice. Defined here (a server-safe module,
 *  no "use client") so both the server layout and the client provider can import
 *  the real string value — a constant exported from a "use client" module would
 *  arrive at the server as a client-reference stub, not the string. */
export const LANG_COOKIE = "xoxocom-lang";

export type NavChild = { label: string; href: string; external?: boolean; desc?: string };
export type NavItem = { label: string; href?: string; children?: NavChild[] };

const de = {
  langToggle: { aria: "Sprache wählen", de: "DE", en: "EN" },

  nav: [
    {
      label: "Produkte",
      href: "/produkte",
      children: [
        { label: "MAtfIT", href: "https://matfit.ai", external: true, desc: "A.I. Transformation Coach für Dev-Teams" },
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
    newsTitle: "MAtfIT",
    newsBody: "Wir entwickeln einen A.I. Transformation Coach, der jedes Dev-Team mit Zeitersparnis, Optimierungsideen sowie Beratung zu Innovationen und Markttrends bereichert.",
    newsCta: "Jetzt probieren",
    aboutTitle: "Dynamisches Team mit Durchschlagskraft",
    aboutBody: "Wir sind ein dynamisches Team, das sich auf die wirtschaftliche und technische Beratung von A.I.-Implementierung spezialisiert hat.",
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
        title: "MAtfIT",
        desc: "Ein A.I. Transformation Coach, der jedes Dev-Team mit Zeitersparnis, Optimierungsideen sowie Beratung zu Innovationen und Markttrends bereichert.",
        ctaLabel: "Jetzt probieren",
        href: "https://matfit.ai",
        external: true,
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
};

const en: typeof de = {
  langToggle: { aria: "Select language", de: "DE", en: "EN" },

  nav: [
    {
      label: "Products",
      href: "/produkte",
      children: [
        { label: "MAtfIT", href: "https://matfit.ai", external: true, desc: "A.I. transformation coach for dev teams" },
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
    newsTitle: "MAtfIT",
    newsBody: "We're building an A.I. transformation coach that enriches every dev team with time savings, optimization ideas and guidance on innovations and market trends.",
    newsCta: "Try it now",
    aboutTitle: "A dynamic team with real impact",
    aboutBody: "We're a dynamic team specialized in the business and technical consulting of A.I. implementation.",
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
        title: "MAtfIT",
        desc: "An A.I. transformation coach that enriches every dev team with time savings, optimization ideas and guidance on innovations and market trends.",
        ctaLabel: "Try it now",
        href: "https://matfit.ai",
        external: true,
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
};

export const COPY = { de, en };
export type Copy = typeof de;
