export const orderStatuses = ["pending", "confirmed", "shipped", "delivered", "returned", "cancelled"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
