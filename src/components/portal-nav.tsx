"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/add-data", label: "Add Data" },
  { href: "/events", label: "Events" }
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-actions" aria-label="Portal navigation">
      {navItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link className={`nav-btn ${isActive ? "active" : ""}`} href={item.href} key={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
