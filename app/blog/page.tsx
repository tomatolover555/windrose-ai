import type { Metadata } from "next";
import { getAllPosts, BLOG_PAGE_SIZE } from "@/lib/blog";
import { BlogIndex } from "@/app/blog/_components/blog-index";
import { site } from "@/lib/site";

const description = "Writing about the agentic web, agent commerce, and autonomous payments.";

export const metadata: Metadata = {
  title: `Blog — ${site.name}`,
  description,
  alternates: {
    canonical: `${site.url}/blog`,
  },
  openGraph: {
    title: "Blog",
    description,
    url: `${site.url}/blog`,
    siteName: site.name,
    type: "website",
    images: [{ url: site.ogImage, alt: site.name }],
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / BLOG_PAGE_SIZE));
  const paginatedPosts = posts.slice(0, BLOG_PAGE_SIZE);

  return <BlogIndex posts={paginatedPosts} currentPage={1} totalPages={totalPages} />;
}
