import Link from "next/link";
import Image from "next/image";
import DashboardNav from "./DashboardNav";

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card/80 flex flex-col">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-6 py-5 border-b border-border"
        >
          <div className="relative w-9 h-9 shrink-0">
            <Image src="/Logo.png" alt="Roboticela" fill className="object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground text-sm">Roboticela</span>
            <span className="text-xs text-foreground/60">Dashboard</span>
          </div>
        </Link>
        <DashboardNav />
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
