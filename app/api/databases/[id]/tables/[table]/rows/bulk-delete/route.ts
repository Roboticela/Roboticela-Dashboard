import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPrimaryKey, runQuery, quoteId } from "@/lib/pg-dynamic";
import { deleteFromR2ByUrls, isR2Configured } from "@/lib/r2-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table: tableName } = await params;
  try {
    const body = await request.json();
    const rows = body.rows as Record<string, unknown>[] | undefined;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array is required and must not be empty" }, { status: 400 });
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

    const pk = await getPrimaryKey(db.connectionUrl, tableName);
    if (pk.length === 0) return NextResponse.json({ error: "Table has no primary key" }, { status: 400 });

    const quotedTable = quoteId(tableName);
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    for (const row of rows) {
      const part = pk.map((col) => {
        const v = row[col];
        if (v === undefined || v === null) return null;
        values.push(v);
        const placeholder = `$${paramIndex++}`;
        return `${quoteId(col)} = ${placeholder}`;
      }).filter(Boolean);
      if (part.length === pk.length) {
        conditions.push(`(${part.join(" AND ")})`);
      }
    }

    if (conditions.length === 0) {
      return NextResponse.json({ error: "No valid rows to delete (each row must contain primary key values)" }, { status: 400 });
    }

    const query = `DELETE FROM ${quotedTable} WHERE ${conditions.join(" OR ")}`;
    await runQuery(db.connectionUrl, query, values);

    return NextResponse.json({ ok: true, deleted: conditions.length });
  } catch (e) {
    console.error("POST bulk-delete", e);
    const message = e instanceof Error ? e.message : "Bulk delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
