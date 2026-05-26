"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StoreProduct } from "@/lib/catalog";
import { cartItemKey, type CartItem } from "@/lib/cart";

type AddCartItemInput = {
  product: StoreProduct;
  quantity: number;
  colors: string[];
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addItem: (input: AddCartItemInput) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "splatt-cart";

function normalizeQuantity(quantity: number) {
  return Math.min(20, Math.max(1, Math.round(quantity)));
}

function parseStoredCart(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item.key && item.product?.id && item.quantity > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(parseStoredCart(window.localStorage.getItem(storageKey)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      totalPrice: items.reduce((total, item) => total + item.product.price * item.quantity, 0),
      addItem(input) {
        const colors = input.colors.slice(0, 3);
        const key = cartItemKey(input.product.id, colors);
        setItems((current) => {
          const existing = current.find((item) => item.key === key);
          if (existing) {
            return current.map((item) => item.key === key ? { ...item, quantity: normalizeQuantity(item.quantity + input.quantity) } : item);
          }
          return [
            ...current,
            {
              key,
              product: {
                id: input.product.id,
                slug: input.product.slug,
                name: input.product.nameEN,
                price: input.product.price,
                image: input.product.image
              },
              quantity: normalizeQuantity(input.quantity),
              colors
            }
          ];
        });
      },
      removeItem(key) {
        setItems((current) => current.filter((item) => item.key !== key));
      },
      updateQuantity(key, quantity) {
        setItems((current) => current.map((item) => item.key === key ? { ...item, quantity: normalizeQuantity(quantity) } : item));
      },
      clearCart() {
        setItems([]);
      }
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
