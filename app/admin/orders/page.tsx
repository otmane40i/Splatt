import { prisma } from "@/lib/prisma";
import { OrdersManager } from "@/components/admin/orders-manager";
import type { OrderStatus } from "@/lib/status";
import { getFirestoreOrders, type StoreOrder } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: { status?: OrderStatus; month?: string };
}) {
  const orders: StoreOrder[] = await getFirestoreOrders(searchParams.status).then(async (firestoreOrders) => {
    if (firestoreOrders) return firestoreOrders;
    const prismaOrders = await prisma.order.findMany({
      where: searchParams.status ? { status: searchParams.status } : undefined,
      include: { product: true },
      orderBy: { createdAt: "desc" }
    });
    return prismaOrders.map((order) => ({
      ...order,
      status: order.status as OrderStatus,
      product: order.product
    }));
  }).catch((error) => {
    console.error("Admin orders DB unavailable:", error);
    return [];
  });
  const activeMonth = searchParams.month;
  const filteredOrders = activeMonth
    ? orders.filter((order) => {
      const date = new Date(order.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === activeMonth;
    })
    : orders;

  return <OrdersManager orders={filteredOrders} allOrders={orders} activeStatus={searchParams.status} activeMonth={activeMonth} />;
}
