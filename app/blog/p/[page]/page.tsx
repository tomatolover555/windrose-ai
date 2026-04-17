import { notFound, permanentRedirect } from "next/navigation";

type Params = {
  params: Promise<{ page: string }>;
};

function parsePage(value: string): number | null {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 2) return null;
  return page;
}

export default async function PaginatedBlogIndexPage({ params }: Params) {
  const { page: pageParam } = await params;
  const currentPage = parsePage(pageParam);
  if (!currentPage) notFound();
  permanentRedirect(`/blog/page/${currentPage}`);
}
