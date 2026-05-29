"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Edit, MapPin, MessageCircle, PackageCheck, ReceiptText, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProductionUnit, StoreOrder } from "@/lib/firestore-store";
import { orderStatuses, type OrderStatus } from "@/lib/status";
import { formatMad } from "@/lib/utils";

type OrderDraft = Pick<StoreOrder, "id" | "customerName" | "customerPhone" | "customerCity" | "customerAddress" | "productName" | "quantity" | "totalPrice" | "status" | "notes">;

const statusStyles: Record<OrderStatus, string> = {
  pending: "border-yellow-300/25 bg-yellow-300/10 text-yellow-100",
  confirmed: "border-[#1FA8A0]/30 bg-[#1FA8A0]/15 text-[#bffefa]",
  shipped: "border-blue-300/25 bg-blue-400/10 text-blue-100",
  delivered: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  returned: "border-orange-300/25 bg-orange-400/10 text-orange-100",
  cancelled: "border-red-300/25 bg-red-400/10 text-red-100"
};

function boxId(order: StoreOrder) {
  return `BOX-${order.id.slice(0, 6).toUpperCase()}`;
}

function monthKey(order: StoreOrder) {
  const date = new Date(order.createdAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function colorsFromNotes(notes: string | null) {
  if (!notes) return [];
  const match = notes.match(/Paint colors(?: in box)?:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1].split(",").map((color) => color.trim()).filter((color) => /^#[0-9a-fA-F]{6}$/.test(color));
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}`;
}

export function OrdersManager({
  orders,
  allOrders,
  units,
  activeStatus,
  activeMonth
}: {
  orders: StoreOrder[];
  allOrders: StoreOrder[];
  units: ProductionUnit[];
  activeStatus?: OrderStatus;
  activeMonth?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const router = useRouter();
  const unitsByOrder = useMemo(() => new Map(units.filter((unit) => unit.orderId).map((unit) => [unit.orderId, unit])), [units]);
  const months = useMemo(() => Array.from(new Set(allOrders.map(monthKey))).sort().reverse(), [allOrders]);
  const stats = useMemo(() => {
    const liveOrders = allOrders.filter((order) => order.status !== "cancelled" && order.status !== "returned");
    return [
      { label: "Open", value: String(allOrders.filter((order) => order.status === "pending" || order.status === "confirmed").length) },
      { label: "Packed", value: String(units.filter((unit) => unit.status === "packaged").length) },
      { label: "Delivered", value: String(allOrders.filter((order) => order.status === "delivered").length) },
      { label: "Revenue", value: formatMad(liveOrders.reduce((sum, order) => sum + order.totalPrice, 0)) }
    ];
  }, [allOrders, units]);

  function ordersHref(status?: OrderStatus, month = activeMonth) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (month) params.set("month", month);
    return `/admin/orders${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function updateStatus(id: string, status: OrderStatus) {
    startTransition(async () => {
      await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      router.refresh();
    });
  }

  function saveOrder() {
    if (!draft) return;
    startTransition(async () => {
      await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      setDraft(null);
      router.refresh();
    });
  }

  function removeOrder(id: string) {
    startTransition(async () => {
      await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FF2E93]">Orders</p>
        <div className="mt-2 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="font-space text-4xl font-black text-white">Customer orders, boxes, and delivery flow.</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/50">Track the customer, chosen product, selected colors, unit ID, packing box, and final delivery status from one clean view.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={activeMonth ?? "all"} onValueChange={(value) => router.push(ordersHref(activeStatus, value === "all" ? undefined : value))}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button asChild variant={!activeStatus ? "default" : "outline"}><Link href={ordersHref(undefined)}>All</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {stats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} />)}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-4">
        <div className="flex flex-wrap gap-2">
          {orderStatuses.map((status) => (
            <Button key={status} asChild size="sm" variant={activeStatus === status ? "default" : "outline"}>
              <Link href={ordersHref(status)}>{status}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        {orders.map((order) => {
          const unit = unitsByOrder.get(order.id);
          const colors = colorsFromNotes(order.notes);
          return (
            <article key={order.id} className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-4 shadow-[0_20px_80px_rgba(255,46,147,0.08)]">
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusStyles[order.status]}>{order.status}</Badge>
                        <span className="font-mono text-xs font-black text-[#1FA8A0]">{boxId(order)}</span>
                        <span className="text-xs text-white/35">#{order.id.slice(0, 8)}</span>
                      </div>
                      <h2 className="mt-3 font-space text-2xl font-black text-white">{order.productName} <span className="text-white/40">x{order.quantity}</span></h2>
                      <p className="mt-1 text-3xl font-black text-[#1FA8A0]">{formatMad(order.totalPrice)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="icon" variant="outline"><a href={whatsappHref(order.customerPhone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a></Button>
                      <Button size="icon" variant="outline" onClick={() => setDraft(order)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="destructive" disabled={isPending} onClick={() => removeOrder(order.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Info icon={<UserRound className="h-4 w-4" />} label="Customer" value={order.customerName || "Customer"} detail={order.customerPhone} />
                    <Info icon={<MapPin className="h-4 w-4" />} label="Address" value={order.customerCity} detail={order.customerAddress} />
                    <Info icon={<CalendarDays className="h-4 w-4" />} label="Date" value={new Date(order.createdAt).toLocaleDateString()} detail={new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-[#FF2E93]" />
                    <h3 className="font-space text-xl font-black">Fulfillment</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniBox label="Unit ID" value={unit?.id ?? "Not assigned"} />
                    <MiniBox label="Unit status" value={unit?.status.replace("_", " ") ?? "Waiting"} />
                    <MiniBox label="Box" value={boxId(order)} />
                    <MiniBox label="Payment" value={formatMad(order.totalPrice)} />
                  </div>
                  <div className="mt-4">
                    <Label>Status</Label>
                    <Select value={order.status} onValueChange={(value) => updateStatus(order.id, value as OrderStatus)} disabled={isPending}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{orderStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {colors.length > 0 ? colors.map((color) => <span key={color} className="h-8 w-8 rounded-full border border-white/25" style={{ backgroundColor: color }} title={color} />) : <span className="text-sm text-white/40">No colors recorded.</span>}
                  </div>
                  {order.notes ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">{order.notes}</p> : null}
                </div>
              </div>
            </article>
          );
        })}
        {orders.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">No orders match this filter.</div> : null}
      </section>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit order</DialogTitle></DialogHeader>
          {draft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer" value={draft.customerName} onChange={(value) => setDraft({ ...draft, customerName: value })} />
              <Field label="Phone" value={draft.customerPhone} onChange={(value) => setDraft({ ...draft, customerPhone: value })} />
              <Field label="City" value={draft.customerCity} onChange={(value) => setDraft({ ...draft, customerCity: value })} />
              <Field label="Product" value={draft.productName} onChange={(value) => setDraft({ ...draft, productName: value })} />
              <Field label="Quantity" type="number" value={String(draft.quantity)} onChange={(value) => setDraft({ ...draft, quantity: Number(value) })} />
              <Field label="Total MAD" type="number" value={String(draft.totalPrice)} onChange={(value) => setDraft({ ...draft, totalPrice: Number(value) })} />
              <div className="grid gap-2 md:col-span-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as OrderStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{orderStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={draft.customerAddress} onChange={(event) => setDraft({ ...draft, customerAddress: event.target.value })} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </div>
              <Button className="md:col-span-2" onClick={saveOrder} disabled={isPending}>{isPending ? "Saving..." : "Save order"}</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
      <div className="flex items-center gap-2 text-white/45">{icon}<span className="text-xs font-black uppercase">{label}</span></div>
      <p className="mt-2 font-bold text-white">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs text-white/45">{detail}</p>
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs font-black uppercase text-white/35">{label}</p><p className="mt-1 font-bold capitalize text-white">{value}</p></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-4"><p className="text-xs font-black uppercase text-white/45">{label}</p><p className="mt-1 font-space text-3xl font-black text-white">{value}</p></div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
