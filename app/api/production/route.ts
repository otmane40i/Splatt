import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
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

type ProductionAction =
  | { type: "saveMachine"; machine: Partial<ProductionMachine> }
  | { type: "removeMachine"; id: string }
  | { type: "saveJob"; job: Partial<PrintQueueJob> }
  | { type: "removeJob"; id: string }
  | { type: "reorderQueue"; ids: string[] }
  | { type: "assignJob"; jobId: string; machineId: string | null }
  | { type: "startPrint"; machineId: string; jobId: string }
  | { type: "pauseMachine"; machineId: string }
  | { type: "markDone"; machineId: string }
  | { type: "saveInventory"; item: Partial<ProductionInventoryItem> }
  | { type: "removeInventory"; id: string }
  | { type: "updateUnit"; id: string; status: UnitStatus };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
}

async function getSystem() {
  return (await getFirestoreProductionSystem()) ?? defaultProductionSystem();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function cleanMachine(machine: Partial<ProductionMachine>): ProductionMachine {
  return {
    id: machine.id || makeId("machine"),
    name: machine.name || "Printer",
    model: machine.model || "",
    status: (machine.status || "idle") as MachineStatus,
    currentJobId: machine.currentJobId ?? null,
    currentJobName: machine.currentJobName ?? null,
    productName: machine.productName ?? null,
    startedAt: machine.startedAt ? new Date(machine.startedAt) : null,
    estimatedSeconds: Number(machine.estimatedSeconds ?? 0),
    pausedRemainingSeconds: typeof machine.pausedRemainingSeconds === "number" ? machine.pausedRemainingSeconds : null
  };
}

function cleanJob(job: Partial<PrintQueueJob>, system: ProductionSystem): PrintQueueJob {
  const existing = system.queue.find((item) => item.id === job.id);
  return {
    id: job.id || makeId("job"),
    productName: job.productName || existing?.productName || "Splatt. figure",
    linkedOrderId: job.linkedOrderId || existing?.linkedOrderId || "",
    customer: job.customer || existing?.customer || "",
    filamentGrams: Number(job.filamentGrams ?? existing?.filamentGrams ?? 80),
    estimatedMinutes: Number(job.estimatedMinutes ?? existing?.estimatedMinutes ?? 180),
    status: (job.status || existing?.status || "queued") as PrintJobStatus,
    assignedMachineId: job.assignedMachineId ?? existing?.assignedMachineId ?? null,
    completedAt: job.completedAt ? new Date(job.completedAt) : existing?.completedAt ?? null,
    orderRevenue: Number(job.orderRevenue ?? existing?.orderRevenue ?? 0)
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

function unitPrefix(productName: string) {
  const clean = productName.replace(/splatt\.?/i, "").trim().split(/\s+/)[0] || "UNIT";
  return clean.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "UNIT";
}

function nextUnitId(productName: string, units: ProductionUnit[]) {
  const prefix = unitPrefix(productName);
  const count = units.filter((unit) => unit.id.startsWith(`${prefix}-`)).length + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

function deductInventory(inventory: ProductionInventoryItem[], filamentGrams: number) {
  const deductions: Record<ProductionInventoryItem["category"], number> = {
    filament: filamentGrams / 1000,
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

function secondsRemaining(machine: ProductionMachine) {
  if (machine.status === "paused") return machine.pausedRemainingSeconds ?? machine.estimatedSeconds;
  if (!machine.startedAt) return machine.estimatedSeconds;
  const elapsed = Math.floor((Date.now() - new Date(machine.startedAt).getTime()) / 1000);
  return Math.max(0, machine.estimatedSeconds - elapsed);
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
    })
  };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await hydrateOrders(await getSystem()));
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const action = (await request.json()) as ProductionAction;
  let system = await hydrateOrders(await getSystem());

  if (action.type === "saveMachine") {
    const machine = cleanMachine(action.machine);
    system.machines = system.machines.some((item) => item.id === machine.id)
      ? system.machines.map((item) => item.id === machine.id ? { ...item, ...machine } : item)
      : [...system.machines, machine];
  }

  if (action.type === "removeMachine") {
    system.machines = system.machines.filter((machine) => machine.id !== action.id);
    system.queue = system.queue.map((job) => job.assignedMachineId === action.id ? { ...job, assignedMachineId: null } : job);
  }

  if (action.type === "saveJob") {
    const job = cleanJob(action.job, system);
    system.queue = system.queue.some((item) => item.id === job.id) ? system.queue.map((item) => item.id === job.id ? job : item) : [...system.queue, job];
  }

  if (action.type === "removeJob") {
    system.queue = system.queue.filter((job) => job.id !== action.id);
  }

  if (action.type === "reorderQueue") {
    const byId = new Map(system.queue.map((job) => [job.id, job]));
    system.queue = action.ids.map((id) => byId.get(id)).filter((job): job is PrintQueueJob => Boolean(job));
  }

  if (action.type === "assignJob") {
    system.queue = system.queue.map((job) => job.id === action.jobId ? { ...job, assignedMachineId: action.machineId } : job);
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
      if (machine.status === "paused") return { ...machine, status: "printing", startedAt: new Date(Date.now() - (machine.estimatedSeconds - (machine.pausedRemainingSeconds ?? machine.estimatedSeconds)) * 1000), pausedRemainingSeconds: null };
      return { ...machine, status: "paused", pausedRemainingSeconds: secondsRemaining(machine) };
    });
  }

  if (action.type === "markDone") {
    const machine = system.machines.find((item) => item.id === action.machineId);
    const job = machine?.currentJobId ? system.queue.find((item) => item.id === machine.currentJobId) : null;
    if (machine && job) {
      system.queue = system.queue.map((item) => item.id === job.id ? { ...item, status: "done", completedAt: new Date() } : item);
      system.inventory = deductInventory(system.inventory, job.filamentGrams);
      system.units = [...system.units, { id: nextUnitId(job.productName, system.units), productName: job.productName, orderId: job.linkedOrderId, customer: job.customer, status: "printed", createdAt: new Date() }];
      system.machines = system.machines.map((item) => item.id === machine.id ? { ...item, status: "done", currentJobId: null, currentJobName: null, productName: null, startedAt: null, estimatedSeconds: 0, pausedRemainingSeconds: null } : item);
    }
  }

  if (action.type === "saveInventory") {
    const item = cleanInventory(action.item);
    system.inventory = system.inventory.some((stock) => stock.id === item.id) ? system.inventory.map((stock) => stock.id === item.id ? item : stock) : [...system.inventory, item];
  }

  if (action.type === "removeInventory") {
    system.inventory = system.inventory.filter((item) => item.id !== action.id);
  }

  if (action.type === "updateUnit") {
    system.units = system.units.map((unit) => unit.id === action.id ? { ...unit, status: action.status } : unit);
  }

  const saved = await saveFirestoreProductionSystem(system);
  return NextResponse.json(saved ?? system);
}
