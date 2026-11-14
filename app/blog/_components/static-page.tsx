import type { ReactNode } from "react";
import { Breadcrumbs } from "@/app/blog/_components/breadcrumbs";
import { JsonLd } from "@/app/blog/_components/json-ld";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";

export function StaticPage({
  title,
  description,
  path,
  pageType = "WebPage",
  children,
}: {
  title: string;
  description: string;
  path: string;
  pageType?: string;
  children: ReactNode;
}) {
  const crumbs = [
    { name: "Blog", path: "/blog" },
    { name: title, path },
  ];

  return (
    <article>
      <JsonLd data={webPageJsonLd({ title, description, path, type: pageType })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs.map((crumb) => ({ name: crumb.name, href: crumb.path }))} />
      <h1 className="blog-title">{title}</h1>
      <div className="prose prose-windrose max-w-none">{children}</div>
    </article>
  );
}
