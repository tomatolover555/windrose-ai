import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export type AffiliateLink = {
  label: string;
  url: string;
  context: string;
};

export type AgentContext = {
  key_claims: string[];
  tools_mentioned: { name: string; role: string; url: string }[];
  recommended_actions: string[];
  related: string[];
};

export type PostMeta = {
  title: string;
  slug: string;
  date: string;
  updated: string;
  summary: string;
  tags: string[];
  category: string;
  audience: string[];
  reading_time_minutes: number;
  affiliate_links: AffiliateLink[];
  human_url: string;
  agent_url: string;
  canonical: string;
  agent_context: AgentContext;
};

export type Post = PostMeta & {
  content: string;
  rawContent: string;
};

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.(mdx|md)$/, ""));
  return [...new Set(slugs)];
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
    const mdPath = path.join(BLOG_DIR, `${slug}.md`);
    const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;

    if (!filePath) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const rt = readingTime(content);

    return {
      ...(data as PostMeta),
      reading_time_minutes: Math.ceil(rt.minutes),
      human_url: `/blog/${slug}`,
      agent_url: `/blog/${slug}.md`,
      canonical: `https://windrose-ai.com/blog/${slug}`,
      content,
      rawContent: raw,
    };
  } catch {
    return null;
  }
}

export function getAllPosts(): Post[] {
  return getAllPostSlugs()
    .map(getPostBySlug)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
