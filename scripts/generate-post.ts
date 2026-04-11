import fs from "fs";
import path from "path";
import OpenAI from "openai";
import matter from "gray-matter";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const QUEUE_PATH = path.join(process.cwd(), "content/content-queue.json");
const BLOG_DIR = path.join(process.cwd(), "content/blog");
const VOICE_CARD_PATH = path.join(process.cwd(), "content/voice-card.json");
const INCIDENT_BANK_PATH = path.join(process.cwd(), "content/incident-bank.json");
const FORMATS_DIR = path.join(process.cwd(), "content/formats");
const ALLOWED_POST_TYPES = new Set([
  "news",
  "analysis",
  "explainer",
  "deep-dive",
  "roundup",
  "comparison",
  "buyer-guide",
  "course-guide",
  "tools-list",
  "implementation-guide",
]);
const POST_TYPE_POLICY = {
  news: { eligibleModules: [] },
  analysis: { eligibleModules: [] },
  explainer: { eligibleModules: [] },
  "deep-dive": { eligibleModules: [] },
  roundup: { eligibleModules: ["recommended-tools", "resource-box"] },
  comparison: { eligibleModules: ["comparison-table", "recommended-tools"] },
  "buyer-guide": { eligibleModules: ["recommended-tools", "resource-box"] },
  "course-guide": { eligibleModules: ["recommended-tools", "resource-box"] },
  "tools-list": { eligibleModules: ["recommended-tools", "resource-box"] },
  "implementation-guide": { eligibleModules: ["resource-box"] },
} as const;
const TOPIC_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "about",
  "when", "what", "why", "how", "are", "have", "has", "will", "need", "needs",
  "just", "than", "they", "them", "their", "more", "less", "over", "under",
  "after", "before", "because", "still", "being", "where", "which", "while",
  "between", "using", "used", "does", "doesn", "isn", "is", "now", "new",
  "2026", "2025", "2024", "blog", "guide", "agentic", "agents", "agent", "web",
  "payments", "commerce", "protocols", "website"
]);

type VoiceCard = {
  persona: string;
  tone: string;
  pet_peeves: string[];
  recurring_opinions: string[];
  opener_styles: string[];
};

function loadVoiceCard(): VoiceCard {
  return JSON.parse(fs.readFileSync(VOICE_CARD_PATH, "utf-8"));
}

function sampleIncidents(count = 4): string[] {
  const bank: string[] = JSON.parse(fs.readFileSync(INCIDENT_BANK_PATH, "utf-8"));
  const shuffled = bank.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickFormat(): { name: string; word_count: string; structure_prompt: string } {
  const files = fs.readdirSync(FORMATS_DIR).filter((f: string) => f.endsWith(".json"));
  const picked = files[Math.floor(Math.random() * files.length)];
  const format = JSON.parse(fs.readFileSync(path.join(FORMATS_DIR, picked), "utf-8"));
  console.log(`Format: ${format.name} (${format.word_count} words)`);
  return format;
}

type QueueItem = {
  id: string;
  title: string;
  slug: string;
  angle: string;
  avoid: string;
  target_keyword: string;
  category: string;
  audience: string[];
  priority: number;
  postType?: string;
  commercialIntent?: boolean;
  monetizationIntent?: string;
  hasAffiliateLinks?: boolean;
  affiliatePrograms?: string[];
};

type AffiliatePolicy = {
  hasAffiliateLinks: boolean;
  affiliatePrograms: string[];
};

type PostTaxonomy = {
  postType: string;
  commercialIntent: boolean;
  eligibleModules: string[];
};

function getExistingPosts(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith(".mdx") || f.endsWith(".md"))
    .map(f => f.replace(/\.(mdx|md)$/, ""));
}

function extractKeywords(text: string, limit = 8): string[] {
  const seen = new Set<string>();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !TOPIC_STOP_WORDS.has(token));

  const keywords: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    keywords.push(token);
    if (keywords.length >= limit) break;
  }
  return keywords;
}

function loadRecentPosts(limit = 5): { title: string; summary: string; date: string; keywords: string[] }[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs.readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => {
      try {
        const fullPath = path.join(BLOG_DIR, file);
        const raw = fs.readFileSync(fullPath, "utf-8");
        const { data } = matter(raw);
        const title = typeof data.title === "string" ? data.title.trim() : "";
        const summary = typeof data.summary === "string" ? data.summary.trim() : "";
        const date =
          data.date instanceof Date
            ? data.date.toISOString()
            : typeof data.date === "string"
              ? data.date
              : "";

        return {
          title,
          summary,
          date,
          keywords: Array.isArray(data.tags) && data.tags.length > 0
            ? data.tags.map((tag: string) => String(tag).trim()).filter(Boolean).slice(0, 8)
            : extractKeywords(`${title} ${summary}`),
        };
      } catch {
        return null;
      }
    })
    .filter((post): post is { title: string; summary: string; date: string; keywords: string[] } => post !== null)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, limit);
}

function buildRecentCoverageContext(posts: { title: string; summary: string; keywords: string[] }[]): string {
  if (!posts.length) return "No recent coverage.";
  return posts
    .map((post, index) => {
      const keywords = post.keywords.length ? post.keywords.join(", ") : "none";
      return `${index + 1}. Title: ${post.title}\n   Summary: ${post.summary}\n   Keywords: ${keywords}`;
    })
    .join("\n");
}

function keywordSet(text: string): Set<string> {
  return new Set(extractKeywords(text, 12));
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / Math.min(a.size, b.size);
}

function isTopicTooSimilar(
  topic: { title: string; summary: string },
  recentPosts: { title: string; summary: string; keywords: string[] }[]
): boolean {
  const topicTitleKeywords = keywordSet(topic.title || "");
  const topicSummaryKeywords = keywordSet(topic.summary || "");

  return recentPosts.some((post) => {
    const recentTitleKeywords = keywordSet(post.title || "");
    const recentSummaryKeywords = keywordSet(post.summary || "");
    const titleScore = overlapScore(topicTitleKeywords, recentTitleKeywords);
    const summaryScore = overlapScore(topicSummaryKeywords, recentSummaryKeywords);
    const combinedScore = overlapScore(
      keywordSet(`${topic.title} ${topic.summary}`),
      keywordSet(`${post.title} ${post.summary}`)
    );
    return titleScore >= 0.6 || summaryScore >= 0.7 || combinedScore >= 0.65;
  });
}

function pickQueueItem(
  queue: QueueItem[],
  existingSlugs: string[],
  recentPosts: { title: string; summary: string; keywords: string[] }[]
): QueueItem | null {
  const candidates = queue
    .filter((item) => !existingSlugs.includes(item.slug))
    .sort((a, b) => a.priority - b.priority);

  if (!candidates.length) return null;

  const distinctCandidate = candidates.find(
    (item) => !isTopicTooSimilar({ title: item.title, summary: item.angle }, recentPosts)
  );

  if (!distinctCandidate) return candidates[0];

  if (distinctCandidate.slug !== candidates[0].slug) {
    console.log(
      `Skipping similar queue item "${candidates[0].title}" in favor of more distinct topic "${distinctCandidate.title}"`
    );
  }

  return distinctCandidate;
}

async function getTavilyStory(): Promise<{ title: string; url: string; content: string } | null> {
  if (!TAVILY_API_KEY) {
    console.warn("TAVILY_API_KEY not set — skipping news grounding");
    return null;
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: "AI agents agentic web autonomous payments protocol 2026",
      search_depth: "basic",
      max_results: 5,
      days: 2,
    }),
  });

  if (!response.ok) {
    console.warn(`Tavily error: ${response.status} — skipping news grounding`);
    return null;
  }

  const data = await response.json() as { results: { title: string; url: string; content: string }[] };
  const results = data.results || [];
  if (!results.length) return null;
  return results.sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0))[0];
}

function parseBooleanFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseStringFlag(name: string): string | null {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!arg) return null;
  return arg.slice(name.length + 3).trim() || null;
}

function parseStringListFlag(name: string): string[] {
  const value = parseStringFlag(name);
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAffiliatePrograms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAffiliatePolicy(input: {
  explicitAffiliate: boolean;
  affiliatePrograms?: string[];
}): AffiliatePolicy {
  if (input.explicitAffiliate !== true) {
    return { hasAffiliateLinks: false, affiliatePrograms: [] };
  }

  return {
    hasAffiliateLinks: true,
    affiliatePrograms: normalizeAffiliatePrograms(input.affiliatePrograms),
  };
}

function normalizePostType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_POST_TYPES.has(normalized) ? normalized : null;
}

function resolvePostTaxonomy(input: {
  mode: string;
  explicitPostType?: string | null;
  queuePostType?: string;
  explicitCommercial?: boolean;
  queueCommercialIntent?: boolean;
}): PostTaxonomy {
  const defaultPostType = input.mode === "news" ? "news" : "explainer";
  const postType =
    normalizePostType(input.explicitPostType) ||
    normalizePostType(input.queuePostType) ||
    defaultPostType;
  const policy = POST_TYPE_POLICY[postType as keyof typeof POST_TYPE_POLICY] || { eligibleModules: [] };

  return {
    postType,
    commercialIntent: input.explicitCommercial === true || input.queueCommercialIntent === true,
    eligibleModules: [...policy.eligibleModules],
  };
}

function applyAffiliateMetadata(
  mdx: string,
  policy: AffiliatePolicy
): string {
  try {
    const parsed = matter(mdx);

    if (!Array.isArray(parsed.data.affiliate_links)) {
      parsed.data.affiliate_links = [];
    }

    if (policy.hasAffiliateLinks) {
      parsed.data.hasAffiliateLinks = true;
      if (policy.affiliatePrograms.length > 0) {
        parsed.data.affiliatePrograms = policy.affiliatePrograms;
      } else {
        delete parsed.data.affiliatePrograms;
      }
    } else {
      delete parsed.data.hasAffiliateLinks;
      delete parsed.data.affiliatePrograms;
    }

    return matter.stringify(parsed.content, parsed.data);
  } catch (err: any) {
    console.warn(`  WARNING: unable to apply affiliate metadata: ${err.message}`);
    return mdx;
  }
}

function applyPostTaxonomyMetadata(
  mdx: string,
  taxonomy: PostTaxonomy
): string {
  try {
    const parsed = matter(mdx);
    parsed.data.postType = taxonomy.postType;

    if (taxonomy.commercialIntent) {
      parsed.data.commercialIntent = true;
    } else {
      delete parsed.data.commercialIntent;
    }

    if (taxonomy.eligibleModules.length > 0) {
      parsed.data.eligibleModules = taxonomy.eligibleModules;
    } else {
      delete parsed.data.eligibleModules;
    }

    return matter.stringify(parsed.content, parsed.data);
  } catch (err: any) {
    console.warn(`  WARNING: unable to apply taxonomy metadata: ${err.message}`);
    return mdx;
  }
}

async function generatePost(opts: {
  title: string;
  angle: string;
  slug: string;
  category: string;
  audience: string[];
  affiliatePolicy: AffiliatePolicy;
  postTaxonomy: PostTaxonomy;
  existingSlugs: string[];
  groundingContext: string;
}): Promise<string> {
  const { title, angle, slug, category, audience, affiliatePolicy, postTaxonomy, existingSlugs, groundingContext } = opts;
  const today = new Date().toISOString().split("T")[0];
  const existingCoverage = existingSlugs.join(", ") || "none yet";

  const voice = loadVoiceCard();
  const incidents = sampleIncidents(4);
  const format = pickFormat();
  const openerStyle = voice.opener_styles[Math.floor(Math.random() * voice.opener_styles.length)];

  const contentPrompt = `Write a blog post about the agentic web.

Title: ${title}
Angle: ${angle}
${groundingContext}
Already covered (avoid repeating): ${existingCoverage}
POST TYPE: ${postTaxonomy.postType}

AUTHOR VOICE: ${voice.persona}
TONE: ${voice.tone}
RECURRING OPINIONS (weave in naturally if relevant, don't force): ${voice.recurring_opinions.join("; ")}

FORMAT: ${format.name} (${format.word_count} words)
STRUCTURE: ${format.structure_prompt}

OPENER INSTRUCTION: ${openerStyle}. Do NOT copy any example verbatim — use your own words and a different example each time.

AVAILABLE EXAMPLES (use 1-2 if relevant, do NOT use all of them):
${incidents.map((i: string) => "- " + i).join("\n")}

NON-NEGOTIABLE RULES:
- MUST name at least 2 real tools, companies, protocols, or projects
- Every ## heading must be specific to this post's topic (generic headings like "Why This Matters", "Background", "Introduction" are forbidden)
- Every paragraph must contain at least one specific, verifiable claim
- Include at least one clear, concrete example to improve understanding
- Aim for clarity over complexity when explaining concepts
- Do NOT start any paragraph with "In today's landscape", "As AI continues to", "It's no secret that", "Organizations are increasingly"

PET PEEVES TO AVOID: ${voice.pet_peeves.join("; ")}

Output ONLY the complete MDX file starting with ---. Include:
1. Full frontmatter with these fields: title, slug (${slug}), date (${today}), updated (${today}), summary, tags, category (${category}), audience (${JSON.stringify(audience)}), affiliate_links (array, empty if none relevant), reading_time_minutes (integer estimate), human_url (/blog/${slug}), agent_url (/blog/${slug}.md), canonical (https://windrose-ai.com/blog/${slug})
   IMPORTANT: ALL string values in frontmatter (title, summary, etc.) MUST be wrapped in double quotes.
2. agent_context YAML block (as part of frontmatter) with:
   - key_claims: list of 3-5 specific factual claims
   - tools_mentioned: list of objects with name, role, url
   - recommended_actions: list of 3-4 actionable steps
   - related: list of 2-3 related post paths like /blog/some-post.md
3. Post body with ## headings following the format structure`;

  const contentResponse = await withRetry(() => openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [{ role: "user", content: contentPrompt }],
    temperature: 0.7,
    max_completion_tokens: 2500,
  }));

  if (contentResponse.choices[0].finish_reason === "length") {
    console.warn("  WARNING: output was truncated (finish_reason=length)");
  }

  let mdx = contentResponse.choices[0].message.content!.trim();

  // Self-critique pass
  const critiquePrompt = `You are a strict editor. Your author's voice: ${voice.persona}. Tone: ${voice.tone}.

Review the post below. For each section:
1. Does it sound like this specific author, or like generic AI content? Rewrite to match the voice.
2. Does the opening contain a specific, concrete example or claim? Fix if not.
3. Are any paragraphs generic enough to appear in any post? Replace with specifics.
4. Improve clarity of explanations where they are harder to follow than they need to be.
5. Keep the tone consistent, readable, and natural throughout.

Output ONLY the complete improved post — start with the frontmatter (---) and include the entire file. No commentary, no preamble, no "Here is the improved post:".

Post to review:
${mdx}`;

  const critiqueResponse = await withRetry(() => openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [{ role: "user", content: critiquePrompt }],
    temperature: 0.3,
    max_completion_tokens: 2700,
  }));

  if (critiqueResponse.choices[0].finish_reason === "length") {
    console.warn("  WARNING: critique pass was truncated (finish_reason=length)");
  }

  let critiqued = critiqueResponse.choices[0].message.content?.trim() || "";

  // If critique returned empty or too short, fall back to pre-critique content
  if (!critiqued || critiqued.length < 500 || !critiqued.startsWith("---")) {
    console.warn("  WARNING: critique pass returned insufficient content, using pre-critique version");
    return mdx;
  }

  return applyAffiliateMetadata(applyPostTaxonomyMetadata(critiqued, postTaxonomy), affiliatePolicy);
}

async function main() {
  const modeArg = process.argv.find(a => a.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : "news";
  const dryRun = process.argv.includes("--dry-run");
  const hasAffiliateLinks = parseBooleanFlag("affiliate");
  const affiliatePrograms = parseStringListFlag("affiliate-programs");
  const postType = parseStringFlag("post-type");
  const commercialIntent = parseBooleanFlag("commercial");

  if (!["news", "evergreen"].includes(mode)) {
    console.error("Unknown mode:", mode, "(use --mode=news or --mode=evergreen)");
    process.exit(1);
  }

  console.log(`Mode: ${mode}`);
  if (hasAffiliateLinks) {
    console.log(
      `Affiliate metadata enabled${affiliatePrograms.length ? ` (${affiliatePrograms.join(", ")})` : ""}`
    );
  }
  if (postType) {
    console.log(`Post type override: ${postType}`);
  }
  if (commercialIntent) {
    console.log("Commercial intent enabled");
  }

  const existingSlugs = getExistingPosts();
  const recentPosts = loadRecentPosts(5);

  if (dryRun) {
    console.log("Dry run — skipping generation.");
    process.exit(0);
  }

  let mdx: string;
  let outSlug: string;

  if (mode === "news") {
    const story = await getTavilyStory();
    const groundingContext = story
      ? `\nGround this post in:\nTitle: ${story.title}\nURL: ${story.url}\nContent: ${story.content?.slice(0, 400)}`
      : "";

    if (story) console.log(`News grounding: "${story.title}"`);

    const today = new Date().toISOString().split("T")[0];
    const recentCoverageContext = buildRecentCoverageContext(recentPosts);
    const createTopic = async (retryReason = "") => withRetry(() => openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [{
        role: "user",
        content: `Today is ${today}. Suggest a blog post title, 1-2 sentence summary, and URL slug for Windrose AI (publication about the agentic web).${groundingContext}

Recent coverage to avoid overlapping with:
${recentCoverageContext}

Avoid topics that overlap with recent posts in core subject, angle, or conclusion.
If a topic is similar, choose a different angle or subtopic.
Avoid repeating recent coverage. If a similar topic was recently published, choose a narrower, more specific, or different angle.
Prefer topics framed around specific incidents, tools, failure modes, or defenses rather than broad claims like "AI attacks are increasing."${retryReason ? `\nPrevious suggestion was too similar to recent coverage: ${retryReason}\nChoose a meaningfully different angle this time.` : ""}

Return JSON: {"title": "...", "summary": "...", "slug": "..."}`
      }],
      response_format: { type: "json_object" },
    }));

    let topicResponse = await createTopic();

    if (topicResponse.choices[0].finish_reason === "length") {
      console.warn("  WARNING: output was truncated (finish_reason=length)");
    }

    let topic = JSON.parse(topicResponse.choices[0].message.content!) as { title: string; summary: string; slug: string };
    if (isTopicTooSimilar(topic, recentPosts)) {
      console.warn("  WARNING: topic too similar to recent coverage, regenerating once");
      topicResponse = await createTopic(`${topic.title} — ${topic.summary}`);
      topic = JSON.parse(topicResponse.choices[0].message.content!) as { title: string; summary: string; slug: string };
    }
    outSlug = topic.slug || `${today}-${topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

    mdx = await generatePost({
      title: topic.title,
      angle: topic.summary,
      slug: outSlug,
      category: "news",
      audience: ["developers", "founders"],
      affiliatePolicy: resolveAffiliatePolicy({
        explicitAffiliate: hasAffiliateLinks,
        affiliatePrograms,
      }),
      postTaxonomy: resolvePostTaxonomy({
        mode,
        explicitPostType: postType,
        explicitCommercial: commercialIntent,
      }),
      existingSlugs,
      groundingContext,
    });
  } else {
    // Evergreen: pull highest-priority unwritten item from queue
    if (!fs.existsSync(QUEUE_PATH)) {
      console.error("No content queue at", QUEUE_PATH);
      process.exit(1);
    }
    const queue: QueueItem[] = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
    const next = pickQueueItem(queue, existingSlugs, recentPosts);

    if (!next) {
      console.log("Queue exhausted — no evergreen posts to generate.");
      process.exit(0);
    }

    console.log(`Queue item: "${next.title}"`);
    outSlug = next.slug;

    mdx = await generatePost({
      title: next.title,
      angle: next.angle,
      slug: next.slug,
      category: next.category,
      audience: next.audience,
      affiliatePolicy: resolveAffiliatePolicy({
        explicitAffiliate:
          hasAffiliateLinks || next.hasAffiliateLinks === true || next.monetizationIntent === "affiliate",
        affiliatePrograms: affiliatePrograms.length > 0 ? affiliatePrograms : next.affiliatePrograms,
      }),
      postTaxonomy: resolvePostTaxonomy({
        mode,
        explicitPostType: postType,
        queuePostType: next.postType,
        explicitCommercial: commercialIntent,
        queueCommercialIntent: next.commercialIntent === true,
      }),
      existingSlugs,
      groundingContext: "",
    });
  }

  // Reject output that is empty, missing frontmatter, too short to be a real
  // post, or contains tell-tale signs the critique pass got confused
  // (e.g. "Post to review" as the title, or the model asking for input).
  const suspiciousPhrases = [
    "post to review",
    "please paste",
    "paste the full",
    "i'm missing",
    "rewrite just that section",
  ];
  const isSuspicious = suspiciousPhrases.some((p) =>
    mdx?.toLowerCase().includes(p)
  );
  if (!mdx || !mdx.startsWith("---") || mdx.length < 1500 || isSuspicious) {
    console.error(
      `Skipping write — output failed quality check (${mdx?.length ?? 0} chars, suspicious=${isSuspicious})`
    );
    process.exit(1);
  }

  // Detect unquoted YAML scalar values containing ': ' (colon-space) — a
  // common cause of js-yaml parse failures (e.g. title: Foo: Bar).
  // Pattern: key followed by unquoted value (no leading " ' [ { | >) that
  // contains ': ' inside it.
  const fmMatch = mdx.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const badLine = fmMatch[1].split("\n").find((line) => {
      const m = line.match(/^[a-z_][\w-]*:\s+([^"'\[{|>\s].*)$/);
      return m && /:\s/.test(m[1]);
    });
    if (badLine) {
      console.error(`Skipping write — unquoted YAML value with colon: ${badLine.trim()}`);
      process.exit(1);
    }
  }

  const outPath = path.join(BLOG_DIR, `${outSlug}.mdx`);
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.writeFileSync(outPath, mdx, "utf-8");
  console.log(`Written: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
