"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BadgePercent, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/components/cart-provider";
import { formatMad } from "@/lib/utils";
import { cartSubtotal, discountAmount, lineTotal, type DiscountCode } from "@/lib/pricing";

type CartOrderResponse = {
  whatsappUrl: string;
};

type DiscountValidationResponse = {
  discount: DiscountCode;
  amount: number;
};

export function CartDrawer({ compact = false }: { compact?: boolean }) {
  const { items, itemCount, removeItem, updateQuantity, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<DiscountCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const discountValue = discountAmount(discount, subtotal);
  const totalPrice = Math.max(0, subtotal - discountValue);

  async function applyDiscount() {
    setError("");
    const response = await fetch("/api/discounts/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal })
    });
    if (!response.ok) {
      setDiscount(null);
      setError("This discount code is not available for this cart.");
      return;
    }
    const result = (await response.json()) as DiscountValidationResponse;
    setDiscount(result.discount);
  }

  function checkout(formData: FormData) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/cart-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.get("customerName"),
          customerPhone: formData.get("customerPhone"),
          customerCity: formData.get("customerCity"),
          customerAddress: formData.get("customerAddress"),
          notes: formData.get("notes"),
          discountCode: discount?.code ?? null,
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            colors: item.colors
          }))
        })
      });

      if (!response.ok) {
        setError("Could not create the cart order. Please check your details and try again.");
        return;
      }

      const result = (await response.json()) as CartOrderResponse;
      clearCart();
      setOpen(false);
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={compact ? "default" : "icon"} className="relative">
          <ShoppingBag className="h-4 w-4" />
          {compact ? <span>Cart</span> : null}
          {itemCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-splatt-pink px-1 text-[10px] font-black text-white">
              {itemCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Your SPLATT. box</DialogTitle>
          <DialogDescription>Every figurine keeps its own selected paint colors, so each kit arrives ready for that pour.</DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-white/40" />
            <p className="mt-4 font-bold">Your cart is empty.</p>
            <Button asChild className="mt-5" onClick={() => setOpen(false)}>
              <Link href="/shop">Start with a figurine</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.key} className="grid grid-cols-[88px_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Link href={`/shop/${item.product.slug}`} onClick={() => setOpen(false)} className="aspect-square overflow-hidden rounded-xl bg-black/40 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${item.product.image}")` }} aria-label={item.product.name} />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-space text-lg font-black">{item.product.name}</h3>
                        <p className="text-sm text-white/55">{formatMad(item.product.price)} each</p>
                        {item.product.bundleQuantity && item.product.bundlePrice ? (
                          <p className="mt-1 text-xs font-bold text-splatt-teal">Deal: buy {item.product.bundleQuantity} for {formatMad(item.product.bundlePrice)}</p>
                        ) : null}
                      </div>
                      <button type="button" className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white" onClick={() => removeItem(item.key)} aria-label="Remove item">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.colors.length > 0 ? item.colors.map((color) => (
                        <span key={color} className="h-7 w-7 rounded-full border-2 border-white/30" style={{ backgroundColor: color }} title={color} />
                      )) : <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/60">Blank kit</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex w-fit items-center rounded-full border border-white/10 bg-black/30 p-1">
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Decrease quantity">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm font-black">{item.quantity}</span>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Increase quantity">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-black">{formatMad(lineTotal(item.product.price, item.quantity, item.product.bundleQuantity, item.product.bundlePrice))}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <form action={checkout} className="grid h-fit gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-white/60">Subtotal</span>
                <span className="font-space text-2xl font-black">{formatMad(subtotal)}</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount-code">Discount code</Label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input id="discount-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SPLATT10" />
                  <Button type="button" variant="outline" onClick={applyDiscount} disabled={!code || subtotal <= 0}>
                    <BadgePercent className="h-4 w-4" /> Apply
                  </Button>
                </div>
                {discount ? <p className="text-sm font-bold text-splatt-teal">{discount.code} applied: -{formatMad(discountValue)}</p> : null}
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] p-4">
                <span className="text-white/60">Total</span>
                <span className="font-space text-3xl font-black text-splatt-teal">{formatMad(totalPrice)}</span>
              </div>
              <Field label="Name" name="customerName" />
              <Field label="Phone" name="customerPhone" />
              <Field label="City" name="customerCity" />
              <div className="grid gap-2">
                <Label htmlFor="cart-address">Address</Label>
                <Textarea id="cart-address" name="customerAddress" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cart-notes">Notes</Label>
                <Textarea id="cart-notes" name="notes" placeholder="Delivery timing, special request..." />
              </div>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Checkout on WhatsApp"}</Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  const id = `cart-${name}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} required />
    </div>
  );
}
