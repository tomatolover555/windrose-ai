import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import bundledPosts from "@/lib/generated/blog-posts.json";
import { POST_REDIRECTS } from "@/lib/redirects";
import { site } from "@/lib/site";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const BUNDLED_POSTS = bundledPosts as Record<string, string>;
const SITE_URL = site.url;
const DEFAULT_OG_IMAGE = site.ogImage;

function blogDirectoryAvailable(): boolean {
  try {
    return fs.existsSync(BLOG_DIR);
  } catch {
    return false;
  }
}

function readPostFromFilesystem(slug: string): string | null {
  try {
    const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
    const mdPath = path.join(BLOG_DIR, `${slug}.md`);
    const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;
    if (!filePath) return null;
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export const BLOG_PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  news: "News",
  explainer: "Explainers",
  "how-to": "How-to",
  analysis: "Analysis",
  general: "General",
};

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
  postType?: string;
  commercialIntent?: boolean;
  eligibleModules?: string[];
  hasAffiliateLinks?: boolean;
  affiliatePrograms?: string[];
  human_url: string;
  agent_url: string;
  canonical: string;
  ogImage: string;
  agent_context: AgentContext;
};

export type Post = PostMeta & {
  content: string;
  rawContent: string;
};

export function getAllPostSlugs(): string[] {
  if (blogDirectoryAvailable()) {
    try {
      const slugs = fs
        .readdirSync(BLOG_DIR)
        .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
        .map((f) => f.replace(/\.(mdx|md)$/, ""));
      return [...new Set(slugs)];
    } catch {
      // Workers expose a broken filesystem; use the build-time bundle.
    }
  }
  return Object.keys(BUNDLED_POSTS);
}

function postFromRaw(slug: string, raw: string): Post | null {
  try {
    const { data, content } = matter(raw);
    const rt = readingTime(content);
    const dateValue =
      data.date instanceof Date
        ? data.date.toISOString()
        : typeof data.date === "string"
          ? new Date(data.date).toISOString()
          : new Date().toISOString();
    const updatedValue =
      data.updated instanceof Date
        ? data.updated.toISOString()
        : typeof data.updated === "string"
          ? new Date(data.updated).toISOString()
          : dateValue;
    const affiliatePrograms = Array.isArray(data.affiliatePrograms)
      ? data.affiliatePrograms.filter(
          (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
        )
      : [];
    const postType = typeof data.postType === "string" && data.postType.trim().length > 0 ? data.postType : undefined;
    const commercialIntent = data.commercialIntent === true;
    const eligibleModules = Array.isArray(data.eligibleModules)
      ? data.eligibleModules.filter(
          (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
        )
      : [];
    const affiliateLinks = Array.isArray(data.affiliate_links) ? data.affiliate_links : [];
    const hasAffiliateLinks = data.hasAffiliateLinks === true || affiliateLinks.length > 0;

    // Provide explicit defaults for every field so a malformed post never
    // crashes the build. Arrays default to [] and strings to "".
    return {
      title: data.title ?? "Untitled",
      slug: data.slug ?? slug,
      date: dateValue,
      updated: updatedValue,
      summary: data.summary ?? data.description ?? "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category ?? "general",
      audience: Array.isArray(data.audience) ? data.audience : [],
      affiliate_links: affiliateLinks,
      postType,
      commercialIntent,
      eligibleModules,
      hasAffiliateLinks,
      affiliatePrograms,
      agent_context: data.agent_context ?? null,
      reading_time_minutes: Math.max(1, Math.ceil(rt.minutes)),
      human_url: `/blog/${slug}`,
      agent_url: `/blog/${slug}.md`,
      canonical: `${SITE_URL}/blog/${slug}`,
      ogImage: typeof data.ogImage === "string" && data.ogImage.trim().length > 0 ? data.ogImage : DEFAULT_OG_IMAGE,
      content: content.replace(/^\s*#[^\n]*\n+/, ""),
      rawContent: raw,
    };
  } catch {
    return null;
  }
}

export function getPostBySlug(slug: string): Post | null {
  const raw = blogDirectoryAvailable() ? readPostFromFilesystem(slug) : (BUNDLED_POSTS[slug] ?? null);
  if (raw == null) return null;
  return postFromRaw(slug, raw);
}

let postCache: Post[] | null = null;

export function getAllPosts(): Post[] {
  if (postCache) return postCache;
  postCache = getAllPostSlugs()
    .map(getPostBySlug)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return postCache;
}

export function slugifyTerm(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryLabel(category: string): string {
  const slug = slugifyTerm(category || "general");
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function categoryPath(category: string): string {
  return `/blog/category/${slugifyTerm(category || "general")}`;
}

export function tagPath(tag: string): string {
  return `/blog/tag/${slugifyTerm(tag)}`;
}

export function formatPostDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function normalizePostSlug(value: string): string {
  let slug = value.trim();
  slug = slug.replace(/^https?:\/\/(?:www\.)?windrose-ai\.com/i, "");
  slug = slug.replace(/^\/blog\//, "");
  slug = slug.replace(/\.(mdx|md|json)$/i, "");
  slug = slug.split(/[?#]/)[0].replace(/\/$/, "");
  if (!slug || slug.includes("/")) return "";
  return POST_REDIRECTS[slug] ?? slug;
}

export type TermArchive = { slug: string; label: string; count: number };

export function listCategories(): TermArchive[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    const slug = slugifyTerm(post.category || "general");
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: categoryLabel(slug), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function listTags(): TermArchive[] {
  const groups = new Map<string, Map<string, number>>();
  for (const post of getAllPosts()) {
    const seen = new Set<string>();
    for (const tag of post.tags ?? []) {
      if (typeof tag !== "string") continue;
      const slug = slugifyTerm(tag);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const labels = groups.get(slug) ?? new Map<string, number>();
      labels.set(tag, (labels.get(tag) ?? 0) + 1);
      groups.set(slug, labels);
    }
  }

  return [...groups.entries()]
    .map(([slug, labels]) => {
      const label = [...labels.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      const count = [...labels.values()].reduce((sum, value) => sum + value, 0);
      return { slug, label, count };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function postsForCategory(slug: string): Post[] {
  return getAllPosts().filter((post) => slugifyTerm(post.category || "general") === slug);
}

export function postsForTag(slug: string): Post[] {
  return getAllPosts().filter((post) =>
    (post.tags ?? []).some((tag) => typeof tag === "string" && slugifyTerm(tag) === slug)
  );
}

export function getRelatedPosts(post: Post, limit = 3): Post[] {
  const used = new Set<string>([post.slug]);
  const explicit: Post[] = [];

  for (const raw of post.agent_context?.related ?? []) {
    if (typeof raw !== "string") continue;
    const slug = normalizePostSlug(raw);
    if (!slug || used.has(slug)) continue;
    const related = getPostBySlug(slug);
    if (!related) continue;
    used.add(related.slug);
    explicit.push(related);
  }

  if (explicit.length >= limit) return explicit.slice(0, limit);

  const tags = new Set(
    (post.tags ?? []).filter((tag): tag is string => typeof tag === "string").map((tag) => slugifyTerm(tag))
  );
  const category = slugifyTerm(post.category || "general");
  const scored = getAllPosts()
    .filter((candidate) => !used.has(candidate.slug))
    .map((candidate) => {
      const overlap = (candidate.tags ?? []).reduce((count, tag) => {
        if (typeof tag !== "string") return count;
        return count + (tags.has(slugifyTerm(tag)) ? 1 : 0);
      }, 0);
      const sameCategory = slugifyTerm(candidate.category || "general") === category ? 0.25 : 0;
      return { candidate, score: overlap + sameCategory };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || new Date(b.candidate.date).getTime() - new Date(a.candidate.date).getTime()
    );

  return [...explicit, ...scored.map((item) => item.candidate)].slice(0, limit);
}
