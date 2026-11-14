import { MetadataRoute } from "next";
import { getAllPosts, listCategories, listTags } from "@/lib/blog";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latest = posts[0] ? new Date(posts[0].updated || posts[0].date) : undefined;

  const staticPages: MetadataRoute.Sitemap = (
    [
      { path: "", priority: 1, changeFrequency: "weekly" },
      { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
      { path: "/blog/about", priority: 0.4, changeFrequency: "yearly" },
      { path: "/blog/contact", priority: 0.3, changeFrequency: "yearly" },
      { path: "/blog/privacy", priority: 0.3, changeFrequency: "yearly" },
      { path: "/blog/affiliate-disclosure", priority: 0.4, changeFrequency: "yearly" },
    ] as const
  ).map((page) => ({
    url: `${site.url}${page.path || "/"}`,
    lastModified: latest,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const categories: MetadataRoute.Sitemap = listCategories().map((category) => ({
    url: `${site.url}/blog/category/${category.slug}`,
    lastModified: latest,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const tags: MetadataRoute.Sitemap = listTags()
    .filter((tag) => tag.count >= 2)
    .map((tag) => ({
      url: `${site.url}/blog/tag/${tag.slug}`,
      lastModified: latest,
      changeFrequency: "weekly",
      priority: 0.4,
    }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.updated || post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...categories, ...tags, ...postEntries];
}
