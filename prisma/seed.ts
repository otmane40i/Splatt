import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@splatt.ma";
  const password = await bcrypt.hash("changeme123", 12);

  await prisma.admin.upsert({
    where: { email },
    update: { password },
    create: { email, password }
  });

  const products = [
    {
      slug: "splatt-bear",
      nameEN: "Splatt. Bear",
      nameFR: "Splatt. Bear",
      descEN: "The classic blank bear kit with three punchy paints and everything needed for a first pour.",
      descFR: "Le kit bear classique avec trois peintures vibrantes et tout ce qu'il faut pour ton premier pour.",
      price: 350,
      image: "/products/bear.svg",
      model3d: "/products/bear.stl",
      category: "Figures",
      featured: true
    },
    {
      slug: "splatt-pup",
      nameEN: "Splatt. Pup",
      nameFR: "Splatt. Pup",
      descEN: "A compact pup figure with playful curves, made for clean drips and desk-size display.",
      descFR: "Une figurine pup compacte aux formes fun, parfaite pour des coulures propres et un display bureau.",
      price: 300,
      image: "/products/pup.svg",
      model3d: null,
      category: "Figures",
      featured: true
    },
    {
      slug: "splatt-phantom",
      nameEN: "Splatt. Phantom",
      nameFR: "Splatt. Phantom",
      descEN: "A larger character silhouette with more surface for dramatic paint-pour movement.",
      descFR: "Une silhouette plus large avec plus de surface pour un effet paint-pour dramatique.",
      price: 450,
      image: "/products/phantom.svg",
      model3d: null,
      category: "Premium",
      featured: true
    },
    {
      slug: "splatt-atlas",
      nameEN: "Splatt. Atlas",
      nameFR: "Splatt. Atlas",
      descEN: "A premium figure inspired by Moroccan craft, streetwear color, and collectible culture.",
      descFR: "Une figurine premium inspiree par l'artisanat marocain, la couleur streetwear et la culture collectible.",
      price: 500,
      image: "/products/atlas.svg",
      model3d: null,
      category: "Premium",
      featured: true
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
