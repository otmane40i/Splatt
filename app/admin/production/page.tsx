import { ProductionManager } from "@/components/admin/production-manager";
import { getProducts } from "@/lib/catalog";
import { defaultProductionSystem, getFirestoreOrders, getFirestoreProductionSystem } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

export default async function AdminProductionPage() {
  const [system, products, orders] = await Promise.all([
    getFirestoreProductionSystem().catch((error) => {
      console.error("Production system unavailable:", error);
      return null;
    }),
    getProducts().catch((error) => {
      console.error("Products unavailable for production:", error);
      return [];
    }),
    getFirestoreOrders().catch((error) => {
      console.error("Orders unavailable for production:", error);
      return null;
    })
  ]);

  return <ProductionManager initialSystem={system ?? defaultProductionSystem()} products={products} orders={orders ?? []} />;
}
