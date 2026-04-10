import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts } from "@/lib/blog";
import { BlogIndex } from "@/app/blog/_components/blog-index";

const PAGE_SIZE = 10;

type Params = {
  params: Promise<{ page: string }>;
};

function parsePage(value: string): number | null {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 2) return null;
  return page;
}

function totalPagesFor(totalPosts: number): number {
  return Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
}

export async function generateStaticParams() {
  const totalPages = totalPagesFor(getAllPosts().length);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page: pageParam } = await params;
  const currentPage = parsePage(pageParam);

  if (!currentPage) {
    return {
      title: "Page unavailable — Windrose AI",
      robots: { index: false, follow: true },
    };
  }

  const totalPages = totalPagesFor(getAllPosts().length);
  if (currentPage > totalPages) {
    return {
      title: "Page unavailable — Windrose AI",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `Blog — Page ${currentPage} — Windrose AI`,
    description: "Writing about the agentic web, agent commerce, and autonomous payments.",
    alternates: {
      canonical: `https://windrose-ai.com/blog/page/${currentPage}`,
    },
  };
}

export default async function PaginatedBlogIndexPage({ params }: Params) {
  const { page: pageParam } = await params;
  const currentPage = parsePage(pageParam);
  if (!currentPage) notFound();

  const posts = getAllPosts();
  const totalPages = totalPagesFor(posts.length);
  if (currentPage > totalPages) notFound();

  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedPosts = posts.slice(start, start + PAGE_SIZE);
  if (paginatedPosts.length === 0) notFound();

  return <BlogIndex posts={paginatedPosts} currentPage={currentPage} totalPages={totalPages} />;
}
