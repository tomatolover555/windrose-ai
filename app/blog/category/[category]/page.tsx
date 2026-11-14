import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/app/blog/_components/blog-index";
import { categoryLabel, listCategories, postsForCategory } from "@/lib/blog";
import { site } from "@/lib/site";

type Params = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return listCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const match = listCategories().find((item) => item.slug === category);
  if (!match) {
    return { title: `Category unavailable — ${site.name}`, robots: { index: false, follow: true } };
  }
  const description = `${match.label} posts from ${site.name} on the agentic web and agent commerce.`;
  const url = `${site.url}/blog/category/${match.slug}`;
  return {
    title: `${match.label} — ${site.name}`,
    description,
    alternates: { canonical: url },
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

export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  const match = listCategories().find((item) => item.slug === category);
  if (!match) notFound();
  const posts = postsForCategory(match.slug);
  if (posts.length === 0) notFound();

  return (
    <BlogIndex
      posts={posts}
      currentPage={1}
      totalPages={1}
      activeCategory={match.slug}
      title={categoryLabel(match.slug)}
      lede={`${posts.length} ${posts.length === 1 ? "post" : "posts"} filed under ${categoryLabel(match.slug)}.`}
    />
  );
}
