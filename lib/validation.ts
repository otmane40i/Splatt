import { z } from "zod";
import { orderStatuses } from "@/lib/status";

export const productSchema = z.object({
  slug: z.string().min(2),
  nameEN: z.string().min(2),
  nameFR: z.string().min(2),
  descEN: z.string().min(8),
  descFR: z.string().min(8),
  price: z.coerce.number().int().positive(),
  image: z.string().min(1),
  category: z.string().min(2),
  inStock: z.coerce.boolean(),
  featured: z.coerce.boolean()
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerCity: z.string().min(2),
  customerAddress: z.string().min(5),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  notes: z.string().optional()
});

export const statusSchema = z.object({
  status: z.enum(orderStatuses)
});
