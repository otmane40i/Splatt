"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, Box, CheckCircle2, PackageCheck, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductionInventoryItem, ProductionSystem, ProductionUnit, StoreOrder, UnitStatus } from "@/lib/firestore-store";

type StorageAction =
  | { type: "saveInventory"; item: Partial<ProductionInventoryItem> }
  | { type: "restockInventory"; id: string; amount: number }
  | { type: "updateUnit"; id: string; patch: { orderId?: string; customer?: string; status?: UnitStatus } };

const unitStatuses: UnitStatus[] = ["in_stock", "packaged", "delivered"];
const statusLabels: Record<UnitStatus, string> = {
  in_stock: "In stock",
  printed: "Printed",
  packaged: "Packaged",
  delivered: "Delivered"
};

function paintColors(notes: string | null) {
  if (!notes) return [];
  const match = notes.match(/Paint colors(?: in box)?:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1].split(",").map((color) => color.trim()).filter((color) => /^#[0-9a-fA-F]{6}$/.test(color));
}

function boxId(order: StoreOrder) {
  return `BOX-${order.id.slice(0, 6).toUpperCase()}`;
}

export function StorageManager({ initialSystem, orders }: { initialSystem: ProductionSystem; orders: StoreOrder[] }) {
  const [system, setSystem] = useState(initialSystem);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const availableUnits = system.units.filter((unit) => unit.status === "in_stock" || unit.status === "printed");
  const openBoxes = orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled");

  function mutate(action: StorageAction) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Storage update failed.");
        return;
      }
      setSystem((await response.json()) as ProductionSystem);
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#1FA8A0]">Storage</p>
        <h1 className="font-space text-4xl font-black text-white">Units, boxes, and kit stock.</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/50">Finished prints move here. Prepare each customer box with the unit ID, selected paint colors, cups, brush, plate, and packaging items.</p>
        {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</div> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Units available" value={String(availableUnits.length)} />
        <Stat label="Packaged" value={String(system.units.filter((unit) => unit.status === "packaged").length)} />
        <Stat label="Delivered" value={String(system.units.filter((unit) => unit.status === "delivered").length)} />
        <Stat label="Open boxes" value={String(openBoxes.length)} />
      </section>

      <Card title="Packing boxes" icon={<Box className="h-5 w-5" />}>
        <div className="grid gap-3 xl:grid-cols-2">
          {openBoxes.map((order) => (
            <PackingBox key={order.id} order={order} units={system.units} mutate={mutate} isPending={isPending} />
          ))}
          {openBoxes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/35 p-6 text-center text-white/45">No open order boxes yet.</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Available units" icon={<PackageCheck className="h-5 w-5" />}>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/45">
                <tr>
                  <th className="p-3">Unit ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {system.units.map((unit) => (
                  <tr key={unit.id}>
                    <td className="p-3 font-mono text-xs font-black text-[#FF2E93]">{unit.id}</td>
                    <td className="p-3">{unit.productName}</td>
                    <td className="p-3 text-white/60">{unit.orderId ? unit.orderId.slice(0, 8) : "Stock"}</td>
                    <td className="p-3">{unit.customer || ordersById.get(unit.orderId)?.customerName || "-"}</td>
                    <td className="p-3">
                      <Select value={unit.status === "printed" ? "in_stock" : unit.status} onValueChange={(value) => mutate({ type: "updateUnit", id: unit.id, patch: { status: value as UnitStatus } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{unitStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {system.units.length === 0 ? <tr><td className="p-8 text-center text-white/45" colSpan={5}>No finished units yet. Mark a print job done in Production.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Kit inventory" icon={<Archive className="h-5 w-5" />}>
          <div className="grid gap-2">
            {system.inventory.map((item) => <InventoryRow key={item.id} item={item} mutate={mutate} isPending={isPending} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PackingBox({ order, units, mutate, isPending }: { order: StoreOrder; units: ProductionUnit[]; mutate: (action: StorageAction) => void; isPending: boolean }) {
  const selectedUnit = units.find((unit) => unit.orderId === order.id);
  const colors = paintColors(order.notes);
  const compatibleUnits = units.filter((unit) => unit.productName === order.productName && (unit.status === "in_stock" || unit.status === "printed" || unit.orderId === order.id));

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black text-[#1FA8A0]">{boxId(order)}</p>
          <h3 className="mt-1 font-space text-xl font-black">{order.productName}</h3>
          <p className="text-sm text-white/50">{order.customerName || "Customer"} - {order.customerCity}</p>
        </div>
        <span className="rounded-full border border-[#FF2E93]/25 bg-[#FF2E93]/15 px-3 py-1 text-xs font-black uppercase text-[#ffc2df]">{order.status}</span>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-xs font-black uppercase text-white/40">Box content</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-white/70">
          <span>1 figurine unit</span>
          <span>3 paints</span>
          <span>1 brush</span>
          <span>2 mixing cups</span>
          <span>1 plate</span>
          <span>1 black SPLATT. box</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.length > 0 ? colors.map((color) => <span key={color} className="h-7 w-7 rounded-full border border-white/30" style={{ backgroundColor: color }} title={color} />) : <span className="text-sm text-white/40">No paint colors saved on this order.</span>}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Select value={selectedUnit?.id ?? "none"} onValueChange={(unitId) => {
          if (unitId === "none") return;
          mutate({ type: "updateUnit", id: unitId, patch: { orderId: order.id, customer: order.customerName, status: "packaged" } });
        }}>
          <SelectTrigger><SelectValue placeholder="Assign unit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Choose unit</SelectItem>
            {compatibleUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.id} - {statusLabels[unit.status]}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedUnit ? <Button onClick={() => mutate({ type: "updateUnit", id: selectedUnit.id, patch: { status: "delivered" } })} disabled={isPending}><CheckCircle2 className="h-4 w-4" /> Delivered</Button> : null}
      </div>
    </div>
  );
}

function InventoryRow({ item, mutate, isPending }: { item: ProductionInventoryItem; mutate: (action: StorageAction) => void; isPending: boolean }) {
  const [stock, setStock] = useState(String(item.stock));
  const low = item.stock <= item.minThreshold;
  const restockAmount = item.category === "filament" ? 1 : 10;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{item.name}</p>
          <p className="text-xs text-white/45">Minimum {item.minThreshold} {item.unit}</p>
        </div>
        {low ? <span className="rounded-full border border-red-400/30 bg-red-500/15 px-2 py-1 text-xs font-black text-red-100">LOW</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <Input type="number" step="0.001" value={stock} onChange={(event) => setStock(event.target.value)} />
        <Button variant="outline" onClick={() => mutate({ type: "saveInventory", item: { ...item, stock: Number(stock) } })} disabled={isPending}><Save className="h-4 w-4" /></Button>
        <Button onClick={() => mutate({ type: "restockInventory", id: item.id, amount: restockAmount })} disabled={isPending}><RefreshCw className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-4"><div className="mb-3 flex items-center gap-3 border-b border-white/10 pb-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1FA8A0]/15 text-[#1FA8A0]">{icon}</div><h2 className="font-space text-xl font-black text-white">{title}</h2></div>{children}</section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-4"><p className="text-xs font-black uppercase text-white/45">{label}</p><p className="mt-1 font-space text-3xl font-black text-white">{value}</p></div>;
}
