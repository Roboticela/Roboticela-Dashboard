import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPrimaryKey, getTableColumns, runQuery, quoteId } from "@/lib/pg-dynamic";
import { deleteFromR2ByUrls, isR2Configured } from "@/lib/r2-dynamic";

const TEMPORAL_TYPES = /^(timestamp|date|time|interval)/i;
function isTemporalType(dataType: string): boolean {
  return TEMPORAL_TYPES.test(dataType);
}

function buildWhereFromPk(quotedTable: string, where: Record<string, unknown>, quote: (n: string) => string): { clause: string; values: unknown[] } {
  const keys = Object.keys(where).filter((k) => where[k] !== undefined && where[k] !== null);
  if (keys.length === 0) throw new Error("where must contain at least one key");
  const clause = keys.map((k, i) => `${quote(k)} = $${i + 1}`).join(" AND ");
  return { clause, values: keys.map((k) => where[k]) };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table: tableName } = await params;
  try {
    const body = await request.json();
    const row = body.row as Record<string, unknown> | undefined;
    if (!row || typeof row !== "object") {
      return NextResponse.json({ error: "row is required" }, { status: 400 });
    }

    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 404 });

    const columns = await getTableColumns(db.connectionUrl, tableName);
    const typeByColumn = Object.fromEntries(columns.map((c) => [c.name, c.type]));

    const defaultTimestampCols = ["createdAt", "updatedAt", "created_at", "updated_at"];
    const now = new Date().toISOString();
    for (const col of columns) {
      if (defaultTimestampCols.includes(col.name) && isTemporalType(col.type)) {
        const v = row[col.name];
        if (v === undefined || v === null || v === "") {
          (row as Record<string, unknown>)[col.name] = now;
        }
      }
    }

    const quotedTable = quoteId(tableName);
    const typeByCol = typeByColumn as Record<string, string>;
    const keysWithValues: string[] = [];
    const values: unknown[] = [];
    for (const k of Object.keys(row)) {
      if (!columns.some((c) => c.name === k)) continue;
      let val = row[k];
      const type = typeByCol[k] ?? "";
      if (val === "") {
        if (isTemporalType(type) || /^(integer|bigint|smallint|numeric|real|double precision)/i.test(type)) {
          val = null;
        }
      }
      if (val === null || val === undefined) continue;
      keysWithValues.push(k);
      values.push(val);
    }
    if (keysWithValues.length === 0) return NextResponse.json({ error: "row must contain at least one column value" }, { status: 400 });

    const cols = keysWithValues.map((k) => quoteId(k)).join(", ");
    const placeholders = keysWithValues.map((_, i) => `$${i + 1}`).join(", ");
    const query = `INSERT INTO ${quotedTable} (${cols}) VALUES (${placeholders})`;
    await runQuery(db.connectionUrl, query, values);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST rows", e);
    const message = e instanceof Error ? e.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table: tableName } = await params;
  try {
    const body = await request.json();
    const where = body.where as Record<string, unknown> | undefined;
    const set = body.set as Record<string, unknown> | undefined;
    if (!where || typeof where !== "object" || !set || typeof set !== "object") {
      return NextResponse.json({ error: "where and set are required" }, { status: 400 });
    }

    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 404 });

    const pk = await getPrimaryKey(db.connectionUrl, tableName);
    if (pk.length === 0) return NextResponse.json({ error: "Table has no primary key" }, { status: 400 });

    const columns = await getTableColumns(db.connectionUrl, tableName);
    const typeByColumn = Object.fromEntries(columns.map((c) => [c.name, c.type]));

    const quotedTable = quoteId(tableName);
    const setKeys = Object.keys(set).filter((k) => set[k] !== undefined);
    if (setKeys.length === 0) return NextResponse.json({ error: "set must contain at least one column" }, { status: 400 });

    const setClause = setKeys.map((k, i) => `${quoteId(k)} = $${i + 1}`).join(", ");
    const whereKeys = Object.keys(where).filter((k) => where[k] !== undefined && where[k] !== null);
    const whereClause = whereKeys.map((k, i) => `${quoteId(k)} = $${setKeys.length + i + 1}`).join(" AND ");
    const setValues = setKeys.map((k) => {
      const val = set[k];
      if (val === "" && isTemporalType(typeByColumn[k] ?? "")) return null;
      return val;
    });
    const values = [...setValues, ...whereKeys.map((k) => where[k])];
    const query = `UPDATE ${quotedTable} SET ${setClause} WHERE ${whereClause}`;
    await runQuery(db.connectionUrl, query, values);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH rows", e);
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table: tableName } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const where = (body.where ?? body) as Record<string, unknown>;
    if (!where || typeof where !== "object" || Object.keys(where).length === 0) {
      return NextResponse.json({ error: "where (primary key) is required" }, { status: 400 });
    }

    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 404 });

    const fileUrls = (body.fileUrls as string[] | undefined) ?? [];
    const config = {
      r2AccountId: db.r2AccountId,
      r2AccessKeyId: db.r2AccessKeyId,
      r2SecretAccessKey: db.r2SecretAccessKey,
      r2Bucket: db.r2Bucket,
      r2PublicUrl: db.r2PublicUrl,
    };
    if (fileUrls.length > 0 && isR2Configured(config)) {
      await deleteFromR2ByUrls(config, fileUrls);
    }

    const quotedTable = quoteId(tableName);
    const whereResult = buildWhereFromPk(quotedTable, where, quoteId);
    const query = `DELETE FROM ${quotedTable} WHERE ${whereResult.clause}`;
    await runQuery(db.connectionUrl, query, whereResult.values);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE rows", e);
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
