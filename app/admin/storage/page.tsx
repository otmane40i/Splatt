import { StorageManager } from "@/components/admin/storage-manager";
import { getProducts } from "@/lib/catalog";
import { defaultProductionSystem, getFirestoreOrders, getFirestoreProductionSystem } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

export default async function AdminStoragePage() {
  const [system, orders, products] = await Promise.all([
    getFirestoreProductionSystem().catch((error) => {
      console.error("Storage system unavailable:", error);
      return null;
    }),
    getFirestoreOrders().catch((error) => {
      console.error("Orders unavailable for storage:", error);
      return null;
    }),
    getProducts().catch((error) => {
      console.error("Products unavailable for storage:", error);
      return [];
    })
  ]);

  return <StorageManager initialSystem={system ?? defaultProductionSystem()} orders={orders ?? []} products={products} />;
}
