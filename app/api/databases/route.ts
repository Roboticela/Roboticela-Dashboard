import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskConnectionUrl } from "@/lib/pg-dynamic";
import { isR2Configured } from "@/lib/r2-dynamic";

export async function GET() {
  try {
    const list = await prisma.savedDatabase.findMany({
      orderBy: { createdAt: "desc" },
    });
    const safe = list.map((db) => ({
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
    }));
    return NextResponse.json(safe);
  } catch (e) {
    console.error("GET /api/databases", e);
    return NextResponse.json(
      { error: "Failed to list databases" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const connectionUrl = typeof body.connectionUrl === "string" ? body.connectionUrl.trim() : "";
    if (!name || !connectionUrl) {
      return NextResponse.json(
        { error: "name and connectionUrl are required" },
        { status: 400 }
      );
    }
    const r2AccountId = typeof body.r2AccountId === "string" ? body.r2AccountId.trim() || null : null;
    const r2AccessKeyId = typeof body.r2AccessKeyId === "string" ? body.r2AccessKeyId.trim() || null : null;
    const r2SecretAccessKey = typeof body.r2SecretAccessKey === "string" ? body.r2SecretAccessKey.trim() || null : null;
    const r2Bucket = typeof body.r2Bucket === "string" ? body.r2Bucket.trim() || null : null;
    const r2PublicUrl = typeof body.r2PublicUrl === "string" ? body.r2PublicUrl.trim() || null : null;

    const db = await prisma.savedDatabase.create({
      data: {
        name,
        connectionUrl,
        r2AccountId: r2AccountId || undefined,
        r2AccessKeyId: r2AccessKeyId || undefined,
        r2SecretAccessKey: r2SecretAccessKey || undefined,
        r2Bucket: r2Bucket || undefined,
        r2PublicUrl: r2PublicUrl || undefined,
      },
    });
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
    console.error("POST /api/databases", e);
    return NextResponse.json(
      { error: "Failed to add database" },
      { status: 500 }
    );
  }
}
