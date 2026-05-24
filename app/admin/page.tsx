import { prisma } from "@/lib/prisma";
import { formatMad } from "@/lib/utils";
import { getProducts, sampleProducts } from "@/lib/catalog";
import { getFirestoreOrders } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const firestoreOrders = await getFirestoreOrders().catch(() => null);
  const products = await getProducts().catch(() => sampleProducts);

  if (firestoreOrders) {
    const totalOrders = firestoreOrders.length;
    const pending = firestoreOrders.filter((order) => order.status === "pending").length;
    const revenue = firestoreOrders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const recentOrders = firestoreOrders.slice(0, 6);
    const stats = [
      ["Total orders", totalOrders.toString()],
      ["Pending", pending.toString()],
      ["Revenue", formatMad(revenue)],
      ["Active products", products.filter((product) => product.inStock).length.toString()]
    ];

    return <DashboardView stats={stats} recentOrders={recentOrders} />;
  }

  try {
    const [totalOrders, pending, revenueAgg, activeProducts, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.aggregate({ _sum: { totalPrice: true }, where: { status: { not: "cancelled" } } }),
      prisma.product.count({ where: { inStock: true } }),
      prisma.order.findMany({ take: 6, orderBy: { createdAt: "desc" } })
    ]);
    const stats = [
      ["Total orders", totalOrders.toString()],
      ["Pending", pending.toString()],
      ["Revenue", formatMad(revenueAgg._sum.totalPrice ?? 0)],
      ["Active products", activeProducts.toString()]
    ];

    return <DashboardView stats={stats} recentOrders={recentOrders} />;
  } catch (error) {
    console.error("Admin dashboard DB unavailable:", error);
  }

  return <DashboardView stats={[
    ["Total orders", "0"],
    ["Pending", "0"],
    ["Revenue", formatMad(0)],
    ["Active products", sampleProducts.length.toString()]
  ]} recentOrders={[]} />;
}

function DashboardView({
  stats,
  recentOrders
}: {
  stats: string[][];
  recentOrders: Array<{ id: string; customerName: string; productName: string; totalPrice: number; status: string }>;
}) {
  return (
    <div>
      <h1 className="font-space text-4xl font-black">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="glass p-5">
            <p className="text-sm text-white/55">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="glass mt-6 overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="font-space text-2xl font-bold">Recent orders</h2>
        </div>
        <div className="divide-y divide-white/10">
          {recentOrders.map((order) => (
            <div key={order.id} className="grid gap-2 p-5 md:grid-cols-4">
              <p className="font-bold">{order.customerName}</p>
              <p className="text-white/60">{order.productName}</p>
              <p>{formatMad(order.totalPrice)}</p>
              <p className="text-splatt-teal">{order.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
