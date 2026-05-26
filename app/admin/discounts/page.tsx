import { DiscountsManager } from "@/components/admin/discounts-manager";
import { getDiscountCodes } from "@/lib/discount-store";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const discounts = await getDiscountCodes().catch((error) => {
    console.error("Discounts unavailable:", error);
    return [];
  });

  return <DiscountsManager discounts={discounts} />;
}
