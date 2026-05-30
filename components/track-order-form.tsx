"use client";

import { useState, useTransition } from "react";
import { PackageCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMad } from "@/lib/utils";

type TrackResult = {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
};

export function TrackOrderForm() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone })
      });
      if (!response.ok) {
        setError("We could not find this order. Check the order ID and phone number.");
        return;
      }
      setResult((await response.json()) as TrackResult);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={submit} className="glass grid gap-4 p-5">
        <div className="grid gap-2">
          <Label htmlFor="order-id">Order ID</Label>
          <Input id="order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Example: a1b2c3d4" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Your WhatsApp number" required />
        </div>
        {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</p> : null}
        <Button type="submit" disabled={isPending}><Search className="h-4 w-4" /> {isPending ? "Checking..." : "Track order"}</Button>
      </form>

      {result ? (
        <section className="glass mt-5 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-splatt-teal/15 text-splatt-teal">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-xs font-black uppercase text-white/35">#{result.id.slice(0, 8)}</p>
              <h2 className="font-space text-2xl font-black text-white">{result.productName} x{result.quantity}</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Mini label="Status" value={result.status} />
            <Mini label="Total" value={formatMad(result.totalPrice)} />
            <Mini label="Date" value={new Date(result.createdAt).toLocaleDateString()} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/35 p-4"><p className="text-xs font-black uppercase text-white/40">{label}</p><p className="mt-1 font-bold capitalize text-white">{value}</p></div>;
}
