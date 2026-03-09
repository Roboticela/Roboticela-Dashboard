import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2ByKeys, isR2Configured, listR2Objects } from "@/lib/r2-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await prisma.savedDatabase.findUnique({ where: { id } });
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 404 });

    const config = {
      r2AccountId: db.r2AccountId,
      r2AccessKeyId: db.r2AccessKeyId,
      r2SecretAccessKey: db.r2SecretAccessKey,
      r2Bucket: db.r2Bucket,
      r2PublicUrl: db.r2PublicUrl,
    };
    if (!isR2Configured(config)) {
      return NextResponse.json({ error: "R2 not configured for this database" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const prefix = typeof body.prefix === "string" ? body.prefix : "";
    const objects = await listR2Objects(config, prefix);
    const keys = objects.map((o) => o.key);
    if (keys.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0, message: "No objects to delete" });
    }
    const { deleted, errors } = await deleteFromR2ByKeys(config, keys);
    return NextResponse.json({ ok: true, deleted: deleted.length, errors });
  } catch (e) {
    console.error("POST r2-delete-all", e);
    const message = e instanceof Error ? e.message : "Delete all failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
