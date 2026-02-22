"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  productType: string;
  productDescription: string;
  industryUseCase: string;
  priorityLevel: string;
  createdAt: string;
};

export default function ProductRequestsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/product-requests")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Product Requests</h1>
      <p className="text-foreground/70 text-sm mb-6">View and review product ideas and requests submitted by visitors.</p>
      {loading ? (
        <div className="text-foreground/60 py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center text-foreground/70">
          No product requests yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-4 py-3 font-semibold text-foreground">Name</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Company</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Product Type</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Description</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Industry / Use case</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Priority</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="px-4 py-3 text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-foreground/90">{row.email}</td>
                    <td className="px-4 py-3 text-foreground/80">{row.company ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground/80">{row.productType}</td>
                    <td className="px-4 py-3 text-foreground/80 max-w-[200px] truncate" title={row.productDescription}>{row.productDescription}</td>
                    <td className="px-4 py-3 text-foreground/80 max-w-[180px] truncate" title={row.industryUseCase}>{row.industryUseCase}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.priorityLevel === "urgent" ? "bg-red-500/20 text-red-400" :
                        row.priorityLevel === "high" ? "bg-amber-500/20 text-amber-400" :
                        "bg-accent text-foreground/80"
                      }`}>
                        {row.priorityLevel}
                      </span>
                    </td>
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
