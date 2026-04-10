import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { BlogIndex } from "@/app/blog/_components/blog-index";

const PAGE_SIZE = 10;

export const metadata: Metadata = {
  title: "Blog — Windrose AI",
  description: "Writing about the agentic web, agent commerce, and autonomous payments.",
  alternates: {
    canonical: "https://windrose-ai.com/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const paginatedPosts = posts.slice(0, PAGE_SIZE);

  return <BlogIndex posts={paginatedPosts} currentPage={1} totalPages={totalPages} />;
}
