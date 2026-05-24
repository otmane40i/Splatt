export type StoreProduct = {
  id: string;
  slug: string;
  nameEN: string;
  nameFR: string;
  descEN: string;
  descFR: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const now = new Date("2026-05-24T00:00:00.000Z");

async function getPrisma() {
  const prismaModule = await import("@/lib/prisma");
  return prismaModule.prisma;
}

export const sampleProducts: StoreProduct[] = [
  {
    id: "splatt-bear",
    slug: "splatt-bear",
    nameEN: "Splatt. Bear",
    nameFR: "Splatt. Bear",
    descEN: "The classic blank bear kit with three punchy paints and everything needed for a first pour.",
    descFR: "Le kit bear classique avec trois peintures vibrantes et tout ce qu'il faut pour ton premier pour.",
    price: 350,
    image: "/products/bear.svg",
    category: "Figures",
    inStock: true,
    featured: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "splatt-pup",
    slug: "splatt-pup",
    nameEN: "Splatt. Pup",
    nameFR: "Splatt. Pup",
    descEN: "A compact pup figure with playful curves, made for clean drips and desk-size display.",
    descFR: "Une figurine pup compacte aux formes fun, parfaite pour des coulures propres et un display bureau.",
    price: 300,
    image: "/products/pup.svg",
    category: "Figures",
    inStock: true,
    featured: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "splatt-phantom",
    slug: "splatt-phantom",
    nameEN: "Splatt. Phantom",
    nameFR: "Splatt. Phantom",
    descEN: "A larger character silhouette with more surface for dramatic paint-pour movement.",
    descFR: "Une silhouette plus large avec plus de surface pour un effet paint-pour dramatique.",
    price: 450,
    image: "/products/phantom.svg",
    category: "Premium",
    inStock: true,
    featured: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "splatt-atlas",
    slug: "splatt-atlas",
    nameEN: "Splatt. Atlas",
    nameFR: "Splatt. Atlas",
    descEN: "A premium figure inspired by Moroccan craft, streetwear color, and collectible culture.",
    descFR: "Une figurine premium inspiree par l'artisanat marocain, la couleur streetwear et la culture collectible.",
    price: 500,
    image: "/products/atlas.svg",
    category: "Premium",
    inStock: true,
    featured: true,
    createdAt: now,
    updatedAt: now
  }
];

export async function getProducts(category?: string) {
  try {
    const { getFirestoreProducts } = await import("@/lib/firestore-store");
    const firestoreProducts = await getFirestoreProducts();
    if (firestoreProducts?.length) {
      return category ? firestoreProducts.filter((product) => product.category === category) : firestoreProducts;
    }
  } catch (error) {
    console.error("Firestore products unavailable:", error);
  }

  try {
    const prisma = await getPrisma();
    return await prisma.product.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }]
    });
  } catch (error) {
    console.error("Falling back to static products:", error);
    return category ? sampleProducts.filter((product) => product.category === category) : sampleProducts;
  }
}

export async function getFeaturedProducts() {
  try {
    const products = await getProducts();
    return products.filter((product) => product.featured && product.inStock).slice(0, 4);
  } catch (error) {
    console.error("Product list unavailable, using static featured products:", error);
  }

  try {
    const prisma = await getPrisma();
    return await prisma.product.findMany({
      where: { featured: true, inStock: true },
      orderBy: { createdAt: "asc" },
      take: 4
    });
  } catch (error) {
    console.error("Falling back to static featured products:", error);
    return sampleProducts.filter((product) => product.featured && product.inStock).slice(0, 4);
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const { getFirestoreProductBySlug } = await import("@/lib/firestore-store");
    const product = await getFirestoreProductBySlug(slug);
    if (product) return product;
  } catch (error) {
    console.error("Firestore product unavailable:", error);
  }

  try {
    const prisma = await getPrisma();
    const product = await prisma.product.findUnique({ where: { slug } });
    return product ?? sampleProducts.find((item) => item.slug === slug) ?? null;
  } catch (error) {
    console.error("Falling back to static product:", error);
    return sampleProducts.find((item) => item.slug === slug) ?? null;
  }
}

export function getCategories(products = sampleProducts) {
  return Array.from(new Set(products.map((product) => product.category))).sort();
}
