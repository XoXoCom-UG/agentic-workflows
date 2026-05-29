# TAM Topic Finder and Classifier For LinkedIn

## Goal
Scrape articles and news blogs on the Internet using Apify, verify their relevance
(theme and topic match > 80%) and recency (published within the specified Timeline),
deduplicate against the existing Google Sheet, and save new results to that sheet.

## Inputs
- **Theme**: The target theme (e.g., "AI", "LinkedIn", "SAFe", "Agile & Product Management")
- **Topic**: The specific search topic (e.g., "Latest AI models", "Claude Opus 4.7", "LinkedIn algorithm updates")
- **Timeline**: Recency window — scraped articles must not be older than this period (e.g., "2 weeks", "7 days")
- **Total Count**: The total number of articles desired (e.g., 20, 50)
- **[OPTIONAL] File Location**: The name or URL of the target Google Sheet. Defaults to `TAM_LinkedIn_Feed_[Month]_[Year]` (e.g., `TAM_LinkedIn_Feed_May_2026`) based on the current date. Pass a name to override, or a URL to target a specific existing sheet.
- **[OPTIONAL] Location**: Geographic filter for the search (e.g., "Germany", "Europe")
- **[OPTIONAL] Folder**: Google Drive folder to place the sheet in. Accepts a folder name (e.g., "Content Feeds") or a full Drive URL. If omitted, defaults to the folder set in `GOOGLE_DRIVE_FOLDER_ID` in `.env`. If the sheet already exists, it will be moved there.
- **[OPTIONAL] Date of Scrape**: The date the scrape request was made (defaults to today if omitted)

## Tools/Scripts
- `execution/scrape_apify_news.py` — Scrapes articles via Apify (up to ~100 sources per run)
- `execution/create_sheet_if_missing.py` — Creates the Google Sheet if it doesn't already exist
- `execution/check_sheet_duplicates.py` — Checks which scraped articles are already in the Sheet
- `execution/classify_articles_llm.py` — Deterministic filter: applies relevance score threshold and recency date check. **Scores are set by the orchestrator (Claude Code) before this script is called.**
- `execution/update_sheet.py` — Batch-appends verified, deduplicated articles to the Sheet
- **Dependencies**: `APIFY_API_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_DRIVE_FOLDER_ID` (all in `.env`). No Anthropic API key needed — relevance scoring is performed by the orchestrator (Claude Code).

## Process

### Step 1: Ensure Sheet Exists
- Run `execution/create_sheet_if_missing.py` with `--file_location` (the user-provided sheet name/URL) and optionally `--folder` (folder name or Drive URL).
- If the sheet doesn't exist, it is created with standard headers:
  `Title | URL | Source | Published Date | Theme | Topic | Relevance Score | Scraped At`
- If `--folder` is provided: new sheets are created inside it; existing sheets are moved there.
- Output: Confirmed Google Sheet URL (store for later steps).

### Step 2: Test Scrape (Verification Sample)
- Run `execution/scrape_apify_news.py` with:
  - `--theme`, `--topic`, `--location` (if provided)
  - `--max_items=10`
- Output: `.tmp/test_articles.json`
- **Agent (You) reads the file and checks:**
  - Do at least 8/10 articles visually match the Theme and Topic? (80% threshold)
  - Are the published dates within the Timeline window?
- **Decision:**
  - **Pass** → Proceed to Step 3.
  - **Fail** → Stop. Ask user to refine Theme, Topic, or Timeline keywords before continuing.

### Step 3: Full Scrape
- Run `execution/scrape_apify_news.py` with:
  - `--theme`, `--topic`, `--location` (if provided)
  - `--max_items` set to **Total Count**
- Output: `.tmp/articles_[timestamp].json`

### Step 4: Deduplication Check
- Run `execution/check_sheet_duplicates.py` with:
  - The Google Sheet URL (from Step 1)
  - `.tmp/articles_[timestamp].json`
- Output: `.tmp/new_articles_[timestamp].json` (articles not yet in the sheet)
- If the new file is empty (all duplicates), notify the user: no new articles found for this topic in the given timeframe.

### Step 5: LLM Classification (Relevance + Recency Verification)
- **Orchestrator (Claude Code) reads `.tmp/new_articles_[timestamp].json`** and scores each article's title + snippet for theme/topic match (0–100). Write `relevance_score` onto each article object and save the file back.
- Then run `execution/classify_articles_llm.py` with:
  - `.tmp/new_articles_[timestamp].json` (now containing scores)
  - `--theme`, `--topic`, `--timeline`
  - `--min_relevance_score=80`
- Script mechanically filters: keeps articles where `relevance_score >= min_relevance_score` AND `published_date` falls within the Timeline window.
- Output: `.tmp/classified_articles_[timestamp].json` (only passing articles)
- If fewer than 5 articles pass, notify user and ask whether to proceed or broaden the search.

### Step 6: Upload to Google Sheet (DELIVERABLE)
- Run `execution/update_sheet.py` with `.tmp/classified_articles_[timestamp].json`
  and the Google Sheet URL.
- **Grouping behaviour:**
  - If the topic already exists in the sheet: new rows are inserted directly after the last existing row for that topic.
  - If the topic is new: 2 blank separator rows are added first, then the new articles.
  - If the sheet has no data yet: rows are written directly with no separator.
- **Output: Google Sheet URL** — this is the deliverable. Share this link with the user.

## Outputs (Deliverables)
**The ONLY deliverable is the Google Sheet URL.** Local `.tmp/` files are intermediates and are never shared with the user as final outputs.

## Sheet Schema
| Column | Description |
|---|---|
| Title | Article headline |
| URL | Direct link to the article |
| Source | Publisher / domain |
| Published Date | Original publication date |
| Theme | User-supplied theme tag |
| Topic | User-supplied topic tag |
| Relevance Score | LLM score (0–100) |
| Scraped At | Timestamp of this scrape run |

## Edge Cases
- **No articles found**: Apify returns empty list → Ask user to broaden Topic or Timeline.
- **All duplicates**: Every article already exists in the sheet → Notify user, no update made.
- **Sheet already exists**: `create_sheet_if_missing.py` skips creation, returns existing URL.
- **API Error**: Check `APIFY_API_TOKEN` and `GOOGLE_APPLICATION_CREDENTIALS` in `.env`.
- **Timeline ambiguity**: If Timeline is vague (e.g., "recent"), default to 2 weeks and confirm with user.

## Error Handling
- **Authentication Error**: Ensure all tokens are present in `.env`.
- **Apify actor not found**: Verify actor slug is correct; fall back to `apify/google-search-scraper`.
- **LLM classification failure**: If Anthropic API fails, flag articles as "unscored" and ask user whether to upload anyway or retry.