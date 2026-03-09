import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSchema } from "@/lib/pg-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }
    const schema = await getSchema(db.connectionUrl);
    return NextResponse.json(schema);
  } catch (e) {
    console.error("GET /api/databases/[id]/schema", e);
    return NextResponse.json(
      { error: "Failed to fetch schema. Check connection URL." },
      { status: 500 }
    );
  }
}
