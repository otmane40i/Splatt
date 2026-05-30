import { ProductCard } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { getCategories, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams
}: {
  searchParams: { category?: string; q?: string };
}) {
  const allProducts = await getProducts();
  const categoryProducts = searchParams.category
    ? allProducts.filter((product) => product.category === searchParams.category)
    : allProducts;
  const query = searchParams.q?.trim().toLowerCase() ?? "";
  const products = query
    ? categoryProducts.filter((product) => [
      product.nameEN,
      product.nameFR,
      product.descEN,
      product.descFR,
      product.category
    ].join(" ").toLowerCase().includes(query))
    : categoryProducts;
  const categories = getCategories(allProducts);

  return (
    <main className="container-page py-12">
      <div className="mb-8">
        <p className="text-sm font-black uppercase text-splatt-pink">Shop</p>
        <h1 className="font-space text-5xl font-black">{query ? `Search: ${searchParams.q}` : "DIY figures"}</h1>
      </div>
      <ShopFilters categories={categories} active={searchParams.category} />
      {products.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="glass mt-8 p-8 text-center text-white/60">
          No products yet. Add your first figurine from the admin panel.
        </div>
      )}
    </main>
  );
}
