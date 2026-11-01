"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocNavGroup } from "@/lib/docs";

/** 文档站左侧目录：按组列出，当前页用朱砂竖线标出来 */
export default function DocsSidebar({ groups }: { groups: DocNavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="文档目录" className="space-y-7 text-sm">
      {groups.map((g) => (
        <div key={g.id}>
          <p className="meta">{g.label}</p>
          <ul className="mt-2 border-l border-black/10 dark:border-white/10">
            {g.pages.map((p) => {
              const href = "/docs/" + p.slug;
              const active = pathname === href;
              return (
                <li key={p.slug}>
                  <Link
                    href={href}
                    className={
                      "block -ml-px border-l-2 py-1 pl-3 leading-5 transition " +
                      (active
                        ? "border-blue-600 font-medium text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 hover:border-black/20 hover:text-gray-900 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white")
                    }
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
