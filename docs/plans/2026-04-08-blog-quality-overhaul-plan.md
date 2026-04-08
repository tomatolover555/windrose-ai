# Blog Quality & Reliability Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all bugs in both blog generators, add a voice system (persona cards, incident banks, format templates) to eliminate repetitive/generic output, and rewrite old CyberIntelAI posts.

**Architecture:** Both blogs keep separate repos and codebases. Each generator gets the same pipeline upgrade: load voice card → sample incidents → pick format → generate → critique (hardened). A cross-repo checklist prevents future divergence.

**Tech Stack:** Node.js scripts (JS for cyberintelai, TS for windrose-ai), OpenAI gpt-5.4-mini, GitHub Actions workflows, Vercel deploys.

**Repos:**
- CyberIntelAI: `/Users/ziv.koren/Documents/cyberintelai`
- Windrose AI: `/Users/ziv.koren/Documents/windrose-ai`

---

### Task 1: Fix Windrose AI generate-post.ts — retry, finish_reason, critique fallback, Tavily sort

**Files:**
- Modify: `windrose-ai/scripts/generate-post.ts`

**Step 1: Add withRetry helper**

Add after line 5 (after `const openai = ...`):

```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === retries) throw err;
      const delay = 2000 * (attempt + 1);
      console.warn(`  Retry ${attempt + 1}/${retries} after error: ${err.message} (waiting ${delay}ms)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}
```

**Step 2: Fix Tavily sort (line 64)**

Change:
```typescript
return results.sort((a, b) => b.title.length - a.title.length)[0];
```
To:
```typescript
return results.sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0))[0];
```

**Step 3: Wrap all OpenAI calls with withRetry**

Three calls to wrap:
- Line 117-122 (content generation) → `await withRetry(() => openai.chat.completions.create({...}))`
- Line 133-138 (critique pass) → same
- Line 177-184 (topic generation in news mode) → same

**Step 4: Add finish_reason checks**

After the content generation call (line 123):
```typescript
if (contentResponse.choices[0].finish_reason === "length") {
  console.warn("  WARNING: content generation was truncated (finish_reason=length)");
}
```

After the critique call (line 139):
```typescript
if (critiqueResponse.choices[0].finish_reason === "length") {
  console.warn("  WARNING: critique pass was truncated (finish_reason=length)");
}
```

**Step 5: Add critique fallback and frontmatter stripping**

Replace lines 140-141:
```typescript
return critiqueResponse.choices[0].message.content!.trim();
```

With:
```typescript
let critiqued = critiqueResponse.choices[0].message.content?.trim() || "";

// If critique returned empty or too short, fall back to pre-critique content
if (critiqued.length < 500) {
  console.warn("  WARNING: critique pass returned insufficient content, using pre-critique version");
  critiqued = mdx;
}

// Strip any frontmatter or title the model may have prepended
critiqued = critiqued.replace(/^---\n[\s\S]*?\n---\n*/, "");
critiqued = critiqued.replace(/^# .+\n+/, "");

return critiqued;
```

Wait — this won't work because the windrose-ai generator expects the critique to return the FULL mdx with frontmatter (it writes the whole file). The stripping approach needs to be different here. Instead, only strip if the critique output starts with `---` AND the pre-critique content already had frontmatter (which it always does). Actually, looking at the code more carefully: the `generatePost` function returns the critique output, and `main()` writes it directly as `outSlug.mdx`. So the critique output IS supposed to include frontmatter.

Let me revise: for windrose-ai, the fallback should return `mdx` (the pre-critique full content), and we should NOT strip frontmatter since the output needs it. We should only strip if the critique duplicated the frontmatter (i.e., has two `---` blocks).

Replace lines 140-141:
```typescript
let critiqued = critiqueResponse.choices[0].message.content?.trim() || "";

// If critique returned empty or too short, fall back to pre-critique content
if (!critiqued || critiqued.length < 500 || !critiqued.startsWith("---")) {
  console.warn("  WARNING: critique pass returned insufficient content, using pre-critique version");
  return mdx;
}

return critiqued;
```

**Step 6: Update critique prompt to be explicit about output format**

Replace lines 126-131:
```typescript
const critiquePrompt = `You are editing a blog post about the agentic web. Review each section: does it contain specific, concrete information a reader couldn't find in 30 seconds on Google?

For any weak section, rewrite it to be more specific and concrete. Output ONLY the complete improved post — start with the frontmatter (---) and include the entire file. No commentary, no preamble, no "Here is the improved post:".

Post to review:
${mdx}`;
```

**Step 7: Verify the script compiles**

Run: `cd /Users/ziv.koren/Documents/windrose-ai && npx tsx --eval "import './scripts/generate-post.ts'" 2>&1 | head -5`

**Step 8: Commit**

```bash
cd /Users/ziv.koren/Documents/windrose-ai
git add scripts/generate-post.ts
git commit -m "fix(generator): add retry, finish_reason check, critique fallback, Tavily sort

Port all hardening fixes from cyberintelai generator:
- withRetry wrapper on all OpenAI calls
- finish_reason truncation detection
- Critique fallback when output is empty/short
- Tavily sort by score instead of title length

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix Windrose AI generate-post.yml — shell injection, bot identity, concurrency, push auth

**Files:**
- Modify: `windrose-ai/.github/workflows/generate-post.yml`

**Step 1: Add concurrency group**

Add after `on:` block (after line 15):
```yaml
concurrency:
  group: blog-publish
  cancel-in-progress: false
```

**Step 2: Fix shell injection in Determine mode step (lines 38-48)**

Replace:
```yaml
      - name: Determine mode
        id: mode
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "mode=news" >> $GITHUB_OUTPUT
          else
            DOW=$(date +%u)
            if [ "$DOW" = "2" ] || [ "$DOW" = "4" ]; then
              echo "mode=evergreen" >> $GITHUB_OUTPUT
            else
              echo "mode=news" >> $GITHUB_OUTPUT
            fi
          fi
```

With:
```yaml
      - name: Determine mode
        id: mode
        env:
          EVENT_NAME: ${{ github.event_name }}
        run: |
          if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
            echo "mode=news" >> $GITHUB_OUTPUT
          else
            DOW=$(date +%u)
            if [ "$DOW" = "2" ] || [ "$DOW" = "4" ]; then
              echo "mode=evergreen" >> $GITHUB_OUTPUT
            else
              echo "mode=news" >> $GITHUB_OUTPUT
            fi
          fi
```

**Step 3: Fix shell injection in Generate post step (lines 56-61)**

Replace:
```yaml
      - name: Generate post
        id: generate
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          TAVILY_API_KEY: ${{ secrets.TAVILY_API_KEY }}
          DRY_RUN: ${{ github.event.inputs.dry_run }}
        run: |
          if [ "$DRY_RUN" = "true" ]; then
            npx tsx scripts/generate-post.ts --dry-run
          else
            npx tsx scripts/generate-post.ts --mode=${{ steps.mode.outputs.mode }}
          fi
```

With:
```yaml
      - name: Generate post
        id: generate
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          TAVILY_API_KEY: ${{ secrets.TAVILY_API_KEY }}
          DRY_RUN: ${{ github.event.inputs.dry_run }}
          GEN_MODE: ${{ steps.mode.outputs.mode }}
        run: |
          if [ "$DRY_RUN" = "true" ]; then
            npx tsx scripts/generate-post.ts --dry-run
          else
            npx tsx scripts/generate-post.ts "--mode=$GEN_MODE"
          fi
```

**Step 4: Fix bot identity and push auth (lines 74-81)**

Replace:
```yaml
      - name: Commit and push (autonomous)
        if: steps.check.outputs.new_post == 'true'
        run: |
          git config user.name "windrose-bot"
          git config user.email "bot@windrose-ai.com"
          git add content/blog/
          git commit -m "feat(blog): auto-generate post"
          git push
```

With:
```yaml
      - name: Commit and push (autonomous)
        if: steps.check.outputs.new_post == 'true'
        env:
          GH_BOT_TOKEN: ${{ secrets.GH_BOT_TOKEN }}
          REPO: ${{ github.repository }}
          GEN_MODE: ${{ steps.mode.outputs.mode }}
        run: |
          git pull origin main || true
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add content/blog/
          git commit -m "post: AI-generated post for $(date +%Y-%m-%d) [mode=$GEN_MODE]"
          git push "https://x-access-token:${GH_BOT_TOKEN}@github.com/${REPO}" main
```

**Step 5: Commit**

```bash
cd /Users/ziv.koren/Documents/windrose-ai
git add .github/workflows/generate-post.yml
git commit -m "fix(workflow): shell injection, bot identity, concurrency, push auth

- Move all \${{ }} expressions to env: vars (shell injection fix)
- Change bot identity to github-actions[bot] with 41898282+ email
- Add concurrency group (blog-publish)
- Add git pull before push
- Switch push to GH_BOT_TOKEN

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Fix Windrose AI generate-bulk.yml — same workflow issues

**Files:**
- Modify: `windrose-ai/.github/workflows/generate-bulk.yml`

**Step 1: Add concurrency group**

Add after `on:` block (after line 13):
```yaml
concurrency:
  group: blog-publish
  cancel-in-progress: false
```

**Step 2: Fix bot identity and push auth (lines 49-60)**

Replace:
```yaml
      - name: Commit and push all new posts
        env:
          MODE: ${{ github.event.inputs.mode }}
        run: |
          git config user.name "windrose-bot"
          git config user.email "bot@windrose-ai.com"
          git pull --rebase origin main || true
          git add content/blog/ content/content-queue.json
          git diff --cached --quiet && echo "No new posts to commit." && exit 0
          POST_COUNT=$(git diff --cached --name-only content/blog/ | wc -l | tr -d ' ')
          git commit -m "feat(blog): bulk-generated $POST_COUNT posts [mode=$MODE]"
          git push
```

With:
```yaml
      - name: Commit and push all new posts
        env:
          INPUT_MODE: ${{ github.event.inputs.mode }}
          GH_BOT_TOKEN: ${{ secrets.GH_BOT_TOKEN }}
          REPO: ${{ github.repository }}
        run: |
          git pull origin main || true
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add content/blog/ content/content-queue.json
          git diff --cached --quiet && echo "No new posts to commit." && exit 0
          POST_COUNT=$(git diff --cached --name-only content/blog/ | wc -l | tr -d ' ')
          git commit -m "feat(blog): bulk-generated $POST_COUNT posts [mode=$INPUT_MODE]"
          git push "https://x-access-token:${GH_BOT_TOKEN}@github.com/${REPO}" main
```

**Step 3: Also fix the shell injection in the generate loop (lines 39-47)**

The `COUNT` and `MODE` are already in `env:`, which is correct. But line 45 uses `$MODE` which references the env var — that's fine. No change needed here.

**Step 4: Commit**

```bash
cd /Users/ziv.koren/Documents/windrose-ai
git add .github/workflows/generate-bulk.yml
git commit -m "fix(workflow): bot identity, concurrency, push auth in bulk workflow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Fix Windrose AI rewrite-posts.ts — .bak creation, retry, model name

**Files:**
- Modify: `windrose-ai/scripts/rewrite-posts.ts`

**Step 1: Add withRetry helper**

Add after line 5:
```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === retries) throw err;
      const delay = 2000 * (attempt + 1);
      console.warn(`  Retry ${attempt + 1}/${retries} after error: ${err.message} (waiting ${delay}ms)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}
```

**Step 2: Remove .bak creation (line 38)**

Delete:
```typescript
  fs.writeFileSync(filePath + ".bak", raw);
```

**Step 3: Wrap OpenAI call with retry and add finish_reason check**

Replace lines 30-37:
```typescript
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_completion_tokens: 4000,
  });

  const enriched = response.choices[0].message.content!.trim();
```

With:
```typescript
  const response = await withRetry(() => openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_completion_tokens: 4000,
  }));

  if (response.choices[0].finish_reason === "length") {
    console.warn("  WARNING: output was truncated (finish_reason=length)");
  }

  const enriched = response.choices[0].message.content?.trim() || "";
  if (!enriched || enriched.length < 500) {
    console.log("  SKIP — output too short or empty");
    return;
  }
```

**Step 4: Remove .bak reference in the final console.log (line 60)**

Replace:
```typescript
  console.log("\nDone! Review posts, then:\n  rm content/blog/*.bak\n  git add content/blog/\n  git commit -m 'content: enrich posts with examples, takeaways, references'");
```

With:
```typescript
  console.log("\nDone! Review posts, then:\n  git add content/blog/\n  git commit -m 'content: enrich posts with examples, takeaways, references'");
```

**Step 5: Commit**

```bash
cd /Users/ziv.koren/Documents/windrose-ai
git add scripts/rewrite-posts.ts
git commit -m "fix(rewrite): remove .bak creation, add retry, fix model name, add fallback

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Fix CyberIntelAI generatePost.js — critique fallback

**Files:**
- Modify: `cyberintelai/scripts/generatePost.js`

**Step 1: Add critique fallback**

After the critique stripping (around line 182), before the `// Step 4` comment, add a fallback check. The current code is:

```javascript
  content = critiqueResponse.choices[0].message.content.trim();

  // Strip any frontmatter or title the model may have prepended
  content = content.replace(/^---\n[\s\S]*?\n---\n*/, "");
  content = content.replace(/^# .+\n+/, "");
```

Change to:

```javascript
  let critiqued = critiqueResponse.choices[0].message.content?.trim() || "";

  // Strip any frontmatter or title the model may have prepended
  critiqued = critiqued.replace(/^---\n[\s\S]*?\n---\n*/, "");
  critiqued = critiqued.replace(/^# .+\n+/, "");

  // Fall back to pre-critique content if critique returned junk
  if (critiqued.length < 500) {
    console.warn("  WARNING: critique pass returned insufficient content, using pre-critique version");
  } else {
    content = critiqued;
  }
```

**Step 2: Commit**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add scripts/generatePost.js
git commit -m "fix(generator): fallback to pre-critique content when critique returns junk

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Create voice cards for both blogs

**Files:**
- Create: `cyberintelai/content/voice-card.json`
- Create: `windrose-ai/content/voice-card.json`

**Step 1: Create CyberIntelAI voice card**

Write to `cyberintelai/content/voice-card.json`:
```json
{
  "persona": "Senior security analyst with 15+ years in the field. Former incident responder who has worked breach investigations at scale. Now focused on the intersection of AI and security — not as a trend-chaser, but because LLMs are creating novel attack surface that most orgs are ignoring.",
  "tone": "Direct, occasionally sardonic, zero hype. Treats the reader as a peer who's seen some things. Uses 'you' not 'organizations'. Drops a dry one-liner when earned.",
  "pet_peeves": [
    "Vendor marketing dressed as research",
    "'Stay vigilant' as actionable advice",
    "AI hype without technical substance",
    "Compliance theater mistaken for security",
    "Generic threat landscape overviews that could have been written in 2019"
  ],
  "recurring_opinions": [
    "Most compliance frameworks are theater — they measure documentation, not defense",
    "The real attack surface is always identity — credentials, tokens, sessions",
    "If your threat model doesn't include your own supply chain, it's not a threat model",
    "Defenders who don't red-team their own AI integrations are going to learn the hard way",
    "The best security controls are boring: least privilege, network segmentation, audit logs"
  ],
  "opener_styles": [
    "Open with a specific CVE number and what it revealed about a broader class of vulnerability",
    "Open with a named threat actor (APT group) and a concrete detail about their tradecraft",
    "Open with a verifiable statistic that contradicts conventional wisdom",
    "Open with a real incident timeline — what happened, when, and the detail that made it interesting",
    "Open with a contrarian claim that the rest of the post will support",
    "Open with a tool or technique name and the specific scenario where it failed or surprised you",
    "Open with a direct question that the post will answer with evidence"
  ]
}
```

**Step 2: Create Windrose AI voice card**

Write to `windrose-ai/content/voice-card.json`:
```json
{
  "persona": "Builder actively shipping in the agentic web space. Has spent real time integrating AI agents with payment rails, APIs, and discovery protocols. Shares what works AND what doesn't — not a cheerleader, not a cynic. Learning in public.",
  "tone": "Enthusiastic but honest. Uses 'we' when describing the industry. Occasionally admits 'I don't know yet' or 'nobody has solved this well'. Concrete examples from building, not abstract theorizing.",
  "pet_peeves": [
    "'AI will replace X' takes with no evidence",
    "Demos that work in a tweet thread but not in production",
    "Ignoring payment and identity as hard problems in agent commerce",
    "Treating the agentic web as just chatbots with tools",
    "Protocol announcements with no working implementations"
  ],
  "recurring_opinions": [
    "Agents need to pay for things and nobody's solved this well yet — that's the real bottleneck",
    "The agentic web is 90% plumbing and 10% magic — the plumbing is where the value is",
    "If your API isn't machine-readable, agents can't use it — and you'll be invisible",
    "Discovery is the unsolved problem — agents can't buy what they can't find",
    "The winners will be whoever makes the boring parts (auth, payments, fulfillment) work reliably"
  ],
  "opener_styles": [
    "Open with a concrete scenario of an agent trying to do something and hitting a wall",
    "Open with a real protocol or standard and the specific problem it solves",
    "Open with a comparison between how humans and agents experience the same task",
    "Open with a builder's anecdote — something that happened while implementing an agent workflow",
    "Open with a market data point about agent adoption or commerce volume",
    "Open with a direct question that developers building agent integrations actually face",
    "Open with a named company or project and what they got right (or wrong) about agent access"
  ]
}
```

**Step 3: Commit both**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add content/voice-card.json
git commit -m "feat(voice): add CyberIntelAI author persona card

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

cd /Users/ziv.koren/Documents/windrose-ai
git add content/voice-card.json
git commit -m "feat(voice): add Windrose AI author persona card

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Create incident/example banks for both blogs

**Files:**
- Create: `cyberintelai/content/incident-bank.json`
- Create: `windrose-ai/content/incident-bank.json`

**Step 1: Create CyberIntelAI incident bank**

Write to `cyberintelai/content/incident-bank.json` — a JSON array of 50 one-line incident summaries. Each entry is a string like:

```json
[
  "SolarWinds/SUNBURST (2020) — build pipeline compromise, signed Orion DLL with backdoor, 18,000 orgs affected, 9 months undetected",
  "Log4Shell CVE-2021-44228 — JNDI lookup RCE in ubiquitous logging library, trivial exploitation, patching took months across the ecosystem",
  "MOVEit/Cl0p CVE-2023-34362 — mass exploitation of file transfer appliance, 2,500+ orgs hit in under two weeks, no ransomware deployed",
  "Storm-0558 (2023) — stolen MSA signing key, forged Azure AD tokens, accessed US government email accounts",
  "Volt Typhoon (2023-2024) — Chinese APT living off the land in US critical infrastructure, no malware deployed, years of persistence",
  "Midnight Blizzard/Nobelium (2024) — compromised Microsoft corporate email via password spray on legacy test tenant, accessed source code",
  "Okta support system breach (2023) — attacker accessed customer HAR files via support case management system, session tokens exposed",
  "Codecov bash uploader compromise (2021) — CI/CD supply chain attack, modified script exfiltrated environment variables from 29,000 customers",
  "3CX supply chain attack (2023) — compromised desktop app update, originated from earlier supply chain compromise of Trading Technologies",
  "PyPI/npm typosquatting campaigns — persistent supply chain attacks via package name confusion, hundreds of malicious packages per year",
  "Kaseya VSA/REvil (2021) — MSP supply chain attack, single zero-day hit 1,500+ businesses through managed service provider trust chain",
  "Colonial Pipeline (2021) — DarkSide ransomware, single compromised VPN credential with no MFA, $4.4M ransom paid",
  "Uber breach (2022) — MFA fatigue attack on contractor, attacker social-engineered Slack access, accessed internal tools and source code",
  "LastPass breach (2022-2023) — DevOps engineer's home Plex server compromised, led to access to encrypted password vaults",
  "MOVEit-adjacent: GoAnywhere MFT CVE-2023-0669 — Cl0p exploited another file transfer tool, 130+ orgs before MOVEit campaign",
  "Twilio/0ktapus (2022) — SMS phishing campaign hit 130+ companies, attackers used Twilio to intercept MFA codes",
  "CircleCI breach (2023) — malware on engineer's laptop stole SSO session, attacker accessed customer secrets and environment variables",
  "Dependency confusion attacks (2021) — researcher Alex Birsan demonstrated private package name hijacking against Apple, Microsoft, PayPal",
  "ProxyLogon/Hafnium CVE-2021-26855 — Exchange Server SSRF to RCE chain, mass exploitation before patch, 30,000+ US orgs",
  "PrintNightmare CVE-2021-34527 — Windows Print Spooler RCE, patch-bypass cycles, default-enabled attack surface on every Windows box",
  "GitHub Actions supply chain risk — tj-actions/changed-files compromise (2025), reminded everyone that Actions run with repo access",
  "Polyfill.io supply chain (2024) — acquired domain injected malware into 100,000+ websites via trusted CDN",
  "CrowdStrike Falcon content update crash (2024) — faulty channel file crashed 8.5M Windows machines, not a cyberattack but a supply chain lesson",
  "XZ Utils/CVE-2024-3094 — social engineering of open source maintainer over 2 years to insert SSH backdoor, caught by accident",
  "Ivanti Connect Secure CVE-2024-21887 — VPN appliance auth bypass + command injection, mass exploitation by UNC5221",
  "Citrix Bleed CVE-2023-4966 — session token leakage from NetScaler, trivial exploitation, LockBit used it extensively",
  "Microsoft Exchange ProxyShell chain (2021) — SSRF + privilege escalation + RCE, widely exploited months after Black Hat talk",
  "Atlassian Confluence CVE-2023-22515 — broken access control allowing admin account creation, exploited as zero-day",
  "Apache Struts CVE-2017-5638 — OGNL injection, the Equifax breach entry point, 147M records exposed",
  "NotPetya (2017) — disguised as ransomware, actually destructive wiper, spread via M.E.Doc supply chain in Ukraine, $10B+ global damage",
  "Stuxnet (2010) — first known cyber weapon targeting industrial control systems, compromised Siemens PLCs in Iranian nuclear facility",
  "Target breach (2013) — HVAC vendor credentials used as entry point, POS malware, 40M credit card numbers stolen",
  "Capital One breach (2019) — SSRF against misconfigured WAF on AWS, 100M+ customer records, exploited by former AWS employee",
  "Kubernetes RBAC misconfigurations — Tesla cryptojacking (2018), exposed Kubernetes dashboard with no password, mining crypto on GPU clusters",
  "SolarMarker/Jupyter malware — SEO poisoning to distribute info-stealer, demonstrated that Google search results are an attack surface",
  "Lapsus$ (2022) — teenage group breached Okta, Microsoft, Nvidia, Samsung via social engineering and SIM swapping, no sophisticated tooling",
  "T-Mobile breaches (2021-2023) — repeated breaches of the same company, API abuse, credential stuffing, 37M+ customers affected",
  "MOVEit CVE-2023-34362 technical detail — SQL injection in web interface, attacker could drop webshells and exfiltrate via HTTPS",
  "Wiz research: ChaosDB (2021) — Jupyter Notebook feature in Azure Cosmos DB exposed primary keys for thousands of databases",
  "Wiz research: ExtraReplica (2022) — cross-tenant vulnerability in Azure PostgreSQL, could read other customers' databases",
  "CISA Known Exploited Vulnerabilities catalog — the authoritative list of vulns being actively exploited, now 1,100+ entries",
  "VirusTotal leaked customer list (2023) — employee accidentally uploaded file containing customer names/emails, including IC agencies",
  "Barracuda ESG CVE-2023-2868 — email gateway zero-day, China-nexus UNC4841, Barracuda told customers to physically replace the appliance",
  "Progress WS_FTP CVE-2023-40044 — .NET deserialization RCE, another file transfer product hit weeks after MOVEit",
  "MGM/Caesars ransomware (2023) — Scattered Spider social-engineered help desk, ransomed two major casinos, $15M payment from Caesars",
  "HTTP/2 Rapid Reset CVE-2023-44487 — protocol-level DDoS amplification, largest DDoS attacks in history, affected every HTTP/2 implementation",
  "Snowflake customer breaches (2024) — stolen credentials from infostealer malware, no MFA on Snowflake accounts, 165+ customers affected",
  "Microsoft Recall controversy (2024) — AI feature that screenshots everything, security researchers extracted plaintext data, delayed launch",
  "OpenAI breach (2023) — internal Slack forum accessed by attacker, raised questions about AI company security practices",
  "Prompt injection against Bing Chat (2023) — researchers showed hidden instructions in web pages could manipulate Bing's AI responses"
]
```

**Step 2: Create Windrose AI incident/example bank**

Write to `windrose-ai/content/incident-bank.json` — 50 one-line examples relevant to the agentic web:

```json
[
  "Stripe API design — the gold standard for developer experience, every agent integration references it as the model to follow",
  "x402 protocol — HTTP-native payments for agents, eliminates OAuth dance for machine-to-machine transactions",
  "Agnes store — custom merch purchased by AI agents on behalf of humans, proving agent commerce works end-to-end",
  "MCP (Model Context Protocol) — Anthropic's standard for connecting LLMs to external tools, rapidly becoming the default",
  "OpenAI Plugins (2023) — first major attempt at agent-accessible services, deprecated within a year, lessons about premature standardization",
  "Shopify's API — massive catalog accessible to agents, but payment flow still assumes human in the browser",
  "AutoGPT (2023) — early autonomous agent that captured imagination but showed the gap between demo and production reliability",
  "LangChain tool-calling — the most common framework for agent-to-API interaction, also the most common source of prompt injection",
  "Coinbase AgentKit — crypto wallet SDK designed for AI agents, bridging the gap between agent intent and on-chain execution",
  "Crossmint — API-first wallet infrastructure, makes it possible for agents to hold and spend without managing private keys",
  "llms.txt standard — proposed convention for making websites machine-readable, adopted by hundreds of sites",
  "OpenAPI/Swagger specs — the de facto standard for API documentation, but most specs are too complex for agents to parse effectively",
  "Vercel AI SDK — React hooks and streaming primitives that make agent UIs feel real-time",
  "Anthropic Claude tool use — function calling that lets agents interact with external services via structured JSON",
  "Printful API — print-on-demand fulfillment accessible via REST, a real example of the agent commerce supply chain",
  "USDC on Base — Circle's stablecoin on Coinbase's L2, the most practical payment rail for agent-to-machine transactions today",
  "Circle developer-controlled wallets — per-transaction wallets for programmatic payments, free tier covers most early-stage needs",
  "A2A (Agent-to-Agent) protocol — Google's proposal for agent interoperability, announced April 2025",
  "Zapier's natural language actions — early attempt at letting agents trigger workflows, limited by Zapier's human-centric model",
  "ChatGPT Actions (successor to Plugins) — OpenAI's current approach to agent-accessible services, JSON schema + OAuth",
  "Plaid for fintech — how financial data aggregation works today, and why agents need something similar but machine-native",
  "Twilio for communications — API-first service that agents can already use for SMS/voice, model for agent-accessible infrastructure",
  "AWS Bedrock Agents — Amazon's managed agent framework, notable for built-in guardrails and action groups",
  "Browser-use/Playwright agents — agents that control browsers as a fallback when APIs don't exist, fragile but widespread",
  "Perplexity AI — search engine built for AI-native retrieval, showing what agent-accessible information looks like",
  "Rabbit R1/Humane Pin (2024) — hardware agents that failed, lessons about what consumers actually want from autonomous agents",
  "Devin by Cognition (2024) — autonomous coding agent, demonstrated both the potential and the reliability gap in agent execution",
  "CrewAI — multi-agent orchestration framework, popular for building agent teams that divide complex tasks",
  "GPT-4o function calling — structured output that made reliable agent-to-API interaction practical for the first time",
  "Replit Agent — autonomous development agent that can deploy full applications, competes with human freelancers on simple tasks",
  "Firecrawl — web scraping API designed for LLMs, turns any webpage into clean markdown that agents can consume",
  "Together AI inference — fast, cheap inference API that makes running agent workloads economically viable",
  "Composio — tool integration platform for AI agents, 250+ pre-built integrations for common SaaS services",
  "E2B (Code Interpreter) — sandboxed code execution for agents, critical for safe autonomous coding tasks",
  "Neon serverless Postgres — database with branching and autoscaling, fits the burst pattern of agent-driven workloads",
  "Val Town — serverless JavaScript runtime, increasingly used as the execution layer for simple agent tasks",
  "Modal — GPU cloud for AI workloads, relevant for agents that need to run inference as part of their workflows",
  "Deno Deploy — edge runtime that agents can deploy to, ultra-fast cold starts matter for agent response times",
  "Supabase — Postgres + auth + storage with a clean API, popular backend for agent-accessible applications",
  "Upstash Redis — serverless Redis, commonly used for rate limiting and caching in agent-facing APIs",
  "Resend — email API that agents use to send transactional emails on behalf of users",
  "Knock — notification infrastructure, relevant for agent-triggered alerts and human-in-the-loop confirmations",
  "Stripe Connect — marketplace payments platform, the most likely path for agent commerce payment splitting",
  "Railway — deployment platform with per-second billing, fits the unpredictable resource usage of agent workflows",
  "Convex — real-time backend with built-in reactivity, interesting model for agent state management",
  "Trigger.dev — background job framework, useful for the async parts of agent workflows (fulfillment, polling, retries)",
  "OpenRouter — LLM routing API that lets agents pick the best model per task, cost optimization for agent workloads",
  "Helicone — LLM observability platform, essential for debugging and monitoring agent API calls in production",
  "Braintrust — AI eval framework, relevant for testing whether agent workflows produce correct results",
  "AgentOps — agent observability and debugging platform, fills the gap between LLM observability and agent-level tracing"
]
```

**Step 3: Commit both**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add content/incident-bank.json
git commit -m "feat(voice): add incident bank (50 cybersecurity incidents for opener diversity)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

cd /Users/ziv.koren/Documents/windrose-ai
git add content/incident-bank.json
git commit -m "feat(voice): add example bank (50 agentic web examples for opener diversity)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Create format templates for both blogs

**Files:**
- Create: `cyberintelai/content/formats/deep-dive.json`
- Create: `cyberintelai/content/formats/hot-take.json`
- Create: `cyberintelai/content/formats/incident-breakdown.json`
- Create: `cyberintelai/content/formats/tool-review.json`
- Create: `cyberintelai/content/formats/quick-hits.json`
- Create: `cyberintelai/content/formats/contrarian.json`
- Create: same 6 files in `windrose-ai/content/formats/`

**Step 1: Create format templates**

Each file is a JSON object with `name`, `word_count`, `structure_prompt`, and `sections`. The `structure_prompt` is injected into the generation prompt. Example for deep-dive:

```json
{
  "name": "deep-dive",
  "word_count": "800-1000",
  "structure_prompt": "Write a thorough deep dive on a single topic. 3-4 sections that progressively build understanding. Start with the concrete problem, move to how it works technically, then to what defenders/builders should do. End with '## The Bottom Line' (2-3 actionable sentences) and '## References' (3-5 real links).",
  "sections": ["topic-specific heading", "technical detail heading", "practical implications heading", "The Bottom Line", "References"]
}
```

Hot take:
```json
{
  "name": "hot-take",
  "word_count": "400-600",
  "structure_prompt": "Write a short, punchy opinion piece. Open with your strongest claim. Support it with 1-2 sections of evidence. No References section — this is a take, not a research paper. End with '## The Bottom Line' (1-2 sentences, direct).",
  "sections": ["opinion-driven heading", "evidence heading", "The Bottom Line"]
}
```

Incident breakdown:
```json
{
  "name": "incident-breakdown",
  "word_count": "600-800",
  "structure_prompt": "Structure as an incident analysis: '## What Happened' (timeline and facts), '## Why It Worked' (the defensive gap), '## What To Do About It' (specific remediation). End with '## The Bottom Line' and '## References'.",
  "sections": ["What Happened", "Why It Worked", "What To Do About It", "The Bottom Line", "References"]
}
```

Tool/protocol review:
```json
{
  "name": "tool-review",
  "word_count": "700-900",
  "structure_prompt": "Review a specific tool, protocol, or framework. Structure as: '## What It Is' (one paragraph), '## How It Works' (technical details), '## Where It Breaks' (honest limitations), '## Verdict' (would you use it, and when). End with '## References'.",
  "sections": ["What It Is", "How It Works", "Where It Breaks", "Verdict", "References"]
}
```

Quick hits:
```json
{
  "name": "quick-hits",
  "word_count": "400-500",
  "structure_prompt": "Write 3-4 short items under one unifying theme. Each item gets its own ## heading (specific, not numbered). Each item is 80-120 words. No Bottom Line or References — this is a roundup, keep it snappy.",
  "sections": ["item-specific heading x3-4"]
}
```

Contrarian:
```json
{
  "name": "contrarian",
  "word_count": "500-700",
  "structure_prompt": "Open with the conventional wisdom that everyone repeats. Then dismantle it with evidence. Structure: '## The Standard Take' (what most people say), '## Why It's Wrong' (your counter-evidence), '## What To Do Instead' (the better approach). End with '## The Bottom Line'.",
  "sections": ["The Standard Take", "Why It's Wrong", "What To Do Instead", "The Bottom Line"]
}
```

Create all 6 files in both `cyberintelai/content/formats/` and `windrose-ai/content/formats/`. The structure prompts differ slightly per blog (cyberintelai references "defenders", windrose-ai references "builders"), but the format names and word counts are the same.

**Step 2: Commit both**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add content/formats/
git commit -m "feat(voice): add 6 format templates for post variety

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

cd /Users/ziv.koren/Documents/windrose-ai
git add content/formats/
git commit -m "feat(voice): add 6 format templates for post variety

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Update CyberIntelAI generator to use voice system

**Files:**
- Modify: `cyberintelai/scripts/generatePost.js`

**Step 1: Add file loading at the top**

After the existing constants (TAVILY_API_KEY, QUEUE_PATH, POSTS_DIR), add:

```javascript
const VOICE_CARD_PATH = path.join(process.cwd(), "content/voice-card.json");
const INCIDENT_BANK_PATH = path.join(process.cwd(), "content/incident-bank.json");
const FORMATS_DIR = path.join(process.cwd(), "content/formats");

function loadVoiceCard() {
  return JSON.parse(fs.readFileSync(VOICE_CARD_PATH, "utf-8"));
}

function sampleIncidents(count = 4) {
  const bank = JSON.parse(fs.readFileSync(INCIDENT_BANK_PATH, "utf-8"));
  const shuffled = bank.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickFormat() {
  const files = fs.readdirSync(FORMATS_DIR).filter(f => f.endsWith(".json"));
  const picked = files[Math.floor(Math.random() * files.length)];
  const format = JSON.parse(fs.readFileSync(path.join(FORMATS_DIR, picked), "utf-8"));
  console.log(`Format: ${format.name} (${format.word_count} words)`);
  return format;
}
```

**Step 2: Rewrite the content prompt in generatePost()**

Replace the entire `contentPrompt` string (currently lines 116-142) with a version that uses voice card, sampled incidents, and selected format. Remove all GOOD OPENER / BAD OPENER examples. The new prompt structure:

```javascript
  const voice = loadVoiceCard();
  const incidents = sampleIncidents(4);
  const format = pickFormat();
  const openerStyle = voice.opener_styles[Math.floor(Math.random() * voice.opener_styles.length)];

  const contentPrompt = `Write a cybersecurity blog post titled: "${title}"
Excerpt/angle: ${excerpt}
${groundingContext}

AUTHOR VOICE: ${voice.persona}
TONE: ${voice.tone}
RECURRING OPINIONS (weave in naturally if relevant, don't force): ${voice.recurring_opinions.join("; ")}

FORMAT: ${format.name} (${format.word_count} words)
STRUCTURE: ${format.structure_prompt}

OPENER INSTRUCTION: ${openerStyle}. Do NOT copy any example verbatim — use your own words and a different incident/detail each time.

AVAILABLE INCIDENTS (use 1-2 if relevant, do NOT use all of them):
${incidents.map(i => `- ${i}`).join("\n")}

NON-NEGOTIABLE RULES:
- Name at least 3 real tools, companies, CVEs, or threat actors
- Every ## heading must be specific to this post's topic
- Every paragraph must contain at least one specific, verifiable claim
- Do NOT start any paragraph with "In today's landscape", "As AI continues to", "It's no secret that", "Organizations are increasingly"
- Do NOT include the title at the top
- Do NOT include frontmatter

PET PEEVES TO AVOID: ${voice.pet_peeves.join("; ")}`;
```

**Step 3: Update the critique prompt to check voice**

Add to the existing critique prompt:
```javascript
  const critiquePrompt = `You are a strict editor. Your author's voice: ${voice.persona}. Tone: ${voice.tone}.

Review the post below. For each section:
1. Does it sound like this specific author, or like generic AI content? Rewrite to match the voice.
2. Does the opening name a specific incident, CVE, company, or statistic? Fix if not.
3. Are any paragraphs generic enough to appear in any post? Replace with specifics.
4. Is the Bottom Line actionable? Fix if it's vague.

Output ONLY the complete improved post body. No frontmatter, no commentary, no preamble.

Post to review:
${content}`;
```

**Step 4: Commit**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add scripts/generatePost.js
git commit -m "feat(voice): integrate voice card, incident bank, and format templates into generator

Replaces hardcoded GOOD/BAD OPENER examples with dynamic system:
- Voice card defines persona, tone, opinions, pet peeves
- Incident bank (50 entries) sampled randomly per post
- Format templates (6 types) selected randomly per post
- Critique pass now checks voice consistency

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Update Windrose AI generator to use voice system

**Files:**
- Modify: `windrose-ai/scripts/generate-post.ts`

**Step 1: Add file loading**

Same pattern as Task 9 but in TypeScript:

```typescript
const VOICE_CARD_PATH = path.join(process.cwd(), "content/voice-card.json");
const INCIDENT_BANK_PATH = path.join(process.cwd(), "content/incident-bank.json");
const FORMATS_DIR = path.join(process.cwd(), "content/formats");

function loadVoiceCard(): { persona: string; tone: string; pet_peeves: string[]; recurring_opinions: string[]; opener_styles: string[] } {
  return JSON.parse(fs.readFileSync(VOICE_CARD_PATH, "utf-8"));
}

function sampleIncidents(count = 4): string[] {
  const bank: string[] = JSON.parse(fs.readFileSync(INCIDENT_BANK_PATH, "utf-8"));
  const shuffled = bank.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickFormat(): { name: string; word_count: string; structure_prompt: string } {
  const files = fs.readdirSync(FORMATS_DIR).filter(f => f.endsWith(".json"));
  const picked = files[Math.floor(Math.random() * files.length)];
  const format = JSON.parse(fs.readFileSync(path.join(FORMATS_DIR, picked), "utf-8"));
  console.log(`Format: ${format.name} (${format.word_count} words)`);
  return format;
}
```

**Step 2: Rewrite the content prompt in generatePost()**

Replace the `contentPrompt` (lines 85-115) with the voice-aware version, same pattern as Task 9 but adapted for the windrose-ai domain (agentic web, not cybersecurity). Remove the inline system prompt and all hardcoded tone instructions.

**Step 3: Update critique prompt to check voice**

Same pattern as Task 9 — include voice persona and tone in critique prompt.

**Step 4: Commit**

```bash
cd /Users/ziv.koren/Documents/windrose-ai
git add scripts/generate-post.ts
git commit -m "feat(voice): integrate voice card, incident bank, and format templates into generator

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Update CyberIntelAI rewrite script to use voice system

**Files:**
- Modify: `cyberintelai/scripts/rewritePosts.js`

**Step 1: Load voice card and incident bank**

Add imports at the top, same as Task 9. In the `rewritePost()` function, load voice card and sample incidents before building the prompt.

**Step 2: Update the rewrite prompt**

Replace the current prompt with one that includes voice card excerpt, sampled incidents, and the diversity rule. Same structure as Task 9's content prompt but framed as a rewrite.

**Step 3: Commit**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add scripts/rewritePosts.js
git commit -m "feat(voice): integrate voice system into rewrite script

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Rewrite 25 old CyberIntelAI posts that still reference CVE-2024-3094

**Files:**
- Modify: 25 posts in `cyberintelai/_posts/` that contain "CVE-2024-3094" or "XZ Utils" or "Andres Freund"

**Step 1: Clear idempotency marker on affected posts**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
grep -l "CVE-2024-3094\|XZ Utils\|Andres Freund" _posts/*.md | while read f; do
  sed -i '' 's/^rewritten: true$/rewritten: false/' "$f"
done
```

**Step 2: Run the rewrite script**

```bash
OPENAI_API_KEY=... node scripts/rewritePosts.js
```

Wait for completion. Verify output count matches expected ~25 posts.

**Step 3: Spot-check 3-4 rewritten posts**

Read a few posts and verify:
- No CVE-2024-3094 / XZ Utils / Andres Freund references
- Voice matches the persona card
- Format varies (not all identical structure)

**Step 4: Commit and push**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add _posts/
git commit -m "fix(content): rewrite 25 posts with voice system — remove CVE-2024-3094 overuse

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

### Task 13: Add cross-blog maintenance checklist to both repos

**Files:**
- Create: `cyberintelai/docs/blog-generator-checklist.md`
- Create: `windrose-ai/docs/blog-generator-checklist.md`

**Step 1: Create checklist**

Both files have identical content:

```markdown
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
```

**Step 2: Commit both**

```bash
cd /Users/ziv.koren/Documents/cyberintelai
git add docs/blog-generator-checklist.md
git commit -m "docs: add cross-repo blog generator checklist

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

cd /Users/ziv.koren/Documents/windrose-ai
git add docs/blog-generator-checklist.md
git commit -m "docs: add cross-repo blog generator checklist

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 14: Push all changes and verify both crons

**Step 1: Push both repos**

```bash
cd /Users/ziv.koren/Documents/cyberintelai && git push
cd /Users/ziv.koren/Documents/windrose-ai && git push
```

**Step 2: Verify Vercel deploys succeed**

Check both projects via Vercel MCP — both latest deployments should be READY.

**Step 3: Optionally trigger a manual workflow_dispatch on both repos**

```bash
cd /Users/ziv.koren/Documents/cyberintelai && gh workflow run "Auto Generate Blog Post" --field mode=news
cd /Users/ziv.koren/Documents/windrose-ai && gh workflow run "Generate Blog Post"
```

Wait for both to complete. Verify:
- Both workflows succeed (green)
- New posts are committed
- Posts use varied formats and openers
- No SolarWinds verbatim copying

---
