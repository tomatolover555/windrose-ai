import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/app/blog/_components/blog-index";
import { listTags, postsForTag } from "@/lib/blog";
import { site } from "@/lib/site";

type Params = { params: Promise<{ tag: string }> };

export function generateStaticParams() {
  return listTags().map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const match = listTags().find((item) => item.slug === tag);
  if (!match) {
    return { title: `Tag unavailable — ${site.name}`, robots: { index: false, follow: true } };
  }
  const description = `Posts tagged ${match.label} on ${site.name}.`;
  const url = `${site.url}/blog/tag/${match.slug}`;
  const thin = match.count < 2;
  return {
    title: `${match.label} — ${site.name}`,
    description,
    alternates: { canonical: url },
    robots: thin ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: match.label,
      description,
      url,
      siteName: site.name,
      type: "website",
      images: [{ url: site.ogImage, alt: site.name }],
    },
  };
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  const match = listTags().find((item) => item.slug === tag);
  if (!match) notFound();
  const posts = postsForTag(match.slug);
  if (posts.length === 0) notFound();

  return (
    <BlogIndex
      posts={posts}
      currentPage={1}
      totalPages={1}
      activeCategory={null}
      title={match.label}
      lede={`${posts.length} ${posts.length === 1 ? "post" : "posts"} tagged ${match.label}.`}
    />
  );
}
