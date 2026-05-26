import type { CartItem } from "@/lib/cart";

export type DiscountCode = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minTotal: number;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function lineTotal(unitPrice: number, quantity: number, bundleQuantity?: number | null, bundlePrice?: number | null) {
  if (!bundleQuantity || !bundlePrice || quantity < bundleQuantity) return unitPrice * quantity;
  const bundles = Math.floor(quantity / bundleQuantity);
  const remaining = quantity % bundleQuantity;
  return bundles * bundlePrice + remaining * unitPrice;
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + lineTotal(item.product.price, item.quantity, item.product.bundleQuantity, item.product.bundlePrice), 0);
}

export function discountAmount(discount: DiscountCode | null, subtotal: number) {
  if (!discount || !discount.active || subtotal < discount.minTotal) return 0;
  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) return 0;
  const raw = discount.type === "percentage" ? Math.floor((subtotal * discount.value) / 100) : discount.value;
  return Math.min(raw, subtotal);
}
