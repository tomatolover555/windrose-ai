# Traffic Growth & Monetization Plan

**Date:** 2026-04-10
**Scope:** CyberIntelAI + Windrose AI
**Status:** Approved

## Goals

1. **Traffic growth** — get indexed, rank for relevant keywords, build organic audience
2. **Monetization infrastructure** — wire up affiliate links and ad plumbing so revenue starts flowing when traffic arrives
3. **Agent parity** — bring CyberIntelAI's agent-friendliness up to Windrose's level

## Strategy

- Topical authority through consistent 5/week publishing (already running)
- Keyword-targeted evergreen posts via target_keyword in content queues
- Cross-linking between blogs where topics overlap
- Programmatic SEO pages (topic/CVE/tool indexes) for long-tail search capture
- Affiliate link population in generators (Windrose ready, CyberIntelAI later)
- Social media automation researched separately

## Not doing

- Paid ads or link building
- Email newsletter
- Vercel Analytics on Windrose (no traffic impact)
- Syntax highlighting, ESLint, theme switcher (no user-facing impact)

---

## Phase 1 — Fixes & Foundation

**Codex Prompt 1**

| # | Item | Repo | Detail |
|---|---|---|---|
| 1 | Remove duplicate post | Windrose | One of `top-agentic-ai-protocols-website-growth-2026.mdx` / `top-agentic-ai-protocols-website-growth-2026-essential-guide.mdx` — same title, keep the better one, delete the other |
| 2 | Add footer content | Windrose | `app/blog/layout.tsx` line 72 — empty div inside footer. Add copyright + nav links (About, Privacy, Contact or equivalent) |
| 3 | Clean up duplicate markdown endpoint | CyberIntelAI | Keep `src/app/posts/[slug].md/route.ts` + middleware rewrite. Remove `src/app/api/posts-markdown/[slug]/route.ts` if it exists, or vice versa. Match pattern Windrose already uses. |
| 4 | Add /.well-known/agent.json | CyberIntelAI | Agent discovery manifest similar to Windrose's `/.well-known/agent-blog.json`. Include blog name, description, topics, link to `/posts/agent.json`, flag for agent_context support |
| 5 | Review short post | Windrose | `unlocking-agentic-payments-on-kite-eth-denver-2026.mdx` is 66 lines. If content is thin/incomplete, either flesh it out or remove it |

---

## Phase 2 — Generator Upgrades

**Codex Prompt 2**

| # | Item | Repo | Detail |
|---|---|---|---|
| 6 | Add tags to generator output | CyberIntelAI | 0/60 posts have tags. Generator should produce 3-5 tags per post in frontmatter. Needed for related posts, agent.json filtering, and programmatic SEO |
| 7 | Add agent_context to generator output | CyberIntelAI | Match Windrose schema: key_claims, tools_mentioned, recommended_actions, related. Generator should populate these fields |
| 8 | Add target_keyword support | Both | When a content queue item has `target_keyword`, optimize title, H2s, and excerpt around it. Posts without a keyword generate normally |
| 9 | Activate affiliate link population | Windrose | Infrastructure exists (`affiliates.json` with 3 programs, context_tags matching). Generator needs to actually call the matching logic and populate `affiliate_links` array |
| 10 | Add cross-blog linking | Both | When a post mentions a topic covered by the other blog, include a contextual link. Could be based on keyword/tag overlap between the two blogs' post indexes |

---

## Phase 3 — Programmatic SEO Pages

**Codex Prompt 3**

| # | Item | Repo | Detail |
|---|---|---|---|
| 11 | /topic/[tag] index pages | Both | Aggregate posts by tag. Each page shows tag name, description, list of posts with that tag. Must have enough content to not be thin. Add to sitemap |
| 12 | /cve/[id] pages | CyberIntelAI | Extract CVE IDs mentioned in posts, build index pages per CVE with brief description + linking posts. Add to sitemap |
| 13 | /tool/[name] pages | Windrose | Extract tools from agent_context.tools_mentioned, build index pages per tool with role description + linking posts. Add to sitemap |

---

## Phase 4 — Cleanup (Low Priority)

**Codex Prompt 4**

| # | Item | Repo |
|---|---|---|
| 14 | Remove orphaned components (13+ files) | CyberIntelAI |
| 15 | Remove unused deps (fs-extra, uuid) | CyberIntelAI |

---

## Separate Research

| # | Item | Owner |
|---|---|---|
| 16 | Social media automation | Claude Code — research platforms, free tier limits, automation policies, recommend approach |

---

## Review Findings (reference)

Verified by Claude Code + Codex on 2026-04-10:

**CyberIntelAI (60 posts, Next.js 15, cyberintelai.com):**
- Pagination: working (10/page)
- Sitemap: complete (homepage + 3 static pages + posts)
- Related posts: rendered (tag-based + fallback)
- Agent endpoints: /posts/agent.json + /posts/[slug].md
- GA4: active (G-D8XD38S2MV)
- Vercel Analytics: active
- AdSense: active (ca-pub-4097251469150076)
- RSS: working
- Voice system: complete (voice card + 51 incidents + 6 formats)
- Missing: /.well-known/agent.json, agent_context in posts, tags (0/60)
- Cleanup needed: 13+ orphaned components, 2 unused deps, duplicate markdown endpoint

**Windrose AI (29 posts, Next.js 16, windrose-ai.com):**
- Pagination: working (10/page)
- Sitemap: complete
- Related posts: rendered (from agent_context.related)
- Agent endpoints: /.well-known/agent-blog.json, /blog/agent.json, /blog/[slug].md, /api/agent, /llms.txt
- GA4: active (G-BXKR6NMBT7)
- RSS: working
- Voice system: complete
- Affiliate infrastructure: wired but all 29 posts have empty arrays
- Missing: footer content, Vercel Analytics (not prioritized)
- Issues: 2 near-duplicate posts (same title), 1 short post (66 lines)
