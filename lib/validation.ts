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
  model3d: z.string().optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).optional().nullable(),
  bundleQuantity: z.coerce.number().int().min(2).optional().nullable(),
  bundlePrice: z.coerce.number().int().positive().optional().nullable(),
  category: z.string().min(2),
  inStock: z.coerce.boolean(),
  featured: z.coerce.boolean()
});

export const discountCodeSchema = z.object({
  code: z.string().min(2).max(24).transform((value) => value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "")),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().int().positive(),
  minTotal: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean(),
  usageLimit: z.coerce.number().int().positive().optional().nullable()
}).superRefine((value, context) => {
  if (value.type === "percentage" && value.value > 90) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Percentage discounts cannot exceed 90%." });
  }
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

export const adminOrderUpdateSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerCity: z.string().min(2),
  customerAddress: z.string().min(5),
  productName: z.string().min(2),
  quantity: z.coerce.number().int().min(1).max(99),
  totalPrice: z.coerce.number().int().min(0),
  status: z.enum(orderStatuses),
  notes: z.string().optional().nullable()
});

export const productionItemSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["filament", "printer", "box", "paint", "tool", "charge", "other"]),
  status: z.enum(["available", "low", "active", "maintenance", "ordered", "paused"]),
  quantity: z.coerce.number().int().min(0),
  unit: z.string().min(1),
  unitCost: z.coerce.number().int().min(0),
  monthlyCost: z.coerce.number().int().min(0),
  notes: z.string().optional().nullable()
});
