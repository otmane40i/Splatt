"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { formatMad } from "@/lib/utils";
import type { StoreProduct } from "@/lib/catalog";

export function ProductCard({ product }: { product: StoreProduct }) {
  const { locale } = useLanguage();
  const name = locale === "fr" ? product.nameFR : product.nameEN;
  const description = locale === "fr" ? product.descFR : product.descEN;
  const productHref = product.slug === "splatt-bear" ? "/product-bear.html" : `/shop/${product.slug}`;

  return (
    <motion.article
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="glass group overflow-hidden p-4 transition hover:border-primary/40 hover:shadow-glow"
    >
      <Link href={productHref} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.04]">
          <Image src={product.image} alt={name} fill className="object-cover transition duration-500 group-hover:scale-105" />
          {product.featured ? <Badge className="absolute left-3 top-3 bg-primary/80">Featured</Badge> : null}
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase text-splatt-teal">{product.category}</p>
          <h3 className="font-space text-xl font-bold">{name}</h3>
          <p className="line-clamp-2 text-sm text-white/60">{description}</p>
          <div className="flex items-center justify-between pt-2">
            <p className="text-lg font-black text-white">{formatMad(product.price)}</p>
            <Button size="sm" variant={product.inStock ? "default" : "secondary"} disabled={!product.inStock}>
              {product.inStock ? "View" : "Sold out"}
            </Button>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
