import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runQuery } from "@/lib/pg-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const databaseId = typeof body.databaseId === "string" ? body.databaseId : null;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    let connectionUrl: string;
    if (databaseId) {
      const db = await prisma.savedDatabase.findUnique({ where: { id: databaseId } });
      if (!db) {
        return NextResponse.json({ error: "Database not found" }, { status: 404 });
      }
      connectionUrl = db.connectionUrl;
    } else {
      return NextResponse.json(
        { error: "databaseId is required" },
        { status: 400 }
      );
    }

    const result = await runQuery(connectionUrl, query);
    return NextResponse.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields,
    });
  } catch (e) {
    console.error("POST /api/databases/query", e);
    const message = e instanceof Error ? e.message : "Query failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
