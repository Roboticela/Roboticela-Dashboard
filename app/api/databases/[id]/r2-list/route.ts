import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isR2Configured, listR2Objects } from "@/lib/r2-dynamic";

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") ?? "";
    const objects = await listR2Objects(config, prefix);
    return NextResponse.json({ objects });
  } catch (e) {
    console.error("GET r2-list", e);
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
