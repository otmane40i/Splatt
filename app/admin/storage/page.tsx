import { StorageManager } from "@/components/admin/storage-manager";
import { defaultProductionSystem, getFirestoreOrders, getFirestoreProductionSystem } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

export default async function AdminStoragePage() {
  const [system, orders] = await Promise.all([
    getFirestoreProductionSystem().catch((error) => {
      console.error("Storage system unavailable:", error);
      return null;
    }),
    getFirestoreOrders().catch((error) => {
      console.error("Orders unavailable for storage:", error);
      return null;
    })
  ]);

  return <StorageManager initialSystem={system ?? defaultProductionSystem()} orders={orders ?? []} />;
}
