"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Box, CheckCircle2, PackageCheck, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StoreProduct } from "@/lib/catalog";
import type { ProductionInventoryItem, ProductionSystem, ProductionUnit, StoreOrder, UnitStatus } from "@/lib/firestore-store";
import { orderStatuses, type OrderStatus } from "@/lib/status";

type StorageAction =
  | { type: "saveInventory"; item: Partial<ProductionInventoryItem> }
  | { type: "restockInventory"; id: string; amount: number }
  | { type: "updateUnit"; id: string; patch: { orderId?: string; customer?: string; status?: UnitStatus; notes?: string } }
  | { type: "deleteUnit"; id: string };

const unitStatuses: UnitStatus[] = ["in_stock", "packaged", "delivered", "ruined"];
const statusLabels: Record<UnitStatus, string> = {
  in_stock: "In stock",
  printed: "Printed",
  packaged: "Packaged",
  delivered: "Delivered",
  ruined: "Ruined"
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

export function StorageManager({ initialSystem, orders, products }: { initialSystem: ProductionSystem; orders: StoreOrder[]; products: StoreProduct[] }) {
  const [system, setSystem] = useState(initialSystem);
  const [orderList, setOrderList] = useState(orders);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const ordersById = useMemo(() => new Map(orderList.map((order) => [order.id, order])), [orderList]);
  const availableUnits = system.units.filter((unit) => unit.status === "in_stock" || unit.status === "printed");
  const terminalOrderStatuses: OrderStatus[] = ["delivered", "returned", "cancelled"];
  const openBoxes = orderList.filter((order) => !terminalOrderStatuses.includes(order.status));
  const followUpOrders = orderList;
  const productStocks = products.map((product) => {
    const units = system.units.filter((unit) => unit.productSlug === product.slug || unit.productName === product.nameEN);
    return {
      product,
      inStock: units.filter((unit) => unit.status === "in_stock" || unit.status === "printed").length,
      packaged: units.filter((unit) => unit.status === "packaged").length,
      ruined: units.filter((unit) => unit.status === "ruined").length
    };
  });

  async function applyProductionAction(action: StorageAction) {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Storage update failed.");
        return null;
      }
      const nextSystem = (await response.json()) as ProductionSystem;
      setSystem(nextSystem);
      return nextSystem;
    } finally {
      setIsSaving(false);
    }
  }

  function mutate(action: StorageAction) {
    void applyProductionAction(action);
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Order status update failed.");
        return null;
      }
      const updatedOrder = (await response.json()) as StoreOrder;
      setOrderList((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
      return updatedOrder;
    } finally {
      setIsSaving(false);
    }
  }

  async function deliverBox(order: StoreOrder, unit: ProductionUnit) {
    const updated = await applyProductionAction({ type: "updateUnit", id: unit.id, patch: { status: "delivered" } });
    if (updated) await updateOrderStatus(order.id, "delivered");
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
        <Stat label="Delivered" value={String(orderList.filter((order) => order.status === "delivered").length)} />
        <Stat label="Open boxes" value={String(openBoxes.length)} />
      </section>

      <Card title="Current product stock" icon={<PackageCheck className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {productStocks.map(({ product, inStock, packaged, ruined }) => (
            <div key={product.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase text-white/40">{product.category}</p>
              <h3 className="mt-1 font-space text-xl font-black">{product.nameEN}</h3>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="stock" value={String(inStock)} />
                <MiniStat label="packed" value={String(packaged)} />
                <MiniStat label="ruined" value={String(ruined)} />
              </div>
            </div>
          ))}
          {productStocks.length === 0 ? <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-white/45">No products found.</p> : null}
        </div>
      </Card>

      <Card title="Packing boxes" icon={<Box className="h-5 w-5" />}>
        <div className="grid gap-3 xl:grid-cols-2">
          {openBoxes.map((order) => (
            <PackingBox key={order.id} order={order} units={system.units} mutate={mutate} deliverBox={deliverBox} isPending={isSaving} />
          ))}
          {openBoxes.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/35 p-6 text-center text-white/45">No open order boxes yet.</p> : null}
        </div>
      </Card>

      <Card title="Order follow-up" icon={<CheckCircle2 className="h-5 w-5" />}>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/45">
              <tr>
                <th className="p-3">Box</th>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Product</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {followUpOrders.map((order) => {
                const unit = system.units.find((item) => item.orderId === order.id);
                return (
                  <tr key={order.id}>
                    <td className="p-3 font-mono text-xs font-black text-[#1FA8A0]">{boxId(order)}</td>
                    <td className="p-3 text-white/60">{order.id.slice(0, 8)}</td>
                    <td className="p-3">{order.customerName || "Customer"}</td>
                    <td className="p-3">{order.productName}</td>
                    <td className="p-3 font-mono text-xs text-[#FF2E93]">{unit?.id ?? "-"}</td>
                    <td className="p-3">
                      <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{orderStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 font-bold">{order.totalPrice} MAD</td>
                  </tr>
                );
              })}
              {followUpOrders.length === 0 ? <tr><td className="p-8 text-center text-white/45" colSpan={7}>Delivered, returned, and cancelled orders will live here.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="All units shortcut" icon={<PackageCheck className="h-5 w-5" />}>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/45">
                <tr>
                  <th className="p-3">Unit ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {system.units.map((unit) => (
                  <UnitRow key={unit.id} unit={unit} ordersById={ordersById} mutate={mutate} isPending={isSaving} />
                ))}
                {system.units.length === 0 ? <tr><td className="p-8 text-center text-white/45" colSpan={7}>No finished units yet. Mark a print job done in Production.</td></tr> : null}
              </tbody>
            </table>
          </div>
      </Card>

      <Card title="Kit inventory" icon={<Archive className="h-5 w-5" />}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {system.inventory.map((item) => <InventoryRow key={item.id} item={item} mutate={mutate} isPending={isSaving} />)}
          </div>
      </Card>
    </div>
  );
}

function PackingBox({ order, units, mutate, deliverBox, isPending }: { order: StoreOrder; units: ProductionUnit[]; mutate: (action: StorageAction) => void; deliverBox: (order: StoreOrder, unit: ProductionUnit) => Promise<void>; isPending: boolean }) {
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
        {selectedUnit ? (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => deliverBox(order, selectedUnit)} disabled={isPending}><CheckCircle2 className="h-4 w-4" /> Delivered</Button>
            <Button variant="outline" onClick={() => mutate({ type: "updateUnit", id: selectedUnit.id, patch: { orderId: "", customer: "", status: "in_stock" } })} disabled={isPending}><RotateCcw className="h-4 w-4" /> Unpack</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UnitRow({ unit, ordersById, mutate, isPending }: { unit: ProductionUnit; ordersById: Map<string, StoreOrder>; mutate: (action: StorageAction) => void; isPending: boolean }) {
  const [notes, setNotes] = useState(unit.notes ?? "");
  const displayStatus = unit.status === "printed" ? "in_stock" : unit.status;

  return (
    <tr>
      <td className="p-3 font-mono text-xs font-black text-[#FF2E93]">{unit.id}</td>
      <td className="p-3">{unit.productName}</td>
      <td className="p-3 text-white/60">{unit.orderId ? unit.orderId.slice(0, 8) : "Stock"}</td>
      <td className="p-3">{unit.customer || ordersById.get(unit.orderId)?.customerName || "-"}</td>
      <td className="p-3">
        <Select value={displayStatus} onValueChange={(value) => mutate({ type: "updateUnit", id: unit.id, patch: { status: value as UnitStatus } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{unitStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={notes} placeholder="Ruined corner, repaint, etc." onChange={(event) => setNotes(event.target.value)} />
          <Button size="icon" variant="outline" onClick={() => mutate({ type: "updateUnit", id: unit.id, patch: { notes } })} disabled={isPending}><Save className="h-4 w-4" /></Button>
        </div>
      </td>
      <td className="p-3 text-right">
        <Button size="icon" variant="destructive" onClick={() => mutate({ type: "deleteUnit", id: unit.id })} disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
      </td>
    </tr>
  );
}

function InventoryRow({ item, mutate, isPending }: { item: ProductionInventoryItem; mutate: (action: StorageAction) => void; isPending: boolean }) {
  const [stock, setStock] = useState(String(item.stock));
  const low = item.stock <= item.minThreshold;
  const restockAmount = item.category === "filament" ? 1 : 10;

  useEffect(() => {
    setStock(String(item.stock));
  }, [item.stock]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-space text-lg font-black">{item.name}</p>
          <p className="text-xs text-white/45">Minimum {item.minThreshold} {item.unit}</p>
        </div>
        {low ? <span className="rounded-full border border-red-400/30 bg-red-500/15 px-2 py-1 text-xs font-black text-red-100">LOW</span> : null}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-space text-3xl font-black">{item.stock}</p>
          <p className="text-xs uppercase text-white/45">{item.unit}</p>
        </div>
        <div className="grid flex-1 grid-cols-[1fr_auto_auto] gap-2">
          <Input type="number" step="0.001" value={stock} onChange={(event) => setStock(event.target.value)} />
          <Button variant="outline" onClick={() => mutate({ type: "saveInventory", item: { ...item, stock: Number(stock) } })} disabled={isPending}><Save className="h-4 w-4" /></Button>
          <Button onClick={() => mutate({ type: "restockInventory", id: item.id, amount: restockAmount })} disabled={isPending}><RefreshCw className="h-4 w-4" /></Button>
        </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2"><p className="font-space text-2xl font-black">{value}</p><p className="text-[10px] font-black uppercase text-white/35">{label}</p></div>;
}
