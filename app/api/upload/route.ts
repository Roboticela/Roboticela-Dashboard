import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, isR2Configured, isAllowedImageType } from "@/lib/r2";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Upload not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL." },
      { status: 503 }
    );
  }

  try {
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
    if (!isAllowedImageType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPEG, WebP, GIF, SVG." },
        { status: 400 }
      );
    }
    const ext = file.name.split(".").pop() || "bin";
    const key = `product/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToR2(key, buffer, file.type);
    return NextResponse.json({ url, key });
  } catch (e) {
    console.error("Upload error:", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
