import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { OrderModal } from "@/components/order-modal";
import { formatMad } from "@/lib/utils";
import { getProductBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  return (
    <main className="container-page grid gap-10 py-12 lg:grid-cols-2">
      <div className="glass relative aspect-square overflow-hidden p-8">
        <Image src={product.image} alt={product.nameEN} fill className="object-contain p-8" priority />
      </div>
      <section className="flex flex-col justify-center">
        <Badge className="w-fit">{product.category}</Badge>
        <h1 className="mt-5 font-space text-5xl font-black">{product.nameEN}</h1>
        <p className="mt-4 text-lg text-white/62">{product.descEN}</p>
        <p className="mt-8 text-3xl font-black">{formatMad(product.price)}</p>
        <div className="mt-8">
          <OrderModal product={product} />
        </div>
      </section>
    </main>
  );
}
