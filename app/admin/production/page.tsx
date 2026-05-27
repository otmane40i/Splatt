import { ProductionManager } from "@/components/admin/production-manager";
import { defaultProductionSystem, getFirestoreProductionSystem } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

export default async function AdminProductionPage() {
  const system = await getFirestoreProductionSystem().catch((error) => {
    console.error("Production system unavailable:", error);
    return null;
  });

  return <ProductionManager initialSystem={system ?? defaultProductionSystem()} />;
}
