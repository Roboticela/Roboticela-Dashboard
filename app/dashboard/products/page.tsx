"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  X,
  Link2,
  GripVertical,
  Cloud,
  ImagePlus,
  AlertTriangle,
} from "lucide-react";

type ProductButton = { name: string; link: string };

type Product = {
  id: string;
  name: string;
  description: string;
  buttonName: string;
  buttonLink: string;
  buttons: ProductButton[];
  appIcon: string | null;
  sortOrder?: number;
  createdAt: string;
};

const ACCEPT_IMAGE = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
const ACCEPT_IMAGE_STR = "PNG, JPEG, WebP, GIF, SVG";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    buttons: [{ name: "", link: "" }] as ProductButton[],
    appIcon: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggedButtonIndex, setDraggedButtonIndex] = useState<number | null>(null);
  const [dragOverButtonIndex, setDragOverButtonIndex] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [dragOverProductIndex, setDragOverProductIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const uploadFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }
      setForm((f) => ({ ...f, appIcon: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file && ACCEPT_IMAGE.includes(file.type)) uploadFile(file);
    },
    []
  );
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      buttons: [{ name: "", link: "" }],
      appIcon: "",
    });
    setUploadError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const buttons =
      p.buttons?.length > 0
        ? p.buttons
        : p.buttonName || p.buttonLink
          ? [{ name: p.buttonName, link: p.buttonLink }]
          : [{ name: "", link: "" }];
    setForm({
      name: p.name,
      description: p.description,
      buttons,
      appIcon: p.appIcon ?? "",
    });
    setUploadError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const setButton = (index: number, field: "name" | "link", value: string) => {
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    }));
  };
  const addButton = () => {
    setForm((f) => ({ ...f, buttons: [...f.buttons, { name: "", link: "" }] }));
  };
  const removeButton = (index: number) => {
    setForm((f) => ({
      ...f,
      buttons: f.buttons.filter((_, i) => i !== index).length ? f.buttons.filter((_, i) => i !== index) : [{ name: "", link: "" }],
    }));
  };

  const moveButton = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setForm((f) => {
      const next = [...f.buttons];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return { ...f, buttons: next };
    });
  };

  const validButtons = form.buttons.filter((b) => b.name.trim() && b.link.trim());
  const canSave =
    form.name.trim() &&
    form.description.trim() &&
    validButtons.length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        buttons: validButtons.map((b) => ({ name: b.name.trim(), link: b.link.trim() })),
        appIcon: form.appIcon.trim() || null,
      };
      if (editing) {
        await fetch(`/api/products/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      closeModal();
      fetchProducts();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (p: Product) => setProductToDelete(p);
  const cancelDelete = () => setProductToDelete(null);
  const remove = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      setProductToDelete(null);
      fetchProducts();
    } finally {
      setDeleting(false);
    }
  };

  const moveProduct = (fromIndex: number, toIndex: number): string[] | null => {
    if (fromIndex === toIndex) return null;
    const next = [...products];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setProducts(next);
    return next.map((p) => p.id);
  };

  const saveProductOrder = async (orderedIds: string[]) => {
    setReordering(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (res.ok) fetchProducts();
    } finally {
      setReordering(false);
      setDraggedProductIndex(null);
      setDragOverProductIndex(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-foreground/70 text-sm">Manage your product catalog—titles, descriptions, action links, and app icons.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="text-foreground/60 py-12 text-center">Loading…</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center text-foreground/70">
          No products yet. Add one to get started.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-2 py-3 w-10 font-semibold text-foreground" aria-label="Drag to reorder" />
                  <th className="px-4 py-3 font-semibold text-foreground">Icon</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Name</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Description</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Buttons</th>
                  <th className="px-4 py-3 font-semibold text-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, rowIndex) => {
                  const btns = p.buttons?.length ? p.buttons : (p.buttonName || p.buttonLink ? [{ name: p.buttonName, link: p.buttonLink }] : []);
                  return (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={() => setDraggedProductIndex(rowIndex)}
                      onDragEnd={() => {
                        setDraggedProductIndex(null);
                        setDragOverProductIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverProductIndex(rowIndex);
                      }}
                      onDragLeave={() => setDragOverProductIndex((i) => (i === rowIndex ? null : i))}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedProductIndex !== null && draggedProductIndex !== rowIndex) {
                          const orderedIds = moveProduct(draggedProductIndex, rowIndex);
                          if (orderedIds) saveProductOrder(orderedIds);
                        }
                        setDraggedProductIndex(null);
                        setDragOverProductIndex(null);
                      }}
                      className={`border-b border-border/60 transition-colors cursor-grab active:cursor-grabbing ${
                        draggedProductIndex === rowIndex
                          ? "opacity-50 bg-primary/5"
                          : dragOverProductIndex === rowIndex
                            ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                            : "hover:bg-accent/30"
                      }`}
                    >
                      <td className="px-2 py-3 text-foreground/40 shrink-0 touch-none">
                        <GripVertical className="w-4 h-4" />
                      </td>
                      <td className="px-4 py-3">
                        {p.appIcon ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-background flex items-center justify-center ring-1 ring-border/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.appIcon} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center ring-1 ring-border/50">
                            <ImageIcon className="w-5 h-5 text-tertiary" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-3 text-foreground/80 max-w-xs truncate">{p.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {btns.map((btn, i) => (
                            <a
                              key={i}
                              href={btn.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                            >
                              {btn.name} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-lg text-foreground/80 hover:bg-accent hover:text-primary"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(p)}
                            className="p-2 rounded-lg text-foreground/80 hover:bg-red-500/20 hover:text-red-500"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reordering && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-foreground/60">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Updating order…
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editing ? "Edit Product" : "Add Product"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 -m-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-accent transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-shadow"
                  placeholder="Product description"
                />
              </div>

              {/* ——— App Icon: beautiful upload ——— */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">App Icon</label>
                {form.appIcon ? (
                  <div className="relative group rounded-2xl overflow-hidden border-2 border-border bg-accent/30">
                    <div className="aspect-video max-h-48 w-full bg-background flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.appIcon}
                        alt=""
                        className="max-h-full w-full object-contain"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <input
                        value={form.appIcon}
                        onChange={(e) => setForm((f) => ({ ...f, appIcon: e.target.value }))}
                        className="flex-1 min-w-0 mr-2 px-3 py-2 rounded-lg bg-card/95 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="Image URL"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, appIcon: "" }))}
                        className="p-2 rounded-lg bg-card/95 border border-border text-foreground/80 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/40 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      relative rounded-2xl border-2 border-dashed transition-all duration-200
                      min-h-[180px] flex flex-col items-center justify-center gap-3 p-6 cursor-pointer
                      ${dragActive ? "border-primary bg-primary/10 scale-[1.01] upload-zone-drag" : "border-border hover:border-primary/50 hover:bg-accent/20"}
                      ${uploading ? "pointer-events-none opacity-80" : ""}
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_IMAGE}
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f);
                        e.target.value = "";
                      }}
                    />
                    {uploading ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
                          <Cloud className="w-7 h-7 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Uploading…</p>
                        <p className="text-xs text-foreground/60">Please wait</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
                          <ImagePlus className="w-7 h-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground">
                            Drop your image here
                          </p>
                          <p className="text-xs text-foreground/60 mt-0.5">
                            or click to browse
                          </p>
                        </div>
                        <p className="text-[11px] text-foreground/50">
                          {ACCEPT_IMAGE_STR} · max 5 MB
                        </p>
                      </>
                    )}
                  </div>
                )}
                {uploadError && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">{uploadError}</p>
                )}
              </div>

              {/* ——— Multiple buttons ——— */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    Buttons *
                  </label>
                  <button
                    type="button"
                    onClick={addButton}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add button
                  </button>
                </div>
                <div className="space-y-3">
                  {form.buttons.map((btn, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => setDraggedButtonIndex(index)}
                      onDragEnd={() => {
                        setDraggedButtonIndex(null);
                        setDragOverButtonIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverButtonIndex(index);
                      }}
                      onDragLeave={() => setDragOverButtonIndex((i) => (i === index ? null : i))}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedButtonIndex !== null && draggedButtonIndex !== index) {
                          moveButton(draggedButtonIndex, index);
                        }
                        setDraggedButtonIndex(null);
                        setDragOverButtonIndex(null);
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors group cursor-grab active:cursor-grabbing ${
                        draggedButtonIndex === index
                          ? "opacity-50 border-primary/60 bg-primary/5"
                          : dragOverButtonIndex === index
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "bg-background/50 border-border"
                      }`}
                    >
                      <span className="text-foreground/40 shrink-0 touch-none" aria-hidden>
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <input
                        value={btn.name}
                        onChange={(e) => setButton(index, "name", e.target.value)}
                        placeholder="Label"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        value={btn.link}
                        onChange={(e) => setButton(index, "link", e.target.value)}
                        placeholder="https://..."
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeButton(index)}
                        className="p-2 rounded-lg text-foreground/50 hover:bg-red-500/15 hover:text-red-500 transition-colors shrink-0"
                        aria-label="Remove button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-foreground/50">At least one button with label and link is required.</p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="w-full py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete product confirmation */}
      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
          >
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 id="delete-dialog-title" className="text-lg font-semibold text-foreground mb-1">
                Delete product?
              </h3>
              <p id="delete-dialog-desc" className="text-sm text-foreground/70 mb-1">
                <span className="font-medium text-foreground">&quot;{productToDelete.name}&quot;</span> will be removed permanently. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-accent/30 border-t border-border">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
