"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Inbox,
  Mail,
  MessageSquare,
  Headphones,
  Star,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/product-requests", label: "Product Requests", icon: Inbox },
  { href: "/dashboard/newsletter", label: "Newsletter", icon: Mail },
  { href: "/dashboard/contact", label: "Contact Us", icon: MessageSquare },
  { href: "/dashboard/support", label: "Support", icon: Headphones },
  { href: "/dashboard/feedback", label: "Feedback", icon: Star },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {nav.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/15 text-primary"
                : "text-foreground/80 hover:bg-accent hover:text-primary"
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
