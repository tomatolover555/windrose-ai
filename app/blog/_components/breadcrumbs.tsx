import Link from "next/link";

export type BreadcrumbItem = { name: string; href: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const current = items[items.length - 1];
  const omitCurrent = Boolean(current && current.name.length > 42);
  const visible = omitCurrent ? items.slice(0, -1) : items;

  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {visible.map((item, index) => {
          const last = index === visible.length - 1;
          return (
            <li key={item.href}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {last && !omitCurrent ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.href}>{item.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
      {omitCurrent && current ? <span className="sr-only">{current.name}</span> : null}
    </nav>
  );
}
