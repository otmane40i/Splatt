"use client";

import { useState, useTransition } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatMad } from "@/lib/utils";
import type { DiscountCode } from "@/lib/pricing";

type DiscountDraft = Omit<DiscountCode, "createdAt" | "updatedAt">;

const blankDiscount: DiscountDraft = {
  id: "",
  code: "",
  type: "percentage",
  value: 10,
  minTotal: 0,
  active: true,
  usageLimit: null,
  usedCount: 0
};

export function DiscountsManager({ discounts }: { discounts: DiscountCode[] }) {
  const [draft, setDraft] = useState<DiscountDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    window.location.reload();
  }

  function save() {
    if (!draft) return;
    const method = draft.id ? "PUT" : "POST";
    startTransition(async () => {
      await fetch("/api/discounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: draft.id || draft.code })
      });
      setDraft(null);
      refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch("/api/discounts", {
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
          <h1 className="font-space text-4xl font-black">Discounts</h1>
          <p className="mt-2 text-sm text-white/55">Create codes for drops, friends, and bundle moments.</p>
        </div>
        <Button onClick={() => setDraft(blankDiscount)}><Plus className="h-4 w-4" /> Add code</Button>
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-white/50">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Minimum</th>
              <th className="p-4">Usage</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td className="p-4 font-space text-lg font-black">{discount.code}</td>
                <td className="p-4">{discount.type === "percentage" ? `${discount.value}% off` : `${formatMad(discount.value)} off`}</td>
                <td className="p-4">{discount.minTotal > 0 ? formatMad(discount.minTotal) : "None"}</td>
                <td className="p-4">{discount.usageLimit ? `${discount.usedCount}/${discount.usageLimit}` : `${discount.usedCount} used`}</td>
                <td className="p-4"><span className={discount.active ? "text-splatt-teal" : "text-white/40"}>{discount.active ? "Active" : "Off"}</span></td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => setDraft(discount)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => remove(discount.id)} disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Edit discount" : "Add discount"}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="grid gap-4">
              <Field label="Code" value={draft.code} onChange={(value) => setDraft({ ...draft, code: value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} />
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={draft.type} onValueChange={(value: "percentage" | "fixed") => setDraft({ ...draft, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed MAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label={draft.type === "percentage" ? "Percent off" : "MAD off"} type="number" value={String(draft.value)} onChange={(value) => setDraft({ ...draft, value: Number(value) })} />
              <Field label="Minimum cart MAD" type="number" value={String(draft.minTotal)} onChange={(value) => setDraft({ ...draft, minTotal: Number(value) })} />
              <Field label="Usage limit" type="number" value={String(draft.usageLimit ?? "")} onChange={(value) => setDraft({ ...draft, usageLimit: value ? Number(value) : null })} />
              <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <Label>Active</Label>
                <Switch checked={draft.active} onCheckedChange={(value) => setDraft({ ...draft, active: value })} />
              </div>
              <Button onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save code"}</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
