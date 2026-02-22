import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export type ProductButton = { name: string; link: string };

function normalizeButtons(product: { buttons: unknown; buttonName: string; buttonLink: string }): ProductButton[] {
  const b = product.buttons;
  if (Array.isArray(b) && b.length > 0 && b.every((x) => x && typeof x.name === "string" && typeof x.link === "string")) {
    return b as ProductButton[];
  }
  return product.buttonName || product.buttonLink
    ? [{ name: product.buttonName || "Link", link: product.buttonLink || "#" }]
    : [];
}

export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      buttonName: p.buttonName,
      buttonLink: p.buttonLink,
      buttons: normalizeButtons(p),
      appIcon: p.appIcon,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
    }));
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, buttons: rawButtons, appIcon } = body;
    if (!name || !description) {
      return NextResponse.json(
        { error: "name and description required" },
        { status: 400 }
      );
    }
    const buttons = Array.isArray(rawButtons) && rawButtons.length > 0
      ? rawButtons.filter((b: unknown) => b && typeof (b as { name?: string }).name === "string" && typeof (b as { link?: string }).link === "string")
      : [];
    if (buttons.length === 0) {
      return NextResponse.json(
        { error: "At least one button (name + link) required" },
        { status: 400 }
      );
    }
    const first = buttons[0];
    const maxOrder = await prisma.product.aggregate({ _max: { sortOrder: true } }).then((r) => r._max.sortOrder ?? -1);
    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        description: String(description).trim(),
        buttonName: String(first.name).trim(),
        buttonLink: String(first.link).trim(),
        buttons: buttons as unknown as object,
        appIcon: appIcon ? String(appIcon).trim() : null,
        sortOrder: maxOrder + 1,
      },
    });
    return NextResponse.json({
      ...product,
      buttons: (product.buttons as ProductButton[]) ?? [{ name: product.buttonName, link: product.buttonLink }],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds array required" }, { status: 400 });
    }
    await Promise.all(
      (orderedIds as string[]).map((id, index) =>
        prisma.product.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reorder products" },
      { status: 500 }
    );
  }
}
