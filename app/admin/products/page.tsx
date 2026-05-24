import { prisma } from "@/lib/prisma";
import { ProductsManager } from "@/components/admin/products-manager";
import { getProducts, sampleProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getProducts().catch(async (error) => {
    console.error("Admin products DB unavailable:", error);
    return prisma.product.findMany({ orderBy: { createdAt: "desc" } }).catch(() => sampleProducts);
  });
  return <ProductsManager products={products} />;
}
