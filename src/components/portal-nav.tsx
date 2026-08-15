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
    // <-- CHANGED: Added flex-nowrap and hidden scrollbars for clean mobile horizontal scrolling if needed
    <nav className="flex items-center gap-1.5 overflow-x-auto shrink-0 py-1" aria-label="Portal navigation">
      {navItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link 
            key={item.href} 
            href={item.href}
            // <-- CHANGED: Adjusted compact padding and text sizes (px-2.5 py-1 text-xs sm:text-sm) for perfect mobile fit
            className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all shrink-0 ${
              isActive 
                ? "bg-blue-600 text-white shadow-xs" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}