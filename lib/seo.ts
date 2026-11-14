import { categoryLabel, type Post } from "@/lib/blog";
import { author, site } from "@/lib/site";

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}

export function articleJsonLd(post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    mainEntityOfPage: post.canonical,
    image: [post.ogImage],
    articleSection: categoryLabel(post.category),
    keywords: (post.tags ?? []).join(", "),
    url: post.canonical,
    author: {
      "@type": "Person",
      name: author.name,
      description: author.bio,
      url: `${site.url}/blog/about`,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: site.ogImage,
      },
    },
  };
}

export function webPageJsonLd(input: { title: string; description: string; path: string; type?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "WebPage",
    name: input.title,
    description: input.description,
    url: `${site.url}${input.path}`,
    isPartOf: {
      "@type": "Blog",
      name: site.name,
      url: `${site.url}/blog`,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
  };
}
