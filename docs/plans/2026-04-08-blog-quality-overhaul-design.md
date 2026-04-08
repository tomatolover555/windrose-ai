# Blog Quality & Reliability Overhaul — Design

**Date:** 2026-04-08
**Scope:** Both CyberIntelAI and Windrose AI blogs
**Status:** Approved

## Problem

Both blogs generate posts via automated pipelines (OpenAI gpt-5.4-mini + Tavily news grounding). Three quality problems exist:

1. **Repetitive openings** — the GOOD OPENER example in the prompt gets copied verbatim (SolarWinds/Mandiant sentence appeared in 2 of 3 new posts)
2. **Generic voice** — posts read like "competent AI summary" rather than a specific author with personality
3. **Structural sameness** — every post follows the identical template (opener, 3 sections, Bottom Line, References)

Additionally, Windrose AI has 11 unfixed bugs that were already resolved in CyberIntelAI, causing daily cron failures.

## Design

### Part 1: Bug Fixes

#### Windrose AI — `scripts/generate-post.ts`

| # | Bug | Fix |
|---|-----|-----|
| W1 | No retry logic on API calls | Add `withRetry()` (2 retries, exponential backoff) |
| W2 | No truncation detection | Check `finish_reason === "length"` after content + critique |
| W3 | Critique returns empty -> workflow crashes | Fallback to pre-critique content if <500 chars |
| W4 | Critique prepends frontmatter/title | Strip `---...---` and `# Title` from critique output |
| W5 | Tavily sorted by title length | Sort by `score` |

#### Windrose AI — `.github/workflows/generate-post.yml`

| # | Bug | Fix |
|---|-----|-----|
| W6 | Shell injection (`${{ }}` in `run:`) | Move to `env:` vars |
| W7 | Bot identity `windrose-bot` | Change to `github-actions[bot]` with `41898282+` email |
| W8 | No `git pull` before push | Add `git pull origin main || true` |
| W9 | No concurrency group | Add `concurrency: { group: blog-publish, cancel-in-progress: false }` |
| W10 | Default GITHUB_TOKEN for push | Switch to `GH_BOT_TOKEN` |

#### Windrose AI — `.github/workflows/generate-bulk.yml`

| # | Bug | Fix |
|---|-----|-----|
| W11 | Same W6-W10 issues | Apply same fixes |

#### CyberIntelAI — `scripts/generatePost.js`

| # | Bug | Fix |
|---|-----|-----|
| C1 | Critique returns empty -> writes empty post | Fallback to pre-critique content if <500 chars |

### Part 2: Voice System

#### 2A: Voice Cards (`content/voice-card.json`)

Each blog gets a JSON file defining the author persona, tone, pet peeves, recurring opinions, and writing tics. The generator injects this into every prompt, replacing inline tone instructions.

- **CyberIntelAI:** Senior security analyst, 15+ years, former incident responder. Direct, sardonic, zero hype. Peer-to-peer tone.
- **Windrose AI:** Builder actively shipping in the agentic web. Enthusiastic but honest. Shares what works and what doesn't.

#### 2B: Incident/Example Bank (`content/incident-bank.json`)

40-50 one-line incident/example summaries per blog. The generator randomly samples 3-5 per post and includes them as available material. Replaces the GOOD OPENER examples that were being copied verbatim.

#### 2C: Format Templates (`content/formats/`)

5-6 named formats per blog, each with a distinct structural prompt:

| Format | Words | Structure |
|--------|-------|-----------|
| Deep Dive | 800-1000 | 3-4 sections, one topic in depth |
| Hot Take | 400-600 | Strong opinion, 1-2 supports, no References |
| Incident Breakdown | 600-800 | What happened, why it matters, what to do |
| Tool/Protocol Review | 700-900 | What, how, where it breaks, verdict |
| Quick Hits | 400-500 | 3-4 short items under one theme |
| Contrarian | 500-700 | Conventional wisdom then dismantle it |

Generator randomly picks or rotates by day-of-week.

#### 2D: Pipeline Changes

Both generators updated to:

1. Load voice card
2. Sample 3-5 incidents from bank
3. Pick format template
4. Generate topic (existing)
5. Generate content (voice + incidents + format in prompt, no GOOD/BAD examples)
6. Critique pass (hardened with fallback, checks voice consistency)
7. Write file (existing)

### Part 3: Old Post Rewrite (CyberIntelAI only)

25 posts still reference CVE-2024-3094/XZ Utils. After voice system is in place:

1. Clear `rewritten: true` on those 25 posts
2. Run rewrite with new voice card + incident bank
3. Result: all posts at same quality standard

### Part 4: Cross-Blog Maintenance Checklist

`docs/blog-generator-checklist.md` added to both repos listing all shared concerns (retry, identity, concurrency, voice, etc.) with a reminder to check the other repo.

## Decisions

- **Keep repos separate** — merging into monorepo is high risk for low value. Process (checklist) prevents future divergence.
- **OpenAI direct** — both blogs use `OPENAI_API_KEY` directly, not OpenRouter. Working fine, no reason to change.
- **Voice: CyberIntelAI = analyst, Windrose AI = builder** — distinct personas for distinct audiences.
- **Mixed formats** — daily cadence maintained, but format varies to break structural monotony.
