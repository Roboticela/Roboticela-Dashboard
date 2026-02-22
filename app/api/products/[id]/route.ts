import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ProductButton } from "../route";

function normalizeButtons(product: { buttons: unknown; buttonName: string; buttonLink: string }): ProductButton[] {
  const b = product.buttons;
  if (Array.isArray(b) && b.length > 0 && b.every((x) => x && typeof x.name === "string" && typeof x.link === "string")) {
    return b as ProductButton[];
  }
  return product.buttonName || product.buttonLink
    ? [{ name: product.buttonName || "Link", link: product.buttonLink || "#" }]
    : [];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...product,
      buttons: normalizeButtons(product),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, buttons: rawButtons, appIcon } = body;
    const update: Record<string, unknown> = {};
    if (name != null) update.name = String(name).trim();
    if (description != null) update.description = String(description).trim();
    if (appIcon !== undefined) update.appIcon = appIcon ? String(appIcon).trim() : null;
    if (Array.isArray(rawButtons) && rawButtons.length > 0) {
      const buttons = rawButtons.filter((b: unknown) => b && typeof (b as { name?: string }).name === "string" && typeof (b as { link?: string }).link === "string");
      if (buttons.length > 0) {
        update.buttons = buttons;
        const first = buttons[0];
        update.buttonName = String(first.name).trim();
        update.buttonLink = String(first.link).trim();
      }
    }
    const product = await prisma.product.update({
      where: { id },
      data: update as { name?: string; description?: string; appIcon?: string | null; buttons?: object; buttonName?: string; buttonLink?: string },
    });
    return NextResponse.json({
      ...product,
      buttons: normalizeButtons(product),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
