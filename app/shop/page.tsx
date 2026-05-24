import { ProductCard } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { getCategories, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams
}: {
  searchParams: { category?: string };
}) {
  const allProducts = await getProducts();
  const products = searchParams.category
    ? allProducts.filter((product) => product.category === searchParams.category)
    : allProducts;
  const categories = getCategories(allProducts);

  return (
    <main className="container-page py-12">
      <div className="mb-8">
        <p className="text-sm font-black uppercase text-splatt-pink">Shop</p>
        <h1 className="font-space text-5xl font-black">DIY figures</h1>
      </div>
      <ShopFilters categories={categories} active={searchParams.category} />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </main>
  );
}
