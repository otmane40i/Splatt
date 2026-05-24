import { prisma } from "@/lib/prisma";
import { ProductsManager } from "@/components/admin/products-manager";
import { sampleProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } }).catch((error) => {
    console.error("Admin products DB unavailable:", error);
    return sampleProducts;
  });
  return <ProductsManager products={products} />;
}
