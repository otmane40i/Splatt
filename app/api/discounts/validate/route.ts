import { NextResponse } from "next/server";
import { getDiscountCode } from "@/lib/discount-store";
import { discountAmount } from "@/lib/pricing";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string; subtotal?: number };
  const code = body.code?.trim().toUpperCase();
  const subtotal = Number(body.subtotal ?? 0);
  if (!code || subtotal <= 0) return NextResponse.json({ error: "Invalid discount" }, { status: 400 });

  const discount = await getDiscountCode(code);
  const amount = discountAmount(discount, subtotal);
  if (!discount || amount <= 0) return NextResponse.json({ error: "Discount unavailable" }, { status: 404 });

  return NextResponse.json({ discount, amount });
}
