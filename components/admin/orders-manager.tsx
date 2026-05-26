"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMad } from "@/lib/utils";
import { orderStatuses, type OrderStatus } from "@/lib/status";
import type { StoreOrder } from "@/lib/firestore-store";

type OrderDraft = Pick<StoreOrder, "id" | "customerName" | "customerPhone" | "customerCity" | "customerAddress" | "productName" | "quantity" | "totalPrice" | "status" | "notes">;

export function OrdersManager({
  orders,
  allOrders,
  activeStatus,
  activeMonth
}: {
  orders: StoreOrder[];
  allOrders: StoreOrder[];
  activeStatus?: OrderStatus;
  activeMonth?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const router = useRouter();
  const months = useMemo(() => {
    return Array.from(new Set(allOrders.map((order) => {
      const date = new Date(order.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }))).sort().reverse();
  }, [allOrders]);

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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-space text-4xl font-black">Orders</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={activeMonth ?? "all"} onValueChange={(value) => router.push(ordersHref(activeStatus, value === "all" ? undefined : value))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button asChild size="sm" variant={!activeStatus ? "default" : "outline"}><Link href={ordersHref(undefined)}>All</Link></Button>
          {orderStatuses.map((status) => (
            <Button key={status} asChild size="sm" variant={activeStatus === status ? "default" : "outline"}><Link href={ordersHref(status)}>{status}</Link></Button>
          ))}
        </div>
      </div>
      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-white/10 text-white/50">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Phone</th>
              <th className="p-4">City</th>
              <th className="p-4">Product</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="p-4">
                  <p className="font-bold">{order.customerName}</p>
                  <p className="text-white/50">{order.customerAddress}</p>
                </td>
                <td className="p-4"><a className="text-splatt-teal hover:underline" href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">{order.customerPhone}</a></td>
                <td className="p-4">{order.customerCity}</td>
                <td className="p-4">{order.productName} x{order.quantity}</td>
                <td className="p-4">{formatMad(order.totalPrice)}</td>
                <td className="p-4">
                  <Select value={order.status} onValueChange={(value: OrderStatus) => updateStatus(order.id, value)} disabled={isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-4 text-white/60">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => setDraft(order)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" disabled={isPending} onClick={() => removeOrder(order.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                <Select value={draft.status} onValueChange={(value: OrderStatus) => setDraft({ ...draft, status: value })}>
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

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
