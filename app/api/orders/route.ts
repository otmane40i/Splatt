import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { orderSchema, statusSchema } from "@/lib/validation";

function whatsappUrl(message: string) {
  const number = process.env.WHATSAPP_NUMBER ?? "212600000000";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const parsedStatus = status ? statusSchema.safeParse({ status }) : null;
  if (status && !parsedStatus?.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const orders = await prisma.order.findMany({
    where: parsedStatus?.success ? { status: parsedStatus.data.status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { product: true }
  });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product || !product.inStock) return NextResponse.json({ error: "Product unavailable" }, { status: 404 });

  const totalPrice = product.price * parsed.data.quantity;
  const order = await prisma.order.create({
    data: {
      ...parsed.data,
      productName: product.nameEN,
      productPrice: product.price,
      totalPrice
    }
  });

  const message = [
    "Salam SPLATT., I want to confirm this order:",
    `${order.productName} x${order.quantity}`,
    `Total: ${order.totalPrice} MAD`,
    `Name: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `City: ${order.customerCity}`,
    `Address: ${order.customerAddress}`,
    order.notes ? `Notes: ${order.notes}` : ""
  ].filter(Boolean).join("\n");

  return NextResponse.json({ order, whatsappUrl: whatsappUrl(message) }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string; status?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = statusSchema.safeParse({ status: body.status });
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const order = await prisma.order.update({ where: { id: body.id }, data: { status: parsed.data.status } });
  return NextResponse.json(order);
}
