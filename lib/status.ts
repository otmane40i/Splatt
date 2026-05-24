export const orderStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
