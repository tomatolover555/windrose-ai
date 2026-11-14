import Link from "next/link";

export type BreadcrumbItem = { name: string; href: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const current = items[items.length - 1];
  const omitCurrent = Boolean(current && current.name.length > 42);
  const visible = omitCurrent ? items.slice(0, -1) : items;

  return (
    <nav aria-label="Breadcrumb" className="blog-kicker" style={{ marginBottom: "1rem" }}>
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.35rem 0.5rem",
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {visible.map((item, index) => {
          const last = index === visible.length - 1;
          return (
            <li key={item.href} style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {last && !omitCurrent ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.href} style={{ color: "#1b3a6b", textDecoration: "none" }}>
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {omitCurrent && current ? <span className="sr-only">{current.name}</span> : null}
    </nav>
  );
}
