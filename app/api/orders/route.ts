import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { adminOrderUpdateSchema, orderSchema, statusSchema } from "@/lib/validation";
import { sampleProducts, type StoreProduct } from "@/lib/catalog";
import { createFirestoreOrder, deleteFirestoreOrder, getFirestoreOrders, updateFirestoreOrder, updateFirestoreOrderStatus } from "@/lib/firestore-store";

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
  const firestoreOrders = await getFirestoreOrders(parsedStatus?.success ? parsedStatus.data.status : undefined);
  if (firestoreOrders) return NextResponse.json(firestoreOrders);
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

  let product: StoreProduct | null = null;
  try {
    product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  } catch (error) {
    console.error("Order product lookup fell back to static products:", error);
  }
  product ??= sampleProducts.find((item) => item.id === parsed.data.productId || item.slug === parsed.data.productId) ?? null;
  if (!product || !product.inStock) return NextResponse.json({ error: "Product unavailable" }, { status: 404 });

  const totalPrice = product.price * parsed.data.quantity;
  const orderData = {
    ...parsed.data,
    productName: product.nameEN,
    productPrice: product.price,
    totalPrice
  };
  let order: unknown = await createFirestoreOrder({ ...orderData, status: "pending", notes: orderData.notes ?? null });
  try {
    order ??= await prisma.order.create({ data: orderData });
  } catch (error) {
    console.error("Order was not saved, continuing to WhatsApp:", error);
  }

  const message = [
    "Salam SPLATT., I want to confirm this order:",
    `${orderData.productName} x${orderData.quantity}`,
    `Total: ${orderData.totalPrice} MAD`,
    `Name: ${orderData.customerName}`,
    `Phone: ${orderData.customerPhone}`,
    `City: ${orderData.customerCity}`,
    `Address: ${orderData.customerAddress}`,
    orderData.notes ? `Notes: ${orderData.notes}` : ""
  ].filter(Boolean).join("\n");

  return NextResponse.json({ order, whatsappUrl: whatsappUrl(message) }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string; status?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const fullUpdate = adminOrderUpdateSchema.safeParse(body);
  if (fullUpdate.success) {
    const updateData = { ...fullUpdate.data, notes: fullUpdate.data.notes ?? null };
    const firestoreOrder = await updateFirestoreOrder(updateData);
    if (firestoreOrder) return NextResponse.json(firestoreOrder);
    const order = await prisma.order.update({
      where: { id: updateData.id },
      data: {
        customerName: updateData.customerName,
        customerPhone: updateData.customerPhone,
        customerCity: updateData.customerCity,
        customerAddress: updateData.customerAddress,
        productName: updateData.productName,
        quantity: updateData.quantity,
        totalPrice: updateData.totalPrice,
        status: updateData.status,
        notes: updateData.notes
      }
    });
    return NextResponse.json(order);
  }
  const parsed = statusSchema.safeParse({ status: body.status });
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const firestoreOrder = await updateFirestoreOrderStatus(body.id, parsed.data.status);
  if (firestoreOrder) return NextResponse.json(firestoreOrder);
  const order = await prisma.order.update({ where: { id: body.id }, data: { status: parsed.data.status } });
  return NextResponse.json(order);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (await deleteFirestoreOrder(id)) return NextResponse.json({ ok: true });
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
