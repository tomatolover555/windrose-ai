import type { AnchorHTMLAttributes } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { AffiliateLinks, PostAffiliateDisclosure } from "@/app/blog/_components/affiliate-links";
import { Breadcrumbs } from "@/app/blog/_components/breadcrumbs";
import { JsonLd } from "@/app/blog/_components/json-ld";
import { PostCard } from "@/components/post-card";
import { PostCover } from "@/components/post-cover";
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

  const updatedLabel =
    post.updated && post.updated.slice(0, 10) !== post.date.slice(0, 10)
      ? formatPostDate(post.updated)
      : null;

  return (
    <article className="post">
      <JsonLd data={articleJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="page-measure">
        <Breadcrumbs items={crumbs.map((crumb) => ({ name: crumb.name, href: crumb.path }))} />
      </div>

      <div className="post-cover cover-frame">
        <PostCover slug={post.slug} category={post.category} title={post.title} />
      </div>

      <header className="page-measure post-header">
        <p className="meta">
          <Link href={categoryPath(post.category)} className="cat">
            {category}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.reading_time_minutes} min read</span>
        </p>
        <h1>{post.title}</h1>
        <p className="byline">
          By{" "}
          <Link href="/blog/about" rel="author">
            {author.name}
          </Link>
          {updatedLabel ? (
            <>
              {" "}
              · Updated <time dateTime={post.updated}>{updatedLabel}</time>
            </>
          ) : null}
        </p>
        <p className="dek">{post.summary}</p>
        <p className="agent-inline">
          <Link href={post.agent_url} title="Agent-readable markdown">
            For AI agents
          </Link>
        </p>
      </header>

      {programs.length > 0 ? (
        <div className="page-measure">
          <PostAffiliateDisclosure />
          <AffiliateLinks programs={programs} />
        </div>
      ) : null}

      <div className="page-measure post-body prose prose-windrose">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>

      {(post.tags ?? []).length > 0 ? (
        <nav aria-label="Tags" className="blog-nav tag-row page-measure">
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
        <section className="related" aria-labelledby="related-posts">
          <h2 id="related-posts" className="section-title">
            Related posts
          </h2>
          <div className="post-grid">
            {relatedPosts.map((related) => (
              <PostCard key={related.slug} post={related} compact />
            ))}
          </div>
        </section>
      ) : null}

      <p className="page-measure back-link">
        <Link href="/blog">All posts</Link>
      </p>
    </article>
  );
}
