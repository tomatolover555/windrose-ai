import type { AnchorHTMLAttributes } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { AffiliateLinks, PostAffiliateDisclosure } from "@/app/blog/_components/affiliate-links";
import { Breadcrumbs } from "@/app/blog/_components/breadcrumbs";
import { JsonLd } from "@/app/blog/_components/json-ld";
import { AFFILIATE_LINK_REL, affiliateLinksForPost, isAffiliateUrl } from "@/lib/affiliates";
import {
  categoryLabel,
  categoryPath,
  formatPostDate,
  getAllPostSlugs,
  getPostBySlug,
  getRelatedPosts,
  tagPath,
} from "@/lib/blog";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { author } from "@/lib/site";

function MarkdownLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const href = typeof props.href === "string" ? props.href : "";
  const sponsored = isAffiliateUrl(href);
  const external = href.startsWith("http://") || href.startsWith("https://");
  const rel = sponsored ? AFFILIATE_LINK_REL : external ? "noopener noreferrer" : props.rel;

  return <a {...props} rel={rel} />;
}

const mdxComponents = { a: MarkdownLink };

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {
      title: "Post unavailable — Windrose AI",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `${post.title} — Windrose AI`,
    description: post.summary,
    authors: [{ name: author.name, url: "/blog/about" }],
    alternates: { canonical: post.canonical },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      url: post.canonical,
      publishedTime: new Date(post.date).toISOString(),
      modifiedTime: new Date(post.updated || post.date).toISOString(),
      siteName: "Windrose AI",
      tags: post.tags,
      section: categoryLabel(post.category),
      authors: [author.name],
      images: [{ url: post.ogImage, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: [post.ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(post);
  const programs = affiliateLinksForPost(post);
  const category = categoryLabel(post.category);
  const crumbs = [
    { name: "Blog", path: "/blog" },
    { name: category, path: categoryPath(post.category) },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <article>
      <JsonLd data={articleJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs.map((crumb) => ({ name: crumb.name, href: crumb.path }))} />

      <p className="blog-kicker" style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.7rem", marginBottom: "0.9rem" }}>
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        <span>{post.reading_time_minutes} min read</span>
        <Link href={categoryPath(post.category)} style={{ color: "#1b3a6b" }}>
          {category}
        </Link>
        <Link href="/blog/about" rel="author" style={{ color: "#1b3a6b" }}>
          {author.name}
        </Link>
        <Link href={post.agent_url} title="Agent-readable markdown" style={{ color: "#6b7f96" }}>
          For AI agents
        </Link>
      </p>

      <h1 className="blog-title">{post.title}</h1>
      <p className="blog-lede">{post.summary}</p>

      {programs.length > 0 ? <PostAffiliateDisclosure /> : null}
      <AffiliateLinks programs={programs} />

      <div className="prose prose-windrose max-w-none">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>

      {(post.tags ?? []).length > 0 ? (
        <nav aria-label="Tags" className="blog-nav" style={{ marginTop: "2.25rem" }}>
          {post.tags.map((tag) =>
            typeof tag === "string" ? (
              <Link key={tag} href={tagPath(tag)} className="blog-chip">
                {tag}
              </Link>
            ) : null
          )}
        </nav>
      ) : null}

      {relatedPosts.length > 0 ? (
        <section style={{ marginTop: "1.5rem" }} aria-labelledby="related-posts">
          <h2 id="related-posts" className="blog-post-title">
            Related posts
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            {relatedPosts.map((related) => (
              <li key={related.slug} style={{ marginBottom: "0.45rem" }}>
                <Link href={`/blog/${related.slug}`}>{related.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/blog">← All posts</Link>
      </p>
    </article>
  );
}
