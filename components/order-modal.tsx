"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";
import { dictionary } from "@/lib/i18n";
import { formatMad } from "@/lib/utils";
import type { StoreProduct } from "@/lib/catalog";

type OrderResponse = {
  whatsappUrl: string;
};

export function OrderModal({ product }: { product: StoreProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { locale } = useLanguage();
  const t = dictionary[locale];

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.get("customerName"),
          customerPhone: formData.get("customerPhone"),
          customerCity: formData.get("customerCity"),
          customerAddress: formData.get("customerAddress"),
          notes: formData.get("notes"),
          productId: product.id,
          quantity
        })
      });

      if (!response.ok) {
        setError("Could not create order. Check the form and try again.");
        return;
      }

      const data = (await response.json()) as OrderResponse;
      setOpen(false);
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center font-black">{quantity}</span>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Increase quantity">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-2xl font-black">{formatMad(product.price * quantity)}</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto" disabled={!product.inStock}>
            <MessageCircle className="h-4 w-4" />
            {t.order}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{product.nameEN}</DialogTitle>
            <DialogDescription>Leave your delivery details. We save the order, then open WhatsApp with the message ready.</DialogDescription>
          </DialogHeader>
          <form action={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input id="customerPhone" name="customerPhone" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerCity">City</Label>
              <Input id="customerCity" name="customerCity" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea id="customerAddress" name="customerAddress" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Continue to WhatsApp"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
