import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from '@/seo/site';

type SeoBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function SeoBreadcrumbs({ items }: SeoBreadcrumbsProps) {
  if (items.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-outline-variant/40 bg-surface-container/50"
    >
      <ol className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3 text-sm text-on-surface-variant sm:px-6">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center gap-1">
              {index > 0 && (
                <span className="material-symbols-outlined text-base text-outline">
                  chevron_right
                </span>
              )}
              {isLast ? (
                <span className="font-medium text-on-surface" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link to={item.path} className="hover:text-primary hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
