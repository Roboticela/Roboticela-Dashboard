"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Database, Trash2, ExternalLink, X, AlertTriangle, Pencil } from "lucide-react";

type SavedDb = {
  id: string;
  name: string;
  connectionUrlMasked: string;
  hasR2?: boolean;
  createdAt: string;
};

export default function DatabasesPage() {
  const [list, setList] = useState<SavedDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SavedDb | null>(null);
  const [form, setForm] = useState({
    name: "",
    connectionUrl: "",
    r2AccountId: "",
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
    r2Bucket: "",
    r2PublicUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedDb | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = async () => {
    const res = await fetch("/api/databases");
    if (res.ok) setList(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({
      name: "",
      connectionUrl: "",
      r2AccountId: "",
      r2AccessKeyId: "",
      r2SecretAccessKey: "",
      r2Bucket: "",
      r2PublicUrl: "",
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (db: SavedDb) => {
    setEditTarget(db);
    setForm({
      name: db.name,
      connectionUrl: "",
      r2AccountId: "",
      r2AccessKeyId: "",
      r2SecretAccessKey: "",
      r2Bucket: "",
      r2PublicUrl: "",
    });
    setError(null);
    setModalOpen(true);
  };

  const addDatabase = async () => {
    if (!form.name.trim() || !form.connectionUrl.trim()) {
      setError("Name and connection URL are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          connectionUrl: form.connectionUrl.trim(),
          r2AccountId: form.r2AccountId.trim() || undefined,
          r2AccessKeyId: form.r2AccessKeyId.trim() || undefined,
          r2SecretAccessKey: form.r2SecretAccessKey.trim() || undefined,
          r2Bucket: form.r2Bucket.trim() || undefined,
          r2PublicUrl: form.r2PublicUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to add database");
        return;
      }
      setModalOpen(false);
      fetchList();
    } finally {
      setSaving(false);
    }
  };

  const saveDatabase = async () => {
    if (!editTarget) return;
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string | null> = { name: form.name.trim() };
      if (form.connectionUrl.trim()) body.connectionUrl = form.connectionUrl.trim();
      const hasAnyR2 = [form.r2AccountId, form.r2AccessKeyId, form.r2SecretAccessKey, form.r2Bucket, form.r2PublicUrl].some((s) => s.trim());
      if (hasAnyR2) {
        body.r2AccountId = form.r2AccountId.trim() || null;
        body.r2AccessKeyId = form.r2AccessKeyId.trim() || null;
        body.r2SecretAccessKey = form.r2SecretAccessKey.trim() || null;
        body.r2Bucket = form.r2Bucket.trim() || null;
        body.r2PublicUrl = form.r2PublicUrl.trim() || null;
      }

      const res = await fetch(`/api/databases/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update database");
        return;
      }
      setModalOpen(false);
      setEditTarget(null);
      fetchList();
    } finally {
      setSaving(false);
    }
  };

  const removeDatabase = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/databases/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchList();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Databases</h1>
          <p className="text-foreground/70 text-sm">
            Add PostgreSQL connections to browse tables and run any SQL. You can add as many databases as you need.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" /> Add database
        </button>
      </div>

      {loading ? (
        <div className="text-foreground/60 py-12 text-center">Loading…</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">No databases yet</p>
          <p className="text-foreground/60 text-sm mb-6 max-w-sm mx-auto">
            Add a database with a connection URL (e.g. postgresql://user:password@host:5432/dbname?schema=public) to browse tables and run SQL.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90"
          >
            <Plus className="w-5 h-5" /> Add database
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((db) => (
            <div
              key={db.id}
              className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Database className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(db)}
                      className="p-2 rounded-lg text-foreground/50 hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label="Edit database"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(db)}
                      className="p-2 rounded-lg text-foreground/50 hover:bg-red-500/15 hover:text-red-500 transition-colors"
                      aria-label="Remove database"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground truncate">{db.name}</h3>
                <p className="text-xs text-foreground/50 font-mono mt-1 break-all">{db.connectionUrlMasked}</p>
              </div>
              <div className="p-3 border-t border-border bg-accent/20 flex gap-2">
                <Link
                  href={`/dashboard/databases/${db.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-background text-sm font-medium hover:opacity-90"
                >
                  Open <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit database modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editTarget ? "Edit database" : "Add database"}</h2>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setEditTarget(null); }}
                className="p-2 -m-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              {editTarget
                ? "Update the name and optionally the connection URL or R2 credentials. Leave fields blank to keep current values."
                : "Enter a display name and your PostgreSQL connection URL. Optionally add R2 credentials so deleting a record can also remove files from R2, and to use the per-file delete button."}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. Todo DB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Connection URL {editTarget && <span className="text-foreground/50 font-normal">(leave blank to keep current)</span>}</label>
                <textarea
                  value={form.connectionUrl}
                  onChange={(e) => setForm((f) => ({ ...f, connectionUrl: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm resize-none"
                  placeholder={editTarget ? "Leave blank to keep current" : "postgresql://user:password@host:5432/db?schema=public"}
                />
              </div>
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-sm font-medium text-foreground mb-1.5">R2 (optional)</p>
                <p className="text-xs text-foreground/50 mb-3">{editTarget ? "Leave blank to keep current. Fill to update or clear R2 config." : "Only needed to delete files from R2 when deleting records or using the per-file delete button. Leave blank if not used."}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">Account ID</label>
                    <input
                      value={form.r2AccountId}
                      onChange={(e) => setForm((f) => ({ ...f, r2AccountId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Cloudflare account ID"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/70 mb-1">Access Key ID</label>
                    <input
                      value={form.r2AccessKeyId}
                      onChange={(e) => setForm((f) => ({ ...f, r2AccessKeyId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="R2 API token access key"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/70 mb-1">Secret Access Key</label>
                    <input
                      type="password"
                      value={form.r2SecretAccessKey}
                      onChange={(e) => setForm((f) => ({ ...f, r2SecretAccessKey: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="R2 API token secret"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/70 mb-1">Bucket</label>
                    <input
                      value={form.r2Bucket}
                      onChange={(e) => setForm((f) => ({ ...f, r2Bucket: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Bucket name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/70 mb-1">Public URL</label>
                    <input
                      value={form.r2PublicUrl}
                      onChange={(e) => setForm((f) => ({ ...f, r2PublicUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://res.todo.roboticela.com"
                    />
                  </div>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">{error}</p>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setModalOpen(false); setEditTarget(null); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={editTarget ? saveDatabase : addDatabase}
                disabled={saving || !form.name.trim() || (!editTarget && !form.connectionUrl.trim())}
                className="flex-1 py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (editTarget ? "Saving…" : "Adding…") : editTarget ? "Save" : "Add database"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Remove this database?</h3>
              <p className="text-sm text-foreground/70">
                &quot;{deleteTarget.name}&quot; will be removed from the list. Your actual database is not modified.
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-accent/30 border-t border-border">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={removeDatabase}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing…
                  </>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
