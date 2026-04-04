import { MetadataRoute } from "next";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getAllPostSlugs();

  const postEntries: MetadataRoute.Sitemap = slugs
    .map((slug) => {
      const post = getPostBySlug(slug);
      if (!post) return null;
      return {
        url: `https://windrose-ai.com/blog/${slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  return [
    {
      url: "https://windrose-ai.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://windrose-ai.com/blog",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...postEntries,
  ];
}
