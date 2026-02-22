import { prisma } from "@/lib/db";
import Link from "next/link";
import { Package, Inbox, Mail, MessageSquare, Headphones, Star, ArrowRight } from "lucide-react";

export default async function DashboardOverview() {
  const [products, productRequests, newsletter, contact, support, feedback] = await Promise.all([
    prisma.product.count(),
    prisma.productRequest.count(),
    prisma.newsletter.count(),
    prisma.contactUs.count(),
    prisma.support.count(),
    prisma.feedback.count(),
  ]);

  const cards = [
    { href: "/dashboard/products", label: "Products", count: products, icon: Package },
    { href: "/dashboard/product-requests", label: "Product Requests", count: productRequests, icon: Inbox },
    { href: "/dashboard/newsletter", label: "Newsletter", count: newsletter, icon: Mail },
    { href: "/dashboard/contact", label: "Contact Us", count: contact, icon: MessageSquare },
    { href: "/dashboard/support", label: "Support", count: support, icon: Headphones },
    { href: "/dashboard/feedback", label: "Feedback", count: feedback, icon: Star },
  ];

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
      <p className="text-foreground/70 mb-8">Overview of your Roboticela data.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-primary">{item.count}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-tertiary shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
