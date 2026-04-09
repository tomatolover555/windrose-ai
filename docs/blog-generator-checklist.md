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
