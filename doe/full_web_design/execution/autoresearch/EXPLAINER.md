# SEO Completeness, explained simply 🧭

This page explains, in very plain words, what we just did to the XoXoCom website
and how the little "robot helper" that did it works. No tech background needed.

---

## ⚡ See the value RIGHT NOW (about 2 minutes)

Don't want to read everything first? Here's the proof you can touch today.

**Proof #1 — the score that was measured.** Open this file in any text editor:
`execution/autoresearch/results/seo.tsv`. You'll see the SEO grade climb from
**32.57 → 100**. That jump *is* the value, written down as a number. (Row 1 is the old
site; the last row is now.)

**Proof #2 — things that did NOT exist before today.** Start the site:

```
cd "sites/xoxocom"
npx next dev
```

Wait for "ready", then open these in your browser — yesterday they were all **404 / not
found**; now they exist:
- http://localhost:3000/sitemap.xml  → the map of every page, for Google
- http://localhost:3000/robots.txt  → the note that welcomes Google's robots
- http://localhost:3000/opengraph-image  → the branded picture shown when the link is shared

**Proof #3 — the grade, live.** In a second terminal (in the `full_web_design` folder):

```
python execution/autoresearch/score/score_seo.py --base-url http://localhost:3000 --verbose
```

It prints `SEO score: 100.0/100  passed=True`. Run it twice — same number every time,
because the grading is honest and repeatable.

**Proof #4 — the hidden "flyer" Google now reads.** On the homepage, right-click →
*"View Page Source"*, then press `Ctrl+F` and search for `og:image` and
`application/ld+json`. Those lines (the share-preview info and the company "business
card") were not there before.

> The single biggest *visible* win: paste the site link into a chat once it's online and
> you'll get a real preview card with a picture — instead of the old empty grey box that
> made the company look unfinished. (How to test that for free is in section 6.)

Full, friendly step-by-step is in **section 6** further down.

---

## 1. First: what is SEO? 🔍

Imagine the internet is a **giant library** with billions of pages. Nobody can read
them all. So **Google** sends out little **robots** that crawl around, read pages, and
write down what each page is about. Later, when someone searches for *"A.I. Beratung"*,
Google looks at its notes and shows the best pages.

**SEO** (Search Engine Optimization) just means: **making your website easy for those
robots to find, read, and understand** — so Google shows it to more people.

Think of it like a shop:

| A shop with bad SEO | A shop with good SEO |
|---|---|
| No sign outside | Big clear sign |
| Not in the phone book | Listed in the phone book with address |
| When you tell a friend, you just say "it's somewhere downtown" | You hand them a nice flyer with a photo |

The shop (our website) was already nicely built. But it had **no sign, no phone-book
entry, and no flyer**. That's what we fixed.

---

## 2. Why this matters for getting clients 💼

People find a company three ways: they **search Google**, or a friend **shares a link**,
or they already know the name. If Google can't read your site, and shared links look
broken, you lose customers *before they even see your work*. Fixing SEO is the cheapest
way to stop losing them. It's free — we only used tools you already have.

---

## 3. What actually changed on the website ✅

Here is the honest, concrete list of what's different now. Before, **none** of these
existed. Now they all do.

### a) A map of all the pages (the "sitemap") 🗺️
A sitemap is a simple list of every page on the site, written for robots. It's like
giving Google a **table of contents** so it never misses a page.
→ Now lives at `/sitemap.xml`.

### b) A note for the robots (the "robots.txt") 🤖
A short note that tells the robots *"yes, please look around, here's the map."*
→ Now lives at `/robots.txt`.

### c) A nice preview when you share the link 🖼️
Before: paste the link in WhatsApp or LinkedIn → an **ugly grey box, no picture**.
Now: it shows a **proper card** with a title, a description, and a branded image
(coral on dark). This is called **Open Graph**. It's the "flyer" you hand a friend.

### d) A business card written for Google ("structured data") 📇
A tiny hidden block of info that tells Google clearly: *"This is XoXoCom UG, here is its
website, logo, email, and LinkedIn."* Google likes this and can show it nicely.
(The tech name is **JSON-LD Organization**.)

### e) Better titles and descriptions for every page 🏷️
Every page now has its **own** title and short description — the right length, and all
different from each other. That's the blue headline and grey text you see in Google
results. Before, some were too short or missing pieces.

### f) A "we own this site" proof slot 🔑
A spot ready for a secret code from Google so you can later prove the site is yours and
see your visitor stats (more on that at the end).

> One important detail: all the website addresses are stored in **one place**
> (a setting called `site_url`). So when your real domain `www.xoxocom.net` is connected
> later, we change **one line** and everything updates. No hunting through files.

---

## 4. The clever robot helper: "AutoResearch" 🎮

Here's the fun part. Instead of a human guessing what to fix, we built a little system
inspired by something a famous A.I. researcher (Andrej Karpathy) made. It works like a
**video game with a score**.

There are three simple roles:

1. **The Teacher** 📋 — a program that looks at the website and gives it a **grade from
   0 to 100** for SEO. The teacher's rules never change (so the grade is fair).
2. **The Student** 🧑‍🎓 — the A.I. that changes the website to try to get a higher grade.
3. **The Goal Sheet** 📝 — a plain note saying *"make SEO better, here are ideas to try."*

Then it plays this loop, over and over:

```
read the goal  →  change one thing  →  ask the Teacher for a grade
      ↑                                              |
      |          if the grade went UP: keep it ✅    |
      └──────────  if it went DOWN: undo it ❌  ←─────┘
```

Only changes that **raise the score survive**. Bad ideas get thrown away automatically.

### Our actual game scores 🏆
We really ran this. The score climbed like this:

| Try | What we did | Score |
|---|---|---|
| Start | The site as it was | **32.57 / 100** |
| 1 | Added sitemap, robots, previews, business card, titles | **88.64** |
| 2 | Gave every page its preview picture | **100** |
| 3 | Found the preview picture was secretly **broken**, fixed it for real | **100 (real!)** |

That third row is a great story: the site *looked* finished (score said 100), but the
preview picture was actually crashing behind the scenes. We made the Teacher **stricter**
so it checks the picture really loads — and then fixed it. Honesty over a fake 100. 😊

---

## 5. Where everything lives 📂

All the "robot helper" files are in one folder: `execution/autoresearch/`

| File | What it is (in plain words) |
|---|---|
| `score/score_seo.py` | **The Teacher.** Looks at the site and prints a grade 0–100. |
| `optimize.py` | **The Game Master.** Gets a grade, then keeps or undoes a change. (The A.I. makes the actual change — see section 7.) |
| `program/seo.md` | **The Goal Sheet.** What to improve and ideas to try. |
| `results/seo.tsv` | **The Scoreboard.** Every try and its score, saved as a list. |
| `EXPLAINER.md` | This page you're reading. |

The website changes live in `sites/xoxocom/` — mainly the new files
`app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `lib/seo.ts`, and small
edits to each page.

There's also a longer "how-to" guide for grown-up users at
`directives/auto_optimize_seo.md`.

---

## 6. How to SEE all of this yourself 👀

You don't need to code. Just follow along. (Type the commands exactly; the `$` is not part
of the command.)

### Step 1 — Start the website on your computer
Open a terminal, go to the site folder, and start it:

```
cd "sites/xoxocom"
npx next dev
```

Wait until it says **ready**. The site is now running at **http://localhost:3000**.
(`localhost` just means "on my own computer.")

### Step 2 — Look at the new SEO things in your browser
Open these web addresses in Chrome:

- **The site:** http://localhost:3000
- **The map (sitemap):** http://localhost:3000/sitemap.xml  → you'll see a list of every page.
- **The robot note:** http://localhost:3000/robots.txt  → a few short lines.
- **The preview picture:** http://localhost:3000/opengraph-image  → the branded image.

### Step 3 — See the SEO grade
Open a **second** terminal (leave the site running in the first), go to the
`full_web_design` folder, and run:

```
python execution/autoresearch/score/score_seo.py --base-url http://localhost:3000 --verbose
```

You'll see something like `SEO score: 100.0/100  passed=True`, plus a list of which
checks pass. The `--verbose` part just means "explain it to me."

### Step 4 — See the goal sheet + the scoreboard history
This prints the goal and the list of past tries:

```
python execution/autoresearch/optimize.py state
```

Or just **open the scoreboard file** in any text editor:
`execution/autoresearch/results/seo.tsv` — it's a simple table of every try and its score.

### Bonus — check the shared-link preview looks nice
Once the site is live on the internet, paste its address into the free
**LinkedIn Post Inspector** (search that name on Google) to see the preview card.

---

## 7. How do I run this myself? Do I need to prompt it? 🙋

Honest answer: **two different things can happen, and only one of them needs the A.I.**

### A) Getting a grade = fully automatic, no A.I. needed 🤖
Any time you want to know the site's SEO grade, you run **one command yourself** (you saw it
in section 6). With the site running:

```
python execution/autoresearch/score/score_seo.py --base-url http://localhost:3000 --verbose
```

The Teacher grades the site and prints a number. No prompt, no A.I., not even the internet.
Run it whenever you like — after a change, before a launch, anytime.

### B) Actually IMPROVING the site = you ask the A.I. (Claude) to do it 🧑‍🎓
The Python can *grade*, and it can *keep or undo*, but it **cannot think up the improvements
by itself**. A person — or the A.I. — has to make the actual changes. So improving is **not**
a "press one button and walk away" thing. You **prompt Claude** (inside Claude Code), and
Claude plays the student: it makes one change, asks the Teacher for a grade, keeps it if the
grade went up, undoes it if not, then repeats.

> 👉 In short: **the grading is automatic; the improving is something you prompt the A.I. to do.**

### How to ask the A.I. to run the whole loop — example prompt 💬
Open this project in Claude Code and paste something like this:

> *Run the SEO completeness AutoResearch loop for the XoXoCom site. First read*
> *`execution/autoresearch/program/seo.md` (the goal sheet) and*
> *`execution/autoresearch/results/seo.tsv` (the scoreboard). Start the dev server, check the*
> *current score with `score_seo.py`, then improve the site one change at a time — re-scoring*
> *after each change and keeping only changes that raise the score, undoing ones that don't —*
> *until it reaches 100 or stops improving. Add a row to `results/seo.tsv` for each try.*

Claude does the rest and shows you the score climbing. That's exactly how it went from 33 to
100 the first time. You don't need to know any code — you just give that instruction.

### "Can it run on its own, like overnight?" 🌙
Sort of — this is the advanced mode. There's a switch that lets the tool **save** good changes
and **undo** bad ones all by itself:

```
python execution/autoresearch/optimize.py evaluate --serve --auto-git --hypothesis "what I changed"
```

But even here, **the A.I. still has to make the change first** — the `--auto-git` switch only
does the "keep or undo" bookkeeping, not the thinking. To make it truly hands-off, you'd pair
it with Claude Code's repeat feature (the `/loop` tool) so Claude keeps trying on a timer. For
now, the simple prompt above is all you need.

### Do I need to run it again right now? ⏳
Not really — the site is **already at 100/100**, so there's little left to improve. You'd run
the loop again when there's something *new* to grade, for example:
- after you **add new pages** to the site,
- after **connecting the real domain** (to confirm the addresses are correct), or
- when you want to start a **different experiment** (speed, wording — see section 9).

---

## 8. What's still left to do (all free) 📝

The robot did its part. A few things need a human, one time:

1. **Connect the real domain** `www.xoxocom.net` to the website host (Netlify), then set
   two settings: the site address (`NEXT_PUBLIC_SITE_URL`) and the Google proof code
   (`GOOGLE_SITE_VERIFICATION`).
2. **Tell Google about the site:** open **Google Search Console** (free), add the site,
   paste the proof code, and submit the sitemap address `/sitemap.xml`. After that you'll
   slowly start seeing **how many people find you on Google** — real data, for free.
3. Publishing the site for real must be done from a copy of the project **outside the
   OneDrive folder** (a quirk of this computer setup), but the SEO work itself is finished
   and correct.

---

## 9. Doing more experiments later 🚀

The cool part: this same game machine can improve **other things** too, not just SEO.
Later you could add:

- **Speed** — how fast pages load.
- **Accessibility** — how usable the site is for everyone (and German law).
- **Wording** — how convincing the text is at turning visitors into customers.

Each new experiment is just **a new Teacher file** (`score/score_xxx.py`) and a new goal
sheet. The Game Master (`optimize.py`) stays the same. We started with SEO because it's
the foundation: if Google can't find you, nothing else matters yet.

---

*In one sentence: we taught a tiny A.I. to play a "make the website easier to find" game,
it scored the site, kept only the changes that helped, and pushed the SEO grade from 33 to
a real 100 — all for free.* 🎉
