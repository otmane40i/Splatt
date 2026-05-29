import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
import { getProducts } from "@/lib/catalog";
import { deleteFirestoreProduct, saveFirestoreProduct } from "@/lib/firestore-store";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
}

function productWithDefaults(data: typeof productSchema._type) {
  return {
    ...data,
    model3d: data.model3d ?? null,
    stockQuantity: data.stockQuantity ?? null,
    bundleQuantity: data.bundleQuantity ?? null,
    bundlePrice: data.bundlePrice ?? null,
    filamentGrams: data.filamentGrams ?? 187,
    printTimeMinutes: data.printTimeMinutes ?? 240,
    productionCost: data.productionCost ?? 90
  };
}

function prismaProductData(data: ReturnType<typeof productWithDefaults>) {
  const { filamentGrams, printTimeMinutes, productionCost, ...product } = data;
  void filamentGrams;
  void printTimeMinutes;
  void productionCost;
  return product;
}

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "product"} ${issue.message}`).join(", ");
    return NextResponse.json({ error: "Invalid product", details }, { status: 400 });
  }
  const existing = (await getProducts()).find((product) => product.slug === parsed.data.slug);
  if (existing) {
    return NextResponse.json({ error: "Product slug already exists", details: "Use a different slug, or edit the existing product instead." }, { status: 409 });
  }
  const productData = productWithDefaults(parsed.data);
  const firestoreProduct = await saveFirestoreProduct({ id: parsed.data.slug, ...productData });
  if (firestoreProduct) return NextResponse.json(firestoreProduct, { status: 201 });
  const product = await prisma.product.create({ data: prismaProductData(productData) });
  return NextResponse.json(product, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "product"} ${issue.message}`).join(", ");
    return NextResponse.json({ error: "Invalid product", details }, { status: 400 });
  }
  const duplicate = (await getProducts()).find((product) => product.slug === parsed.data.slug && product.id !== body.id);
  if (duplicate) {
    return NextResponse.json({ error: "Product slug already exists", details: "Use a different slug for this product." }, { status: 409 });
  }
  const productData = productWithDefaults(parsed.data);
  const firestoreProduct = await saveFirestoreProduct({ id: body.id, ...productData });
  if (firestoreProduct) return NextResponse.json(firestoreProduct);
  const product = await prisma.product.update({ where: { id: body.id }, data: prismaProductData(productData) });
  return NextResponse.json(product);
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (await deleteFirestoreProduct(id)) return NextResponse.json({ ok: true });
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
