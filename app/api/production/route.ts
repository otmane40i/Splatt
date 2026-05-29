import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProducts, type StoreProduct } from "@/lib/catalog";
import {
  adjustFirestoreProductStock,
  defaultProductionSystem,
  getFirestoreOrders,
  getFirestoreProductionSystem,
  saveFirestoreProductionSystem,
  type MachineStatus,
  type PrintJobStatus,
  type PrintQueueJob,
  type ProductionInventoryItem,
  type ProductionMachine,
  type ProductionSystem,
  type ProductionUnit,
  type UnitStatus
} from "@/lib/firestore-store";

type UnitPatch = Partial<Pick<ProductionUnit, "orderId" | "customer" | "status">>;

type ProductionAction =
  | { type: "saveMachine"; machine: Partial<ProductionMachine> }
  | { type: "removeMachine"; id: string }
  | { type: "saveJob"; job: Partial<PrintQueueJob> }
  | { type: "removeJob"; id: string }
  | { type: "updateJob"; id: string; patch: Partial<PrintQueueJob> }
  | { type: "startPrint"; machineId: string; jobId: string }
  | { type: "pauseMachine"; machineId: string }
  | { type: "markDone"; machineId?: string; jobId?: string }
  | { type: "saveInventory"; item: Partial<ProductionInventoryItem> }
  | { type: "restockInventory"; id: string; amount: number }
  | { type: "updateUnit"; id: string; patch: UnitPatch };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getSystem() {
  return (await getFirestoreProductionSystem()) ?? defaultProductionSystem();
}

function productBySlug(products: StoreProduct[], slug?: string) {
  return products.find((product) => product.slug === slug || product.id === slug) ?? products[0] ?? null;
}

function orderCustomer(orderId: string) {
  return getFirestoreOrders().then((orders) => orders?.find((order) => order.id === orderId)?.customerName ?? "");
}

function cleanMachine(machine: Partial<ProductionMachine>): ProductionMachine {
  return {
    id: machine.id || makeId("machine"),
    name: machine.name?.trim() || "Printer",
    model: "Bambu Lab A1",
    status: (machine.status || "idle") as MachineStatus,
    currentJobId: machine.currentJobId ?? null,
    currentJobName: machine.currentJobName ?? null,
    productName: machine.productName ?? null,
    startedAt: machine.startedAt ? new Date(machine.startedAt) : null,
    estimatedSeconds: Number(machine.estimatedSeconds ?? 0),
    pausedRemainingSeconds: typeof machine.pausedRemainingSeconds === "number" ? machine.pausedRemainingSeconds : null
  };
}

function cleanJob(job: Partial<PrintQueueJob>, system: ProductionSystem, products: StoreProduct[]): PrintQueueJob {
  const existing = system.queue.find((item) => item.id === job.id);
  const product = productBySlug(products, job.productSlug || job.productId || existing?.productSlug || existing?.productId);
  const productSlug = product?.slug ?? existing?.productSlug ?? "";
  return {
    id: job.id || makeId("job"),
    productId: product?.id ?? productSlug,
    productSlug,
    productName: product?.nameEN ?? job.productName ?? existing?.productName ?? "Splatt. figure",
    linkedOrderId: job.linkedOrderId ?? existing?.linkedOrderId ?? "",
    customer: job.customer ?? existing?.customer ?? "",
    filamentGrams: Number(job.filamentGrams ?? product?.filamentGrams ?? existing?.filamentGrams ?? 187),
    estimatedMinutes: Number(job.estimatedMinutes ?? product?.printTimeMinutes ?? existing?.estimatedMinutes ?? 240),
    status: (job.status || existing?.status || "queued") as PrintJobStatus,
    assignedMachineId: job.assignedMachineId ?? existing?.assignedMachineId ?? null,
    completedAt: job.completedAt ? new Date(job.completedAt) : existing?.completedAt ?? null,
    orderRevenue: Number(job.orderRevenue ?? existing?.orderRevenue ?? product?.price ?? 0)
  };
}

function cleanInventory(item: Partial<ProductionInventoryItem>): ProductionInventoryItem {
  return {
    id: item.id || makeId("stock"),
    name: item.name || "Inventory item",
    category: item.category || "filament",
    stock: Number(item.stock ?? 0),
    minThreshold: Number(item.minThreshold ?? 0),
    unit: item.unit || "unit",
    unitCost: Number(item.unitCost ?? 0)
  };
}

function secondsRemaining(machine: ProductionMachine) {
  if (machine.status === "paused") return machine.pausedRemainingSeconds ?? machine.estimatedSeconds;
  if (!machine.startedAt) return machine.estimatedSeconds;
  const elapsed = Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000);
  return Math.max(0, machine.estimatedSeconds - elapsed);
}

function deductInventory(inventory: ProductionInventoryItem[]) {
  const deductions: Record<ProductionInventoryItem["category"], number> = {
    filament: 0.187,
    paint: 3,
    brush: 1,
    cup: 2,
    box: 1,
    plate: 1
  };
  return inventory.map((item) => ({
    ...item,
    stock: Math.max(0, Number((item.stock - (deductions[item.category] ?? 0)).toFixed(3)))
  }));
}

function unitPrefix(productSlug: string, productName: string) {
  const source = productSlug.replace(/^splatt-/, "") || productName.replace(/splatt\.?/i, "");
  return (source.trim().split(/[-\s_]+/)[0] || "UNIT").replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
}

function nextUnitId(job: PrintQueueJob, units: ProductionUnit[]) {
  const prefix = unitPrefix(job.productSlug, job.productName);
  const count = units.filter((unit) => unit.id.startsWith(`${prefix}-`)).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

async function hydrateOrders(system: ProductionSystem) {
  const orders = await getFirestoreOrders().catch(() => null);
  if (!orders) return system;
  const byId = new Map(orders.map((order) => [order.id, order]));
  return {
    ...system,
    queue: system.queue.map((job) => {
      const order = byId.get(job.linkedOrderId);
      return order ? { ...job, customer: job.customer || order.customerName, orderRevenue: job.orderRevenue || order.totalPrice } : job;
    }),
    units: system.units.map((unit) => {
      const order = byId.get(unit.orderId);
      return order ? { ...unit, customer: unit.customer || order.customerName } : unit;
    })
  };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [system, products, orders] = await Promise.all([hydrateOrders(await getSystem()), getProducts(), getFirestoreOrders()]);
  return NextResponse.json({ system, products, orders: orders ?? [] });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const action = (await request.json()) as ProductionAction;
  const products = await getProducts();
  let system = await hydrateOrders(await getSystem());

  if (action.type === "saveMachine") {
    const machine = cleanMachine(action.machine);
    system.machines = system.machines.some((item) => item.id === machine.id)
      ? system.machines.map((item) => item.id === machine.id ? { ...item, name: machine.name, model: machine.model, status: machine.status } : item)
      : [...system.machines, machine];
  }

  if (action.type === "removeMachine") {
    system.machines = system.machines.filter((machine) => machine.id !== action.id);
    system.queue = system.queue.map((job) => job.assignedMachineId === action.id ? { ...job, assignedMachineId: null } : job);
  }

  if (action.type === "saveJob") {
    const job = cleanJob(action.job, system, products);
    if (job.linkedOrderId && !job.customer) job.customer = await orderCustomer(job.linkedOrderId);
    system.queue = system.queue.some((item) => item.id === job.id) ? system.queue.map((item) => item.id === job.id ? job : item) : [...system.queue, job];
  }

  if (action.type === "updateJob") {
    system.queue = system.queue.map((job) => job.id === action.id ? cleanJob({ ...job, ...action.patch, id: job.id }, system, products) : job);
  }

  if (action.type === "removeJob") {
    system.queue = system.queue.filter((job) => job.id !== action.id);
  }

  if (action.type === "startPrint") {
    const job = system.queue.find((item) => item.id === action.jobId);
    if (job) {
      system.queue = system.queue.map((item) => item.id === action.jobId ? { ...item, status: "printing", assignedMachineId: action.machineId } : item);
      system.machines = system.machines.map((machine) => machine.id === action.machineId ? {
        ...machine,
        status: "printing",
        currentJobId: job.id,
        currentJobName: job.id,
        productName: job.productName,
        startedAt: new Date(),
        estimatedSeconds: job.estimatedMinutes * 60,
        pausedRemainingSeconds: null
      } : machine);
    }
  }

  if (action.type === "pauseMachine") {
    system.machines = system.machines.map((machine) => {
      if (machine.id !== action.machineId) return machine;
      if (machine.status === "paused") {
        const remaining = machine.pausedRemainingSeconds ?? machine.estimatedSeconds;
        return { ...machine, status: "printing", startedAt: new Date(Date.now() - (machine.estimatedSeconds - remaining) * 1000), pausedRemainingSeconds: null };
      }
      if (machine.status !== "printing") return machine;
      return { ...machine, status: "paused", pausedRemainingSeconds: secondsRemaining(machine) };
    });
  }

  if (action.type === "markDone") {
    const machine = action.machineId ? system.machines.find((item) => item.id === action.machineId) : null;
    const jobId = action.jobId || machine?.currentJobId || "";
    const job = system.queue.find((item) => item.id === jobId);
    if (job && job.status !== "done") {
      const completedJob = { ...job, status: "done" as PrintJobStatus, completedAt: new Date() };
      system.queue = system.queue.map((item) => item.id === job.id ? completedJob : item);
      system.inventory = deductInventory(system.inventory);
      system.units = [
        ...system.units,
        {
          id: nextUnitId(completedJob, system.units),
          productSlug: completedJob.productSlug,
          productName: completedJob.productName,
          orderId: completedJob.linkedOrderId,
          customer: completedJob.customer,
          status: "printed",
          createdAt: new Date()
        }
      ];
      if (!completedJob.linkedOrderId) await adjustFirestoreProductStock(completedJob.productSlug, 1);
      if (machine) {
        system.machines = system.machines.map((item) => item.id === machine.id ? { ...item, status: "done", currentJobId: null, currentJobName: null, productName: null, startedAt: null, estimatedSeconds: 0, pausedRemainingSeconds: null } : item);
      }
    }
  }

  if (action.type === "saveInventory") {
    const item = cleanInventory(action.item);
    system.inventory = system.inventory.some((stock) => stock.id === item.id) ? system.inventory.map((stock) => stock.id === item.id ? item : stock) : [...system.inventory, item];
  }

  if (action.type === "restockInventory") {
    system.inventory = system.inventory.map((item) => item.id === action.id ? { ...item, stock: Number((item.stock + action.amount).toFixed(3)) } : item);
  }

  if (action.type === "updateUnit") {
    system.units = system.units.map((unit) => unit.id === action.id ? { ...unit, ...action.patch } : unit);
  }

  const saved = await saveFirestoreProductionSystem(system);
  return NextResponse.json(saved ?? system);
}
