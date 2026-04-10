# Blog SEO & Monetization Design

**Date:** 2026-04-10
**Approach:** Quick monetization + SEO in parallel (Approach B)
**Budget:** Free tools by default, paid only with clear ROI

---

## Section 1: Monetization Quick Wins

### CyberIntelAI
- **AdSense:** Keep existing auto-ads (ca-pub-4097251469150076). No changes.
- **Affiliates:** Add `content/affiliates.json` with cybersecurity-relevant programs (security tools, cloud providers, training platforms). Update generator to populate `affiliate_links` when post topics match program context tags.

### Windrose AI
- **Ads:** No ads for now. Apply to Carbon Ads when traffic reaches ~10k monthly page views. Carbon is developer-audience focused, looks premium (not cheap like AdSense auto-ads). Used by CSS-Tricks, MDN, CodePen.
- **Affiliates:** Infrastructure already exists (`content/affiliates.json` with Vercel, Printful, OpenRouter). Posts currently have empty `affiliate_links` arrays. Update generator to populate affiliate links when post topics match program context tags.

### Both
- Update generators to match post topics against affiliate program `context_tags` and insert relevant links.

---

## Section 2: SEO & Traffic Growth

### 1. Google Search Console (step zero)
- Set up for both domains (cyberintelai.com, windrose-ai.com)
- Verify domain ownership (DNS record or meta tag)
- Submit sitemaps (both already generate dynamic sitemaps)
- Requires manual setup by founder (Google account login)

### 2. Fix Missing Meta Tags
- **Twitter/X cards:** Add `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` to both blogs
- **OG image:** CyberintelAI has ogImage in post data but doesn't render it in meta tags. Fix.

### 3. RSS Feeds
- CyberintelAI has `<link rel="alternate" type="application/rss+xml" href="/feed.xml" />` in layout but no actual feed route. Create `/app/feed.xml/route.ts`.
- Windrose has no RSS at all. Add feed route and link tag.
- RSS helps with aggregators, feed readers, and provides another discovery path.

### 4. Internal Linking
- Windrose posts have `related` fields in frontmatter. Verify template renders these as actual clickable links.
- CyberintelAI: consider adding cross-post references (lower priority).

### 5. Robots.txt
- Already good on both. Allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.).
- No changes needed.

---

## Section 3: Analytics & Measurement

### Google Analytics 4 (GA4)
- Add to both blogs. Free.
- One `<Script>` tag in each blog's root layout with GA4 measurement ID.
- Provides: page views, sessions, traffic sources, which posts perform, real-time visitors.
- Founder creates GA4 properties in Google Analytics account (same Google account as Search Console).

### Vercel Analytics
- CyberintelAI: `@vercel/analytics` package installed but never wired up. Activate it.
- Windrose: Add package and wire up.
- Free on Vercel Hobby plan. Provides Web Vitals (page load speed, CLS, etc.).

### What We're NOT Doing
- No Plausible/Fathom (paid, GA4 does the same for free)
- No Hotjar/heatmaps (overkill before meaningful traffic)
- No cookie consent banner yet (GA4 basic mode runs without cookies)

---

## Implementation Priority

1. Google Search Console setup (manual, founder-driven, guided by Claude)
2. GA4 setup (manual account creation + code change for script tag)
3. Twitter/X cards + OG image fixes (code changes)
4. RSS feeds (code changes)
5. Vercel Analytics activation (code changes)
6. Affiliate link activation in generators (code changes)
7. CyberintelAI affiliate config creation (content + code)

---

## Future Milestones (not in scope now)

- **~10k monthly page views:** Apply to Carbon Ads for windrose
- **Meaningful traffic data:** Evaluate keyword performance, consider content calendar optimization
- **Revenue justifies it:** Consider paid SEO tools (Ahrefs/Semrush) for keyword research
- **Legal requirement:** Add cookie consent banner when traffic or geography demands it
