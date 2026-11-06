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

/** One entry on Sally's news board (/sally). `date` is ISO (YYYY-MM-DD) so it sorts as text. */
export type SallyPost = {
  date: string;
  category: "company" | "team";
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

/**
 * One canned answer of Sally's chat. Sally deliberately has no LLM behind her: every
 * reply is written here, so a chat costs nothing and nothing the visitor types leaves
 * the browser. `keywords` are matched as word prefixes against the lower-cased input
 * (see lib/sally-brain.ts). Keep them specific: a question that matches several
 * intents equally well gets several answers.
 */
export type SallyTopic = "sally" | "agentix" | "xoxocom" | "courses" | "contact";

export type SallyIntent = {
  /** Stable key, identical in both languages (the quick-pick chips refer to it). */
  id: string;
  /** Catalog group. Intents without a topic/question (small talk) stay out of the catalog. */
  topic?: SallyTopic;
  /** How the question reads in the catalog and on the chips. */
  question?: string;
  /**
   * A topic's catch-all answer (e.g. "What is Agentix Projects?"). It is dropped when a
   * more specific intent of the same topic scores as well, so "Was kostet Agentix?"
   * gets the price, not the price plus the product pitch.
   */
  broad?: boolean;
  keywords: string[];
  answer: string;
  href?: string;
  linkLabel?: string;
};

const de = {
  langToggle: { aria: "Sprache wählen", de: "DE", en: "EN" },

  nav: [
    {
      label: "Produkte",
      href: "/produkte",
      children: [
        { label: "Agentix Projects", href: "https://agentix-projects.com", external: true, desc: "Train your AI Project-Agents" },
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
    { label: "Sally", href: "/sally" },
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
        href: "https://agentix-projects.com",
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
      "Praxisnahe A.I.-Kurse von XoXoCom UG, aus echter Projekterfahrung. Den Anfang macht: Baue deinen eigenen RAG-Agenten mit n8n und Pinecone. Jetzt buchen.",
    viewCourse: "Kurs ansehen",
    carouselAria: "Kurse",
    scrollPrev: "Vorheriger Kurs",
    scrollNext: "Nächster Kurs",
    // --- detail page chrome ---
    comingSoon: "Jetzt buchbar",
    backToCourses: "Zurück zu den Kursen",
    breadcrumbHome: "Startseite",
    priceLabel: "Preis",
    priceUnit: "pro Person",
    levelLabel: "Level",
    stackLabel: "Stack",
    stackNote: "Die Werkzeuge, mit denen du in diesem Kurs arbeitest.",
    // --- waiting-list form ---
    waitlist: {
      eyebrow: "Platz buchen",
      title: "Sichere dir deinen Platz – oder Plätze für dein ganzes Team",
      body: "Aus echter Projekterfahrung, nicht von der Folie. Buche für dich oder bring gleich dein ganzes Team mit. Schick uns deine Buchungsanfrage und wir melden uns per E-Mail, um deine Buchung, den Starttermin und die nächsten Schritte zu bestätigen. Hier wird nichts bezahlt.",
      firstName: "Vorname",
      email: "E-Mail",
      note: "Was willst du damit bauen? (optional)",
      bookingFor: "Für wen buchst du?",
      forMyself: "Privat",
      forMyTeam: "Für mein Unternehmen",
      company: "Unternehmen",
      lastName: "Nachname (optional)",
      participants: "Anzahl Teilnehmende",
      participantsHint: "2–20. Für größere Gruppen ",
      participantsHintLink: "sprich uns direkt an",
      submit: "Jetzt buchen",
      submitting: "Wird gesendet…",
      successTitle: "Buchungsanfrage erhalten.",
      successBody: "Wir melden uns in Kürze per E-Mail, um deine Buchung und den Starttermin zu bestätigen.",
      errInvalidEmail: "Diese E-Mail-Adresse sieht nicht korrekt aus — bitte prüfe sie.",
      errCompany: "Bitte gib den Namen deines Unternehmens an.",
      errPlaces: "Bitte wähle zwischen 2 und 20 Teilnehmenden.",
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
          "Baue deinen eigenen Retrieval-Agenten mit n8n und Pinecone. Einsteiger bis Fortgeschrittene, 1.099 €. Jetzt Plätze für dich oder dein ganzes Team buchen.",
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

  /**
   * Sally — the XoXoCom A.I. assistant page (/sally). Two jobs: a news board ("Aus der
   * Firma" / "Aus dem Team") and a very basic chat. The same post texts are meant to
   * feed Sally's LinkedIn posts later (feature 2), so write them as Sally, first person.
   *
   * Adding a post = one entry in `posts` here AND in the English tree. Newest is shown
   * first regardless of order (sorted by `date`).
   *
   * ⚠ DRAFT COPY — review before relying on it. Facts are limited to what the team has
   * shipped or announced (Agentix Projects features, closed beta, courses relaunch).
   */
  sally: {
    metaTitle: "Sally — die A.I.-Assistentin von XoXoCom",
    metaDescription: "Lerne Sally kennen: die elektronische Assistentin der XoXoCom. Sie teilt News zu Agentix Projects und aus unserem Team – und beantwortet deine ersten Fragen.",
    eyebrow: "Sally · A.I.-Assistentin",
    greeting: "Hey, ich bin Sally 👋 die elektronische Assistentin der XoXoCom. Ich halte dich über News zu Agentix Projects und aus unserem Team auf dem Laufenden. Frag mich einfach etwas!",
    newsTitle: "Neuigkeiten",
    tabs: { company: "Aus der Firma", team: "Aus dem Team" },
    showMore: "Weiterlesen",
    showLess: "Weniger",
    posts: [
      {
        date: "2026-11-06",
        category: "team",
        title: "Hey, ich bin Sally 👋",
        body: "Ab heute bin ich die elektronische Assistentin der XoXoCom. Ich informiere euch hier – und bald auch auf LinkedIn – über News zu Agentix Projects und aus unserem Team. Kurz gesagt: Ein A.I. Consultant kann dir bei der Umsetzung deiner Business-Ideen helfen, und ich erzähle dir, wie das funktioniert. 🚀",
      },
      {
        date: "2026-10-30",
        category: "team",
        title: "Die Closed Beta rückt näher 🔑",
        body: "Unser Team bereitet gerade die ersten Beta-Zugänge für Agentix Projects vor – inklusive Sicherheit, Rechtstexten und einem neuen Tutorial für den Einstieg. Du willst zu den Ersten gehören? Schreib uns!",
        href: "/kontakt",
        linkLabel: "Beta-Zugang anfragen",
      },
      {
        date: "2026-10-16",
        category: "company",
        title: "Transformation Concept mit Fortschrittsanzeige 📈",
        body: "In Agentix Projects gehst du mit deinem A.I. Consultant Station für Station durch deine Idee und siehst jederzeit, wie weit du bist. Am Ende steht dein fertiges Transformation Concept – inklusive Transformationskosten.",
        href: "https://agentix-projects.com",
        linkLabel: "Agentix Projects ansehen",
      },
      {
        date: "2026-10-16",
        category: "company",
        title: "Deine Agenten gehören dir 🔐",
        body: "Jeder Account hat jetzt seine eigenen Agenten – was du anlegst, siehst nur du. Und die A.I. gibt jedem neuen Projekt automatisch einen passenden Namen und eine Beschreibung.",
      },
      {
        date: "2026-09-29",
        category: "company",
        title: "Unsere A.I.-Kurse sind zurück 🎓",
        body: "Praxisnahe Kurse zu A.I.-Workflows – buchbar für dich allein oder gleich für dein ganzes Team.",
        href: "/courses",
        linkLabel: "Zu den Kursen",
      },
    ] as SallyPost[],
    notes: {
      linkedinTitle: "Sally kümmert sich um LinkedIn",
      linkedinBody: "Bald schreibe ich unsere LinkedIn-Beiträge: wie Agentix Projects entsteht, was im Team passiert und was A.I. Consultants für deine Ideen tun können.",
      linkedinSoon: "Bald auf LinkedIn",
      whyTitle: "Warum haben wir Sally?",
      whyBody: "Weil wir A.I. nicht nur beraten, sondern selbst einsetzen.",
      whyCta: "Mehr erfahren",
    },
    why: {
      eyebrow: "Warum Sally?",
      title: "Eine A.I., die für ein A.I.-Team spricht",
      sub: "Wir helfen Unternehmen, A.I. in ihre Arbeit zu bringen. Da liegt es nahe, dass wir das bei uns selbst zuerst tun.",
      points: [
        { title: "Wir nutzen, was wir empfehlen", body: "Sally ist das sichtbarste Beispiel dafür, wie A.I. bei uns im Alltag mitarbeitet – nicht als Demo, sondern als Teil des Teams." },
        { title: "Immer etwas Neues", body: "Sally sorgt dafür, dass es regelmäßig Neuigkeiten zu Agentix Projects und aus unserem Team gibt – hier und bald auf LinkedIn." },
        { title: "Ein Gesicht für Agentix", body: "Sie erklärt in einfachen Worten, wie A.I. Consultants und Coaches dir bei der Umsetzung deiner Business-Ideen helfen." },
        { title: "Klar gekennzeichnet", body: "Sally ist eine A.I. und sagt das auch. Jeder Beitrag wird vom Team geprüft, bevor er erscheint." },
      ],
      cta: "Agentix Projects ausprobieren",
    },
    chat: {
      aria: "Chat mit Sally",
      placeholder: "Frag Sally etwas …",
      send: "Senden",
      typing: "Sally tippt …",
      you: "Du",
      // Quick-pick chips under the chat: intent ids, identical in both languages.
      suggestions: ["who", "agentix", "beta", "contact"],
      disclaimer: "Sally antwortet mit vorbereiteten Antworten. Deine Eingaben werden nicht gespeichert.",
      catalogOpen: "Alle Fragen",
      catalogTitle: "Was möchtest du wissen?",
      catalogHint: "Wähle eine oder mehrere Fragen – Sally beantwortet sie nacheinander.",
      catalogAsk: "Fragen stellen",
      catalogClose: "Schließen",
      topics: {
        sally: "Über Sally",
        agentix: "Agentix Projects",
        xoxocom: "XoXoCom & Leistungen",
        courses: "Kurse",
        contact: "Kontakt",
      },
      fallback: {
        id: "fallback",
        keywords: [],
        answer: "Hmm, darauf habe ich noch keine Antwort 🙈 Ich bin bewusst einfach gehalten. Schau in „Alle Fragen“ – oder schreib dem Team direkt.",
        href: "/kontakt",
        linkLabel: "Zum Kontakt",
      } as SallyIntent,
      intents: [
        // --- Über Sally ---
        {
          id: "who", topic: "sally", question: "Wer bist du?",
          keywords: ["wer bist", "was bist", "sally", "stell dich"],
          answer: "Ich bin Sally 🤖 die elektronische Assistentin der XoXoCom. Ich teile News aus der Firma und aus dem Team – hier auf der Website und bald auch auf LinkedIn.",
        },
        {
          id: "why", topic: "sally", question: "Warum gibt es dich?",
          keywords: ["warum", "wieso", "weshalb", "wozu", "zweck"],
          answer: "Weil wir A.I. nicht nur beraten, sondern selbst einsetzen. Ich bin sozusagen der Beweis: eine A.I., die für ein A.I.-Team kommuniziert 😉",
        },
        {
          id: "human", topic: "sally", question: "Bist du ein Mensch oder eine KI?",
          keywords: ["mensch", "echt", "ki", "bot", "roboter", "kunstlich"],
          answer: "Ich bin eine A.I.-Assistentin, kein Mensch 🤖 Hier im Chat antworte ich mit Antworten, die das XoXoCom-Team für mich vorbereitet hat – so bleibt alles korrekt.",
        },
        {
          id: "linkedin", topic: "sally", question: "Was machst du auf LinkedIn?",
          keywords: ["linkedin", "post", "beitr", "social"],
          answer: "Ich kümmere mich bald um unseren LinkedIn-Auftritt ✍️ Dort erzähle ich, wie Agentix Projects entsteht, was im Team passiert und was A.I. Consultants für deine Ideen tun können.",
        },
        {
          id: "data", topic: "sally", question: "Speicherst du, was ich schreibe?",
          keywords: ["speicher", "daten", "datenschutz", "privat", "gespeichert", "dsgvo"],
          answer: "Nein. Unser Chat läuft komplett in deinem Browser – nichts, was du hier schreibst, wird gesendet oder gespeichert 🔒",
          href: "/datenschutz",
          linkLabel: "Datenschutzerklärung",
        },
        {
          id: "news", topic: "sally", question: "Was gibt es Neues?",
          keywords: ["news", "neu", "aktuell", "update", "neuigkeit"],
          answer: "Die neuesten Meldungen findest du im News-Board 📰 – getrennt nach „Aus der Firma“ und „Aus dem Team“.",
        },
        // --- Agentix Projects ---
        {
          id: "agentix", broad: true, topic: "agentix", question: "Was ist Agentix Projects?",
          keywords: ["agentix", "app", "produkt"],
          answer: "Agentix Projects ist unser eigenes Produkt: Dort arbeitest du mit A.I. Consultants und Coaches an deiner Business-Idee – Schritt für Schritt bis zum fertigen Transformation Concept 🚀",
          href: "https://agentix-projects.com",
          linkLabel: "Agentix Projects öffnen",
        },
        {
          id: "audience", topic: "agentix", question: "Für wen ist Agentix Projects?",
          keywords: ["fur wen", "zielgruppe", "geeignet", "startup", "grunder"],
          answer: "Für alle, die eine Business-Idee mit A.I. umsetzen wollen – von Gründer:innen über Produktteams bis zu Dev-Teams, die mit A.I.-Agenten Zeit sparen und neue Ideen entwickeln möchten.",
        },
        {
          id: "consultant", topic: "agentix", question: "Was macht ein A.I. Consultant?",
          keywords: ["consultant", "berater", "umsetz"],
          answer: "Ein A.I. Consultant begleitet die Umsetzung deiner Idee: Er stellt die richtigen Fragen, strukturiert dein Vorhaben und arbeitet mit dir an Ausführung und Wachstum 📈",
        },
        {
          id: "coach", topic: "agentix", question: "Und was macht der Coach?",
          keywords: ["coach", "prozess", "begleit"],
          answer: "Der Coach kümmert sich um Prozess & Support: Er gibt dir Orientierung im Projekt, hilft dir dranzubleiben und achtet darauf, dass du Schritt für Schritt vorankommst 🧭",
        },
        {
          id: "concept", topic: "agentix", question: "Was ist das Transformation Concept?",
          keywords: ["transformation concept", "konzept", "concept", "station", "fortschritt"],
          answer: "Das Transformation Concept ist das Ergebnis deiner Arbeit in Agentix Projects: Du gehst mit deinem Consultant Station für Station durch deine Idee, siehst deinen Fortschritt – und erhältst am Ende ein vollständiges Konzept inklusive Transformationskosten.",
        },
        {
          id: "beta", topic: "agentix", question: "Wie komme ich in die Beta?",
          keywords: ["beta", "zugang", "key", "registr", "anmeld", "testen", "ausprobier"],
          answer: "Agentix Projects startet als Closed Beta: Die Registrierung läuft über einen Beta-Key. Schreib dem Team, wenn du dabei sein möchtest – wir melden uns 🔑",
          href: "/kontakt",
          linkLabel: "Beta-Zugang anfragen",
        },
        {
          id: "price", topic: "agentix", question: "Was kostet Agentix Projects?",
          keywords: ["kost", "preis", "geld", "bezahl", "abo", "plan", "gratis"],
          answer: "Preise und Pläne geben wir zum offiziellen Start bekannt. Geplant ist auch ein kostenloser Einstieg, mit dem du Agentix Projects in Ruhe ausprobieren kannst 💡",
        },
        {
          id: "security", topic: "agentix", question: "Sind meine Projektdaten sicher?",
          keywords: ["sicher", "schutz", "vertraulich", "geheim", "sehen andere", "projektdaten"],
          answer: "Datenschutz ist uns wichtig 🔐 Jeder Account hat seine eigenen Agenten: Was du anlegst, siehst nur du. Unser Anspruch ist ein privater Service, bei dem keine Nutzerdaten für andere sichtbar sind.",
        },
        // --- XoXoCom & Leistungen ---
        {
          id: "about", broad: true, topic: "xoxocom", question: "Wer steckt hinter XoXoCom?",
          keywords: ["wer steckt", "hinter xoxocom", "uber euch", "xoxocom", "firma", "unternehmen"],
          answer: "Hinter XoXoCom steht ein junges Team aus Beratung und Entwicklung, das agile Methodik mit künstlicher Intelligenz verbindet.",
          href: "/ueber-uns",
          linkLabel: "Über uns",
        },
        {
          id: "services", broad: true, topic: "xoxocom", question: "Welche Leistungen bietet ihr an?",
          keywords: ["leistung", "angebot", "anbiet", "bietet", "service", "helfen", "hilfe", "unterstutz"],
          answer: "XoXoCom verbindet agile Arbeitsweisen mit A.I.: A.I. Transformation, Expert Consulting und Business Coaching – für Teams und Unternehmen.",
          href: "/leistungen/ai-transformation",
          linkLabel: "Leistungen ansehen",
        },
        {
          id: "aiTransformation", topic: "xoxocom", question: "Was ist A.I. Transformation?",
          keywords: ["transformation", "agil", "ki transformation"],
          answer: "Bei der A.I. Transformation verbinden wir agile Methodik mit der Power der A.I. – individuell, disruptiv und messbar überlegen. Wir begleiten Teams vom Business Case bis zur Produktion.",
          href: "/leistungen/ai-transformation",
          linkLabel: "Mehr zur A.I. Transformation",
        },
        {
          id: "expertConsulting", topic: "xoxocom", question: "Was ist Expert Consulting?",
          keywords: ["expert", "projekteinsatz", "projekteinsatze", "rolle", "scrum", "product owner", "spezialist"],
          answer: "Beim Expert Consulting besetzen wir kritische Schlüsselrollen mit Spezialisten – vom Product Owner und Scrum Master über Software Engineers bis zum A.I. Specialist 🧩",
          href: "/leistungen/expert-consulting",
          linkLabel: "Mehr zu Expert Consulting",
        },
        {
          id: "businessCoaching", topic: "xoxocom", question: "Was ist Business Coaching?",
          keywords: ["business coaching", "coaching", "mentor", "karriere"],
          answer: "Beim Business Coaching schließen wir die Lücke zwischen Innovation und Mensch – als strategischer Partner für dein Unternehmen und Mentor für deine Karriere 🌱",
          href: "/leistungen/business-coaching",
          linkLabel: "Mehr zu Business Coaching",
        },
        // --- Kurse ---
        {
          id: "courses", topic: "courses", question: "Welche Kurse gibt es?",
          keywords: ["kurs", "schulung", "training", "lernen", "workshop", "weiterbild"],
          answer: "Wir bieten praxisnahe A.I.-Kurse an – für dich allein oder für dein ganzes Team 🎓",
          href: "/courses",
          linkLabel: "Zu den Kursen",
        },
        {
          id: "courseTeam", topic: "courses", question: "Kann ich einen Kurs für mein Team buchen?",
          keywords: ["fur mein team", "buch", "mitarbeit", "kollegen", "gruppe", "mehrere"],
          answer: "Ja! Bei der Buchung wählst du „Für mein Unternehmen“ und fragst gleich mehrere Plätze für dein Team an. Als Ansprechperson sprichst du dann für dein Team mit uns 👥",
          href: "/courses",
          linkLabel: "Kurs buchen",
        },
        {
          id: "courseStart", topic: "courses", question: "Wann starten die Kurse?",
          keywords: ["wann", "start", "datum", "beginn"],
          answer: "Nach deiner Buchung meldet sich das Team persönlich bei dir – mit Termin und allen Details. Die Buchung ist unverbindlich: Nichts wird reserviert oder bezahlt, bevor wir uns gemeldet haben 📅",
        },
        // --- Kontakt ---
        {
          id: "contact", topic: "contact", question: "Wie erreiche ich das Team?",
          keywords: ["kontakt", "erreich", "sprechen", "anruf", "telefon", "termin"],
          answer: "Am schnellsten erreichst du das Team über das Kontaktformular 📬",
          href: "/kontakt",
          linkLabel: "Zum Kontakt",
        },
        {
          id: "email", topic: "contact", question: "Wie lautet eure E-Mail-Adresse?",
          keywords: ["mail", "adresse"],
          answer: "Du erreichst uns unter info@xoxocom.net ✉️ – oder ganz bequem über das Kontaktformular.",
          href: "mailto:info@xoxocom.net",
          linkLabel: "E-Mail schreiben",
        },
        {
          id: "reply", topic: "contact", question: "Wie schnell antwortet ihr?",
          keywords: ["schnell", "antwort", "dauer", "wie lange", "reaktion"],
          answer: "Wir lesen jede Nachricht und antworten innerhalb eines Werktags ⚡",
        },
        // --- small talk (not in the catalog) ---
        {
          id: "thanks",
          keywords: ["danke", "dank", "super", "cool", "toll"],
          answer: "Gern geschehen! 💛 Schau bald wieder vorbei – es gibt regelmäßig Neues.",
        },
        {
          id: "greet",
          keywords: ["hallo", "hi", "hey", "servus", "moin", "guten"],
          answer: "Hallo! Schön, dass du da bist 👋 Frag mich einfach etwas – oder stöbere in „Alle Fragen“.",
        },
      ] as SallyIntent[],
    },
  },
};

const en: typeof de = {
  langToggle: { aria: "Select language", de: "DE", en: "EN" },

  nav: [
    {
      label: "Products",
      href: "/produkte",
      children: [
        { label: "Agentix Projects", href: "https://agentix-projects.com", external: true, desc: "Train your AI Project-Agents" },
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
    { label: "Sally", href: "/sally" },
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
        href: "https://agentix-projects.com",
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
      "Hands-on A.I. courses from XoXoCom UG, taught from real delivery experience. First up: Build Your Own RAG Agent with n8n and Pinecone. Book now.",
    viewCourse: "View course",
    carouselAria: "Courses",
    scrollPrev: "Previous course",
    scrollNext: "Next course",
    comingSoon: "Now booking",
    backToCourses: "Back to courses",
    breadcrumbHome: "Home",
    priceLabel: "Price",
    priceUnit: "per participant",
    levelLabel: "Level",
    stackLabel: "Stack",
    stackNote: "The tools you'll be working with on this course.",
    waitlist: {
      eyebrow: "Book your place",
      title: "Secure your place, or your whole team's",
      body: "Taught from real delivery experience, not from slideware. Book for yourself or bring your whole team. Send your booking request and we'll get back to you by email to confirm your booking, the start date and the next steps. No payment is taken here.",
      firstName: "First name",
      email: "Email",
      note: "What do you want to build with it? (optional)",
      bookingFor: "Who are you booking for?",
      forMyself: "For myself",
      forMyTeam: "For my team",
      company: "Company",
      lastName: "Last name (optional)",
      participants: "Number of participants",
      participantsHint: "2–20. For larger groups, ",
      participantsHintLink: "get in touch",
      submit: "Book now",
      submitting: "Sending…",
      successTitle: "Booking request received.",
      successBody: "We'll email you shortly to confirm your booking and the start date.",
      errInvalidEmail: "That email address doesn't look right — please check it.",
      errCompany: "Please enter your company name.",
      errPlaces: "Please choose between 2 and 20 participants.",
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
          "Build your own retrieval agent with n8n and Pinecone. Beginner to intermediate, €1,099. Book a place for yourself or your whole team now.",
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

  sally: {
    metaTitle: "Sally — the A.I. assistant of XoXoCom",
    metaDescription: "Meet Sally, the electronic assistant of XoXoCom. She shares news about Agentix Projects and our team — and answers your first questions.",
    eyebrow: "Sally · A.I. assistant",
    greeting: "Hey, I'm Sally 👋 the electronic assistant of XoXoCom. I keep you posted on news about Agentix Projects and from our team. Just ask me something!",
    newsTitle: "News",
    tabs: { company: "From the company", team: "From the team" },
    showMore: "Read more",
    showLess: "Less",
    posts: [
      {
        date: "2026-11-06",
        category: "team",
        title: "Hey, I'm Sally 👋",
        body: "Starting today, I'm the electronic assistant of XoXoCom. I'll keep you posted here — and soon on LinkedIn — about news on Agentix Projects and from our team. In short: an A.I. consultant can help you turn your business ideas into reality, and I'll tell you how that works. 🚀",
      },
      {
        date: "2026-10-30",
        category: "team",
        title: "The closed beta is getting close 🔑",
        body: "Our team is preparing the first beta access for Agentix Projects — including security, legal texts and a new getting-started tutorial. Want to be among the first? Write to us!",
        href: "/kontakt",
        linkLabel: "Request beta access",
      },
      {
        date: "2026-10-16",
        category: "company",
        title: "Transformation Concept with progress tracking 📈",
        body: "In Agentix Projects you walk through your idea with your A.I. consultant, station by station, and always see how far along you are. At the end you get your finished Transformation Concept — including transformation costs.",
        href: "https://agentix-projects.com",
        linkLabel: "See Agentix Projects",
      },
      {
        date: "2026-10-16",
        category: "company",
        title: "Your agents belong to you 🔐",
        body: "Every account now has its own agents — what you create, only you see. And the A.I. automatically gives every new project a fitting name and description.",
      },
      {
        date: "2026-09-29",
        category: "company",
        title: "Our A.I. courses are back 🎓",
        body: "Hands-on courses on A.I. workflows — book a place for yourself or for your whole team.",
        href: "/courses",
        linkLabel: "See the courses",
      },
    ] as SallyPost[],
    notes: {
      linkedinTitle: "Sally takes care of LinkedIn",
      linkedinBody: "Soon I'll write our LinkedIn posts: how Agentix Projects is built, what's happening in the team and what A.I. consultants can do for your ideas.",
      linkedinSoon: "Coming soon to LinkedIn",
      whyTitle: "Why do we have Sally?",
      whyBody: "Because we don't just advise on A.I. — we use it ourselves.",
      whyCta: "Learn more",
    },
    why: {
      eyebrow: "Why Sally?",
      title: "An A.I. that speaks for an A.I. team",
      sub: "We help companies bring A.I. into their work. So it only makes sense that we do it ourselves first.",
      points: [
        { title: "We use what we recommend", body: "Sally is the most visible example of how A.I. works alongside us every day — not as a demo, but as part of the team." },
        { title: "Always something new", body: "Sally makes sure there's regular news about Agentix Projects and from our team — here and soon on LinkedIn." },
        { title: "A face for Agentix", body: "She explains in plain words how A.I. consultants and coaches help you turn your business ideas into reality." },
        { title: "Clearly labelled", body: "Sally is an A.I. and says so. Every post is reviewed by the team before it goes out." },
      ],
      cta: "Try Agentix Projects",
    },
    chat: {
      aria: "Chat with Sally",
      placeholder: "Ask Sally something …",
      send: "Send",
      typing: "Sally is typing …",
      you: "You",
      suggestions: ["who", "agentix", "beta", "contact"],
      disclaimer: "Sally replies with prepared answers. What you type is not stored.",
      catalogOpen: "All questions",
      catalogTitle: "What would you like to know?",
      catalogHint: "Pick one or more questions — Sally answers them one by one.",
      catalogAsk: "Ask",
      catalogClose: "Close",
      topics: {
        sally: "About Sally",
        agentix: "Agentix Projects",
        xoxocom: "XoXoCom & services",
        courses: "Courses",
        contact: "Contact",
      },
      fallback: {
        id: "fallback",
        keywords: [],
        answer: "Hmm, I don't have an answer for that yet 🙈 I'm kept simple on purpose. Have a look at “All questions” — or write to the team directly.",
        href: "/kontakt",
        linkLabel: "Contact",
      } as SallyIntent,
      intents: [
        // --- About Sally ---
        {
          id: "who", topic: "sally", question: "Who are you?",
          keywords: ["who are", "what are you", "sally", "introduce"],
          answer: "I'm Sally 🤖 the electronic assistant of XoXoCom. I share news from the company and the team — here on the website and soon on LinkedIn.",
        },
        {
          id: "why", topic: "sally", question: "Why do you exist?",
          keywords: ["why", "purpose", "reason"],
          answer: "Because we don't just advise on A.I. — we use it ourselves. I'm the proof: an A.I. that communicates for an A.I. team 😉",
        },
        {
          id: "human", topic: "sally", question: "Are you a human or an A.I.?",
          keywords: ["human", "real", "ai", "bot", "robot", "artificial"],
          answer: "I'm an A.I. assistant, not a human 🤖 In this chat I reply with answers the XoXoCom team prepared for me — that way everything stays accurate.",
        },
        {
          id: "linkedin", topic: "sally", question: "What do you do on LinkedIn?",
          keywords: ["linkedin", "post", "social"],
          answer: "I'll soon take care of our LinkedIn presence ✍️ I'll share how Agentix Projects is built, what's happening in the team and what A.I. consultants can do for your ideas.",
        },
        {
          id: "data", topic: "sally", question: "Do you store what I type?",
          keywords: ["store", "data", "privacy", "private", "saved", "gdpr"],
          answer: "No. Our chat runs entirely in your browser — nothing you type here is sent or stored 🔒",
          href: "/datenschutz",
          linkLabel: "Privacy policy",
        },
        {
          id: "news", topic: "sally", question: "What's new?",
          keywords: ["news", "new", "latest", "update"],
          answer: "You'll find the latest posts on the news board 📰 — split into “From the company” and “From the team”.",
        },
        // --- Agentix Projects ---
        {
          id: "agentix", broad: true, topic: "agentix", question: "What is Agentix Projects?",
          keywords: ["agentix", "app", "product"],
          answer: "Agentix Projects is our own product: you work on your business idea with A.I. consultants and coaches — step by step, all the way to a finished Transformation Concept 🚀",
          href: "https://agentix-projects.com",
          linkLabel: "Open Agentix Projects",
        },
        {
          id: "audience", topic: "agentix", question: "Who is Agentix Projects for?",
          keywords: ["who is", "for whom", "audience", "suitable", "startup", "founder", "target"],
          answer: "For anyone who wants to turn a business idea into reality with A.I. — from founders and product teams to dev teams that want to save time and develop new ideas with A.I. agents.",
        },
        {
          id: "consultant", topic: "agentix", question: "What does an A.I. consultant do?",
          keywords: ["consultant", "advisor", "implement"],
          answer: "An A.I. consultant guides the implementation of your idea: asks the right questions, structures your project and works with you on execution and growth 📈",
        },
        {
          id: "coach", topic: "agentix", question: "And what does the coach do?",
          keywords: ["coach", "process", "guide"],
          answer: "The coach takes care of process & support: gives you orientation in the project, helps you stay on track and makes sure you move forward step by step 🧭",
        },
        {
          id: "concept", topic: "agentix", question: "What is the Transformation Concept?",
          keywords: ["transformation concept", "concept", "station", "progress"],
          answer: "The Transformation Concept is the result of your work in Agentix Projects: you walk through your idea with your consultant station by station, see your progress — and end up with a complete concept including transformation costs.",
        },
        {
          id: "beta", topic: "agentix", question: "How do I join the beta?",
          keywords: ["beta", "access", "key", "register", "sign up", "signup", "try"],
          answer: "Agentix Projects starts as a closed beta: registration works with a beta key. Write to the team if you'd like to join — we'll get back to you 🔑",
          href: "/kontakt",
          linkLabel: "Request beta access",
        },
        {
          id: "price", topic: "agentix", question: "How much does Agentix Projects cost?",
          keywords: ["cost", "price", "pricing", "how much", "pay", "subscription", "plan", "free"],
          answer: "We'll announce prices and plans at the official launch. A free entry tier is planned too, so you can try Agentix Projects at your own pace 💡",
        },
        {
          id: "security", topic: "agentix", question: "Is my project data safe?",
          keywords: ["safe", "secure", "security", "confidential", "secret", "can others", "project data"],
          answer: "Privacy matters to us 🔐 Every account has its own agents: what you create, only you see. Our aim is a private service where no user data is visible to others.",
        },
        // --- XoXoCom & services ---
        {
          id: "about", broad: true, topic: "xoxocom", question: "Who is behind XoXoCom?",
          keywords: ["who is behind", "behind xoxocom", "about you", "xoxocom", "company"],
          answer: "Behind XoXoCom is a young team from consulting and development that combines agile methodology with artificial intelligence.",
          href: "/ueber-uns",
          linkLabel: "About us",
        },
        {
          id: "services", broad: true, topic: "xoxocom", question: "What services do you offer?",
          keywords: ["service", "offer", "provide", "help", "support"],
          answer: "XoXoCom combines agile ways of working with A.I.: A.I. Transformation, Expert Consulting and Business Coaching — for teams and companies.",
          href: "/leistungen/ai-transformation",
          linkLabel: "See our services",
        },
        {
          id: "aiTransformation", topic: "xoxocom", question: "What is A.I. Transformation?",
          keywords: ["transformation", "agile"],
          answer: "In A.I. Transformation we combine agile methodology with the power of A.I. — individual, disruptive and measurably superior. We support teams from the business case to production.",
          href: "/leistungen/ai-transformation",
          linkLabel: "More on A.I. Transformation",
        },
        {
          id: "expertConsulting", topic: "xoxocom", question: "What is Expert Consulting?",
          keywords: ["expert", "staffing", "role", "scrum", "product owner", "specialist"],
          answer: "With Expert Consulting we fill critical key roles with specialists — from Product Owner and Scrum Master to software engineers and A.I. specialists 🧩",
          href: "/leistungen/expert-consulting",
          linkLabel: "More on Expert Consulting",
        },
        {
          id: "businessCoaching", topic: "xoxocom", question: "What is Business Coaching?",
          keywords: ["business coaching", "coaching", "mentor", "career"],
          answer: "With Business Coaching we close the gap between innovation and people — as a strategic partner for your company and a mentor for your career 🌱",
          href: "/leistungen/business-coaching",
          linkLabel: "More on Business Coaching",
        },
        // --- Courses ---
        {
          id: "courses", topic: "courses", question: "What courses are there?",
          keywords: ["course", "training", "learn", "workshop", "class"],
          answer: "We offer hands-on A.I. courses — for yourself or for your whole team 🎓",
          href: "/courses",
          linkLabel: "See the courses",
        },
        {
          id: "courseTeam", topic: "courses", question: "Can I book a course for my team?",
          keywords: ["for my team", "book", "employees", "colleagues", "group", "several"],
          answer: "Yes! When booking, choose “For my team” and request several places at once. As the contact person you then speak for your team towards us 👥",
          href: "/courses",
          linkLabel: "Book a course",
        },
        {
          id: "courseStart", topic: "courses", question: "When do the courses start?",
          keywords: ["when", "start", "date", "begin"],
          answer: "After your booking the team gets in touch personally — with a date and all the details. A booking commits you to nothing: nothing is reserved or paid until we've confirmed 📅",
        },
        // --- Contact ---
        {
          id: "contact", topic: "contact", question: "How do I reach the team?",
          keywords: ["contact", "reach", "talk", "call", "phone", "write", "meeting"],
          answer: "The fastest way to reach the team is the contact form 📬",
          href: "/kontakt",
          linkLabel: "Contact",
        },
        {
          id: "email", topic: "contact", question: "What's your email address?",
          keywords: ["mail", "address"],
          answer: "You can reach us at info@xoxocom.net ✉️ — or simply use the contact form.",
          href: "mailto:info@xoxocom.net",
          linkLabel: "Send an email",
        },
        {
          id: "reply", topic: "contact", question: "How fast do you reply?",
          keywords: ["fast", "quick", "reply", "respond", "how long"],
          answer: "We read every message and reply within one business day ⚡",
        },
        // --- small talk (not in the catalog) ---
        {
          id: "thanks",
          keywords: ["thank", "thx", "great", "cool", "nice"],
          answer: "You're welcome! 💛 Come back soon — there's regularly something new.",
        },
        {
          id: "greet",
          keywords: ["hello", "hi", "hey", "good morning", "good evening"],
          answer: "Hi! Great to have you here 👋 Just ask me something — or browse “All questions”.",
        },
      ] as SallyIntent[],
    },
  },
};

export const COPY = { de, en };
export type Copy = typeof de;

/** One course, in one language — everything both the card and the detail page render. */
export type CourseEntry = Copy["courses"]["catalog"][number];
