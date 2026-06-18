/**
 * Bilingual content dictionary (German + English) for the MAtfIT fake-door
 * landing page.
 *
 * `de` is the source of truth; `en` is typed as `typeof de`, so TypeScript
 * forces the English tree to mirror the German one exactly — a missing or
 * misnamed key is a compile error, not a silent untranslated string.
 *
 * Consumed through the language context in `lib/i18n.tsx` (`useLang().c`).
 * Legal pages (Impressum/Datenschutz) are intentionally NOT here — they stay
 * German for legal validity.
 */

export type Lang = "de" | "en";

export type Chip = { label: string; sub: string };
export type ValueItem = { number: string; title: string; body: string };

const de = {
  langToggle: { aria: "Sprache wählen", de: "DE", en: "EN" },

  header: {
    homeAria: "MAtfIT — Startseite",
  },

  hero: {
    eyebrow: "Dein KI-Coach für die IT-Transformation",
    titleLine1: "Starte deine",
    titleAccent: "KI-Transformation",
    subPre:
      "MAtfIT ist dein KI-Coach für IT-Transformation — fundierte, auf dein Projekt & Team zugeschnittene Beratung. Von der Tech-Stack-Analyse bis zur umsetzbaren Roadmap. ",
    subStrong: "Ein Tool statt vieler.",
    cta: "Jetzt Frühzugang sichern",
    ctaNote: "Sichere dir deinen Platz auf der Early-Access-Liste.",
    chips: [
      { label: "Ein Tool", sub: "statt vieler" },
      { label: "DACH", sub: "Markt-Fokus" },
      { label: "Roadmaps", sub: "KI-gestützt" },
    ] as Chip[],
  },

  heroMockup: {
    browserLabel: "matfit.app",
    alt: "MAtfIT Produkt-Oberfläche: stelle jede Frage zu SaaS, KI und DACH-Strategie",
  },

  valueProps: {
    eyebrow: "Ein Coach. Der gesamte Pfad.",
    titlePre: "Von der Analyse bis zur ",
    titleAccent: "Umsetzung",
    sub: "MAtfIT begleitet dich Schritt für Schritt durch deine KI-Transformation — fundiert, konkret und auf dein Projekt & Team zugeschnitten.",
    items: [
      {
        number: "01",
        title: "Tech-Stack-Analyse",
        body: "Analysiere deinen Tech-Stack hinsichtlich aktueller KI-Implementierung — und entdecke, wo der größte Hebel liegt.",
      },
      {
        number: "02",
        title: "Trend-Abgleich",
        body: "Abgleich mit aktuellen und zukünftigen Trends im Markt. Bleib deinen Wettbewerbern einen Schritt voraus.",
      },
      {
        number: "03",
        title: "Umsetzung nach Business Value",
        body: "Plane deine Umsetzung priorisiert nach echtem Business Value — nicht nach dem lautesten Hype.",
      },
      {
        number: "04",
        title: "Stories & Teilschritte",
        body: "Heruntergebrochen auf konkrete Stories und Teilschritte, die dein Team sofort einplanen kann.",
      },
      {
        number: "05",
        title: "Requirements-Prüfung",
        body: "Aufwandsschätzung, Manpower, Know-how, Technik und Budget — vorab geprüft, bevor du startest.",
      },
    ] as ValueItem[],
  },

  signup: {
    eyebrow: "Early Access",
    titlePre: "Sichere dir den ",
    titleAccent: "Frühzugang",
    sub: "Trag dich ein — wir melden uns, sobald MAtfIT startet. Du gehörst zu den Ersten, die ihre KI-Transformation mit MAtfIT angehen.",
    submitLabel: "Auf die Liste setzen",
    fineprint: "Kein Spam. Nur eine Nachricht zum Launch. Abmeldung jederzeit möglich.",
  },

  form: {
    submitting: "Wird gesendet…",
    submitFallback: "Auf die Liste setzen",
    errInvalidEmail: "Diese E-Mail sieht nicht richtig aus — bitte prüfe sie.",
    errGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    errNetwork: "Netzwerkfehler. Bitte versuche es erneut.",
    privacyPre: "Mit dem Absenden akzeptierst du unsere ",
    privacyLink: "Datenschutzerklärung",
    labels: {
      first_name: "Vorname",
      last_name: "Nachname",
      email: "E-Mail",
      phone: "Telefon",
      company: "Firma",
      role: "Rolle",
      country: "Land",
    } as Record<string, string>,
    placeholders: {
      first_name: "Max",
      email: "max@firma.de",
      company: "Deine Firma GmbH",
    } as Record<string, string>,
  },

  footer: {
    legalAria: "Rechtliches",
    impressum: "Impressum",
    datenschutz: "Datenschutz",
    home: "Startseite",
  },

  thankYou: {
    eyebrowSuffix: "Early Access",
    title: "Du stehst auf der Liste.",
    body: "Danke für dein Interesse an MAtfIT. Wir melden uns bei dir, sobald es losgeht — du gehörst zu den Ersten, die dabei sind.",
    emailNote: "Wir haben dir außerdem eine kurze Bestätigung per E-Mail geschickt.",
  },
};

const en: typeof de = {
  langToggle: { aria: "Select language", de: "DE", en: "EN" },

  header: {
    homeAria: "MAtfIT — Home",
  },

  hero: {
    eyebrow: "Your AI coach for IT transformation",
    titleLine1: "Start your",
    titleAccent: "AI transformation",
    subPre:
      "MAtfIT is your AI coach for IT transformation — well-founded advice tailored to your project & team. From tech-stack analysis to an actionable roadmap. ",
    subStrong: "One tool instead of many.",
    cta: "Get early access now",
    ctaNote: "Secure your spot on the early-access list.",
    chips: [
      { label: "One tool", sub: "instead of many" },
      { label: "DACH", sub: "market focus" },
      { label: "Roadmaps", sub: "AI-powered" },
    ] as Chip[],
  },

  heroMockup: {
    browserLabel: "matfit.app",
    alt: "MAtfIT product interface: ask any question about SaaS, AI and DACH strategy",
  },

  valueProps: {
    eyebrow: "One coach. The entire path.",
    titlePre: "From analysis to ",
    titleAccent: "execution",
    sub: "MAtfIT guides you step by step through your AI transformation — well-founded, concrete and tailored to your project & team.",
    items: [
      {
        number: "01",
        title: "Tech-stack analysis",
        body: "Analyze your tech stack for its current AI implementation — and discover where the biggest leverage lies.",
      },
      {
        number: "02",
        title: "Trend alignment",
        body: "Alignment with current and future market trends. Stay one step ahead of your competitors.",
      },
      {
        number: "03",
        title: "Delivery by business value",
        body: "Plan your delivery prioritized by real business value — not by the loudest hype.",
      },
      {
        number: "04",
        title: "Stories & sub-steps",
        body: "Broken down into concrete stories and sub-steps your team can schedule right away.",
      },
      {
        number: "05",
        title: "Requirements check",
        body: "Effort estimate, manpower, know-how, technology and budget — checked up front before you start.",
      },
    ] as ValueItem[],
  },

  signup: {
    eyebrow: "Early Access",
    titlePre: "Secure your ",
    titleAccent: "early access",
    sub: "Sign up — we'll reach out as soon as MAtfIT launches. You'll be among the first to tackle your AI transformation with MAtfIT.",
    submitLabel: "Add me to the list",
    fineprint: "No spam. Just one message at launch. Unsubscribe anytime.",
  },

  form: {
    submitting: "Sending…",
    submitFallback: "Add me to the list",
    errInvalidEmail: "That email doesn't look right — please check it.",
    errGeneric: "Something went wrong. Please try again.",
    errNetwork: "Network error. Please try again.",
    privacyPre: "By submitting you accept our ",
    privacyLink: "privacy policy",
    labels: {
      first_name: "First name",
      last_name: "Last name",
      email: "Email",
      phone: "Phone",
      company: "Company",
      role: "Role",
      country: "Country",
    } as Record<string, string>,
    placeholders: {
      first_name: "Alex",
      email: "alex@company.com",
      company: "Your Company Ltd.",
    } as Record<string, string>,
  },

  footer: {
    legalAria: "Legal",
    impressum: "Impressum",
    datenschutz: "Datenschutz",
    home: "Home",
  },

  thankYou: {
    eyebrowSuffix: "Early Access",
    title: "You're on the list.",
    body: "Thanks for your interest in MAtfIT. We'll reach out as soon as we go live — you'll be among the first on board.",
    emailNote: "We've also sent you a short confirmation by email.",
  },
};

export const COPY = { de, en };
export type Copy = typeof de;
