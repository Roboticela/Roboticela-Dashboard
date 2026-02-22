import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Image src="/Logo.png" alt="Roboticela" width={120} height={120} className="mb-6" />
      <h1 className="text-3xl font-bold text-foreground mb-2">Roboticela Dashboard</h1>
      <p className="text-foreground/70 mb-8 text-center max-w-md">
        Manage products, requests, newsletter, contact, support, and feedback.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-xl bg-primary text-background font-semibold hover:opacity-90 transition-opacity"
      >
        Open Dashboard
      </Link>
    </div>
  );
}
