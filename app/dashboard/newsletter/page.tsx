"use client";

import { useEffect, useState } from "react";

type Item = { id: string; email: string; createdAt: string };

export default function NewsletterPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/newsletter")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Newsletter</h1>
      <p className="text-foreground/70 text-sm mb-6">View everyone who has subscribed to your newsletter.</p>
      {loading ? (
        <div className="text-foreground/60 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center text-foreground/70">
          No newsletter subscribers yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="px-4 py-3 text-foreground">{row.email}</td>
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
