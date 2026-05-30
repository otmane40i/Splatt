import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getFirestoreOrders } from "@/lib/firestore-store";
import type { OrderStatus } from "@/lib/status";

const trackSchema = z.object({
  orderId: z.string().min(3),
  phone: z.string().min(6)
});

function digits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function POST(request: Request) {
  const parsed = trackSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tracking details" }, { status: 400 });

  const orderId = parsed.data.orderId.trim().toLowerCase();
  const phone = digits(parsed.data.phone);
  const firestoreOrders = await getFirestoreOrders().catch(() => null);
  const firestoreMatch = firestoreOrders?.find((order) => {
    const idMatches = order.id.toLowerCase().includes(orderId) || order.id.slice(0, 8).toLowerCase() === orderId;
    return idMatches && digits(order.customerPhone).endsWith(phone.slice(-8));
  });

  if (firestoreMatch) {
    return NextResponse.json({
      id: firestoreMatch.id,
      customerName: firestoreMatch.customerName,
      productName: firestoreMatch.productName,
      quantity: firestoreMatch.quantity,
      totalPrice: firestoreMatch.totalPrice,
      status: firestoreMatch.status,
      createdAt: firestoreMatch.createdAt
    });
  }

  const prismaOrders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
  const prismaMatch = prismaOrders.find((order) => {
    const idMatches = order.id.toLowerCase().includes(orderId) || order.id.slice(0, 8).toLowerCase() === orderId;
    return idMatches && digits(order.customerPhone).endsWith(phone.slice(-8));
  });

  if (!prismaMatch) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json({
    id: prismaMatch.id,
    customerName: prismaMatch.customerName,
    productName: prismaMatch.productName,
    quantity: prismaMatch.quantity,
    totalPrice: prismaMatch.totalPrice,
    status: prismaMatch.status as OrderStatus,
    createdAt: prismaMatch.createdAt
  });
}
