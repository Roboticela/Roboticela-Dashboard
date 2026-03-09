import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2WithConfig, isR2Configured } from "@/lib/r2-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    const rawPath = (formData.get("path") as string | null)?.trim() ?? "";
    const pathSeg = rawPath.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/") || "uploads";
    const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
    const key = `${pathSeg}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { url } = await uploadToR2WithConfig(config, key, buffer, file.type || "application/octet-stream");
    return NextResponse.json({ url, key });
  } catch (e) {
    console.error("POST /api/databases/[id]/upload", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
