"use client";

import { useState, useTransition } from "react";
import { Edit, Factory, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMad } from "@/lib/utils";
import type { ProductionItem } from "@/lib/firestore-store";

type ProductionDraft = Omit<ProductionItem, "createdAt" | "updatedAt">;

const types: ProductionItem["type"][] = ["filament", "printer", "box", "paint", "tool", "charge", "other"];
const statuses: ProductionItem["status"][] = ["available", "low", "active", "maintenance", "ordered", "paused"];

const blankItem: ProductionDraft = {
  id: "",
  name: "",
  type: "filament",
  status: "available",
  quantity: 0,
  unit: "kg",
  unitCost: 0,
  monthlyCost: 0,
  notes: null
};

export function ProductionManager({ items }: { items: ProductionItem[] }) {
  const [draft, setDraft] = useState<ProductionDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const inventoryValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const monthlyCharges = items.reduce((sum, item) => sum + item.monthlyCost, 0);
  const activePrinters = items.filter((item) => item.type === "printer" && item.status === "active").length;
  const lowItems = items.filter((item) => item.status === "low").length;

  function refresh() {
    window.location.reload();
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      await fetch("/api/production", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      setDraft(null);
      refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch("/api/production", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl font-black">Production</h1>
          <p className="mt-2 text-sm text-white/55">Track printers, filament, packaging, tools, and monthly charges.</p>
        </div>
        <Button onClick={() => setDraft(blankItem)}><Plus className="h-4 w-4" /> Add item</Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Inventory value" value={formatMad(inventoryValue)} />
        <Metric label="Monthly charges" value={formatMad(monthlyCharges)} />
        <Metric label="Active printers" value={String(activePrinters)} />
        <Metric label="Low items" value={String(lowItems)} />
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-white/10 text-white/50">
            <tr>
              <th className="p-4">Item</th>
              <th className="p-4">Type</th>
              <th className="p-4">Status</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Unit cost</th>
              <th className="p-4">Monthly</th>
              <th className="p-4">Value</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-4">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-white/45">{item.notes}</p>
                </td>
                <td className="p-4 capitalize">{item.type}</td>
                <td className="p-4"><span className={item.status === "low" || item.status === "maintenance" ? "text-splatt-orange" : "text-splatt-teal"}>{item.status}</span></td>
                <td className="p-4">{item.quantity} {item.unit}</td>
                <td className="p-4">{formatMad(item.unitCost)}</td>
                <td className="p-4">{formatMad(item.monthlyCost)}</td>
                <td className="p-4">{formatMad(item.quantity * item.unitCost)}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => setDraft(item)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" disabled={isPending} onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-white/50">
                  <Factory className="mx-auto mb-3 h-8 w-8" /> Add filament, printers, boxes, paint, rent, electricity, or other charges.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit production item" : "Add production item"}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={draft.type} onValueChange={(value: ProductionItem["type"]) => setDraft({ ...draft, type: value, unit: value === "filament" ? "kg" : value === "charge" ? "month" : "unit" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(value: ProductionItem["status"]) => setDraft({ ...draft, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Quantity" type="number" value={String(draft.quantity)} onChange={(value) => setDraft({ ...draft, quantity: Number(value) })} />
              <Field label="Unit" value={draft.unit} onChange={(value) => setDraft({ ...draft, unit: value })} />
              <Field label="Unit cost MAD" type="number" value={String(draft.unitCost)} onChange={(value) => setDraft({ ...draft, unitCost: Number(value) })} />
              <Field label="Monthly cost MAD" type="number" value={String(draft.monthlyCost)} onChange={(value) => setDraft({ ...draft, monthlyCost: Number(value) })} />
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="production-notes">Notes</Label>
                <Textarea id="production-notes" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Supplier, printer model, electricity estimate..." />
              </div>
              <Button className="md:col-span-2" onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save item"}</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="glass p-5"><p className="text-sm text-white/55">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
