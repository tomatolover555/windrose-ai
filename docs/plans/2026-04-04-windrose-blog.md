# Windrose Blog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dual-audience blog at `/blog/` — elegant UI for humans, structured markdown for AI agents — with an automated content generation pipeline.

**Architecture:** MDX files in `content/blog/` serve as the git-native CMS. Next.js renders human pages at `/blog/[slug]` and serves raw markdown at `/blog/[slug].md`. GitHub Actions cron runs 2-3x/week, calls OpenRouter API to generate posts, opens PRs during Phase 1 (human review), commits directly in Phase 2 (autonomous). Typography-first design, no hero images, affiliate links auto-injected from a registry.

**Tech Stack:** Next.js 16 App Router, TypeScript, gray-matter (frontmatter), next-mdx-remote (MDX rendering), Tailwind CSS + @tailwindcss/typography (styling), OpenRouter API (content generation), GitHub Actions (automation).

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install blog dependencies**

```bash
cd /Users/ziv.koren/windrose-ai
npm install gray-matter next-mdx-remote reading-time
npm install -D tailwindcss @tailwindcss/typography postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Verify install**

```bash
cat package.json | grep -E "gray-matter|next-mdx|reading-time|tailwindcss"
```
Expected: all four packages appear.

**Step 3: Configure Tailwind**

Replace `tailwind.config.js` content:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
};
```

**Step 4: Update `app/globals.css`**

Replace contents:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
```

**Step 5: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js app/globals.css
git commit -m "feat(blog): install tailwind, gray-matter, next-mdx-remote"
```

---

## Task 2: Content directory structure

**Files:**
- Create: `content/blog/.gitkeep`
- Create: `content/content-queue.json`
- Create: `content/affiliates.json`

**Step 1: Create directories and files**

```bash
mkdir -p /Users/ziv.koren/windrose-ai/content/blog
```

Create `content/content-queue.json`:
```json
[
  {
    "id": "q001",
    "title": "What Is the Agentic Web? A Plain-Language Guide",
    "slug": "what-is-the-agentic-web",
    "angle": "Explain the agentic web to a smart non-technical reader. Define it clearly, give 3 concrete examples of agents buying or doing things autonomously, and explain why this matters now.",
    "avoid": "Do not use jargon without defining it. Do not just list AI company names.",
    "target_keyword": "agentic web explained",
    "category": "explainer",
    "audience": ["general", "founders"],
    "priority": 1
  },
  {
    "id": "q002",
    "title": "How to Make Your Online Store Agent-Accessible",
    "slug": "how-to-make-your-store-agent-accessible",
    "angle": "Practical step-by-step guide for developers. Cover: structured discovery endpoints, machine-readable product data, agent authentication, and the x402 payment standard.",
    "avoid": "Do not be vague. Every step should be actionable.",
    "target_keyword": "agent-accessible online store",
    "category": "how-to",
    "audience": ["developers"],
    "priority": 2
  },
  {
    "id": "q003",
    "title": "x402: The Payment Standard Built for AI Agents",
    "slug": "x402-payment-standard-for-ai-agents",
    "angle": "Explain x402 protocol clearly: what problem it solves, how the 402/PAYMENT-REQUIRED/PAYMENT-SIGNATURE flow works, and why it matters for autonomous agent commerce. Include a simple code example.",
    "avoid": "Do not assume reader knows HTTP deeply. Explain the flow from scratch.",
    "target_keyword": "x402 payment protocol agents",
    "category": "explainer",
    "audience": ["developers", "founders"],
    "priority": 3
  }
]
```

Create `content/affiliates.json`:
```json
{
  "version": "1",
  "programs": [
    {
      "id": "vercel",
      "name": "Vercel",
      "url": "https://vercel.com/referral/windrose",
      "context_tags": ["hosting", "deployment", "nextjs"],
      "disclosure": "affiliate"
    },
    {
      "id": "printful",
      "name": "Printful",
      "url": "https://www.printful.com/a/windrose",
      "context_tags": ["fulfillment", "print-on-demand", "ecommerce"],
      "disclosure": "affiliate"
    },
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "url": "https://openrouter.ai/?ref=windrose",
      "context_tags": ["llm", "ai-api", "content-generation"],
      "disclosure": "affiliate"
    }
  ]
}
```

**Note:** Replace affiliate URLs with real affiliate links when you join those programs.

**Step 2: Commit**

```bash
git add content/
git commit -m "feat(blog): add content directory, queue, and affiliates registry"
```

---

## Task 3: Blog utilities (lib/blog.ts)

**Files:**
- Create: `lib/blog.ts`

**Step 1: Create the blog utility**

Create `lib/blog.ts`:
```typescript
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

function slugToFilename(slug: string) {
  return `${slug}.mdx`;
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.(mdx|md)$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
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
}

export function getAllPosts(): Post[] {
  return getAllPostSlugs()
    .map(getPostBySlug)
    .filter((p): p is Post => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/ziv.koren/windrose-ai && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to `lib/blog.ts`.

**Step 3: Commit**

```bash
git add lib/blog.ts
git commit -m "feat(blog): add blog utility for reading MDX posts"
```

---

## Task 4: First sample post

**Files:**
- Create: `content/blog/what-is-the-agentic-web.mdx`

**Step 1: Create the sample post**

Create `content/blog/what-is-the-agentic-web.mdx`:
```mdx
---
title: "What Is the Agentic Web? A Plain-Language Guide"
slug: what-is-the-agentic-web
date: "2026-04-10"
updated: "2026-04-10"
summary: "AI agents are starting to browse, buy, and act on the web autonomously. Here's what the agentic web means, why it's happening now, and what it changes."
tags: [agentic-web, explainer, ai-agents]
category: explainer
audience: [general, founders]
affiliate_links: []
agent_context:
  key_claims:
    - "The agentic web refers to AI agents autonomously performing tasks on the web on behalf of humans"
    - "Agents need machine-readable interfaces because they cannot interpret visual UI the way humans do"
    - "x402 is an emerging HTTP payment standard designed for agent-to-machine payments"
  tools_mentioned:
    - name: "x402 Protocol"
      role: "payment standard for autonomous agent transactions"
      url: "https://x402.org"
  recommended_actions:
    - "Expose machine-readable discovery endpoints on your web products"
    - "Read the x402 specification if building payment-enabled agent surfaces"
  related:
    - "/blog/x402-payment-standard-for-ai-agents.md"
    - "/blog/how-to-make-your-store-agent-accessible.md"
---

The web was built for human eyes. Pages have layouts, colors, buttons, and menus — all designed to be read and clicked by people. But something is changing.

AI agents are starting to use the web too. Not to look at it — to *act* on it. They browse product catalogs, make purchases, book appointments, and complete tasks autonomously, on behalf of the humans who deployed them.

This is what people mean when they talk about the **agentic web**.

## What is an agent, exactly?

An AI agent is a software program that can take actions in the world — not just generate text, but actually *do things*. It can call APIs, fill out forms, send payments, read responses, and decide what to do next.

Think of it like this: you tell your AI assistant "buy me a black t-shirt that says Keep Going and ship it to my address." You don't specify which store, which size to pick if Medium is sold out, or how to pay. The agent figures that out and handles it, start to finish.

## Why is this happening now?

Three things came together:

1. **LLMs got good enough** to understand natural language instructions and reason about multi-step tasks
2. **Tool use became reliable** — models can now reliably call APIs and handle the responses
3. **Payment infrastructure is emerging** — standards like x402 let agents pay for things autonomously without a human entering a credit card

The technology stack for autonomous agent commerce exists today, even if most of the web hasn't adapted to it yet.

## What does the agentic web look like in practice?

Here are three concrete examples:

**Example 1: Autonomous merchandise purchase**
A fan of a band asks their AI assistant to buy official tour merch as a gift. The agent discovers the store's machine-readable catalog, validates the product design, creates an order intent, and pays using the x402 protocol — all without the human touching a browser.

**Example 2: Automated supply reordering**
A small business's AI system monitors inventory levels and autonomously reorders from suppliers when stock runs low. It compares prices across agent-accessible suppliers, selects the best option, and places the order.

**Example 3: Agent-to-agent commerce**
An AI content creation agent needs stock footage. It discovers a footage marketplace, browses machine-readable listings, pays per clip using a crypto micropayment standard, and downloads the files — no human in the loop.

## Why does this matter for people building on the web?

If your product is only accessible through a visual UI, agents cannot use it. You're invisible to this new category of autonomous buyer.

The stores, services, and platforms that adapt early — by exposing structured machine-readable surfaces, clear APIs, and agent-compatible payment methods — will have a significant advantage as agent usage grows.

That's what this blog is about: what it means to build for the agentic web, and how to do it well.
```

**Step 2: Commit**

```bash
git add content/blog/what-is-the-agentic-web.mdx
git commit -m "feat(blog): add first sample post"
```

---

## Task 5: Blog UI — layout and typography

**Files:**
- Create: `app/blog/layout.tsx`
- Modify: `app/layout.tsx`

**Step 1: Update root layout for Tailwind**

Update `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windrose AI",
  description: "Thinking about the agentic web.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Create blog layout**

Create `app/blog/layout.tsx`:
```tsx
import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Windrose
          </Link>
          <Link href="/blog" className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors">
            Blog
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-2xl mx-auto px-6 py-8 text-sm text-gray-400">
          <p>Windrose AI — thinking about the agentic web.</p>
        </div>
      </footer>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/blog/layout.tsx app/layout.tsx
git commit -m "feat(blog): add blog layout with header and footer"
```

---

## Task 6: Blog index page

**Files:**
- Create: `app/blog/page.tsx`

**Step 1: Create blog index**

Create `app/blog/page.tsx`:
```tsx
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog — Windrose AI",
  description: "Writing about the agentic web, agent commerce, and autonomous payments.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          The Agentic Web
        </h1>
        <p className="text-lg text-gray-500">
          Writing about agent commerce, autonomous payments, and what the web looks like when AI agents become dominant users of it.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-400">No posts yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {posts.map((post) => (
            <article key={post.slug} className="py-8 first:pt-0">
              <div className="flex items-center gap-3 mb-2 text-sm text-gray-400">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span>·</span>
                <span>{post.reading_time_minutes} min read</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-gray-600 transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-gray-500 mb-3 leading-relaxed">{post.summary}</p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/blog/page.tsx
git commit -m "feat(blog): add blog index page"
```

---

## Task 7: Blog post page

**Files:**
- Create: `app/blog/[slug]/page.tsx`

**Step 1: Create post page**

Create `app/blog/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Windrose AI`,
    description: post.summary,
    alternates: { canonical: post.canonical },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4 text-sm text-gray-400">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>·</span>
          <span>{post.reading_time_minutes} min read</span>
          <span>·</span>
          <Link
            href={post.agent_url}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Agent-readable version"
          >
            For AI agents ↗
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">{post.summary}</p>
      </div>

      {/* Content */}
      <div className="prose prose-gray prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {/* Tags */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Affiliate disclosure */}
        {post.affiliate_links.length > 0 && (
          <p className="text-xs text-gray-400">
            This post contains affiliate links. Windrose may earn a commission if you purchase through them.
          </p>
        )}
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← All posts
        </Link>
      </div>
    </article>
  );
}
```

**Step 2: Commit**

```bash
git add app/blog/[slug]/page.tsx
git commit -m "feat(blog): add blog post page with MDX rendering"
```

---

## Task 8: Agent-readable markdown endpoint

**Files:**
- Create: `app/blog/[slug].md/route.ts`

**Step 1: Create the agent endpoint**

Create `app/blog/[slug].md/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  // strip trailing .md if present (Next.js includes it in the slug segment)
  const slug = resolvedParams.slug.replace(/\.md$/, "");
  const post = getPostBySlug(slug);

  if (!post) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(post.rawContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type": "agent-readable-post",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

**Step 2: Test it manually after deploy**

```
curl https://windrose-ai.com/blog/what-is-the-agentic-web.md
```
Expected: raw MDX with frontmatter.

**Step 3: Commit**

```bash
git add "app/blog/[slug].md/route.ts"
git commit -m "feat(blog): add agent-readable markdown endpoint"
```

---

## Task 9: Agent discovery surfaces

**Files:**
- Create: `app/blog/agent.json/route.ts`
- Create: `app/.well-known/agent-blog.json/route.ts`
- Modify: `app/llms.txt/route.ts` (or create if not exists)

**Step 1: Create `/blog/agent.json`**

Create `app/blog/agent.json/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/blog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");

  let posts = getAllPosts();
  if (tag) {
    posts = posts.filter((p) => p.tags.includes(tag));
  }

  const index = {
    version: "1",
    description: "Windrose AI blog — writing about the agentic web, agent commerce, and autonomous payments.",
    agent_instructions: "Fetch individual posts using the agent_url field. Each post includes an agent_context block with key_claims, tools_mentioned, recommended_actions, and related posts.",
    base_url: "https://windrose-ai.com",
    posts: posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      date: p.date,
      summary: p.summary,
      tags: p.tags,
      category: p.category,
      audience: p.audience,
      human_url: `https://windrose-ai.com${p.human_url}`,
      agent_url: `https://windrose-ai.com${p.agent_url}`,
    })),
  };

  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
```

**Step 2: Create `/.well-known/agent-blog.json`**

Create `app/.well-known/agent-blog.json/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const doc = {
    version: "1",
    name: "Windrose AI Blog",
    description: "A publication about the agentic web — agent commerce, autonomous payments, and what the internet looks like when AI agents become dominant users.",
    topics: [
      "agentic-web",
      "agent-commerce",
      "autonomous-payments",
      "x402-protocol",
      "agent-accessible-stores",
      "llm-agents",
    ],
    agent_index: "https://windrose-ai.com/blog/agent.json",
    agent_index_filtered_example: "https://windrose-ai.com/blog/agent.json?tag=autonomous-payments",
    post_format: "markdown-with-frontmatter",
    agent_context_block: true,
    human_base_url: "https://windrose-ai.com/blog",
    contact: "windrose-ai.com",
  };

  return NextResponse.json(doc, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
```

**Step 3: Create or update `/llms.txt`**

Check if `app/llms.txt/route.ts` exists. If not, create it. If it does, add the blog section.

Create `app/llms.txt/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const text = `# Windrose AI

Windrose AI is an experimental platform for the agentic web — exploring how AI agents interact with digital products, commerce, and information.

## Blog

Windrose publishes writing about the agentic web at /blog/.

Topics covered:
- What the agentic web is and why it matters
- How to build stores and products that serve AI agents
- The x402 payment protocol for autonomous agent transactions
- Agent discovery, authentication, and commerce patterns

Agent-readable blog index: https://windrose-ai.com/blog/agent.json
Each post has a machine-readable version at /blog/[slug].md

## Agent API

The Windrose agent API is at /api/agent.
It exposes structured surfaces for agent interaction and discovery.

## Principles

- Machine-readable by default
- Agent-first design
- Structured data over prose where possible
`;

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
```

**Step 4: Update middleware to allow public access to these routes**

Check `middleware.ts`. The matcher only protects `/dashboard`, so these routes are already public. No change needed.

**Step 5: Commit**

```bash
git add app/blog/agent.json/route.ts "app/.well-known/agent-blog.json/route.ts" app/llms.txt/route.ts
git commit -m "feat(blog): add agent discovery surfaces (agent.json, well-known, llms.txt)"
```

---

## Task 10: Content generation script

**Files:**
- Create: `scripts/generate-post.ts`

**Step 1: Create the generation script**

Create `scripts/generate-post.ts`:
```typescript
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
```

**Step 2: Test dry run**

```bash
cd /Users/ziv.koren/windrose-ai
OPENROUTER_API_KEY=test npx tsx scripts/generate-post.ts --dry-run
```
Expected: `Generating: "What Is the Agentic Web?..."` then `Dry run — skipping generation.`

**Step 3: Commit**

```bash
git add scripts/generate-post.ts
git commit -m "feat(blog): add content generation script (OpenRouter)"
```

---

## Task 11: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/generate-post.yml`

**Step 1: Create workflow**

Create `.github/workflows/generate-post.yml`:
```yaml
name: Generate Blog Post

on:
  schedule:
    # Run Mon, Wed, Fri at 09:00 UTC
    - cron: "0 9 * * 1,3,5"
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (skip actual generation)"
        required: false
        default: "false"

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate post
        id: generate
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            npx tsx scripts/generate-post.ts --dry-run
          else
            npx tsx scripts/generate-post.ts
          fi

      - name: Check for new post
        id: check
        run: |
          if git diff --quiet HEAD -- content/blog/; then
            echo "new_post=false" >> $GITHUB_OUTPUT
          else
            echo "new_post=true" >> $GITHUB_OUTPUT
            NEW_FILE=$(git status --short content/blog/ | awk '{print $2}' | head -1)
            echo "new_file=$NEW_FILE" >> $GITHUB_OUTPUT
          fi

      # PHASE 1: Open a PR for human review
      # After Phase 1 is complete, replace this step with the Phase 2 direct commit step below
      - name: Open PR (Phase 1 — human review)
        if: steps.check.outputs.new_post == 'true'
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "feat(blog): auto-generate post"
          branch: "auto/blog-post-${{ github.run_number }}"
          title: "New post: ${{ steps.check.outputs.new_file }}"
          body: |
            Auto-generated blog post. Please review before merging.

            - Check factual accuracy
            - Check agent_context block is useful
            - Check affiliate links are appropriate
            - Merge when satisfied

      # PHASE 2 (uncomment when ready for autonomous operation):
      # - name: Commit and push (Phase 2 — autonomous)
      #   if: steps.check.outputs.new_post == 'true'
      #   run: |
      #     git config user.name "windrose-bot"
      #     git config user.email "bot@windrose-ai.com"
      #     git add content/blog/
      #     git commit -m "feat(blog): auto-generate post"
      #     git push
```

**Step 2: Add OPENROUTER_API_KEY to GitHub secrets**

Go to: `https://github.com/tomatolover555/windrose-ai/settings/secrets/actions`
Add secret: `OPENROUTER_API_KEY` = your OpenRouter API key.

**Step 3: Commit**

```bash
git add .github/workflows/generate-post.yml
git commit -m "feat(blog): add GitHub Actions content generation workflow"
```

---

## Task 12: Update homepage to feature the blog

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update homepage**

Update `app/page.tsx`:
```tsx
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Windrose AI</h1>
        <p className="text-gray-500">
          Exposing structured surfaces for the agentic web.{" "}
          <code className="text-sm bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">
            GET /api/agent
          </code>
        </p>
      </div>

      {recentPosts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Latest writing
            </h2>
            <Link href="/blog" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              All posts →
            </Link>
          </div>
          <div className="space-y-6">
            {recentPosts.map((post) => (
              <div key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-gray-900 font-medium hover:text-gray-600 transition-colors"
                >
                  {post.title}
                </Link>
                <p className="text-sm text-gray-400 mt-0.5">{post.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat(blog): update homepage to feature recent posts"
```

---

## Task 13: Push everything and verify deploy

**Step 1: Push all commits**

```bash
cd /Users/ziv.koren/windrose-ai && git push
```

**Step 2: Verify Vercel deploy**

Watch the deployment at: `https://vercel.com/zivs-projects-f4716c93/agnes-ai` (or check Vercel dashboard for the windrose project).

**Step 3: Smoke test live URLs**

```bash
# Human-facing
curl -I https://windrose-ai.com/blog
curl -I https://windrose-ai.com/blog/what-is-the-agentic-web

# Agent surfaces
curl https://windrose-ai.com/blog/what-is-the-agentic-web.md | head -20
curl https://windrose-ai.com/blog/agent.json | head -30
curl https://windrose-ai.com/.well-known/agent-blog.json
curl https://windrose-ai.com/llms.txt
```

Expected: all return 200. `.md` endpoint returns raw markdown. `agent.json` returns JSON with post listing.

**Step 4: Commit any fixes found during smoke test**

---

## Environment Variables Required

Add these to Vercel for the windrose project (Settings → Environment Variables):

| Variable | Value | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | your key | For content generation script |
| `ADMIN_TOKEN` | existing value | Already set |

Add to GitHub Actions secrets:
- `OPENROUTER_API_KEY` — same key

---

## Phase Transition Checklist (Phase 1 → Phase 2)

Before switching to fully autonomous publishing:

- [ ] At least 10 posts published and reviewed
- [ ] No factual errors found in the last 5 posts
- [ ] `agent_context` blocks are consistently useful
- [ ] Affiliate link injection is working correctly
- [ ] Quality gate pass rate is > 90%
- [ ] Content queue has been self-refilling correctly

To activate Phase 2: uncomment the "Phase 2" step in `.github/workflows/generate-post.yml` and delete the "Phase 1" PR step.
