"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Item = { id: string; rating: number; message: string; productName: string; createdAt: string };

export default function FeedbackPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Feedback</h1>
      <p className="text-foreground/70 text-sm mb-6">User ratings and feedback for your products.</p>
      {loading ? (
        <div className="text-foreground/60 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center text-foreground/70">
          No feedback yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-4 py-3 font-semibold text-foreground">Rating</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Product Name</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Message</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-0.5 text-primary">
                        {Array.from({ length: 7 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < row.rating ? "fill-current" : "opacity-30"}`}
                          />
                        ))}
                        <span className="ml-1 text-foreground/80">({row.rating}/7)</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{row.productName}</td>
                    <td className="px-4 py-3 text-foreground/80 max-w-md truncate" title={row.message}>{row.message}</td>
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
