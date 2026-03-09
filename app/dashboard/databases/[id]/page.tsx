"use client";

import { use, useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Table2,
  Code,
  Play,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  ZoomIn,
  Copy,
  Check,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsRight,
  Pencil,
  Trash2,
  Download,
  Upload,
  File,
  HardDrive,
  Plus,
} from "lucide-react";
import { CustomCheckbox } from "../components/CustomCheckbox";
import { CustomSelect } from "../components/CustomSelect";

type TableInfo = { tableName: string; columns: { name: string; type: string }[] };
type DbMeta = { id: string; name: string; connectionUrlMasked: string; hasR2?: boolean };

const PAGE_SIZES = [25, 50, 100, 250, 500];

const IMAGE_COLUMN_NAMES = /^(app_icon|icon|image|img|avatar|photo|picture|logo|thumbnail|url|banner|cover|image_url|img_url|icon_url)$/i;
const IMAGE_URL_PATTERN = /^https?:\/\/.+/i;

function isImageColumn(columnName: string): boolean {
  return IMAGE_COLUMN_NAMES.test(columnName);
}

function looksLikeImageUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  if (!IMAGE_URL_PATTERN.test(value)) return false;
  const v = value.toLowerCase();
  return /\.(jpe?g|png|gif|webp|svg|ico)(\?|$)/i.test(v) || v.includes("r2.dev") || v.includes("cloudflare") || v.includes("blob") || v.includes("data:image");
}

function isJsonLike(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const t = value.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const s = String(value);
  if (isJsonLike(s)) {
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  }
  return s;
}

function getFileUrlsFromRow(row: Record<string, unknown>, columns: { name: string }[]): string[] {
  const urls: string[] = [];
  for (const col of columns) {
    const v = row[col.name];
    if (typeof v === "string" && v.startsWith("http") && (isImageColumn(col.name) || looksLikeImageUrl(v))) {
      urls.push(v);
    }
  }
  return urls;
}

function isFileUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("http");
}

function TableCell({
  value,
  columnName,
  onPreview,
  hasR2,
  onDeleteFile,
}: {
  value: unknown;
  columnName: string;
  onPreview: (col: string, val: unknown) => void;
  hasR2?: boolean;
  onDeleteFile?: (url: string) => void;
}) {
  const showAsImage = (isImageColumn(columnName) || looksLikeImageUrl(value)) && typeof value === "string" && value.startsWith("http");
  const showAsFile = !showAsImage && isFileUrl(value);
  const str = value !== null && value !== undefined ? String(value) : "";
  const truncated = str.length > 60 ? str.slice(0, 60) + "…" : str;

  if (showAsImage) {
    return (
      <td
        className="px-3 py-2 align-middle"
        onClick={() => onPreview(columnName, value)}
      >
        <div className="flex items-center gap-2 min-w-[80px]" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="rounded-lg overflow-hidden border border-border bg-background/50 hover:ring-2 hover:ring-primary/30 transition-all shrink-0"
          >
            <span className="relative w-12 h-12 bg-accent flex items-center justify-center overflow-hidden block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={str}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
              <span className="hidden absolute inset-0 flex items-center justify-center text-tertiary">
                <ZoomIn className="w-5 h-5" />
              </span>
            </span>
          </button>
          {hasR2 && onDeleteFile && (
            <button
              type="button"
              onClick={() => onDeleteFile(str)}
              className="p-2 rounded-lg text-foreground/60 hover:bg-red-500/10 hover:text-red-500 shrink-0"
              title="Delete file from R2"
              aria-label="Delete file from R2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    );
  }

  if (showAsFile) {
    const filename = str.split("/").pop()?.split("?")[0] || "file";
    return (
      <td className="px-3 py-2 align-middle" onClick={() => onPreview(columnName, value)}>
        <div className="flex items-center gap-2 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
          <a
            href={str}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2 py-1.5 hover:ring-2 hover:ring-primary/30 transition-all min-w-0 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <File className="w-4 h-4 text-tertiary" />
            </span>
            <span className="text-xs text-foreground/80 truncate flex-1">{filename}</span>
          </a>
          <a
            href={str}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-foreground/60 hover:bg-primary/10 hover:text-primary shrink-0"
            title="Download"
            aria-label="Download file"
          >
            <Download className="w-4 h-4" />
          </a>
          {hasR2 && onDeleteFile && (
            <button
              type="button"
              onClick={() => onDeleteFile(str)}
              className="p-2 rounded-lg text-foreground/60 hover:bg-red-500/10 hover:text-red-500 shrink-0"
              title="Delete file from R2"
              aria-label="Delete file from R2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    );
  }

  return (
    <td
      className="px-3 py-2 text-foreground/90 max-w-[220px] cursor-pointer hover:bg-primary/5 transition-colors"
      onClick={() => onPreview(columnName, value)}
      title={str}
    >
      <span className="block truncate">{truncated || "—"}</span>
    </td>
  );
}

function PreviewModal({
  columnName,
  value,
  onClose,
}: {
  columnName: string;
  value: unknown;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const formatted = formatPreviewValue(value);
  const showAsImage = (isImageColumn(columnName) || looksLikeImageUrl(value)) && typeof value === "string" && value.startsWith("http");
  const isFile = isFileUrl(value);
  const fileUrl = typeof value === "string" ? value : "";
  const filename = fileUrl.split("/").pop()?.split("?")[0] || "file";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-4 bg-accent/30">
          <div className="min-w-0">
            <p className="text-xs text-foreground/50 font-medium uppercase tracking-wider">Column</p>
            <p className="font-mono font-semibold text-foreground truncate">{columnName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isFile && (
              <a
                href={fileUrl}
                download={filename}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-border text-foreground/70 hover:bg-accent hover:text-foreground flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Download</span>
              </a>
            )}
            <button
              type="button"
              onClick={copyToClipboard}
              className="p-2 rounded-xl border border-border text-foreground/70 hover:bg-accent hover:text-foreground flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-foreground/70 hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {showAsImage && typeof value === "string" && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border bg-background/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="w-full max-h-[400px] object-contain" />
              <p className="p-2 text-xs text-foreground/50 font-mono break-all">{value}</p>
            </div>
          )}
          {isFile && !showAsImage && (
            <div className="mb-4 rounded-xl border border-border bg-accent/30 p-6 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center">
                <File className="w-8 h-8 text-tertiary" />
              </div>
              <p className="text-sm text-foreground/70">No preview available</p>
              <a
                href={fileUrl}
                download={filename}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-medium hover:opacity-90"
              >
                <Download className="w-4 h-4" /> Download file
              </a>
              <p className="text-xs text-foreground/50 font-mono break-all w-full text-center">{fileUrl}</p>
            </div>
          )}
          <pre className="text-sm font-mono text-foreground/90 whitespace-pre-wrap break-words bg-background/50 p-4 rounded-xl border border-border">
            {formatted}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [db, setDb] = useState<DbMeta | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [activeTab, setActiveTab] = useState<"tables" | "sql" | "storage">("tables");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableColumns, setTableColumns] = useState<{ name: string; type: string }[]>([]);
  const [tablePrimaryKey, setTablePrimaryKey] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<string, unknown>[]>([]);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [editFormBooleans, setEditFormBooleans] = useState<Record<string, string>>({});
  const [editFormFiles, setEditFormFiles] = useState<Record<string, string>>({});
  const [uploadingCol, setUploadingCol] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [addFormBooleans, setAddFormBooleans] = useState<Record<string, string>>({});
  const [addFormFiles, setAddFormFiles] = useState<Record<string, string>>({});
  const [savingAddRow, setSavingAddRow] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [preview, setPreview] = useState<{ columnName: string; value: unknown } | null>(null);
  const [sql, setSql] = useState("-- Run any SQL (SELECT, INSERT, UPDATE, DELETE, etc.)\nSELECT 1 as example;");
  const [queryResult, setQueryResult] = useState<{ rows: Record<string, unknown>[]; rowCount: number } | null>(null);
  const [runningQuery, setRunningQuery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPath, setUploadPath] = useState("uploads");
  const [uploadResult, setUploadResult] = useState<{ url: string; key: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [storageListPrefix, setStorageListPrefix] = useState("");
  const [storageObjects, setStorageObjects] = useState<{ key: string; size: number; lastModified: string; url: string }[]>([]);
  const [loadingStorageList, setLoadingStorageList] = useState(false);
  const [selectedStorageKeys, setSelectedStorageKeys] = useState<Set<string>>(new Set());
  const [storageDeleteAllConfirm, setStorageDeleteAllConfirm] = useState(false);
  const [storageDeletingAll, setStorageDeletingAll] = useState(false);
  const [storageDeletingKeys, setStorageDeletingKeys] = useState(false);

  const fetchMeta = useCallback(async () => {
    if (!id) return;
    setLoadingMeta(true);
    try {
      const res = await fetch(`/api/databases/${id}`);
      if (res.ok) setDb(await res.json());
    } finally {
      setLoadingMeta(false);
    }
  }, [id]);

  const fetchSchema = useCallback(async () => {
    if (!id) return;
    setLoadingSchema(true);
    try {
      const res = await fetch(`/api/databases/${id}/schema`);
      if (res.ok) setSchema(await res.json());
      setError(null);
    } catch {
      setError("Failed to load schema");
    } finally {
      setLoadingSchema(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMeta();
    fetchSchema();
  }, [fetchMeta, fetchSchema]);

  const loadTableData = useCallback(
    async (tableName: string, opts?: { page?: number; pageSize?: number; sort?: string; order?: "asc" | "desc"; search?: string }) => {
      if (!id) return;
      setSelectedTable(tableName);
      setLoadingTable(true);
      setError(null);
      const limit = opts?.pageSize ?? pageSize;
      const offset = (opts?.page ?? page) * limit;
      const sort = opts?.sort !== undefined ? opts.sort : (sortBy ?? "");
      const order = opts?.order ?? sortOrder;
      const q = opts?.search !== undefined ? opts.search : search;
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          sort: sort || "",
          order,
          ...(q ? { search: q } : {}),
        });
        const res = await fetch(`/api/databases/${id}/tables/${encodeURIComponent(tableName)}?${params}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to load table");
          setTableData([]);
          setTableTotal(0);
          return;
        }
        setTableData(data.rows ?? []);
        setTableTotal(data.total ?? 0);
        setTableColumns(data.columns ?? []);
        setTablePrimaryKey(data.primaryKey ?? []);
        setSelectedRows([]);
        if (opts?.sort !== undefined) setSortBy(data.sort ?? null);
        if (opts?.order !== undefined) setSortOrder(data.order ?? "asc");
        if (opts?.page !== undefined) setPage(opts.page);
        if (opts?.pageSize !== undefined) setPageSize(opts.pageSize ?? 50);
      } finally {
        setLoadingTable(false);
      }
    },
    [id, pageSize, page, sortBy, sortOrder, search]
  );

  const loadTableDataForCurrentTable = useCallback(
    (opts?: { page?: number; pageSize?: number; sort?: string; order?: "asc" | "desc"; search?: string }) => {
      if (selectedTable) loadTableData(selectedTable, opts);
    },
    [selectedTable, loadTableData]
  );

  const handleSelectTable = useCallback(
    (tableName: string) => {
      setPage(0);
      setSearch("");
      setSearchInput("");
      setSortBy(null);
      setSortOrder("asc");
      loadTableData(tableName, { page: 0, pageSize, search: "", sort: undefined, order: "asc" });
    },
    [pageSize, loadTableData]
  );

  const totalPages = Math.max(1, Math.ceil(tableTotal / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const from = tableTotal === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, tableTotal);

  const handleSort = useCallback(
    (col: string) => {
      const nextOrder = sortBy === col && sortOrder === "asc" ? "desc" : "asc";
      setSortBy(col);
      setSortOrder(nextOrder);
      if (selectedTable) loadTableData(selectedTable, { page: 0, sort: col, order: nextOrder, pageSize, search });
      setPage(0);
    },
    [sortBy, sortOrder, selectedTable, loadTableData, pageSize, search]
  );

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
    if (selectedTable) loadTableData(selectedTable, { page: 0, search: searchInput, pageSize, sort: sortBy ?? undefined, order: sortOrder });
  }, [searchInput, selectedTable, loadTableData, pageSize, sortBy, sortOrder]);

  const columns = selectedTable ? schema.find((t) => t.tableName === selectedTable)?.columns ?? tableColumns : [];
  const resultRows = queryResult?.rows ?? [];
  const resultKeys = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];

  const getRowPk = useCallback((row: Record<string, unknown>) => {
    const pk: Record<string, unknown> = {};
    for (const k of tablePrimaryKey) {
      if (row[k] !== undefined) pk[k] = row[k];
    }
    return pk;
  }, [tablePrimaryKey]);

  const rowPkKey = useCallback((row: Record<string, unknown>) => {
    return JSON.stringify(getRowPk(row));
  }, [getRowPk]);

  const selectedPkSet = useMemo(() => new Set(selectedRows.map((r) => rowPkKey(r))), [selectedRows, rowPkKey]);

  const isRowSelected = useCallback((row: Record<string, unknown>) => selectedPkSet.has(rowPkKey(row)), [selectedPkSet, rowPkKey]);

  const toggleRowSelection = useCallback((row: Record<string, unknown>) => {
    const key = rowPkKey(row);
    if (selectedPkSet.has(key)) {
      setSelectedRows((prev) => prev.filter((r) => rowPkKey(r) !== key));
    } else {
      setSelectedRows((prev) => [...prev, getRowPk(row)]);
    }
  }, [rowPkKey, selectedPkSet, getRowPk]);

  const selectAllOnPage = useCallback(() => {
    const keys = new Set(tableData.map((r) => rowPkKey(r)));
    const toAdd = tableData.filter((r) => !selectedPkSet.has(rowPkKey(r))).map(getRowPk);
    setSelectedRows((prev) => [...prev.filter((r) => !keys.has(rowPkKey(r))), ...toAdd]);
  }, [tableData, selectedPkSet, rowPkKey, getRowPk]);

  const clearSelection = useCallback(() => {
    setSelectedRows([]);
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    const allSelected = tableData.length > 0 && tableData.every((r) => isRowSelected(r));
    if (allSelected) {
      const keys = new Set(tableData.map((r) => rowPkKey(r)));
      setSelectedRows((prev) => prev.filter((r) => !keys.has(rowPkKey(r))));
    } else {
      selectAllOnPage();
    }
  }, [tableData, isRowSelected, rowPkKey, selectAllOnPage]);

  const handleUpdateRow = useCallback(async (where: Record<string, unknown>, set: Record<string, unknown>) => {
    if (!id || !selectedTable) return;
    setSavingRow(true);
    setError(null);
    try {
      const res = await fetch(`/api/databases/${id}/tables/${encodeURIComponent(selectedTable)}/rows`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ where, set }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Update failed");
        return;
      }
      setEditRow(null);
      loadTableDataForCurrentTable({ page: currentPage });
    } finally {
      setSavingRow(false);
    }
  }, [id, selectedTable, currentPage, loadTableDataForCurrentTable]);

  const handleAddRow = useCallback(async (row: Record<string, unknown>) => {
    if (!id || !selectedTable) return;
    setSavingAddRow(true);
    setError(null);
    try {
      const res = await fetch(`/api/databases/${id}/tables/${encodeURIComponent(selectedTable)}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Insert failed");
        return;
      }
      setAddRowOpen(false);
      setAddFormBooleans({});
      setAddFormFiles({});
      loadTableDataForCurrentTable({ page: currentPage });
    } finally {
      setSavingAddRow(false);
    }
  }, [id, selectedTable, currentPage, loadTableDataForCurrentTable]);

  const handleDeleteRow = useCallback(async (where: Record<string, unknown>, row?: Record<string, unknown>) => {
    if (!id || !selectedTable) return;
    const fileUrls = row ? getFileUrlsFromRow(row, columns) : [];
    setDeletingRow(true);
    setError(null);
    try {
      const res = await fetch(`/api/databases/${id}/tables/${encodeURIComponent(selectedTable)}/rows`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ where, fileUrls }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Delete failed");
        return;
      }
      setDeleteRow(null);
      loadTableDataForCurrentTable({ page: currentPage });
    } finally {
      setDeletingRow(false);
    }
  }, [id, selectedTable, currentPage, loadTableDataForCurrentTable]);

  const handleDeleteFile = useCallback(async (url: string) => {
    if (!id) return;
    setError(null);
    setDeletingFile(true);
    try {
      const res = await fetch(`/api/databases/${id}/r2-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete file from R2");
        setDeleteFileConfirm(null);
        return;
      }
      const errors = (data.errors as { url: string; error: string }[] | undefined) ?? [];
      if (errors.length > 0) {
        setError(errors.map((e) => e.error).join("; ") || "Could not delete file from R2");
        setDeleteFileConfirm(null);
        return;
      }
      setDeleteFileConfirm(null);
      loadTableDataForCurrentTable({ page: currentPage });
    } catch {
      setError("Failed to delete file from R2");
      setDeleteFileConfirm(null);
    } finally {
      setDeletingFile(false);
    }
  }, [id, currentPage, loadTableDataForCurrentTable]);

  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editUploadTargetRef = useRef<string | null>(null);
  const addUploadTargetRef = useRef<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const r2UploadFileRef = useRef<HTMLInputElement>(null);
  const handleEditUpload = useCallback(
    async (file: File) => {
      const colName = editUploadTargetRef.current;
      if (!id || !colName) return;
      setUploadingCol(colName);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/databases/${id}/upload`, { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Upload failed");
          return;
        }
        setEditFormFiles((prev) => ({ ...prev, [colName]: data.url }));
      } catch {
        setError("Upload failed");
      } finally {
        setUploadingCol(null);
        editUploadTargetRef.current = null;
        if (editFileInputRef.current) editFileInputRef.current.value = "";
      }
    },
    [id]
  );

  const handleAddUpload = useCallback(
    async (file: File) => {
      const colName = addUploadTargetRef.current;
      if (!id || !colName) return;
      setUploadingCol(colName);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", uploadPath);
        const res = await fetch(`/api/databases/${id}/upload`, { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Upload failed");
          return;
        }
        setAddFormFiles((prev) => ({ ...prev, [colName]: data.url }));
      } catch {
        setError("Upload failed");
      } finally {
        setUploadingCol(null);
        addUploadTargetRef.current = null;
        if (addFileInputRef.current) addFileInputRef.current.value = "";
      }
    },
    [id, uploadPath]
  );

  const handleR2Upload = useCallback(async () => {
    if (!id) return;
    const file = r2UploadFileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first");
      return;
    }
    setError(null);
    setUploadResult(null);
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", uploadPath || "uploads");
      const res = await fetch(`/api/databases/${id}/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setUploadResult({ url: data.url, key: data.key });
      if (r2UploadFileRef.current) r2UploadFileRef.current.value = "";
    } catch {
      setError("Upload failed");
    } finally {
      setUploadingFile(false);
    }
  }, [id, uploadPath]);

  const copyUploadUrl = useCallback(() => {
    if (!uploadResult?.url) return;
    navigator.clipboard.writeText(uploadResult.url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }, [uploadResult?.url]);

  const loadStorageList = useCallback(async () => {
    if (!id) return;
    setLoadingStorageList(true);
    setError(null);
    try {
      const params = storageListPrefix.trim() ? `?prefix=${encodeURIComponent(storageListPrefix.trim())}` : "";
      const res = await fetch(`/api/databases/${id}/r2-list${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to list files");
        setStorageObjects([]);
        return;
      }
      setStorageObjects(data.objects ?? []);
      setSelectedStorageKeys(new Set());
    } finally {
      setLoadingStorageList(false);
    }
  }, [id, storageListPrefix]);

  const deleteStorageSelected = useCallback(async () => {
    if (!id || selectedStorageKeys.size === 0) return;
    setStorageDeletingKeys(true);
    setError(null);
    try {
      const res = await fetch(`/api/databases/${id}/r2-delete-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(selectedStorageKeys) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete files");
        return;
      }
      setSelectedStorageKeys(new Set());
      loadStorageList();
    } finally {
      setStorageDeletingKeys(false);
    }
  }, [id, selectedStorageKeys, loadStorageList]);

  const deleteStorageAll = useCallback(async () => {
    if (!id) return;
    setStorageDeletingAll(true);
    setError(null);
    try {
      const res = await fetch(`/api/databases/${id}/r2-delete-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: storageListPrefix.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete all");
        return;
      }
      setStorageDeleteAllConfirm(false);
      setSelectedStorageKeys(new Set());
      loadStorageList();
    } finally {
      setStorageDeletingAll(false);
    }
  }, [id, storageListPrefix, loadStorageList]);

  const handleBulkDelete = useCallback(async () => {
    if (!id || !selectedTable || selectedRows.length === 0) return;
    const rowsToDelete = tableData.filter((r) => isRowSelected(r));
    const fileUrls = rowsToDelete.flatMap((r) => getFileUrlsFromRow(r, columns));
    setBulkDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/databases/${id}/tables/${encodeURIComponent(selectedTable)}/rows/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: selectedRows, fileUrls }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Bulk delete failed");
        return;
      }
      setBulkDeleteConfirm(false);
      setSelectedRows([]);
      loadTableDataForCurrentTable({ page: currentPage });
    } finally {
      setBulkDeleting(false);
    }
  }, [id, selectedTable, selectedRows, tableData, columns, isRowSelected, currentPage, loadTableDataForCurrentTable]);

  const runSql = async () => {
    if (!id) return;
    setRunningQuery(true);
    setError(null);
    setQueryResult(null);
    try {
      const res = await fetch("/api/databases/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: id, query: sql }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Query failed");
        return;
      }
      setQueryResult({ rows: data.rows ?? [], rowCount: data.rowCount ?? 0 });
    } finally {
      setRunningQuery(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!db) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-foreground/70">Database not found.</p>
        <Link href="/dashboard/databases" className="text-primary font-medium mt-2 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Databases
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col h-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/databases"
            className="inline-flex items-center gap-2 text-foreground/70 hover:text-primary text-sm font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Databases
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{db.name}</h1>
          <p className="text-xs text-foreground/50 font-mono mt-0.5">{db.connectionUrlMasked}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchSchema(); if (selectedTable) loadTableDataForCurrentTable({ page: currentPage }); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-foreground/80 hover:bg-accent hover:text-foreground text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "tables"
              ? "bg-primary/15 text-primary border-b-2 border-primary -mb-[1px]"
              : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <Table2 className="w-4 h-4" /> Tables
        </button>
        <button
          onClick={() => setActiveTab("sql")}
          className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "sql"
              ? "bg-primary/15 text-primary border-b-2 border-primary -mb-[1px]"
              : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <Code className="w-4 h-4" /> SQL
        </button>
        {db?.hasR2 && (
          <button
            onClick={() => setActiveTab("storage")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === "storage"
                ? "bg-primary/15 text-primary border-b-2 border-primary -mb-[1px]"
                : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <HardDrive className="w-4 h-4" /> Storage
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {activeTab === "tables" && (
        <div className="flex flex-1 min-h-0 gap-4">
          <aside className="w-56 shrink-0 rounded-2xl border border-border bg-card/60 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-accent/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Tables</h3>
              <button
                onClick={() => fetchSchema()}
                className="p-1.5 rounded-lg text-foreground/50 hover:bg-accent hover:text-foreground"
                aria-label="Refresh tables"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingSchema ? (
                <div className="py-4 flex flex-col gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-9 rounded-xl bg-accent/50 animate-pulse" />
                  ))}
                </div>
              ) : schema.length === 0 ? (
                <div className="py-6 text-center text-foreground/50 text-sm">No tables in public schema</div>
              ) : (
                schema.map((t) => (
                  <button
                    key={t.tableName}
                    onClick={() => handleSelectTable(t.tableName)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center justify-between gap-2 transition-colors ${
                      selectedTable === t.tableName
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-foreground/80 hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{t.tableName}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card/60 overflow-hidden flex flex-col flex min-h-0">
            {!selectedTable ? (
              <div className="flex-1 flex flex-col items-center justify-center text-foreground/50 py-16">
                <Table2 className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">Select a table</p>
                <p className="text-xs mt-1">Choose a table from the list to browse data</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border bg-accent/30 flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground shrink-0">{selectedTable}</h3>
                  <button
                    type="button"
                    onClick={() => { setAddFormBooleans({}); setAddFormFiles({}); setAddRowOpen(true); }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-background text-sm font-medium hover:opacity-90 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add record
                  </button>
                  <div className="flex-1 min-w-[200px] flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                        placeholder="Search in table…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button
                      onClick={handleSearchSubmit}
                      className="px-3 py-2 rounded-xl bg-primary text-background text-sm font-medium hover:opacity-90"
                    >
                      Search
                    </button>
                    {search && (
                      <button
                        onClick={() => { setSearch(""); setSearchInput(""); loadTableDataForCurrentTable({ search: "" }); }}
                        className="text-xs text-foreground/60 hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <span>{tableTotal.toLocaleString()} row(s)</span>
                  </div>
                </div>

                {selectedRows.length > 0 && (
                  <div className="px-4 py-2 border-b border-border bg-primary/10 flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {selectedRows.length} row(s) selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkDeleteConfirm(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" /> Delete selected
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-foreground/80 text-sm font-medium hover:bg-accent"
                      >
                        Clear selection
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-auto min-h-0">
                  {loadingTable ? (
                    <div className="flex flex-col gap-2 p-6">
                      <div className="h-10 rounded-xl bg-accent/50 animate-pulse w-full" />
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-12 rounded-lg bg-accent/30 animate-pulse w-full" style={{ animationDelay: `${i * 50}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-accent/50 sticky top-0 z-10">
                            {tablePrimaryKey.length > 0 && (
                              <th className="px-2 py-3 w-10 sticky left-0 z-20 bg-accent/50 border-r border-border/50">
                                <CustomCheckbox
                                  checked={tableData.length > 0 && tableData.every((r) => isRowSelected(r))}
                                  onChange={toggleSelectAllOnPage}
                                  aria-label="Select all on page"
                                />
                              </th>
                            )}
                            {columns.map((col) => (
                              <th
                                key={col.name}
                                className="px-3 py-3 font-semibold text-foreground whitespace-nowrap"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSort(col.name)}
                                  className="flex items-center gap-1 group hover:text-primary"
                                >
                                  {col.name}
                                  <span className="text-foreground/40 text-xs font-normal">({col.type})</span>
                                  {sortBy === col.name ? (
                                    sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <span className="w-4 h-4 opacity-0 group-hover:opacity-40 inline-flex">
                                      <ChevronUp className="w-4 h-4" />
                                    </span>
                                  )}
                                </button>
                              </th>
                            ))}
                            {tablePrimaryKey.length > 0 && (
                              <th className="px-3 py-3 font-semibold text-foreground whitespace-nowrap w-24 sticky right-0 z-20 bg-accent/50 border-l border-border/50 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.length === 0 ? (
                            <tr>
                              <td colSpan={columns.length + (tablePrimaryKey.length > 0 ? 2 : 0)} className="px-4 py-12 text-center text-foreground/50">
                                {search ? "No rows match your search." : "No rows in this table."}
                              </td>
                            </tr>
                          ) : (
                            tableData.map((row, idx) => (
                              <tr
                                key={rowPkKey(row)}
                                className="border-b border-border/60 hover:bg-accent/20 transition-colors group/row"
                              >
                                {tablePrimaryKey.length > 0 && (
                                  <td className="px-2 py-2 sticky left-0 z-10 bg-card/60 group-hover/row:bg-accent/20 border-r border-border/50">
                                    <CustomCheckbox
                                      checked={isRowSelected(row)}
                                      onChange={() => toggleRowSelection(row)}
                                      aria-label="Select row"
                                    />
                                  </td>
                                )}
                                {columns.map((col) => (
                                  <TableCell
                                    key={col.name}
                                    value={row[col.name]}
                                    columnName={col.name}
                                    onPreview={(colName, val) => setPreview({ columnName: colName, value: val })}
                                    hasR2={db?.hasR2}
                                    onDeleteFile={db?.hasR2 ? (url) => setDeleteFileConfirm(url) : undefined}
                                  />
                                ))}
                                {tablePrimaryKey.length > 0 && (
                                  <td className="px-3 py-2 sticky right-0 z-10 bg-card/60 group-hover/row:bg-accent/20 border-l border-border/50 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]">
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => { setEditFormBooleans({}); setEditFormFiles({}); setEditRow({ ...row }); }}
                                        className="p-2 rounded-lg text-foreground/70 hover:bg-primary/10 hover:text-primary"
                                        aria-label="Edit row"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteRow(row)}
                                        className="p-2 rounded-lg text-foreground/70 hover:bg-red-500/10 hover:text-red-500"
                                        aria-label="Delete row"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {!loadingTable && tableData.length > 0 && (
                  <div className="px-4 py-3 border-t border-border bg-accent/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-foreground/70">
                        Showing {from.toLocaleString()}–{to.toLocaleString()} of {tableTotal.toLocaleString()}
                      </span>
                      <div className="min-w-[120px]">
                        <CustomSelect
                          value={String(pageSize)}
                          options={PAGE_SIZES.map((s) => ({ value: String(s), label: `${s} per page` }))}
                          onChange={(v) => {
                            const n = Number(v);
                            setPageSize(n);
                            setPage(0);
                            loadTableDataForCurrentTable({ page: 0, pageSize: n });
                          }}
                          openAbove
                          aria-label="Rows per page"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setPage(0); loadTableDataForCurrentTable({ page: 0 }); }}
                        disabled={currentPage === 0}
                        className="p-2 rounded-lg border border-border text-foreground/70 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="First page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setPage(currentPage - 1); loadTableDataForCurrentTable({ page: currentPage - 1 }); }}
                        disabled={currentPage === 0}
                        className="p-2 rounded-lg border border-border text-foreground/70 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-2 text-sm text-foreground/80">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => { setPage(currentPage + 1); loadTableDataForCurrentTable({ page: currentPage + 1 }); }}
                        disabled={currentPage >= totalPages - 1}
                        className="p-2 rounded-lg border border-border text-foreground/70 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Next page"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setPage(totalPages - 1); loadTableDataForCurrentTable({ page: totalPages - 1 }); }}
                        disabled={currentPage >= totalPages - 1}
                        className="p-2 rounded-lg border border-border text-foreground/70 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Last page"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "sql" && (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden flex flex-col flex-1 min-h-0">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="flex-1 min-h-[160px] w-full p-4 bg-background/50 border-0 text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-0"
              placeholder="SELECT * FROM ..."
              spellCheck={false}
            />
            <div className="px-4 py-3 border-t border-border bg-accent/30 flex items-center justify-between">
              <span className="text-xs text-foreground/50">PostgreSQL — SELECT, INSERT, UPDATE, DELETE, etc.</span>
              <button
                onClick={runSql}
                disabled={runningQuery || !sql.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningQuery ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Running…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Run
                  </>
                )}
              </button>
            </div>
          </div>
          {queryResult !== null && (
            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="px-4 py-3 border-b border-border bg-accent/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Result</h3>
                <span className="text-xs text-foreground/50">{queryResult.rowCount.toLocaleString()} row(s)</span>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-accent/50 sticky top-0">
                        {resultKeys.map((k) => (
                          <th key={k} className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultRows.length === 0 ? (
                        <tr>
                          <td colSpan={resultKeys.length} className="px-4 py-8 text-center text-foreground/50">
                            No rows returned
                          </td>
                        </tr>
                      ) : (
                        resultRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-border/60 hover:bg-accent/20">
                            {resultKeys.map((key) => (
                              <td
                                key={key}
                                className="px-4 py-2.5 text-foreground/90 max-w-[220px] truncate cursor-pointer hover:bg-primary/5"
                                title={String(row[key] ?? "")}
                                onClick={() => setPreview({ columnName: key, value: row[key] })}
                              >
                                {looksLikeImageUrl(row[key]) ? (
                                  <span className="inline-flex items-center gap-2">
                                    <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-accent shrink-0">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={String(row[key])} alt="" className="w-full h-full object-cover" />
                                    </span>
                                    <span className="truncate">View</span>
                                  </span>
                                ) : (
                                  row[key] !== null && row[key] !== undefined ? String(row[key]) : "—"
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "storage" && db?.hasR2 && (
        <div className="flex flex-1 min-h-0 overflow-auto">
          <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto py-4 px-2">
            {/* Upload section */}
            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Upload file</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">Path (folder in bucket)</label>
                  <input
                    type="text"
                    value={uploadPath}
                    onChange={(e) => setUploadPath(e.target.value)}
                    placeholder="e.g. uploads or images/products"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-foreground/50 mt-1">Object key will be: path/timestamp-random.ext</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">File</label>
                  <input
                    ref={r2UploadFileRef}
                    type="file"
                    className="block w-full text-sm text-foreground/80 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/20 file:text-primary file:font-medium hover:file:bg-primary/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleR2Upload}
                  disabled={uploadingFile}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Upload
                    </>
                  )}
                </button>
              </div>
              {uploadResult && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-foreground/80 mb-2">Public URL</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      readOnly
                      value={uploadResult.url}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-accent/30 text-foreground text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={copyUploadUrl}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-accent/50 hover:bg-accent text-foreground text-sm"
                    >
                      {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedUrl ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-foreground/50 mt-1.5">Key: {uploadResult.key}</p>
                </div>
              )}
            </div>

            {/* Files section */}
            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border bg-accent/30 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground shrink-0">Files</h3>
                <input
                  type="text"
                  value={storageListPrefix}
                  onChange={(e) => setStorageListPrefix(e.target.value)}
                  placeholder="Filter by prefix (e.g. uploads)"
                  className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={loadStorageList}
                  disabled={loadingStorageList}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 disabled:opacity-50"
                >
                  {loadingStorageList ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  List
                </button>
                {selectedStorageKeys.size > 0 && (
                  <button
                    type="button"
                    onClick={deleteStorageSelected}
                    disabled={storageDeletingKeys}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {storageDeletingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete selected ({selectedStorageKeys.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStorageDeleteAllConfirm(true)}
                  disabled={storageObjects.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete all
                </button>
              </div>
              <div className="flex-1 overflow-auto min-h-[200px]">
                {storageObjects.length === 0 && !loadingStorageList ? (
                  <div className="p-8 text-center text-foreground/50 text-sm">
                    {storageListPrefix ? "No files with this prefix. Click List to refresh." : "Click List to load files from the bucket."}
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 bg-accent/50 border-b border-border z-10">
                      <tr>
                        <th className="px-3 py-2 w-9">
                          {storageObjects.length > 0 && (
                            <CustomCheckbox
                              checked={selectedStorageKeys.size === storageObjects.length}
                              onChange={(checked) => {
                                if (checked) setSelectedStorageKeys(new Set(storageObjects.map((o) => o.key)));
                                else setSelectedStorageKeys(new Set());
                              }}
                            />
                          )}
                        </th>
                        <th className="px-3 py-2 font-semibold text-foreground">Key</th>
                        <th className="px-3 py-2 font-semibold text-foreground w-24">Size</th>
                        <th className="px-3 py-2 font-semibold text-foreground w-40">Modified</th>
                        <th className="px-3 py-2 w-28" />
                      </tr>
                    </thead>
                    <tbody>
                      {storageObjects.map((obj) => (
                        <tr key={obj.key} className="border-b border-border/60 hover:bg-accent/20">
                          <td className="px-3 py-2">
                            <CustomCheckbox
                              checked={selectedStorageKeys.has(obj.key)}
                              onChange={(checked) => {
                                setSelectedStorageKeys((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(obj.key);
                                  else next.delete(obj.key);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-foreground/90 truncate max-w-[200px]" title={obj.key}>
                            {obj.key}
                          </td>
                          <td className="px-3 py-2 text-foreground/70">
                            {obj.size < 1024 ? `${obj.size} B` : obj.size < 1024 * 1024 ? `${(obj.size / 1024).toFixed(1)} KB` : `${(obj.size / (1024 * 1024)).toFixed(2)} MB`}
                          </td>
                          <td className="px-3 py-2 text-foreground/70 text-xs">
                            {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(obj.url)}
                              className="p-1.5 rounded-lg hover:bg-accent text-foreground/70 hover:text-foreground"
                              title="Copy URL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!id) return;
                                try {
                                  const res = await fetch(`/api/databases/${id}/r2-delete-keys`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ keys: [obj.key] }),
                                  });
                                  if (res.ok) loadStorageList();
                                  else {
                                    const data = await res.json().catch(() => ({}));
                                    setError(data.error || "Delete failed");
                                  }
                                } catch {
                                  setError("Delete failed");
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-foreground/70 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {storageDeleteAllConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setStorageDeleteAllConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete all files?</h3>
            <p className="text-sm text-foreground/70 mb-4">
              This will permanently delete all objects{storageListPrefix.trim() ? ` under prefix "${storageListPrefix.trim()}"` : " in the bucket"}. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setStorageDeleteAllConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteStorageAll}
                disabled={storageDeletingAll}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {storageDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <PreviewModal
          columnName={preview.columnName}
          value={preview.value}
          onClose={() => setPreview(null)}
        />
      )}

      {editRow && selectedTable && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setEditRow(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Edit row</h3>
              <button type="button" onClick={() => setEditRow(null)} className="p-2 rounded-lg hover:bg-accent text-foreground/70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="flex-1 overflow-auto p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const set: Record<string, unknown> = {};
                const pkSet = new Set(tablePrimaryKey);
                columns.forEach((col) => {
                  if (pkSet.has(col.name)) return;
                  const input = form.elements.namedItem(`edit-${col.name}`) as HTMLInputElement | HTMLTextAreaElement | null;
                  if (!input) return;
                  let val: unknown;
                  if (col.type === "boolean") {
                    val = (input as HTMLSelectElement).value === "true";
                  } else if (col.type.includes("int") || col.type === "numeric" || col.type === "smallint" || col.type === "bigint") {
                    const n = Number((input as HTMLInputElement).value);
                    val = Number.isNaN(n) ? (input as HTMLInputElement).value : n;
                  } else {
                    val = input.value;
                  }
                  set[col.name] = val;
                });
                handleUpdateRow(getRowPk(editRow), set);
              }}
            >
              <div className="space-y-4">
                {columns.map((col) => {
                  const isPk = tablePrimaryKey.includes(col.name);
                  const val = editRow[col.name];
                  const strVal = val === null || val === undefined ? "" : String(val);
                  if (isPk) {
                    return (
                      <div key={col.name}>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{col.name} <span className="text-foreground/50">(primary key)</span></label>
                        <div className="px-3 py-2 rounded-xl bg-accent/50 text-foreground font-mono text-sm">{strVal || "—"}</div>
                      </div>
                    );
                  }
                  const isText = col.type.includes("text") || col.type.includes("char") || col.type.includes("varchar");
                  const isFileCol = isImageColumn(col.name);
                  const fileVal = editFormFiles[col.name] ?? strVal;
                  return (
                    <div key={col.name}>
                      <label className="block text-sm font-medium text-foreground mb-1">{col.name} <span className="text-foreground/50">({col.type})</span></label>
                      {isFileCol && db?.hasR2 ? (
                        <div className="space-y-2">
                          <input
                            type="hidden"
                            name={`edit-${col.name}`}
                            value={fileVal}
                            readOnly
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={fileVal}
                              onChange={(e) => setEditFormFiles((prev) => ({ ...prev, [col.name]: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                              placeholder="URL or upload a file"
                            />
                            <input
                              ref={editFileInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf,.doc,.docx,.txt"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleEditUpload(f);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => { editUploadTargetRef.current = col.name; editFileInputRef.current?.click(); }}
                              disabled={uploadingCol === col.name}
                              className="px-4 py-2 rounded-xl border border-border text-foreground/80 hover:bg-accent hover:text-foreground text-sm font-medium flex items-center gap-2 shrink-0 disabled:opacity-50"
                            >
                              {uploadingCol === col.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              Upload
                            </button>
                          </div>
                          {fileVal && (
                            <div className="flex items-center gap-2 mt-1">
                              {looksLikeImageUrl(fileVal) ? (
                                <span className="relative w-12 h-12 rounded-lg overflow-hidden bg-accent shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={fileVal} alt="" className="w-full h-full object-cover" />
                                </span>
                              ) : (
                                <span className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
                                  <File className="w-6 h-6 text-tertiary" />
                                </span>
                              )}
                              <span className="text-xs text-foreground/60 truncate flex-1">{fileVal}</span>
                            </div>
                          )}
                        </div>
                      ) : isFileCol ? (
                        <input
                          name={`edit-${col.name}`}
                          type="text"
                          defaultValue={strVal}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                          placeholder="File URL (add R2 to database to upload)"
                        />
                      ) : isText && strVal.length > 80 ? (
                        <textarea
                          name={`edit-${col.name}`}
                          defaultValue={strVal}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                        />
                      ) : col.type === "boolean" ? (
                        <>
                          <input
                            type="hidden"
                            name={`edit-${col.name}`}
                            value={editFormBooleans[col.name] ?? (val === true || val === "true" || val === 1 ? "true" : "false")}
                            readOnly
                          />
                          <CustomSelect
                            value={editFormBooleans[col.name] ?? (val === true || val === "true" || val === 1 ? "true" : "false")}
                            options={[{ value: "true", label: "true" }, { value: "false", label: "false" }]}
                            onChange={(v) => setEditFormBooleans((prev) => ({ ...prev, [col.name]: v }))}
                            aria-label={col.name}
                          />
                        </>
                      ) : (
                        <input
                          name={`edit-${col.name}`}
                          type={col.type.includes("int") || col.type === "numeric" ? "number" : "text"}
                          defaultValue={strVal}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setEditRow(null)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={savingRow} className="flex-1 py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addRowOpen && selectedTable && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setAddRowOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Add record</h3>
              <button type="button" onClick={() => setAddRowOpen(false)} className="p-2 rounded-lg hover:bg-accent text-foreground/70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="flex-1 overflow-auto p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const row: Record<string, unknown> = {};
                columns.forEach((col) => {
                  const input = form.elements.namedItem(`add-${col.name}`) as HTMLInputElement | HTMLTextAreaElement | null;
                  if (!input) return;
                  let val: unknown;
                  if (col.type === "boolean") {
                    val = (input as HTMLSelectElement).value === "true";
                  } else if (col.type.includes("int") || col.type === "numeric" || col.type === "smallint" || col.type === "bigint") {
                    const n = Number((input as HTMLInputElement).value);
                    val = (input as HTMLInputElement).value === "" ? "" : Number.isNaN(n) ? (input as HTMLInputElement).value : n;
                  } else {
                    val = input.value;
                  }
                  row[col.name] = val;
                });
                handleAddRow(row);
              }}
            >
              <div className="space-y-4">
                {columns.map((col) => {
                  const isText = col.type.includes("text") || col.type.includes("char") || col.type.includes("varchar");
                  const isFileCol = isImageColumn(col.name);
                  const fileVal = addFormFiles[col.name] ?? "";
                  return (
                    <div key={col.name}>
                      <label className="block text-sm font-medium text-foreground mb-1">{col.name} <span className="text-foreground/50">({col.type})</span></label>
                      {isFileCol && db?.hasR2 ? (
                        <div className="space-y-2">
                          <input type="hidden" name={`add-${col.name}`} value={fileVal} readOnly />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={fileVal}
                              onChange={(e) => setAddFormFiles((prev) => ({ ...prev, [col.name]: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                              placeholder="URL or upload a file"
                            />
                            <input
                              ref={addFileInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf,.doc,.docx,.txt"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAddUpload(f);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => { addUploadTargetRef.current = col.name; addFileInputRef.current?.click(); }}
                              disabled={uploadingCol === col.name}
                              className="px-4 py-2 rounded-xl border border-border text-foreground/80 hover:bg-accent hover:text-foreground text-sm font-medium flex items-center gap-2 shrink-0 disabled:opacity-50"
                            >
                              {uploadingCol === col.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              Upload
                            </button>
                          </div>
                          {fileVal && (
                            <div className="flex items-center gap-2 mt-1">
                              {looksLikeImageUrl(fileVal) ? (
                                <span className="relative w-12 h-12 rounded-lg overflow-hidden bg-accent shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={fileVal} alt="" className="w-full h-full object-cover" />
                                </span>
                              ) : (
                                <span className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
                                  <File className="w-6 h-6 text-tertiary" />
                                </span>
                              )}
                              <span className="text-xs text-foreground/60 truncate flex-1">{fileVal}</span>
                            </div>
                          )}
                        </div>
                      ) : isFileCol ? (
                        <input
                          name={`add-${col.name}`}
                          type="text"
                          defaultValue=""
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                          placeholder="File URL (add R2 to database to upload)"
                        />
                      ) : isText ? (
                        <textarea
                          name={`add-${col.name}`}
                          defaultValue=""
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                        />
                      ) : col.type === "boolean" ? (
                        <>
                          <input type="hidden" name={`add-${col.name}`} value={addFormBooleans[col.name] ?? "false"} readOnly />
                          <CustomSelect
                            value={addFormBooleans[col.name] ?? "false"}
                            options={[{ value: "true", label: "true" }, { value: "false", label: "false" }]}
                            onChange={(v) => setAddFormBooleans((prev) => ({ ...prev, [col.name]: v }))}
                            aria-label={col.name}
                          />
                        </>
                      ) : (
                        <input
                          name={`add-${col.name}`}
                          type={col.type.includes("int") || col.type === "numeric" ? "number" : "text"}
                          defaultValue=""
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setAddRowOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={savingAddRow} className="flex-1 py-2.5 rounded-xl bg-primary text-background font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingAddRow ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteRow && selectedTable && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setDeleteRow(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Delete this row?</h3>
              <p className="text-sm text-foreground/70 mb-3">This action cannot be undone.</p>
              <div className="rounded-xl bg-accent/50 p-3 font-mono text-xs text-foreground/80">
                {tablePrimaryKey.map((k) => (
                  <div key={k}><span className="text-foreground/50">{k}:</span> {String(deleteRow[k] ?? "—")}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button type="button" onClick={() => setDeleteRow(null)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-accent">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRow(getRowPk(deleteRow), deleteRow)}
                disabled={deletingRow}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => setBulkDeleteConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Delete {selectedRows.length} row(s)?</h3>
              <p className="text-sm text-foreground/70">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button type="button" onClick={() => setBulkDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-accent">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFileConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm" onClick={() => !deletingFile && setDeleteFileConfirm(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Delete file from R2?</h3>
              <p className="text-sm text-foreground/70 mb-2">The file will be removed from R2 storage. The database record will not be changed.</p>
              <p className="text-xs font-mono text-foreground/60 break-all bg-accent/50 p-2 rounded-lg">{deleteFileConfirm}</p>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button type="button" onClick={() => setDeleteFileConfirm(null)} disabled={deletingFile} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-accent disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFile(deleteFileConfirm)}
                disabled={deletingFile}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete file
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
