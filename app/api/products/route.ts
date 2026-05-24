import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
import { getProducts } from "@/lib/catalog";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
}

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const product = await prisma.product.update({ where: { id: body.id }, data: parsed.data });
  return NextResponse.json(product);
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
