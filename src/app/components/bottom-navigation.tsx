"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const hiddenPrefixes = ["/login", "/auth", "/onboarding", "/admin"];

export function BottomNavigation() {
  const pathname = usePathname();
  const hidden =
    hiddenPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.endsWith("/write") ||
    pathname.endsWith("/edit");

  if (hidden) return null;

  const items = [
    {
      href: "/",
      label: "홈",
      active:
        pathname === "/" ||
        pathname.startsWith("/clubs/") ||
        pathname.startsWith("/posts/"),
      icon: <HomeIcon />,
    },
    {
      href: "/proposals",
      label: "제안",
      active: pathname.startsWith("/proposals"),
      icon: <PlusIcon />,
    },
    {
      href: "/my",
      label: "나의 글",
      active: pathname.startsWith("/my"),
      icon: <PersonIcon />,
    },
  ];

  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      <div className="bottom-navigation-inner">
        {items.map((item) => (
          <Link
            className={item.active ? "bottom-nav-item active" : "bottom-nav-item"}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            key={item.href}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 10.7 12 3.8l8.5 6.9v8.1a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7Z" />
      <path d="M9.2 20.5v-6.2h5.6v6.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.2 20c.5-4 2.8-6.2 6.8-6.2s6.3 2.2 6.8 6.2Z" />
    </svg>
  );
}
