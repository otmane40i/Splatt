import Link from "next/link";
import { ArrowRight, Boxes, Factory, Package, ReceiptText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMad } from "@/lib/utils";
import { getProducts, sampleProducts } from "@/lib/catalog";
import { defaultProductionSystem, getFirestoreOrders, getFirestoreProductionSystem, type StoreOrder } from "@/lib/firestore-store";
import { getDiscountCodes } from "@/lib/discount-store";
import type { OrderStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

type DashboardOrder = Pick<StoreOrder, "id" | "customerName" | "productName" | "totalPrice" | "status" | "createdAt">;

async function getDashboardOrders() {
  const firestoreOrders = await getFirestoreOrders().catch((error) => {
    console.error("Dashboard Firestore orders unavailable:", error);
    return null;
  });

  const prismaOrders = await prisma.order.findMany({ take: 20, orderBy: { createdAt: "desc" } }).then((orders) => orders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    productName: order.productName,
    totalPrice: order.totalPrice,
    status: order.status as OrderStatus,
    createdAt: order.createdAt
  } satisfies DashboardOrder))).catch((error) => {
    console.error("Dashboard Prisma orders unavailable:", error);
    return [];
  });

  if (firestoreOrders && firestoreOrders.length > 0) return firestoreOrders;
  return prismaOrders;
}

export default async function AdminDashboard() {
  const [orders, products, discounts, productionSystem] = await Promise.all([
    getDashboardOrders(),
    getProducts().catch(() => sampleProducts),
    getDiscountCodes().catch(() => []),
    getFirestoreProductionSystem().catch((error) => {
      console.error("Dashboard production system unavailable:", error);
      return defaultProductionSystem();
    })
  ]);

  const system = productionSystem ?? defaultProductionSystem();
  const openOrders = orders.filter((order) => order.status === "pending" || order.status === "confirmed");
  const revenue = orders.filter((order) => order.status !== "cancelled" && order.status !== "returned").reduce((sum, order) => sum + order.totalPrice, 0);
  const lowStock = products.filter((product) => product.stockQuantity !== null && product.stockQuantity <= 3);
  const activeJobs = system.queue.filter((job) => job.status === "queued" || job.status === "printing");
  const stockUnits = system.units.filter((unit) => unit.status === "in_stock" || unit.status === "printed");
  const openBoxes = orders.filter((order) => order.status !== "delivered" && order.status !== "returned" && order.status !== "cancelled");
  const stats = [
    ["Total orders", orders.length.toString()],
    ["Open orders", openOrders.length.toString()],
    ["Revenue", formatMad(revenue)],
    ["Active products", products.filter((product) => product.inStock).length.toString()],
    ["Print jobs", activeJobs.length.toString()],
    ["Units ready", stockUnits.length.toString()]
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-[#0A0A0A] p-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FF2E93]">Command center</p>
        <h1 className="mt-2 font-space text-4xl font-black text-white">Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/50">A quick pulse check for orders, production, storage, stock, and money.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="glass p-5">
            <p className="text-sm text-white/55">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <QuickCard href="/admin/orders" icon={<ReceiptText className="h-5 w-5" />} label="Orders" value={`${openOrders.length} open`} detail="Customers, WhatsApp, returns" />
        <QuickCard href="/admin/production" icon={<Factory className="h-5 w-5" />} label="Production" value={`${activeJobs.length} jobs`} detail="Machines and print queue" />
        <QuickCard href="/admin/storage" icon={<Boxes className="h-5 w-5" />} label="Storage" value={`${openBoxes.length} boxes`} detail="Units, boxes, inventory" />
        <QuickCard href="/admin/products" icon={<Package className="h-5 w-5" />} label="Products" value={`${lowStock.length} low`} detail="Stock, prices, 3D models" />
      </section>

      {lowStock.length > 0 ? (
        <section className="glass p-5">
          <h2 className="font-space text-2xl font-bold">Low stock</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {lowStock.map((product) => (
              <div key={product.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-bold">{product.nameEN}</p>
                <p className="mt-1 text-sm text-splatt-orange">{product.stockQuantity} left</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
          <h2 className="font-space text-2xl font-bold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm font-black text-[#FF2E93] hover:text-white">Open orders</Link>
        </div>
        <div className="divide-y divide-white/10">
          {orders.slice(0, 6).map((order) => (
            <div key={order.id} className="grid gap-2 p-5 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
              <div>
                <p className="font-bold">{order.customerName || "Customer"}</p>
                <p className="font-mono text-xs text-white/35">#{order.id.slice(0, 8)}</p>
              </div>
              <p className="text-white/60">{order.productName}</p>
              <p className="font-bold">{formatMad(order.totalPrice)}</p>
              <span className="rounded-full border border-[#1FA8A0]/25 bg-[#1FA8A0]/10 px-3 py-1 text-xs font-black uppercase text-[#bffefa]">{order.status}</span>
            </div>
          ))}
          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-space text-2xl font-black text-white">No orders yet.</p>
              <p className="mt-2 text-sm text-white/45">When a customer orders from WhatsApp checkout, it will appear here and in the Orders section.</p>
              <Link href="/admin/orders" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FF2E93] px-5 py-3 text-sm font-black text-white">Go to Orders <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function QuickCard({ href, icon, label, value, detail }: { href: string; icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Link href={href} className="group rounded-3xl border border-white/10 bg-[#0f0f0f] p-4 transition hover:border-[#FF2E93]/40 hover:shadow-[0_18px_60px_rgba(255,46,147,0.14)]">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FF2E93]/15 text-[#FF2E93]">{icon}</div>
        <ArrowRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-white" />
      </div>
      <p className="mt-4 text-sm font-black uppercase text-white/45">{label}</p>
      <p className="mt-1 font-space text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{detail}</p>
    </Link>
  );
}
