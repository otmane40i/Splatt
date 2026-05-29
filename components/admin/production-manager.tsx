"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, CircleOff, Factory, Pause, Play, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StoreProduct } from "@/lib/catalog";
import type { MachineStatus, PrintJobStatus, PrintQueueJob, ProductionMachine, ProductionSystem, StoreOrder } from "@/lib/firestore-store";

type ProductionAction =
  | { type: "saveMachine"; machine: Partial<ProductionMachine> }
  | { type: "removeMachine"; id: string }
  | { type: "saveJob"; job: Partial<PrintQueueJob> }
  | { type: "removeJob"; id: string }
  | { type: "updateJob"; id: string; patch: Partial<PrintQueueJob> }
  | { type: "startPrint"; machineId: string; jobId: string }
  | { type: "pauseMachine"; machineId: string }
  | { type: "markDone"; machineId?: string; jobId?: string };

type JobDraft = {
  productSlug: string;
  linkedOrderId: string;
  assignedMachineId: string;
  filamentGrams: string;
  estimatedMinutes: string;
};

const jobStatuses: PrintJobStatus[] = ["queued", "printing", "done", "cancelled"];
const machineLabels: Record<MachineStatus, string> = {
  idle: "Off duty",
  printing: "Printing",
  done: "Done",
  paused: "Paused"
};
const machineStyles: Record<MachineStatus, string> = {
  idle: "border-white/10 bg-white/8 text-white/70",
  printing: "border-[#1FA8A0]/30 bg-[#1FA8A0]/15 text-[#9cf4ef]",
  done: "border-[#FF2E93]/30 bg-[#FF2E93]/15 text-[#ffc2df]",
  paused: "border-yellow-400/30 bg-yellow-400/15 text-yellow-100"
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function productName(product: StoreProduct) {
  return product.nameEN || product.nameFR || product.slug;
}

function productFallback(products: StoreProduct[]) {
  return products[0]?.slug ?? "";
}

function secondsRemaining(machine: ProductionMachine, now: number) {
  if (machine.status === "paused") return machine.pausedRemainingSeconds ?? machine.estimatedSeconds;
  if (!machine.startedAt) return machine.estimatedSeconds;
  return Math.max(0, machine.estimatedSeconds - Math.floor((now - new Date(machine.startedAt).getTime()) / 1000));
}

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function formatRemaining(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return formatMinutes(minutes);
}

export function ProductionManager({ initialSystem, products, orders }: { initialSystem: ProductionSystem; products: StoreProduct[]; orders: StoreOrder[] }) {
  const [system, setSystem] = useState(initialSystem);
  const [newMachineName, setNewMachineName] = useState("");
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const productsBySlug = useMemo(() => new Map(products.map((product) => [product.slug, product])), [products]);
  const [jobDraft, setJobDraft] = useState<JobDraft>(() => {
    const slug = productFallback(products);
    const product = products.find((item) => item.slug === slug);
    return {
      productSlug: slug,
      linkedOrderId: "",
      assignedMachineId: "",
      filamentGrams: String(product?.filamentGrams ?? 187),
      estimatedMinutes: String(product?.printTimeMinutes ?? 240)
    };
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeJobs = system.queue.filter((job) => job.status !== "done" && job.status !== "cancelled");
  const doneToday = system.queue.filter((job) => {
    if (job.status !== "done" || !job.completedAt) return false;
    const completed = new Date(job.completedAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return completed.getTime() >= today.getTime();
  }).length;

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
      setSystem((await response.json()) as ProductionSystem);
    });
  }

  function updateDraftProduct(slug: string) {
    const product = productsBySlug.get(slug);
    setJobDraft((draft) => ({
      ...draft,
      productSlug: slug,
      filamentGrams: String(product?.filamentGrams ?? 187),
      estimatedMinutes: String(product?.printTimeMinutes ?? 240)
    }));
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
      setError("Add a product first, then create a print job.");
      return;
    }
    const order = orders.find((item) => item.id === jobDraft.linkedOrderId);
    mutate({
      type: "saveJob",
      job: {
        productId: product.id,
        productSlug: product.slug,
        productName: productName(product),
        linkedOrderId: jobDraft.linkedOrderId,
        customer: order?.customerName ?? "",
        filamentGrams: Math.max(1, Number(jobDraft.filamentGrams) || product.filamentGrams),
        estimatedMinutes: Math.max(1, Number(jobDraft.estimatedMinutes) || product.printTimeMinutes),
        status: "queued",
        assignedMachineId: jobDraft.assignedMachineId || null,
        orderRevenue: order?.totalPrice ?? product.price
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FF2E93]">Production</p>
            <h1 className="font-space text-4xl font-black text-white">Print jobs only.</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/50">Create print jobs, run machine simulations, and mark finished units. Storage and boxes live in the new Storage section.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[220px_auto]">
            <Input value={newMachineName} placeholder="Machine name" onChange={(event) => setNewMachineName(event.target.value)} />
            <Button onClick={addMachine} disabled={isPending}><Plus className="h-4 w-4" /> Add machine</Button>
          </div>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</div> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Machines" value={String(system.machines.length)} />
        <Stat label="Printing" value={String(system.machines.filter((machine) => machine.status === "printing").length)} />
        <Stat label="Open jobs" value={String(activeJobs.length)} />
        <Stat label="Done today" value={String(doneToday)} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card title="Machines" icon={<Printer className="h-5 w-5" />}>
          <div className="grid gap-2">
            {system.machines.map((machine) => (
              <MachineLine key={machine.id} machine={machine} now={now} isPending={isPending} onPause={() => mutate({ type: "pauseMachine", machineId: machine.id })} onDone={() => mutate({ type: "markDone", machineId: machine.id })} onRemove={() => mutate({ type: "removeMachine", id: machine.id })} />
            ))}
          </div>
        </Card>

        <Card title="Add print job" icon={<Factory className="h-5 w-5" />}>
          <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr_0.8fr_0.8fr]">
            <Select value={jobDraft.productSlug} onValueChange={updateDraftProduct}>
              <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.slug}>{productName(product)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={jobDraft.linkedOrderId || "none"} onValueChange={(value) => setJobDraft((draft) => ({ ...draft, linkedOrderId: value === "none" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Order optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No order, stock unit</SelectItem>
                {orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.id.slice(0, 8)} - {order.customerName || order.productName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" min={1} value={jobDraft.filamentGrams} onChange={(event) => setJobDraft((draft) => ({ ...draft, filamentGrams: event.target.value }))} placeholder="Filament g" />
            <Input type="number" min={1} value={jobDraft.estimatedMinutes} onChange={(event) => setJobDraft((draft) => ({ ...draft, estimatedMinutes: event.target.value }))} placeholder="Print minutes" />
            <Select value={jobDraft.assignedMachineId || "none"} onValueChange={(value) => setJobDraft((draft) => ({ ...draft, assignedMachineId: value === "none" ? "" : value }))}>
              <SelectTrigger><SelectValue placeholder="Machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {system.machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="lg:col-span-3" onClick={addJob} disabled={isPending || products.length === 0}><Plus className="h-4 w-4" /> Create job</Button>
          </div>
        </Card>
      </div>

      <Card title="Print queue" icon={<Play className="h-5 w-5" />}>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/45">
              <tr>
                <th className="p-3">Job ID</th>
                <th className="p-3">Product</th>
                <th className="p-3">Order</th>
                <th className="p-3">Filament</th>
                <th className="p-3">Time</th>
                <th className="p-3">Status</th>
                <th className="p-3">Machine</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {activeJobs.map((job) => (
                <JobRow key={job.id} job={job} products={products} machines={system.machines} orders={orders} isPending={isPending} mutate={mutate} />
              ))}
              {activeJobs.length === 0 ? <tr><td className="p-8 text-center text-white/45" colSpan={8}>No print jobs yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-4"><p className="text-xs font-black uppercase text-white/45">{label}</p><p className="mt-1 font-space text-3xl font-black text-white">{value}</p></div>;
}

function MachineLine({ machine, now, isPending, onPause, onDone, onRemove }: { machine: ProductionMachine; now: number; isPending: boolean; onPause: () => void; onDone: () => void; onRemove: () => void }) {
  const remaining = secondsRemaining(machine, now);
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-space text-lg font-black">{machine.name}</h3>
          <p className="text-xs text-white/45">{machine.model || "Bambu Lab A1"}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${machineStyles[machine.status]}`}>{machineLabels[machine.status]}</span>
      </div>
      {machine.status === "printing" || machine.status === "paused" ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="font-bold">{machine.productName || "Current print"}</p>
          <p className="text-white/45">{machine.currentJobName} - {formatRemaining(remaining)} remaining</p>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline" onClick={onPause} disabled={isPending || (machine.status !== "printing" && machine.status !== "paused")}><Pause className="h-4 w-4" /> Pause</Button>
        <Button size="sm" variant="outline" onClick={onDone} disabled={isPending || !machine.currentJobId}><CheckCircle2 className="h-4 w-4" /> Done</Button>
        <Button size="sm" variant="ghost" className="text-red-200 hover:text-red-100" onClick={onRemove} disabled={isPending || machine.status === "printing"}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function JobRow({ job, products, machines, orders, isPending, mutate }: { job: PrintQueueJob; products: StoreProduct[]; machines: ProductionMachine[]; orders: StoreOrder[]; isPending: boolean; mutate: (action: ProductionAction) => void }) {
  return (
    <tr>
      <td className="p-3 font-mono text-xs font-black text-[#FF2E93]">{job.id}</td>
      <td className="p-3">
        <Select value={job.productSlug} onValueChange={(value) => {
          const product = products.find((item) => item.slug === value);
          mutate({ type: "updateJob", id: job.id, patch: { productSlug: value, productId: product?.id ?? value, productName: product ? productName(product) : job.productName } });
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.slug}>{productName(product)}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <Select value={job.linkedOrderId || "none"} onValueChange={(value) => {
          const order = value === "none" ? null : orders.find((item) => item.id === value);
          mutate({ type: "updateJob", id: job.id, patch: { linkedOrderId: value === "none" ? "" : value, customer: order?.customerName ?? "", orderRevenue: order?.totalPrice ?? job.orderRevenue } });
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Stock</SelectItem>
            {orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.id.slice(0, 8)} - {order.customerName || order.productName}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <Input className="w-24" type="number" min={1} value={String(job.filamentGrams)} onChange={(event) => mutate({ type: "updateJob", id: job.id, patch: { filamentGrams: Math.max(1, Number(event.target.value)) } })} />
      </td>
      <td className="p-3">
        <Input className="w-24" type="number" min={1} value={String(job.estimatedMinutes)} onChange={(event) => mutate({ type: "updateJob", id: job.id, patch: { estimatedMinutes: Math.max(1, Number(event.target.value)) } })} />
      </td>
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
            <SelectItem value="none">None</SelectItem>
            {machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => job.assignedMachineId ? mutate({ type: "startPrint", machineId: job.assignedMachineId, jobId: job.id }) : undefined} disabled={isPending || !job.assignedMachineId || job.status === "printing"}><Play className="h-4 w-4" /> Run</Button>
          <Button size="icon" variant="outline" onClick={() => mutate({ type: "markDone", jobId: job.id })} disabled={isPending}><CheckCircle2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" onClick={() => mutate({ type: "updateJob", id: job.id, patch: { status: "cancelled" } })} disabled={isPending}><CircleOff className="h-4 w-4" /></Button>
          <Button size="icon" variant="destructive" onClick={() => mutate({ type: "removeJob", id: job.id })} disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
  );
}
