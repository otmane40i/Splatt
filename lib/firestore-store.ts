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

export type ProductionItem = {
  id: string;
  name: string;
  type: "filament" | "printer" | "box" | "paint" | "tool" | "charge" | "other";
  status: "available" | "low" | "active" | "maintenance" | "ordered" | "paused";
  quantity: number;
  unit: string;
  unitCost: number;
  monthlyCost: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MachineStatus = "idle" | "printing" | "done" | "paused";
export type PrintJobStatus = "queued" | "printing" | "done" | "cancelled";
export type UnitStatus = "printed" | "packaged" | "delivered";

export type ProductionMachine = {
  id: string;
  name: string;
  model: string;
  status: MachineStatus;
  currentJobId: string | null;
  currentJobName: string | null;
  productName: string | null;
  startedAt: Date | null;
  estimatedSeconds: number;
  pausedRemainingSeconds: number | null;
};

export type PrintQueueJob = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  linkedOrderId: string;
  customer: string;
  filamentGrams: number;
  estimatedMinutes: number;
  status: PrintJobStatus;
  assignedMachineId: string | null;
  completedAt: Date | null;
  orderRevenue: number;
};

export type ProductionInventoryItem = {
  id: string;
  name: string;
  category: "filament" | "paint" | "brush" | "cup" | "box" | "plate";
  stock: number;
  minThreshold: number;
  unit: string;
  unitCost: number;
};

export type ProductionUnit = {
  id: string;
  productSlug: string;
  productName: string;
  orderId: string;
  customer: string;
  status: UnitStatus;
  createdAt: Date;
};

export type ProductionSystem = {
  machines: ProductionMachine[];
  queue: PrintQueueJob[];
  inventory: ProductionInventoryItem[];
  units: ProductionUnit[];
  updatedAt: Date;
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
    stockQuantity: typeof data.stockQuantity === "number" ? data.stockQuantity : null,
    bundleQuantity: typeof data.bundleQuantity === "number" ? data.bundleQuantity : null,
    bundlePrice: typeof data.bundlePrice === "number" ? data.bundlePrice : null,
    filamentGrams: Number(data.filamentGrams ?? 187),
    printTimeMinutes: Number(data.printTimeMinutes ?? 240),
    productionCost: Number(data.productionCost ?? 90),
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

function productionItemFromDoc(id: string, data: FirebaseFirestore.DocumentData): ProductionItem {
  return {
    id,
    name: String(data.name ?? ""),
    type: String(data.type ?? "other") as ProductionItem["type"],
    status: String(data.status ?? "available") as ProductionItem["status"],
    quantity: Number(data.quantity ?? 0),
    unit: String(data.unit ?? "unit"),
    unitCost: Number(data.unitCost ?? 0),
    monthlyCost: Number(data.monthlyCost ?? 0),
    notes: typeof data.notes === "string" ? data.notes : null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt)
  };
}

function nullableDate(value: unknown) {
  if (value === null || value === undefined) return null;
  return asDate(value);
}

function machineFromData(data: FirebaseFirestore.DocumentData): ProductionMachine {
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? "Printer"),
    model: String(data.model ?? "Bambu Lab A1"),
    status: String(data.status ?? "idle") as MachineStatus,
    currentJobId: typeof data.currentJobId === "string" ? data.currentJobId : null,
    currentJobName: typeof data.currentJobName === "string" ? data.currentJobName : null,
    productName: typeof data.productName === "string" ? data.productName : null,
    startedAt: nullableDate(data.startedAt),
    estimatedSeconds: Number(data.estimatedSeconds ?? 0),
    pausedRemainingSeconds: typeof data.pausedRemainingSeconds === "number" ? data.pausedRemainingSeconds : null
  };
}

function queueJobFromData(data: FirebaseFirestore.DocumentData): PrintQueueJob {
  return {
    id: String(data.id ?? ""),
    productId: String(data.productId ?? data.productSlug ?? ""),
    productSlug: String(data.productSlug ?? data.productId ?? ""),
    productName: String(data.productName ?? ""),
    linkedOrderId: String(data.linkedOrderId ?? ""),
    customer: String(data.customer ?? ""),
    filamentGrams: Number(data.filamentGrams ?? 0),
    estimatedMinutes: Number(data.estimatedMinutes ?? 0),
    status: String(data.status ?? "queued") as PrintJobStatus,
    assignedMachineId: typeof data.assignedMachineId === "string" ? data.assignedMachineId : null,
    completedAt: nullableDate(data.completedAt),
    orderRevenue: Number(data.orderRevenue ?? 0)
  };
}

function inventoryFromData(data: FirebaseFirestore.DocumentData): ProductionInventoryItem {
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    category: String(data.category ?? "filament") as ProductionInventoryItem["category"],
    stock: Number(data.stock ?? 0),
    minThreshold: Number(data.minThreshold ?? 0),
    unit: String(data.unit ?? "unit"),
    unitCost: Number(data.unitCost ?? 0)
  };
}

function unitFromData(data: FirebaseFirestore.DocumentData): ProductionUnit {
  return {
    id: String(data.id ?? ""),
    productSlug: String(data.productSlug ?? ""),
    productName: String(data.productName ?? ""),
    orderId: String(data.orderId ?? ""),
    customer: String(data.customer ?? ""),
    status: String(data.status ?? "printed") as UnitStatus,
    createdAt: asDate(data.createdAt)
  };
}

export function defaultProductionSystem(): ProductionSystem {
  return {
    machines: [
      { id: "printer-1", name: "Printer 01", model: "Bambu Lab A1", status: "idle", currentJobId: null, currentJobName: null, productName: null, startedAt: null, estimatedSeconds: 0, pausedRemainingSeconds: null }
    ],
    queue: [],
    inventory: [
      { id: "filament-white", name: "White PLA roll", category: "filament", stock: 1, minThreshold: 0.3, unit: "kg", unitCost: 180 },
      { id: "paint-bottles", name: "Paint bottles", category: "paint", stock: 24, minThreshold: 9, unit: "bottles", unitCost: 18 },
      { id: "brushes", name: "Brushes", category: "brush", stock: 20, minThreshold: 6, unit: "pcs", unitCost: 5 },
      { id: "mixing-cups", name: "Mixing cups", category: "cup", stock: 60, minThreshold: 20, unit: "pcs", unitCost: 1 },
      { id: "shipping-boxes", name: "Boxes", category: "box", stock: 20, minThreshold: 6, unit: "pcs", unitCost: 8 },
      { id: "paper-plates", name: "Plates", category: "plate", stock: 40, minThreshold: 12, unit: "pcs", unitCost: 1 }
    ],
    units: [],
    updatedAt: new Date()
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

export async function adjustFirestoreProductStock(productSlugOrId: string, delta: number) {
  const db = getFirebaseDb();
  if (!db || !productSlugOrId) return null;

  const direct = db.collection("products").doc(productSlugOrId);
  let ref = direct;
  let saved = await direct.get();

  if (!saved.exists) {
    const snapshot = await db.collection("products").where("slug", "==", productSlugOrId).limit(1).get();
    const found = snapshot.docs[0];
    if (!found) return null;
    ref = found.ref;
    saved = found;
  }

  const current = typeof saved.data()?.stockQuantity === "number" ? Number(saved.data()?.stockQuantity) : 0;
  await ref.update({
    stockQuantity: Math.max(0, current + delta),
    updatedAt: FieldValue.serverTimestamp()
  });
  const updated = await ref.get();
  return productFromDoc(updated.id, updated.data() ?? {});
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

export async function updateFirestoreOrder(data: Omit<StoreOrder, "createdAt" | "product" | "productId" | "productPrice"> & { id: string }) {
  const db = getFirebaseDb();
  if (!db) return null;

  const ref = db.collection("orders").doc(data.id);
  await ref.update({
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerCity: data.customerCity,
    customerAddress: data.customerAddress,
    productName: data.productName,
    quantity: data.quantity,
    totalPrice: data.totalPrice,
    status: data.status,
    notes: data.notes ?? null
  });
  const saved = await ref.get();
  return orderFromDoc(saved.id, saved.data() ?? {});
}

export async function deleteFirestoreOrder(id: string) {
  const db = getFirebaseDb();
  if (!db) return false;
  await db.collection("orders").doc(id).delete();
  return true;
}

export async function getFirestoreProductionItems() {
  const db = getFirebaseDb();
  if (!db) return null;
  const snapshot = await db.collection("productionItems").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => productionItemFromDoc(doc.id, doc.data()));
}

export async function saveFirestoreProductionItem(item: Omit<ProductionItem, "createdAt" | "updatedAt">) {
  const db = getFirebaseDb();
  if (!db) return null;
  const id = item.id || undefined;
  const ref = id ? db.collection("productionItems").doc(id) : db.collection("productionItems").doc();
  const existing = await ref.get();
  await ref.set(
    {
      ...item,
      id: ref.id,
      createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  const saved = await ref.get();
  return productionItemFromDoc(saved.id, saved.data() ?? {});
}

export async function deleteFirestoreProductionItem(id: string) {
  const db = getFirebaseDb();
  if (!db) return false;
  await db.collection("productionItems").doc(id).delete();
  return true;
}

export async function getFirestoreProductionSystem() {
  const db = getFirebaseDb();
  if (!db) return null;
  const saved = await db.collection("production").doc("system").get();
  if (!saved.exists) return defaultProductionSystem();
  const data = saved.data() ?? {};
  return {
    machines: Array.isArray(data.machines) ? data.machines.map(machineFromData) : defaultProductionSystem().machines,
    queue: Array.isArray(data.queue) ? data.queue.map(queueJobFromData) : [],
    inventory: Array.isArray(data.inventory) ? data.inventory.map(inventoryFromData) : defaultProductionSystem().inventory,
    units: Array.isArray(data.units) ? data.units.map(unitFromData) : [],
    updatedAt: asDate(data.updatedAt)
  } satisfies ProductionSystem;
}

export async function saveFirestoreProductionSystem(system: ProductionSystem) {
  const db = getFirebaseDb();
  if (!db) return null;
  await db.collection("production").doc("system").set(
    {
      ...system,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return getFirestoreProductionSystem();
}
