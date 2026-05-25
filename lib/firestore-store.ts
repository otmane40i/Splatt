import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { StoreProduct } from "@/lib/catalog";
import type { OrderStatus } from "@/lib/status";

export type StoreOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  notes: string | null;
  createdAt: Date;
  product?: StoreProduct | null;
};

function asDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function productFromDoc(id: string, data: FirebaseFirestore.DocumentData): StoreProduct {
  return {
    id,
    slug: String(data.slug ?? id),
    nameEN: String(data.nameEN ?? ""),
    nameFR: String(data.nameFR ?? ""),
    descEN: String(data.descEN ?? ""),
    descFR: String(data.descFR ?? ""),
    price: Number(data.price ?? 0),
    image: String(data.image ?? "/products/bear.svg"),
    model3d: typeof data.model3d === "string" && data.model3d.length > 0 ? data.model3d : null,
    category: String(data.category ?? "Figures"),
    inStock: Boolean(data.inStock ?? true),
    featured: Boolean(data.featured ?? false),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt)
  };
}

function orderFromDoc(id: string, data: FirebaseFirestore.DocumentData): StoreOrder {
  return {
    id,
    customerName: String(data.customerName ?? ""),
    customerPhone: String(data.customerPhone ?? ""),
    customerCity: String(data.customerCity ?? ""),
    customerAddress: String(data.customerAddress ?? ""),
    productId: String(data.productId ?? ""),
    productName: String(data.productName ?? ""),
    productPrice: Number(data.productPrice ?? 0),
    quantity: Number(data.quantity ?? 1),
    totalPrice: Number(data.totalPrice ?? 0),
    status: String(data.status ?? "pending") as OrderStatus,
    notes: typeof data.notes === "string" ? data.notes : null,
    createdAt: asDate(data.createdAt),
    product: null
  };
}

export async function getFirestoreProducts() {
  const db = getFirebaseDb();
  if (!db) return null;

  const snapshot = await db.collection("products").orderBy("createdAt", "asc").get();
  return snapshot.docs.map((doc) => productFromDoc(doc.id, doc.data()));
}

export async function getFirestoreProductBySlug(slug: string) {
  const db = getFirebaseDb();
  if (!db) return null;

  const direct = await db.collection("products").doc(slug).get();
  if (direct.exists) return productFromDoc(direct.id, direct.data() ?? {});

  const snapshot = await db.collection("products").where("slug", "==", slug).limit(1).get();
  const doc = snapshot.docs[0];
  return doc ? productFromDoc(doc.id, doc.data()) : null;
}

export async function saveFirestoreProduct(product: Omit<StoreProduct, "createdAt" | "updatedAt">) {
  const db = getFirebaseDb();
  if (!db) return null;

  const id = product.id || product.slug;
  const ref = db.collection("products").doc(id);
  const existing = await ref.get();
  await ref.set(
    {
      ...product,
      id,
      createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  const saved = await ref.get();
  return productFromDoc(saved.id, saved.data() ?? {});
}

export async function deleteFirestoreProduct(id: string) {
  const db = getFirebaseDb();
  if (!db) return false;
  await db.collection("products").doc(id).delete();
  return true;
}

export async function getFirestoreOrders(status?: OrderStatus) {
  const db = getFirebaseDb();
  if (!db) return null;

  let query: FirebaseFirestore.Query = db.collection("orders");
  if (status) query = query.where("status", "==", status);
  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => orderFromDoc(doc.id, doc.data()));
}

export async function createFirestoreOrder(data: Omit<StoreOrder, "id" | "createdAt" | "product">) {
  const db = getFirebaseDb();
  if (!db) return null;

  const ref = await db.collection("orders").add({
    ...data,
    createdAt: FieldValue.serverTimestamp()
  });
  const saved = await ref.get();
  return orderFromDoc(saved.id, saved.data() ?? {});
}

export async function updateFirestoreOrderStatus(id: string, status: OrderStatus) {
  const db = getFirebaseDb();
  if (!db) return null;

  const ref = db.collection("orders").doc(id);
  await ref.update({ status });
  const saved = await ref.get();
  return orderFromDoc(saved.id, saved.data() ?? {});
}
