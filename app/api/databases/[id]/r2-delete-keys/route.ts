import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2ByKeys, isR2Configured } from "@/lib/r2-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const keys = Array.isArray(body.keys) ? body.keys.filter((k) => typeof k === "string") : [];
    if (keys.length === 0) {
      return NextResponse.json({ error: "keys array required" }, { status: 400 });
    }

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

    const { deleted, errors } = await deleteFromR2ByKeys(config, keys);
    return NextResponse.json({ ok: true, deleted, errors });
  } catch (e) {
    console.error("POST r2-delete-keys", e);
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
