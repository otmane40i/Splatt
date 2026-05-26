import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { productionItemSchema } from "@/lib/validation";
import { deleteFirestoreProductionItem, getFirestoreProductionItems, saveFirestoreProductionItem } from "@/lib/firestore-store";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
}

function fromPrisma(item: {
  id: string;
  name: string;
  type: string;
  status: string;
  quantity: number;
  unit: string;
  unitCost: number;
  monthlyCost: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return item;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const firestoreItems = await getFirestoreProductionItems();
  if (firestoreItems) return NextResponse.json(firestoreItems);
  const items = await prisma.productionItem.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items.map(fromPrisma));
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = productionItemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid production item" }, { status: 400 });
  const firestoreItem = await saveFirestoreProductionItem({ id: "", ...parsed.data, notes: parsed.data.notes ?? null });
  if (firestoreItem) return NextResponse.json(firestoreItem, { status: 201 });
  const item = await prisma.productionItem.create({ data: { ...parsed.data, notes: parsed.data.notes ?? null } });
  return NextResponse.json(fromPrisma(item), { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = productionItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid production item" }, { status: 400 });
  const firestoreItem = await saveFirestoreProductionItem({ id: body.id, ...parsed.data, notes: parsed.data.notes ?? null });
  if (firestoreItem) return NextResponse.json(firestoreItem);
  const item = await prisma.productionItem.update({ where: { id: body.id }, data: { ...parsed.data, notes: parsed.data.notes ?? null } });
  return NextResponse.json(fromPrisma(item));
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (await deleteFirestoreProductionItem(id)) return NextResponse.json({ ok: true });
  await prisma.productionItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
