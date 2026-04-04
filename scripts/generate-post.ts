import fs from "fs";
import path from "path";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const QUEUE_PATH = path.join(process.cwd(), "content/content-queue.json");
const BLOG_DIR = path.join(process.cwd(), "content/blog");
const AFFILIATES_PATH = path.join(process.cwd(), "content/affiliates.json");

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
};

type AffiliateProgram = {
  id: string;
  name: string;
  url: string;
  context_tags: string[];
  disclosure: string;
};

function getExistingPosts(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith(".mdx") || f.endsWith(".md"))
    .map(f => f.replace(/\.(mdx|md)$/, ""));
}

function getRelevantAffiliates(content: string, affiliates: AffiliateProgram[]) {
  return affiliates.filter(a =>
    a.context_tags.some(tag => content.toLowerCase().includes(tag.toLowerCase()))
  );
}

async function generatePost(item: QueueItem, existingSlugs: string[]): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  const affiliates: { programs: AffiliateProgram[] } = JSON.parse(
    fs.readFileSync(AFFILIATES_PATH, "utf-8")
  );

  const existingCoverage = existingSlugs.join(", ") || "none yet";

  const systemPrompt = `You are a skilled technology writer for Windrose AI, a publication about the agentic web.
Write clearly, accurately, and engagingly. Avoid hype and buzzwords.
The blog serves both human readers (developers, founders, general public) and AI agents.
Each post must include an agent_context frontmatter block with structured key claims, tools mentioned, recommended actions, and related posts.`;

  const userPrompt = `Write a complete MDX blog post with the following brief:

Title: ${item.title}
Slug: ${item.slug}
Angle: ${item.angle}
Avoid: ${item.avoid}
Target keyword: ${item.target_keyword}
Category: ${item.category}
Audience: ${item.audience.join(", ")}

Already covered (don't repeat): ${existingCoverage}

Available affiliate programs (only mention if genuinely relevant):
${affiliates.programs.map(a => `- ${a.name}: ${a.context_tags.join(", ")}`).join("\n")}

Output ONLY the complete MDX file starting with --- frontmatter. Include:
1. Full frontmatter (title, slug, date as ${new Date().toISOString().split("T")[0]}, updated, summary, tags, category, audience, affiliate_links, agent_context)
2. agent_context block with: key_claims (3-5 factual claims), tools_mentioned (with name/role/url), recommended_actions (actionable steps), related (2-3 related post .md URLs from /blog/)
3. Post body — well-structured with clear headings, 600-1000 words
Do not include any text before the opening --- or after the final content.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://windrose-ai.com",
      "X-Title": "Windrose AI Blog Generator",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(QUEUE_PATH)) {
    console.error("No content queue found at", QUEUE_PATH);
    process.exit(1);
  }

  const queue: QueueItem[] = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
  const existingSlugs = getExistingPosts();

  // Pick highest-priority item not yet published
  const next = queue
    .filter(item => !existingSlugs.includes(item.slug))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!next) {
    console.log("Queue exhausted — no new posts to generate.");
    process.exit(0);
  }

  console.log(`Generating: "${next.title}" (${next.slug})`);

  if (dryRun) {
    console.log("Dry run — skipping generation.");
    process.exit(0);
  }

  const mdx = await generatePost(next, existingSlugs);

  const outPath = path.join(BLOG_DIR, `${next.slug}.mdx`);
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.writeFileSync(outPath, mdx, "utf-8");

  console.log(`Written to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
