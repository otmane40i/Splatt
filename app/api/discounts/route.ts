import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteDiscountCode, getDiscountCodes, saveDiscountCode } from "@/lib/discount-store";
import { discountCodeSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
}

function withDefaults(data: {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minTotal: number;
  active: boolean;
  usageLimit?: number | null;
}) {
  return { ...data, usageLimit: data.usageLimit ?? null };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getDiscountCodes());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = discountCodeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid discount code" }, { status: 400 });
  const discount = await saveDiscountCode({ id: parsed.data.code, usedCount: 0, ...withDefaults(parsed.data) });
  return NextResponse.json(discount, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string; usedCount?: number };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = discountCodeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid discount code" }, { status: 400 });
  const discount = await saveDiscountCode({ id: body.id, usedCount: body.usedCount ?? 0, ...withDefaults(parsed.data) });
  return NextResponse.json(discount);
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteDiscountCode(id);
  return NextResponse.json({ ok: true });
}
