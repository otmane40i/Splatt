import { prisma } from "@/lib/prisma";
import { OrdersManager } from "@/components/admin/orders-manager";
import type { OrderStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: { status?: OrderStatus };
}) {
  const orders = await prisma.order.findMany({
    where: searchParams.status ? { status: searchParams.status } : undefined,
    include: { product: true },
    orderBy: { createdAt: "desc" }
  });
  return <OrdersManager orders={orders} activeStatus={searchParams.status} />;
}
