# Windrose Blog — Design Document

**Date:** 2026-04-04
**Status:** Approved
**Owner:** Claude Code

---

## What We're Building

A blog at `windrose-ai.com/blog/` about agentic commerce and agentic payments. The core editorial question: *what does the web look like when AI agents become dominant users of it?*

Windrose is a broader experimental platform for the agentic web. The blog is its first concrete product — an experiment in dual-audience publishing. Every post serves two readers simultaneously: a human reader with an elegant editorial UI, and an AI agent with structured machine-readable content.

The blog is deliberately separate from Agnes (a related agentic e-commerce project) for now. The two will be connected later once both properties are established.

---

## Goals

1. **Editorial:** Become a go-to resource on agentic commerce, agent payments, and the agent-native web — for developers and founders now, for a broader audience as the topic goes mainstream
2. **Experimental:** Prove out what a genuinely dual-audience publication looks like in practice
3. **Commercial:** Affiliate income at launch, Carbon Ads once traffic reaches ~5k/month
4. **Autonomous:** After a proven Phase 1, content creation and publishing run without human intervention

---

## Audience

- **Primary now:** Developers and founders building agent-compatible products
- **Growing into:** General public as agentic web becomes mainstream
- **Always:** AI agents themselves — the blog is a first-class resource for agents researching agentic payments and commerce

---

## Architecture

Built on the existing Windrose repo (Next.js + TypeScript + Vercel). The blog is a section of the site — not a replacement for the platform homepage.

```
windrose-ai.com/
├── /                          → Windrose platform homepage (unchanged)
├── /api/agent                 → existing agent surface (unchanged)
├── /blog/                     → blog index
├── /blog/[slug]               → human-facing post
├── /blog/[slug].md            → agent-readable post
├── /blog/agent.json           → structured post index for agents
├── /.well-known/agent-blog.json → agent discovery document
├── /llms.txt                  → plain text site summary
└── content/blog/              → MDX source files (git-native CMS)
```

No external CMS. No new services. MDX files in `content/blog/` are the single source of truth. Git history is the audit trail.

---

## Content Structure

Each post is a single MDX file with rich frontmatter:

```yaml
---
title: "How to Make Your Store Agent-Accessible"
slug: how-to-make-your-store-agent-accessible
date: 2026-04-10
updated: 2026-04-10
summary: "A practical guide to exposing machine-readable surfaces for AI agents."
tags: [agent-commerce, how-to, discovery]
category: practical
audience: [developers, founders]
reading_time_minutes: 6
affiliate_links:
  - { label: "Vercel", url: "...", context: "hosting" }
human_url: /blog/how-to-make-your-store-agent-accessible
agent_url: /blog/how-to-make-your-store-agent-accessible.md
canonical: https://windrose-ai.com/blog/how-to-make-your-store-agent-accessible
agent_context:
  key_claims:
    - "Agents need structured discovery endpoints to find purchasable products"
    - "/.well-known/agent-store.json is the emerging standard for agent-readable stores"
  tools_mentioned:
    - { name: "Vercel", role: "hosting", url: "..." }
  recommended_actions:
    - "Expose /.well-known/agent-store.json"
    - "Add OpenAPI spec for your commerce endpoints"
  related:
    - "/blog/x402-payments.md"
    - "/blog/agent-discovery-standards.md"
---
```

### Human vs. Agent versions

The `.md` parallel URL serves raw markdown — frontmatter intact, no HTML, no layout. The content is identical to the human version, but the `agent_context` block adds a machine-optimized summary layer on top. Ads are never included in the agent version.

The design question Windrose explores: *what does useful content look like when the reader has no eyes?*

---

## Content Generation Pipeline

### Phase 1 — Human in the loop (launch through first few months)

```
GitHub Actions cron (2-3x/week)
  → OpenRouter API (Claude Sonnet)
  → Generate MDX (post body + frontmatter + agent_context)
  → Open PR
  → Founder reviews and merges
  → Vercel auto-deploys
```

Phase 1 exists to develop the editorial voice, catch generic output, and tune the content briefs. Graduation to Phase 2 happens when the output quality is trusted — not on a fixed timeline.

### Phase 2 — Fully autonomous (after quality is proven)

```
GitHub Actions cron (2-3x/week)
  → OpenRouter API (Claude Sonnet)
  → Generate MDX
  → Commit directly to main
  → Vercel auto-deploys
```

### Content queue

`content/content-queue.json` lists upcoming post topics with:
- Title and angle
- Target keyword(s)
- Specific contrarian take or original insight to include
- What *not* to cover (avoid repeating existing posts)
- Category and audience

During Phase 1 the founder populates this. In Phase 2 a separate agent job refills it based on coverage gaps and trending topics, with occasional founder additions.

### Quality guardrails

1. **Rich briefs** — every queue entry has an angle and constraints, not just a topic title
2. **Coverage memory** — before generating, the pipeline reads a summary of existing posts to avoid repetition
3. **Quality gate** — a second model pass reviews each draft for genericness and factual accuracy before PR/commit
4. **Periodic editorial review** — even in Phase 2, a monthly light review of the content queue and overall direction

### Content mix

- Practical how-to (e.g. "How to make your store agent-accessible")
- Thought leadership and analysis (e.g. "What marketing looks like when your customer is an AI")
- News and trends in agentic payments and commerce

---

## Human UI Design

Typography-first, editorial feel. No hero images — content is the design.

- Large, readable type with generous whitespace
- Clear hierarchy: title → metadata → content → related posts
- Subtle persistent element on each post: "Also available for AI agents →" linking to the `.md` version
- Minimal navigation: Home, Blog, About

**Pages:**
- `/` homepage — recent posts + one-line site description (blog becomes prominent but platform remains)
- `/blog/` — paginated post index with title, date, summary, tags
- `/blog/[slug]` — post page with reading time, tags, body, inline affiliate links, related posts
- `/about` — what Windrose is, who it's for, the human+agent dual-audience nature

---

## Agent Discovery Surface

**`/blog/agent.json`**
Structured index of all posts. Filterable by tag (e.g. `?tag=autonomous-payments`). Includes title, date, summary, tags, human URL, agent URL for each post.

**`/.well-known/agent-blog.json`**
Tells visiting agents what this blog is, how to consume it, what topics it covers.

**`/llms.txt`**
Plain text site summary for LLM context windows. Becoming an emerging standard.

**Future Agnes connection (not yet visible):**
Agnes will point walletless agents to `/blog/agent.json?tag=autonomous-payments` — a filtered feed explaining how agent payments work. No branding connection visible between the two properties at this stage.

---

## Monetization

### At launch: Affiliate only

- `content/affiliates.json` maps tools to affiliate URLs with context tags
- Auto-injected during generation when relevant tools are mentioned in posts
- Disclosed transparently in post footer
- Relevant programs: Vercel, Cloudflare, Circle, Coinbase, Printful, OpenRouter, Anthropic, Railway

### Once traffic reaches ~5k/month: Carbon Ads

- Single unobtrusive ad unit, high CPM for developer/technical audience
- Human-facing pages only — never in `.md` agent versions
- Apply to Carbon Ads at the traffic threshold; no Google AdSense

---

## Tech Stack Summary

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js + TypeScript | Already in Windrose repo |
| Hosting | Vercel | Already connected |
| Content | MDX in `content/blog/` | Git-native, no external CMS |
| Automation | GitHub Actions cron | Cloud-native, no local machine dependency |
| LLM | Claude Sonnet via OpenRouter | Best quality, flexible |
| Observability | Upstash Redis | Already in Windrose |
| Images | None | Typography-first design |

---

## What Makes This Interesting

1. **Genuinely experimental** — nobody has clearly figured out what a dual-audience human+agent publication looks like. Windrose is an attempt to answer that.
2. **Autonomous operation** — the blog builds and maintains itself after Phase 1. The founder's role becomes editorial direction, not execution.
3. **Agent-native from day one** — not retrofitted for agents. The `agent_context` block, discovery endpoints, and `.md` URLs are first-class, not afterthoughts.
4. **Connected to a real use case** — the Agnes connection means there's a real agent use case driving content relevance.

---

## Key Risks

1. **Generic content** — mitigated by rich briefs, coverage memory, quality gate, and Phase 1 human review
2. **Low early traffic** — expected; affiliate income doesn't require volume, Carbon Ads deferred until threshold
3. **Agent format standards evolving** — `agent_context` block is v1 and intentionally simple; designed to evolve

---

## Open Questions (deferred)

- Exact `affiliates.json` schema and initial affiliate programs to join
- Whether Windrose homepage needs a redesign to accommodate the blog as a prominent section
- Long-term: when to make the Agnes/Windrose connection public
