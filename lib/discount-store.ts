import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { prisma } from "@/lib/prisma";
import { getFirebaseDb } from "@/lib/firebase";
import type { DiscountCode } from "@/lib/pricing";

type DiscountInput = Omit<DiscountCode, "createdAt" | "updatedAt" | "usedCount"> & { usedCount?: number };

function asDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function discountFromDoc(id: string, data: FirebaseFirestore.DocumentData): DiscountCode {
  const type = data.type === "fixed" ? "fixed" : "percentage";
  return {
    id,
    code: String(data.code ?? id).toUpperCase(),
    type,
    value: Number(data.value ?? 0),
    minTotal: Number(data.minTotal ?? 0),
    active: Boolean(data.active ?? true),
    usageLimit: typeof data.usageLimit === "number" ? data.usageLimit : null,
    usedCount: Number(data.usedCount ?? 0),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt)
  };
}

function discountFromPrisma(discount: {
  id: string;
  code: string;
  type: string;
  value: number;
  minTotal: number;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}): DiscountCode {
  return {
    ...discount,
    type: discount.type === "fixed" ? "fixed" : "percentage"
  };
}

export async function getDiscountCodes() {
  const db = getFirebaseDb();
  if (db) {
    const snapshot = await db.collection("discounts").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc) => discountFromDoc(doc.id, doc.data()));
  }

  const discounts = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return discounts.map(discountFromPrisma);
}

export async function getDiscountCode(code: string) {
  const normalized = code.trim().toUpperCase();
  const db = getFirebaseDb();
  if (db) {
    const direct = await db.collection("discounts").doc(normalized).get();
    if (direct.exists) return discountFromDoc(direct.id, direct.data() ?? {});
    const snapshot = await db.collection("discounts").where("code", "==", normalized).limit(1).get();
    const doc = snapshot.docs[0];
    return doc ? discountFromDoc(doc.id, doc.data()) : null;
  }

  const discount = await prisma.discountCode.findUnique({ where: { code: normalized } });
  return discount ? discountFromPrisma(discount) : null;
}

export async function saveDiscountCode(discount: DiscountInput) {
  const id = discount.id || discount.code;
  const normalized = discount.code.trim().toUpperCase();
  const db = getFirebaseDb();
  if (db) {
    const ref = db.collection("discounts").doc(id || normalized);
    const existing = await ref.get();
    await ref.set(
      {
        ...discount,
        code: normalized,
        usedCount: discount.usedCount ?? existing.data()?.usedCount ?? 0,
        createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    const saved = await ref.get();
    return discountFromDoc(saved.id, saved.data() ?? {});
  }

  const saved = await prisma.discountCode.upsert({
    where: { id: id || normalized },
    create: { ...discount, id: id || undefined, code: normalized, usedCount: discount.usedCount ?? 0 },
    update: { ...discount, code: normalized }
  });
  return discountFromPrisma(saved);
}

export async function deleteDiscountCode(id: string) {
  const db = getFirebaseDb();
  if (db) {
    await db.collection("discounts").doc(id).delete();
    return;
  }

  await prisma.discountCode.delete({ where: { id } });
}
