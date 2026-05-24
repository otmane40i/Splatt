import { prisma } from "@/lib/prisma";
import { ProductsManager } from "@/components/admin/products-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return <ProductsManager products={products} />;
}
