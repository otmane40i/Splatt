"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Box, CheckCircle2, Factory, PackageCheck, Pause, Play, Plus, Printer, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMad } from "@/lib/utils";
import type { StoreProduct } from "@/lib/catalog";
import type { MachineStatus, PrintJobStatus, PrintQueueJob, ProductionInventoryItem, ProductionMachine, ProductionSystem, StoreOrder, UnitStatus } from "@/lib/firestore-store";

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
  | { type: "updateUnit"; id: string; patch: { orderId?: string; customer?: string; status?: UnitStatus } };

type JobDraft = {
  productSlug: string;
  linkedOrderId: string;
  assignedMachineId: string;
};

const jobStatuses: PrintJobStatus[] = ["queued", "printing", "done", "cancelled"];
const unitStatuses: UnitStatus[] = ["printed", "packaged", "delivered"];
const machineStatusStyles: Record<MachineStatus, string> = {
  idle: "border-white/10 bg-white/10 text-white",
  printing: "border-[#1FA8A0]/30 bg-[#1FA8A0]/15 text-[#9cf4ef]",
  done: "border-[#FF2E93]/30 bg-[#FF2E93]/15 text-[#ffc2df]",
  paused: "border-yellow-400/30 bg-yellow-400/15 text-yellow-100"
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function secondsRemaining(machine: ProductionMachine, now: number) {
  if (machine.status === "paused") return machine.pausedRemainingSeconds ?? machine.estimatedSeconds;
  if (!machine.startedAt) return machine.estimatedSeconds;
  const elapsed = Math.floor((now - new Date(machine.startedAt).getTime()) / 1000);
  return Math.max(0, machine.estimatedSeconds - elapsed);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function productName(product: StoreProduct) {
  return product.nameEN || product.nameFR || product.slug;
}

function productFallback(products: StoreProduct[]) {
  return products[0]?.slug ?? "";
}

export function ProductionManager({ initialSystem, products, orders }: { initialSystem: ProductionSystem; products: StoreProduct[]; orders: StoreOrder[] }) {
  const [system, setSystem] = useState(initialSystem);
  const [newMachineName, setNewMachineName] = useState("");
  const [jobDraft, setJobDraft] = useState<JobDraft>(() => ({ productSlug: productFallback(products), linkedOrderId: "", assignedMachineId: "" }));
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const productsBySlug = useMemo(() => new Map(products.map((product) => [product.slug, product])), [products]);
  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const queuedJobs = system.queue.filter((job) => job.status !== "done");
  const completedJobs = system.queue.filter((job) => job.status === "done");

  const stats = useMemo(() => {
    const today = startOfToday().getTime();
    const week = startOfWeek().getTime();
    const doneThisWeek = completedJobs.filter((job) => job.completedAt && new Date(job.completedAt).getTime() >= week);
    return {
      today: completedJobs.filter((job) => job.completedAt && new Date(job.completedAt).getTime() >= today).length,
      week: doneThisWeek.length,
      filamentKg: doneThisWeek.reduce((sum, job) => sum + job.filamentGrams / 1000, 0),
      cost: doneThisWeek.reduce((sum, job) => sum + (productsBySlug.get(job.productSlug)?.productionCost ?? 90), 0),
      revenue: doneThisWeek.reduce((sum, job) => sum + (job.orderRevenue || ordersById.get(job.linkedOrderId)?.totalPrice || productsBySlug.get(job.productSlug)?.price || 0), 0)
    };
  }, [completedJobs, ordersById, productsBySlug]);

  function mutate(action: ProductionAction) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Production update failed.");
        return;
      }
      const next = (await response.json()) as ProductionSystem;
      setSystem(next);
    });
  }

  function addMachine() {
    const name = newMachineName.trim();
    if (!name) return;
    mutate({ type: "saveMachine", machine: { id: makeId("machine"), name, model: "Bambu Lab A1", status: "idle" } });
    setNewMachineName("");
  }

  function addJob() {
    const product = productsBySlug.get(jobDraft.productSlug);
    if (!product) {
      setError("Add at least one product before creating a print job.");
      return;
    }
    const order = ordersById.get(jobDraft.linkedOrderId);
    mutate({
      type: "saveJob",
      job: {
        id: makeId("job"),
        productId: product.id,
        productSlug: product.slug,
        productName: productName(product),
        linkedOrderId: jobDraft.linkedOrderId,
        customer: order?.customerName ?? "",
        filamentGrams: product.filamentGrams,
        estimatedMinutes: product.printTimeMinutes,
        status: "queued",
        assignedMachineId: jobDraft.assignedMachineId || null,
        orderRevenue: order?.totalPrice ?? product.price
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A]">
        <div className="border-b border-white/10 bg-gradient-to-r from-[#FF2E93]/16 via-white/[0.03] to-[#1FA8A0]/12 p-4">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FF2E93]">Production control</p>
              <h1 className="font-space text-3xl font-black text-white md:text-4xl">Factory board</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/55">Fast actions for machines, queue, inventory, unit IDs, and weekly numbers.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[220px_auto]">
              <Input value={newMachineName} placeholder="Machine name" onChange={(event) => setNewMachineName(event.target.value)} />
              <Button onClick={addMachine} disabled={isPending}><Plus className="h-4 w-4" /> Add machine</Button>
            </div>
          </div>
        </div>
        <section className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Today" value={String(stats.today)} detail="units printed" />
          <Stat label="This week" value={String(stats.week)} detail="completed units" />
          <Stat label="Filament" value={`${stats.filamentKg.toFixed(2)} kg`} detail="weekly use" />
          <Stat label="Cost" value={formatMad(stats.cost)} detail="production" />
          <Stat label="Revenue" value={formatMad(stats.revenue)} detail="completed orders" />
        </section>
      </div>

      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</div> : null}

      <div className="grid gap-4 2xl:grid-cols-[440px_1fr]">
        <Card title="Machines" icon={<Printer className="h-5 w-5" />}>
          <div className="grid gap-3">
            {system.machines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                queue={queuedJobs}
                now={now}
                isPending={isPending}
                onStart={(jobId) => mutate({ type: "startPrint", machineId: machine.id, jobId })}
                onPause={() => mutate({ type: "pauseMachine", machineId: machine.id })}
                onDone={() => mutate({ type: "markDone", machineId: machine.id })}
                onRemove={() => mutate({ type: "removeMachine", id: machine.id })}
              />
            ))}
          </div>
        </Card>

        <Card title="Print Queue" icon={<Factory className="h-5 w-5" />}>
          <div className="mb-3 grid gap-2 rounded-2xl border border-white/10 bg-black/35 p-3 xl:grid-cols-[1.1fr_1fr_1fr_auto]">
            <Select value={jobDraft.productSlug} onValueChange={(value) => setJobDraft((draft) => ({ ...draft, productSlug: value }))}>
              <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.slug}>{productName(product)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={jobDraft.linkedOrderId || "none"} onValueChange={(value) => setJobDraft((draft) => ({ ...draft, linkedOrderId: value === "none" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Linked order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No order, add to stock</SelectItem>
                {orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.id.slice(0, 8)} - {order.customerName || order.productName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={jobDraft.assignedMachineId || "none"} onValueChange={(value) => setJobDraft((draft) => ({ ...draft, assignedMachineId: value === "none" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Assign machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {system.machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addJob} disabled={isPending || products.length === 0}><Plus className="h-4 w-4" /> Add job</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/45">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Linked order</th>
                  <th className="p-3">Filament</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Machine</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {queuedJobs.map((job) => (
                  <JobRow key={job.id} job={job} products={products} machines={system.machines} orders={orders} isPending={isPending} mutate={mutate} />
                ))}
                {queuedJobs.length === 0 ? <tr><td className="p-8 text-center text-white/45" colSpan={8}>No active jobs yet. Choose a product above and add the first print.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {completedJobs.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {completedJobs.slice(0, 6).map((job) => <div key={job.id} className="rounded-2xl border border-[#1FA8A0]/20 bg-[#1FA8A0]/10 p-3 text-sm"><b>{job.productName}</b><p className="mt-1 truncate text-white/50">{job.id}</p></div>)}
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card title="Inventory" icon={<Box className="h-5 w-5" />}>
          <div className="grid gap-3">
            {system.inventory.map((item) => (
              <InventoryRow key={item.id} item={item} isPending={isPending} mutate={mutate} />
            ))}
          </div>
        </Card>

        <Card title="Unit Tracker" icon={<PackageCheck className="h-5 w-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 text-white/45">
                <tr>
                  <th className="p-3">Unit ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {system.units.map((unit) => (
                  <tr key={unit.id}>
                    <td className="p-3 font-black text-[#FF2E93]">{unit.id}</td>
                    <td className="p-3">{unit.productName}</td>
                    <td className="p-3">
                      <Select value={unit.orderId || "none"} onValueChange={(value) => {
                        const order = value === "none" ? null : ordersById.get(value);
                        mutate({ type: "updateUnit", id: unit.id, patch: { orderId: value === "none" ? "" : value, customer: order?.customerName ?? "" } });
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No order</SelectItem>
                          {orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.id.slice(0, 8)} - {order.customerName || order.productName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">{unit.customer || "-"}</td>
                    <td className="p-3">
                      <Select value={unit.status} onValueChange={(value) => mutate({ type: "updateUnit", id: unit.id, patch: { status: value as UnitStatus } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{unitStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-white/55">{new Date(unit.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {system.units.length === 0 ? <tr><td className="p-6 text-center text-white/45" colSpan={6}>Completed prints will appear here as unique unit IDs.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-4">
      <div className="mb-3 flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF2E93]/15 text-[#FF2E93]">{icon}</div>
        <h2 className="font-space text-xl font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-[#0f0f0f] p-4">
      <p className="text-xs font-black uppercase text-white/45">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="font-space text-2xl font-black text-white">{value}</p>
        <p className="pb-1 text-xs font-bold text-white/35">{detail}</p>
      </div>
    </div>
  );
}

function MachineCard({ machine, queue, now, isPending, onStart, onPause, onDone, onRemove }: { machine: ProductionMachine; queue: PrintQueueJob[]; now: number; isPending: boolean; onStart: (jobId: string) => void; onPause: () => void; onDone: () => void; onRemove: () => void }) {
  const [selectedJob, setSelectedJob] = useState(queue.find((job) => job.assignedMachineId === machine.id)?.id ?? queue[0]?.id ?? "");
  const remaining = secondsRemaining(machine, now);
  const progress = machine.estimatedSeconds > 0 ? Math.min(100, Math.round(((machine.estimatedSeconds - remaining) / machine.estimatedSeconds) * 100)) : machine.status === "done" ? 100 : 0;

  useEffect(() => {
    if (!selectedJob && queue[0]) setSelectedJob(queue[0].id);
  }, [queue, selectedJob]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-space text-xl font-black">{machine.name}</h3>
          <p className="text-sm text-white/45">{machine.model || "Bambu Lab A1"}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${machineStatusStyles[machine.status]}`}>{machine.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Info label="Current job" value={machine.currentJobName || "-"} />
        <Info label="Product" value={machine.productName || "-"} />
        <Info label="Time left" value={machine.status === "idle" ? "-" : formatDuration(remaining)} />
        <Info label="Progress" value={`${progress}%`} />
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#FF2E93] to-[#1FA8A0] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-2">
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger><SelectValue placeholder="Select queued job" /></SelectTrigger>
          <SelectContent>{queue.map((job) => <SelectItem key={job.id} value={job.id}>{job.productName} - {job.id.slice(-6)}</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" onClick={() => selectedJob ? onStart(selectedJob) : undefined} disabled={isPending || !selectedJob || machine.status === "printing"}><Play className="h-4 w-4" /> Start</Button>
          <Button size="sm" variant="outline" onClick={onPause} disabled={isPending || (machine.status !== "printing" && machine.status !== "paused")}><Pause className="h-4 w-4" /> Pause</Button>
          <Button size="sm" variant="outline" onClick={onDone} disabled={isPending || !machine.currentJobId}><CheckCircle2 className="h-4 w-4" /> Done</Button>
        </div>
        <Button size="sm" variant="ghost" className="text-red-200 hover:text-red-100" onClick={onRemove} disabled={isPending || machine.status === "printing"}><Trash2 className="h-4 w-4" /> Remove machine</Button>
      </div>
    </div>
  );
}

function JobRow({ job, products, machines, orders, isPending, mutate }: { job: PrintQueueJob; products: StoreProduct[]; machines: ProductionMachine[]; orders: StoreOrder[]; isPending: boolean; mutate: (action: ProductionAction) => void }) {
  const product = products.find((item) => item.slug === job.productSlug);
  return (
    <tr>
      <td className="p-3 font-mono text-xs text-[#FF2E93]">{job.id}</td>
      <td className="p-3">
        <Select value={job.productSlug} onValueChange={(value) => {
          const next = products.find((item) => item.slug === value);
          mutate({ type: "updateJob", id: job.id, patch: { productSlug: value, productId: next?.id ?? value, productName: next ? productName(next) : job.productName, filamentGrams: next?.filamentGrams, estimatedMinutes: next?.printTimeMinutes, orderRevenue: next?.price } });
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{products.map((item) => <SelectItem key={item.id} value={item.slug}>{productName(item)}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <Select value={job.linkedOrderId || "none"} onValueChange={(value) => {
          const order = value === "none" ? null : orders.find((item) => item.id === value);
          mutate({ type: "updateJob", id: job.id, patch: { linkedOrderId: value === "none" ? "" : value, customer: order?.customerName ?? "", orderRevenue: order?.totalPrice ?? product?.price ?? job.orderRevenue } });
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Stock unit</SelectItem>
            {orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.id.slice(0, 8)} - {order.customerName || order.productName}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">{job.filamentGrams}g</td>
      <td className="p-3">{Math.round(job.estimatedMinutes / 60)}h {job.estimatedMinutes % 60}m</td>
      <td className="p-3">
        <Select value={job.status} onValueChange={(value) => value === "done" ? mutate({ type: "markDone", jobId: job.id }) : mutate({ type: "updateJob", id: job.id, patch: { status: value as PrintJobStatus } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{jobStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <Select value={job.assignedMachineId || "none"} onValueChange={(value) => mutate({ type: "updateJob", id: job.id, patch: { assignedMachineId: value === "none" ? null : value } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-2">
          <Button size="icon" variant="outline" onClick={() => mutate({ type: "markDone", jobId: job.id })} disabled={isPending || job.status === "done"}><CheckCircle2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="destructive" onClick={() => mutate({ type: "removeJob", id: job.id })} disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
  );
}

function InventoryRow({ item, isPending, mutate }: { item: ProductionInventoryItem; isPending: boolean; mutate: (action: ProductionAction) => void }) {
  const [stock, setStock] = useState(String(item.stock));
  const low = item.stock <= item.minThreshold;
  const restockAmount = item.category === "filament" ? 1 : 10;
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 md:grid-cols-[1fr_120px_120px_auto_auto] md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-bold">{item.name}</p>
          {low ? <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-xs font-black text-red-100"><AlertTriangle className="h-3 w-3" /> LOW</span> : null}
        </div>
        <p className="text-xs text-white/45">Minimum: {item.minThreshold} {item.unit}</p>
      </div>
      <Input type="number" step="0.001" value={stock} onChange={(event) => setStock(event.target.value)} />
      <div className="text-sm text-white/55">{item.unit}</div>
      <Button variant="outline" onClick={() => mutate({ type: "saveInventory", item: { ...item, stock: Number(stock) } })} disabled={isPending}><Save className="h-4 w-4" /> Save</Button>
      <Button onClick={() => mutate({ type: "restockInventory", id: item.id, amount: restockAmount })} disabled={isPending}><RefreshCw className="h-4 w-4" /> Restock</Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2"><p className="text-[11px] font-black uppercase text-white/35">{label}</p><p className="truncate font-bold">{value}</p></div>;
}
