# Blog Generator — Cross-Repo Checklist

When changing the generator or workflows, check if the same change
is needed in the other blog repo.

## Generator (scripts/)
- [ ] Retry logic (withRetry wrapper)
- [ ] finish_reason truncation check
- [ ] Critique fallback (empty → use pre-critique content)
- [ ] Frontmatter/title stripping after critique
- [ ] Tavily sort by score
- [ ] Voice card loaded and injected
- [ ] Incident bank sampled
- [ ] Format template selected

## Workflows (.github/workflows/)
- [ ] No shell injection (${{ }} in run: blocks)
- [ ] Bot identity: github-actions[bot] with 41898282+ email
- [ ] git pull before push
- [ ] Concurrency group: blog-publish
- [ ] Push via GH_BOT_TOKEN, not default GITHUB_TOKEN
- [ ] npm ci (not npm install)

## Other blog repo
- [ ] Same fix applied to [cyberintelai / windrose-ai]

## Post Taxonomy And Affiliate Metadata Examples

Rules to remember:
- `postType` defines article structure, not automatic monetization.
- `commercialIntent` is explicit.
- `hasAffiliateLinks` is explicit.
- The inline affiliate disclosure appears only when an enrolled program in `content/affiliates.json` has `status: active` and an `https` URL. Empty or `todo` programs are not linked.
- Monetizable formats like `comparison`, `tools-list`, and `implementation-guide` do not automatically become affiliate posts.
- If affiliate metadata is absent, no disclosure snippet is shown.

### Example 1: Normal Editorial Post

Use this for explanatory or educational pieces about the agentic web.

CLI:

```bash
npx tsx scripts/generate-post.ts --mode=evergreen --post-type=explainer
```

Expected emitted metadata:

```yaml
postType: "explainer"
affiliate_links: []
```

Notes:
- No `commercialIntent`
- No `hasAffiliateLinks`
- No `affiliatePrograms`

### Example 2: Monetizable-Format Post Without Affiliate Links

Use this when the article format may support future monetization modules, but the post is still editorial-only.

Queue/content-plan example:

```json
{
  "id": "example-implementation-guide",
  "title": "How To Evaluate Agent Payment Providers",
  "slug": "how-to-evaluate-agent-payment-providers",
  "angle": "Show builders how to compare implementation tradeoffs between payment layers for autonomous agents.",
  "avoid": "Generic future-of-payments takes",
  "target_keyword": "agent payment providers",
  "category": "payments",
  "audience": ["developers", "founders"],
  "priority": 1,
  "postType": "implementation-guide"
}
```

Expected emitted metadata:

```yaml
postType: "implementation-guide"
eligibleModules:
  - "resource-box"
affiliate_links: []
```

Notes:
- This is still non-affiliate by default.
- Monetizable structure does not enable affiliate disclosure on its own.

### Example 3: Affiliate-Enabled Post

Use this only when affiliate links are intentionally planned for the post.

CLI:

```bash
npx tsx scripts/generate-post.ts \
  --mode=evergreen \
  --post-type=tools-list \
  --commercial \
  --affiliate \
  --affiliate-programs=base44
```

Expected emitted metadata when `base44` is still `status: todo` or has an empty URL:

```yaml
postType: "tools-list"
commercialIntent: true
eligibleModules:
  - "recommended-tools"
  - "resource-box"
affiliate_links: []
```

Notes:
- `hasAffiliateLinks` and `affiliatePrograms` are omitted until the program URL is real and `status` is `active`.
- Do not use placeholder program ids such as `example-program`.
- Published links use `rel="sponsored nofollow"`.
