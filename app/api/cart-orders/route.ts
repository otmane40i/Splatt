import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getProducts, type StoreProduct } from "@/lib/catalog";
import { createFirestoreOrder } from "@/lib/firestore-store";

const cartOrderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerCity: z.string().min(2),
  customerAddress: z.string().min(5),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().int().min(1).max(20),
    colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(3)
  })).min(1).max(20)
});

function whatsappUrl(message: string) {
  const number = process.env.WHATSAPP_NUMBER ?? "212600000000";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function colorLine(colors: string[]) {
  return colors.length > 0 ? colors.join(", ") : "Blank / no paint selected";
}

export async function POST(request: Request) {
  const parsed = cartOrderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart order" }, { status: 400 });

  const products = await getProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const orderGroup = `SPLATT-${Date.now().toString(36).toUpperCase()}`;

  const lines = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    return product ? { ...item, product } : null;
  });

  if (lines.some((line) => !line?.product.inStock)) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 404 });
  }

  const validLines = lines as Array<{ productId: string; quantity: number; colors: string[]; product: StoreProduct }>;
  const totalPrice = validLines.reduce((total, line) => total + line.product.price * line.quantity, 0);

  await Promise.all(validLines.map(async (line, index) => {
    const notes = [
      `Cart order: ${orderGroup}`,
      `Line ${index + 1} of ${validLines.length}`,
      `Paint colors in box: ${colorLine(line.colors)}`,
      parsed.data.notes ? `Customer notes: ${parsed.data.notes}` : ""
    ].filter(Boolean).join("\n");

    const orderData = {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerCity: parsed.data.customerCity,
      customerAddress: parsed.data.customerAddress,
      productId: line.product.id,
      quantity: line.quantity,
      notes,
      productName: line.product.nameEN,
      productPrice: line.product.price,
      totalPrice: line.product.price * line.quantity
    };

    const saved = await createFirestoreOrder({ ...orderData, status: "pending" });
    if (saved) return;
    try {
      await prisma.order.create({ data: orderData });
    } catch (error) {
      console.error("Cart order line was not saved locally:", error);
    }
  }));

  const message = [
    "Salam SPLATT., I want to confirm this cart order:",
    `Order: ${orderGroup}`,
    "",
    ...validLines.flatMap((line, index) => [
      `${index + 1}. ${line.product.nameEN} x${line.quantity} - ${line.product.price * line.quantity} MAD`,
      `   Paint colors: ${colorLine(line.colors)}`
    ]),
    "",
    `Total: ${totalPrice} MAD`,
    `Name: ${parsed.data.customerName}`,
    `Phone: ${parsed.data.customerPhone}`,
    `City: ${parsed.data.customerCity}`,
    `Address: ${parsed.data.customerAddress}`,
    parsed.data.notes ? `Notes: ${parsed.data.notes}` : ""
  ].filter(Boolean).join("\n");

  return NextResponse.json({ whatsappUrl: whatsappUrl(message), orderGroup }, { status: 201 });
}
