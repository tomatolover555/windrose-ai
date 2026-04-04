import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BLOG_DIR = path.join(process.cwd(), "content/blog");

async function enrichPost(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");

  const prompt = `You are enriching an existing blog post about the agentic web. You MUST preserve ALL frontmatter exactly as-is — including agent_context YAML blocks, affiliate_links, and all other fields. Only modify the post body. Make four improvements:

1. NAMED EXAMPLES: Replace vague references with specific, real, named tools, projects, companies, protocols, or incidents. Only name real things.

2. KEY TAKEAWAYS: Add a "## Key Takeaways" section as the second-to-last section (before References if it exists, or at the end). 4 specific bullets.

3. REFERENCES: Add a "## References" section as the very last section with 4-5 real external links:
- [Title](URL)

4. SUMMARY: In the frontmatter, rewrite just the "summary:" field to be more specific and hook-driven (1-2 sentences). Leave all other frontmatter fields unchanged.

Return the COMPLETE file starting with ---

File to enrich:

${raw}`;

  console.log(`Enriching: ${path.basename(filePath)}`);

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_completion_tokens: 4000,
  });

  const enriched = response.choices[0].message.content!.trim();
  fs.writeFileSync(filePath + ".bak", raw);
  fs.writeFileSync(filePath, enriched);
  console.log(`  done`);
}

async function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error("No blog directory at", BLOG_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith(".mdx") || f.endsWith(".md"))
    .map(f => path.join(BLOG_DIR, f));

  console.log(`Found ${files.length} posts`);

  for (const file of files) {
    await enrichPost(file);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\nDone! Review posts, then:\n  rm content/blog/*.bak\n  git add content/blog/\n  git commit -m 'content: enrich posts with examples, takeaways, references'");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
