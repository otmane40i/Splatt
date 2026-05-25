import { notFound } from "next/navigation";
import { ProductCustomizer } from "@/components/product-customizer";
import { getProductBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  return <ProductCustomizer product={product} />;
}
