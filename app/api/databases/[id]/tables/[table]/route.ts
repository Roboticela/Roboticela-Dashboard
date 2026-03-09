import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSchema, getPrimaryKey, runQuery, quoteId } from "@/lib/pg-dynamic";

const TEXT_LIKE_TYPES = new Set([
  "character varying", "varchar", "char", "character", "text",
  "nvarchar", "nchar", "bpchar",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table: tableName } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const sort = searchParams.get("sort") ?? "";
  const order = (searchParams.get("order") ?? "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
  const search = searchParams.get("search")?.trim() ?? "";

  try {
    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }

    const schema = await getSchema(db.connectionUrl);
    const tableInfo = schema.find((t) => t.tableName === tableName);
    if (!tableInfo) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const quotedTable = quoteId(tableName);
    const columns = tableInfo.columns;
    const sortColumn = sort && columns.some((c) => c.name === sort) ? quoteId(sort) : quoteId(columns[0]?.name ?? "id");
    const textColumns = columns.filter((c) => TEXT_LIKE_TYPES.has(c.data_type));
    const hasSearch = search.length > 0 && textColumns.length > 0;

    let total = 0;
    if (hasSearch) {
      const whereClause = textColumns.map((c) => `${quoteId(c.name)} ILIKE $1`).join(" OR ");
      const countQuery = `SELECT COUNT(*)::int as c FROM ${quotedTable} WHERE (${whereClause})`;
      const countResult = await runQuery(db.connectionUrl, countQuery, [`%${search}%`]);
      total = (countResult.rows[0]?.c as number) ?? 0;
    } else {
      const countResult = await runQuery(db.connectionUrl, `SELECT COUNT(*)::int as c FROM ${quotedTable}`);
      total = (countResult.rows[0]?.c as number) ?? 0;
    }

    const orderClause = `ORDER BY ${sortColumn} ${order}`;
    let dataQuery: string;
    let dataParams: unknown[];
    if (hasSearch) {
      const whereClause = textColumns.map((c) => `${quoteId(c.name)} ILIKE $1`).join(" OR ");
      dataQuery = `SELECT * FROM ${quotedTable} WHERE (${whereClause}) ${orderClause} LIMIT $2 OFFSET $3`;
      dataParams = [`%${search}%`, limit, offset];
    } else {
      dataQuery = `SELECT * FROM ${quotedTable} ${orderClause} LIMIT $1 OFFSET $2`;
      dataParams = [limit, offset];
    }

    const dataResult = await runQuery(db.connectionUrl, dataQuery, dataParams);

    let primaryKey: string[] = [];
    try {
      primaryKey = await getPrimaryKey(db.connectionUrl, tableName);
    } catch {
      // table may have no PK
    }

    return NextResponse.json({
      rows: dataResult.rows,
      total,
      limit,
      offset,
      sort: sort || columns[0]?.name,
      order: order.toLowerCase(),
      columns: tableInfo.columns,
      primaryKey,
    });
  } catch (e) {
    console.error("GET /api/databases/[id]/tables/[table]", e);
    const message = e instanceof Error ? e.message : "Failed to load table";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
