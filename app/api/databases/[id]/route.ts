import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskConnectionUrl } from "@/lib/pg-dynamic";
import { isR2Configured } from "@/lib/r2-dynamic";

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
    return NextResponse.json({
      id: db.id,
      name: db.name,
      connectionUrlMasked: maskConnectionUrl(db.connectionUrl),
      hasR2: isR2Configured({
        r2AccountId: db.r2AccountId,
        r2AccessKeyId: db.r2AccessKeyId,
        r2SecretAccessKey: db.r2SecretAccessKey,
        r2Bucket: db.r2Bucket,
        r2PublicUrl: db.r2PublicUrl,
      }),
      createdAt: db.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("GET /api/databases/[id]", e);
    return NextResponse.json({ error: "Failed to load database" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: Record<string, string | null> = {};

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.connectionUrl === "string" && body.connectionUrl.trim()) data.connectionUrl = body.connectionUrl.trim();
    if (body.r2AccountId !== undefined) data.r2AccountId = typeof body.r2AccountId === "string" && body.r2AccountId.trim() ? body.r2AccountId.trim() : null;
    if (body.r2AccessKeyId !== undefined) data.r2AccessKeyId = typeof body.r2AccessKeyId === "string" && body.r2AccessKeyId.trim() ? body.r2AccessKeyId.trim() : null;
    if (body.r2SecretAccessKey !== undefined) data.r2SecretAccessKey = typeof body.r2SecretAccessKey === "string" && body.r2SecretAccessKey.trim() ? body.r2SecretAccessKey.trim() : null;
    if (body.r2Bucket !== undefined) data.r2Bucket = typeof body.r2Bucket === "string" && body.r2Bucket.trim() ? body.r2Bucket.trim() : null;
    if (body.r2PublicUrl !== undefined) data.r2PublicUrl = typeof body.r2PublicUrl === "string" && body.r2PublicUrl.trim() ? body.r2PublicUrl.trim() : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.savedDatabase.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      connectionUrlMasked: maskConnectionUrl(updated.connectionUrl),
      hasR2: isR2Configured({
        r2AccountId: updated.r2AccountId,
        r2AccessKeyId: updated.r2AccessKeyId,
        r2SecretAccessKey: updated.r2SecretAccessKey,
        r2Bucket: updated.r2Bucket,
        r2PublicUrl: updated.r2PublicUrl,
      }),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("PATCH /api/databases/[id]", e);
    return NextResponse.json(
      { error: "Failed to update database" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.savedDatabase.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/databases/[id]", e);
    return NextResponse.json(
      { error: "Failed to delete database" },
      { status: 500 }
    );
  }
}
