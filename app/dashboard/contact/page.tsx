"use client";

import { useEffect, useState } from "react";

type Item = { id: string; fullName: string; email: string; message: string; createdAt: string };

export default function ContactPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contact")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Contact Us</h1>
      <p className="text-foreground/70 text-sm mb-6">Messages sent through your contact form.</p>
      {loading ? (
        <div className="text-foreground/60 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center text-foreground/70">
          No contact messages yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-4 py-3 font-semibold text-foreground">Full Name</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Message</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="px-4 py-3 text-foreground">{row.fullName}</td>
                    <td className="px-4 py-3 text-foreground/90">{row.email}</td>
                    <td className="px-4 py-3 text-foreground/80 max-w-xs truncate" title={row.message}>{row.message}</td>
                    <td className="px-4 py-3 text-foreground/60 text-xs">{new Date(row.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
