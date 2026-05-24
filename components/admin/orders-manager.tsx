"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import type { Order, Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMad } from "@/lib/utils";
import { orderStatuses, type OrderStatus } from "@/lib/status";

type OrderWithProduct = Order & { product: Product };

export function OrdersManager({ orders, activeStatus }: { orders: OrderWithProduct[]; activeStatus?: OrderStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-space text-4xl font-black">Orders</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant={!activeStatus ? "default" : "outline"}><Link href="/admin/orders">All</Link></Button>
          {orderStatuses.map((status) => (
            <Button key={status} asChild size="sm" variant={activeStatus === status ? "default" : "outline"}><Link href={`/admin/orders?status=${status}`}>{status}</Link></Button>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
