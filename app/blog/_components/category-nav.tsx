import Link from "next/link";
import { listCategories } from "@/lib/blog";

export function CategoryNav({ active = "all" }: { active?: string | null }) {
  const categories = listCategories();

  return (
    <nav aria-label="Categories" className="blog-nav">
      <Link href="/blog" className="blog-chip" aria-current={active === "all" ? "page" : undefined}>
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/blog/category/${category.slug}`}
          className="blog-chip"
          aria-current={active === category.slug ? "page" : undefined}
        >
          {category.label}
          <span className="chip-count">{category.count}</span>
        </Link>
      ))}
    </nav>
  );
}
