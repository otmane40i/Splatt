import { prisma } from "@/lib/prisma";
import { ProductionManager } from "@/components/admin/production-manager";
import { getFirestoreProductionItems, type ProductionItem } from "@/lib/firestore-store";

export const dynamic = "force-dynamic";

function fromPrisma(item: {
  id: string;
  name: string;
  type: string;
  status: string;
  quantity: number;
  unit: string;
  unitCost: number;
  monthlyCost: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductionItem {
  return {
    ...item,
    type: item.type as ProductionItem["type"],
    status: item.status as ProductionItem["status"]
  };
}

export default async function AdminProductionPage() {
  const items = await getFirestoreProductionItems().then(async (firestoreItems) => {
    if (firestoreItems) return firestoreItems;
    const prismaItems = await prisma.productionItem.findMany({ orderBy: { createdAt: "desc" } });
    return prismaItems.map(fromPrisma);
  }).catch((error) => {
    console.error("Production items unavailable:", error);
    return [];
  });

  return <ProductionManager items={items} />;
}
