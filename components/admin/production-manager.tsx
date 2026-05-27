"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Box, CheckCircle2, Clock, Factory, GripVertical, PackageCheck, Pause, Play, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMad } from "@/lib/utils";
import type { MachineStatus, PrintJobStatus, PrintQueueJob, ProductionInventoryItem, ProductionMachine, ProductionSystem, UnitStatus } from "@/lib/firestore-store";

type MachineDraft = Pick<ProductionMachine, "id" | "name" | "model" | "status">;
type JobDraft = Pick<PrintQueueJob, "id" | "productName" | "linkedOrderId" | "customer" | "filamentGrams" | "estimatedMinutes" | "status" | "assignedMachineId" | "orderRevenue">;
type InventoryDraft = ProductionInventoryItem;

const machineStatuses: MachineStatus[] = ["idle", "printing", "done", "paused"];
const jobStatuses: PrintJobStatus[] = ["queued", "printing", "done"];
const unitStatuses: UnitStatus[] = ["printed", "packaged", "delivered"];
const inventoryCategories: ProductionInventoryItem["category"][] = ["filament", "paint", "brush", "cup", "box", "plate"];

export function ProductionManager({ initialSystem }: { initialSystem: ProductionSystem }) {
  const [system, setSystem] = useState(initialSystem);
  const [machineDraft, setMachineDraft] = useState<MachineDraft | null>(null);
  const [jobDraft, setJobDraft] = useState<JobDraft | null>(null);
  const [inventoryDraft, setInventoryDraft] = useState<InventoryDraft | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - 6);
    const doneJobs = system.queue.filter((job) => job.status === "done");
    const dailyJobs = doneJobs.filter((job) => job.completedAt && new Date(job.completedAt).getTime() >= dayStart.getTime());
    const weeklyJobs = doneJobs.filter((job) => job.completedAt && new Date(job.completedAt).getTime() >= weekStart.getTime());
    const cost = system.inventory.reduce((sum, item) => sum + Math.max(0, item.minThreshold - item.stock) * item.unitCost, 0);
    const revenue = doneJobs.reduce((sum, job) => sum + job.orderRevenue, 0);
    return {
      dailyUnits: dailyJobs.length,
      weeklyUnits: weeklyJobs.length,
      filament: doneJobs.reduce((sum, job) => sum + job.filamentGrams, 0),
      boxes: doneJobs.length,
      cost,
      revenue
    };
  }, [system]);

  function mutate(action: object) {
    startTransition(async () => {
      const response = await fetch("/api/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      if (!response.ok) return;
      const updated = (await response.json()) as ProductionSystem;
      setSystem(updated);
    });
  }

  function reorderQueue(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const current = system.queue;
    const dragged = current.find((job) => job.id === dragId);
    if (!dragged) return;
    const next = current.filter((job) => job.id !== dragId);
    const targetIndex = next.findIndex((job) => job.id === targetId);
    next.splice(targetIndex, 0, dragged);
    setSystem({ ...system, queue: next });
    mutate({ type: "reorderQueue", ids: next.map((job) => job.id) });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase text-splatt-pink">Production OS</p>
          <h1 className="font-space text-4xl font-black sm:text-5xl">Manage every unit from print to box.</h1>
          <p className="mt-2 max-w-2xl text-white/55">Machines, print queue, inventory, assigned orders, and production money in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMachineDraft({ id: "", name: "", model: "", status: "idle" })}><Plus className="h-4 w-4" /> Machine</Button>
          <Button variant="outline" onClick={() => setJobDraft({ id: "", productName: "", linkedOrderId: "", customer: "", filamentGrams: 80, estimatedMinutes: 180, status: "queued", assignedMachineId: null, orderRevenue: 0 })}><Plus className="h-4 w-4" /> Print job</Button>
          <Button variant="outline" onClick={() => setInventoryDraft({ id: "", name: "", category: "filament", stock: 0, minThreshold: 0, unit: "unit", unitCost: 0 })}><Plus className="h-4 w-4" /> Inventory</Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat label="Today printed" value={String(stats.dailyUnits)} />
        <Stat label="7-day printed" value={String(stats.weeklyUnits)} />
        <Stat label="Filament used" value={`${stats.filament}g`} />
        <Stat label="Boxes used" value={String(stats.boxes)} />
        <Stat label="Revenue done" value={formatMad(stats.revenue)} />
      </section>

      <section>
        <SectionTitle icon={Printer} title="Machines Panel" action={<Button size="sm" onClick={() => setMachineDraft({ id: "", name: "", model: "", status: "idle" })}><Plus className="h-4 w-4" /> Add machine</Button>} />
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {system.machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} queue={system.queue} now={now} isPending={isPending} onEdit={() => setMachineDraft(machine)} onStart={(jobId) => mutate({ type: "startPrint", machineId: machine.id, jobId })} onPause={() => mutate({ type: "pauseMachine", machineId: machine.id })} onDone={() => mutate({ type: "markDone", machineId: machine.id })} onRemove={() => mutate({ type: "removeMachine", id: machine.id })} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={GripVertical} title="Print Queue" action={<Button size="sm" onClick={() => setJobDraft({ id: "", productName: "", linkedOrderId: "", customer: "", filamentGrams: 80, estimatedMinutes: 180, status: "queued", assignedMachineId: null, orderRevenue: 0 })}><Plus className="h-4 w-4" /> Add job</Button>} />
        <div className="glass mt-4 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="p-4">Move</th>
                <th className="p-4">Job ID</th>
                <th className="p-4">Product</th>
                <th className="p-4">Order</th>
                <th className="p-4">Filament</th>
                <th className="p-4">Time</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned machine</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {system.queue.map((job) => (
                <tr key={job.id} draggable onDragStart={() => setDragId(job.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderQueue(job.id)} className="transition hover:bg-white/[0.03]">
                  <td className="p-4 text-white/35"><GripVertical className="h-4 w-4" /></td>
                  <td className="p-4 font-mono text-xs">{job.id}</td>
                  <td className="p-4 font-bold">{job.productName}<p className="text-white/40">{job.customer}</p></td>
                  <td className="p-4">{job.linkedOrderId || "No order"}</td>
                  <td className="p-4">{job.filamentGrams}g</td>
                  <td className="p-4">{job.estimatedMinutes} min</td>
                  <td className="p-4"><StatusBadge status={job.status} /></td>
                  <td className="p-4">
                    <Select value={job.assignedMachineId ?? "none"} onValueChange={(value) => mutate({ type: "assignJob", jobId: job.id, machineId: value === "none" ? null : value })}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {system.machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setJobDraft(job)}>Edit</Button>
                      <Button size="icon" variant="destructive" onClick={() => mutate({ type: "removeJob", id: job.id })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionTitle icon={Box} title="Inventory Tracker" action={<Button size="sm" onClick={() => setInventoryDraft({ id: "", name: "", category: "filament", stock: 0, minThreshold: 0, unit: "unit", unitCost: 0 })}><Plus className="h-4 w-4" /> Add stock</Button>} />
          <div className="mt-4 grid gap-3">
            {system.inventory.map((item) => <InventoryRow key={item.id} item={item} onEdit={() => setInventoryDraft(item)} onRemove={() => mutate({ type: "removeInventory", id: item.id })} />)}
          </div>
        </div>

        <div>
          <SectionTitle icon={PackageCheck} title="Order-to-Unit Assignment" />
          <div className="glass mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 text-white/50">
                <tr><th className="p-4">Unit ID</th><th className="p-4">Product</th><th className="p-4">Order ID</th><th className="p-4">Customer</th><th className="p-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {system.units.map((unit) => (
                  <tr key={unit.id}>
                    <td className="p-4 font-black">{unit.id}</td>
                    <td className="p-4">{unit.productName}</td>
                    <td className="p-4">{unit.orderId || "Stock"}</td>
                    <td className="p-4">{unit.customer || "No customer"}</td>
                    <td className="p-4">
                      <Select value={unit.status} onValueChange={(status: UnitStatus) => mutate({ type: "updateUnit", id: unit.id, status })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{unitStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {system.units.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-white/45">Mark a print as done to create the first unit ID.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <MachineDialog draft={machineDraft} setDraft={setMachineDraft} save={(machine) => mutate({ type: "saveMachine", machine })} />
      <JobDialog draft={jobDraft} setDraft={setJobDraft} machines={system.machines} save={(job) => mutate({ type: "saveJob", job })} />
      <InventoryDialog draft={inventoryDraft} setDraft={setInventoryDraft} save={(item) => mutate({ type: "saveInventory", item })} />
    </div>
  );
}

function MachineCard({ machine, queue, now, isPending, onEdit, onStart, onPause, onDone, onRemove }: { machine: ProductionMachine; queue: PrintQueueJob[]; now: number; isPending: boolean; onEdit: () => void; onStart: (jobId: string) => void; onPause: () => void; onDone: () => void; onRemove: () => void }) {
  const availableJobs = queue.filter((job) => job.status === "queued" && (!job.assignedMachineId || job.assignedMachineId === machine.id));
  const remaining = remainingSeconds(machine, now);
  const progress = machine.estimatedSeconds > 0 ? Math.min(100, Math.round(((machine.estimatedSeconds - remaining) / machine.estimatedSeconds) * 100)) : 0;
  return (
    <div className="glass p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-space text-2xl font-black">{machine.name}</p>
          <p className="text-sm text-white/45">{machine.model || "No model set"}</p>
        </div>
        <StatusBadge status={machine.status} />
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs font-black uppercase text-white/40">Current print</p>
        <p className="mt-2 font-bold">{machine.productName || "No active job"}</p>
        <p className="mt-1 text-sm text-white/50">{machine.currentJobName || "Waiting for queue"}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-splatt-pink" style={{ width: `${progress}%` }} /></div>
        <p className="mt-2 flex items-center gap-2 text-sm text-white/60"><Clock className="h-4 w-4" /> {formatDuration(remaining)} remaining</p>
      </div>
      <div className="mt-4 grid gap-2">
        <Select onValueChange={onStart} disabled={isPending || availableJobs.length === 0}>
          <SelectTrigger><SelectValue placeholder="Start print job" /></SelectTrigger>
          <SelectContent>{availableJobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.productName} · {job.estimatedMinutes} min</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={onPause} disabled={!machine.currentJobId}><Pause className="h-4 w-4" /> Pause</Button>
          <Button variant="outline" onClick={onDone} disabled={!machine.currentJobId}><CheckCircle2 className="h-4 w-4" /> Done</Button>
          <Button variant="outline" onClick={onEdit}>Edit</Button>
        </div>
        <Button variant="destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /> Remove</Button>
      </div>
    </div>
  );
}

function InventoryRow({ item, onEdit, onRemove }: { item: ProductionInventoryItem; onEdit: () => void; onRemove: () => void }) {
  const low = item.stock <= item.minThreshold;
  return (
    <div className="glass flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-bold">{item.name}</p>
        <p className="text-sm text-white/45 capitalize">{item.category} · min {item.minThreshold} {item.unit} · {formatMad(item.unitCost)} / {item.unit}</p>
      </div>
      <div className="flex items-center gap-3">
        {low ? <span className="flex items-center gap-1 rounded-full bg-splatt-orange/15 px-3 py-1 text-xs font-black text-splatt-orange"><AlertTriangle className="h-3 w-3" /> LOW</span> : null}
        <span className="font-space text-xl font-black">{item.stock} {item.unit}</span>
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button size="icon" variant="destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function MachineDialog({ draft, setDraft, save }: { draft: MachineDraft | null; setDraft: (draft: MachineDraft | null) => void; save: (draft: MachineDraft) => void }) {
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
      <DialogContent><DialogHeader><DialogTitle>Machine</DialogTitle></DialogHeader>
        {draft ? <div className="grid gap-4">
          <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <Field label="Model" value={draft.model} onChange={(model) => setDraft({ ...draft, model })} />
          <SelectField label="Status" value={draft.status} values={machineStatuses} onChange={(status) => setDraft({ ...draft, status: status as MachineStatus })} />
          <Button onClick={() => { save(draft); setDraft(null); }}>Save machine</Button>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}

function JobDialog({ draft, setDraft, machines, save }: { draft: JobDraft | null; setDraft: (draft: JobDraft | null) => void; machines: ProductionMachine[]; save: (draft: JobDraft) => void }) {
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
      <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Print job</DialogTitle></DialogHeader>
        {draft ? <div className="grid gap-4 md:grid-cols-2">
          <Field label="Product name" value={draft.productName} onChange={(productName) => setDraft({ ...draft, productName })} />
          <Field label="Linked order ID" value={draft.linkedOrderId} onChange={(linkedOrderId) => setDraft({ ...draft, linkedOrderId })} />
          <Field label="Customer" value={draft.customer} onChange={(customer) => setDraft({ ...draft, customer })} />
          <Field label="Filament needed (g)" type="number" value={String(draft.filamentGrams)} onChange={(value) => setDraft({ ...draft, filamentGrams: Number(value) })} />
          <Field label="Estimated time (min)" type="number" value={String(draft.estimatedMinutes)} onChange={(value) => setDraft({ ...draft, estimatedMinutes: Number(value) })} />
          <Field label="Order revenue MAD" type="number" value={String(draft.orderRevenue)} onChange={(value) => setDraft({ ...draft, orderRevenue: Number(value) })} />
          <SelectField label="Status" value={draft.status} values={jobStatuses} onChange={(status) => setDraft({ ...draft, status: status as PrintJobStatus })} />
          <div className="grid gap-2">
            <Label>Assigned machine</Label>
            <Select value={draft.assignedMachineId ?? "none"} onValueChange={(value) => setDraft({ ...draft, assignedMachineId: value === "none" ? null : value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Unassigned</SelectItem>{machines.map((machine) => <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="md:col-span-2" onClick={() => { save(draft); setDraft(null); }}>Save print job</Button>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}

function InventoryDialog({ draft, setDraft, save }: { draft: InventoryDraft | null; setDraft: (draft: InventoryDraft | null) => void; save: (draft: InventoryDraft) => void }) {
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
      <DialogContent><DialogHeader><DialogTitle>Inventory item</DialogTitle></DialogHeader>
        {draft ? <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <SelectField label="Category" value={draft.category} values={inventoryCategories} onChange={(category) => setDraft({ ...draft, category: category as ProductionInventoryItem["category"] })} />
          <Field label="Current stock" type="number" value={String(draft.stock)} onChange={(value) => setDraft({ ...draft, stock: Number(value) })} />
          <Field label="Minimum threshold" type="number" value={String(draft.minThreshold)} onChange={(value) => setDraft({ ...draft, minThreshold: Number(value) })} />
          <Field label="Unit" value={draft.unit} onChange={(unit) => setDraft({ ...draft, unit })} />
          <Field label="Unit cost MAD" type="number" value={String(draft.unitCost)} onChange={(value) => setDraft({ ...draft, unitCost: Number(value) })} />
          <Button className="md:col-span-2" onClick={() => { save(draft); setDraft(null); }}>Save inventory</Button>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}

function remainingSeconds(machine: ProductionMachine, now: number) {
  if (machine.status === "paused") return machine.pausedRemainingSeconds ?? machine.estimatedSeconds;
  if (!machine.startedAt) return machine.estimatedSeconds;
  const elapsed = Math.floor((now - new Date(machine.startedAt).getTime()) / 1000);
  return Math.max(0, machine.estimatedSeconds - elapsed);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="glass p-5"><p className="text-sm text-white/50">{label}</p><p className="mt-2 font-space text-2xl font-black">{value}</p></div>;
}

function SectionTitle({ icon: Icon, title, action }: { icon: typeof Factory; title: string; action?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><h2 className="flex items-center gap-3 font-space text-2xl font-black"><Icon className="h-6 w-6 text-splatt-pink" />{title}</h2>{action}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "printing" ? "text-splatt-teal bg-splatt-teal/15" : status === "done" ? "text-splatt-pink bg-splatt-pink/15" : status === "paused" ? "text-splatt-orange bg-splatt-orange/15" : "text-white/65 bg-white/10";
  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone}`}>{status}</span>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
