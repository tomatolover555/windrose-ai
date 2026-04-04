# Agent-Friendly + SEO + Content Quality Overhaul
**Date:** 2026-04-04
**Applies to:** cyberintelai.com and windrose-ai.com
**Approach:** Parallel tracks — infrastructure, content rewrites, generator overhaul simultaneously

---

## Context

Both blogs are Next.js static sites deployed on Vercel. They have working designs, AdSense integration, and basic AI-powered post generators. This overhaul makes them legible to AI agents, competitive in search, and produces content with genuine informational value rather than generic summaries.

---

## Track 1: Agent + SEO Infrastructure

Applied to both blogs identically.

### `llms.txt`
A plain-text file at the root of each site (served at `/llms.txt`) describing the blog's purpose, topic domain, intended audience, and linking to all published posts. This is the emerging standard for agent-readable site metadata — analogous to `robots.txt` but for AI. Agents that fetch this file get a structured overview without needing to crawl the full site.

### `robots.txt`
Explicitly allow known AI crawlers:
- `GPTBot` (OpenAI)
- `ClaudeBot` (Anthropic)
- `OAI-SearchBot` (OpenAI search)
- `PerplexityBot`
- `anthropic-ai`
- `Google-Extended`

Neither blog currently has a `robots.txt`. Without one, crawlers make their own decisions.

### Schema.org JSON-LD
On every post page: `BlogPosting` structured data with `headline`, `description`, `datePublished`, `dateModified`, `author`, and `url`. On the index page: `Blog` type with `name`, `description`, `url`. This is what enables Google AI Overviews, Perplexity, and other agents to accurately attribute and cite content.

### `sitemap.xml`
Generated at build time via Next.js App Router's native sitemap support (`app/sitemap.ts`). Includes all post URLs with `lastModified` dates. Submitted to Google Search Console after deployment.

### Open Graph tags per post
Dynamic `og:title`, `og:description`, `og:type=article`, `og:published_time` on every post. Currently both blogs use generic or missing OG tags. This also improves social sharing previews.

### Reading time
Calculated from word count and shown in post metadata. Small UX improvement for humans; signals content depth to agents parsing metadata.

---

## Track 2: Content Quality — Existing Posts

**cyberintelai:** 7 posts from April 2025
**windrose-ai:** existing posts (inventory checked during implementation)

### What changes in each post
- **Named real-world examples**: replace vague references ("a major retailer") with specific named incidents, CVEs, tools, and vendors
- **Key Takeaways box**: 3–5 scannable bullets at the end of each post — what to remember or do. Agents use these for summarization; humans appreciate the structure
- **References section**: 3–5 real external links per post. Signals credibility to Google and AI agents, gives readers depth
- **Sharper excerpts**: excerpts appear in the post listing and in agent summaries. Rewritten to be specific and hook-driven rather than generic

### Method
A one-time script runs each existing post through `gpt-5.4` (full model, not mini — quality matters for this one-time rewrite) with explicit instructions requiring concrete examples, data points, and references. Output is reviewed before publishing. The original content is the input; the model enriches it rather than replacing it.

---

## Track 3: Generator Overhaul — Hybrid Content Pipeline

### Model
Both blogs: `gpt-5.4-mini` via OpenAI API
- cyberintelai: existing `OPENAI_API_KEY` GitHub secret
- windrose-ai: new `OPENAI_API_KEY` GitHub secret (added 2026-04-04), replaces OpenRouter

### News grounding (Tavily API)
Before generating any post, the generator queries Tavily for recent headlines (last 48 hours) matching the blog's topic domain. Tavily returns clean, structured results designed for LLM consumption. The generator uses the most specific/interesting result as the grounding event for news-driven posts.

New secret required: `TAVILY_API_KEY` on both repos. Tavily free tier (1,000 searches/month) covers daily generation comfortably.

### Generation flow
1. **Mode selection**: `--mode=news` or `--mode=evergreen` flag (or alternating by day of week)
2. **News mode**: Tavily search → select story → generate title + excerpt grounded in real event → generate post body referencing real news
3. **Evergreen mode**: topic selected from queue (windrose-ai) or generated from domain context (cyberintelai) → generate title + excerpt → generate post body
4. **Quality constraints** in all prompts:
   - Must name at least 2 real tools, companies, CVEs, or incidents
   - Must include a contrarian or nuanced angle
   - Must end with "The Bottom Line" section
   - Must include a References section with real URLs
5. **Self-critique pass**: second LLM call asks "does this post contain anything a reader couldn't find in 30 seconds on Google? If not, rewrite the weakest section." One revision cycle.

### Scheduling (GitHub Actions cron)
- Monday/Wednesday/Friday: news-driven posts (Tavily-grounded)
- Tuesday/Thursday: evergreen deep-dives
- Saturday/Sunday: off

### windrose-ai specific
- Existing content queue (`content/content-queue.json`) and affiliate link system (`content/affiliates.json`) retained
- Existing `agent_context` frontmatter block retained and improved
- OpenRouter dependency removed; generator rewritten to use OpenAI SDK
- cyberintelai generator brought up to windrose-ai's level: add `agent_context` block, add affiliate hooks (future use)

---

## Secrets Summary

| Repo | Secret | Status |
|------|--------|--------|
| cyberintelai | `OPENAI_API_KEY` | ✓ Exists |
| cyberintelai | `TAVILY_API_KEY` | Add during implementation |
| cyberintelai | `GH_BOT_TOKEN` | ✓ Exists |
| windrose-ai | `OPENAI_API_KEY` | ✓ Added 2026-04-04 |
| windrose-ai | `TAVILY_API_KEY` | Add during implementation |
| windrose-ai | `GH_BOT_TOKEN` | Verify exists |
| windrose-ai | `OPENROUTER_API_KEY` | Remove after migration |

---

## Out of Scope
- Payment gating for agent content access (revisit when blogs have significant traffic)
- Agnes cross-linking (revisit when Agnes is in production)
- windrose-ai AdSense setup (separate effort)
