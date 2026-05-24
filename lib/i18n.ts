export type Locale = "en" | "fr";

export const dictionary = {
  en: {
    nav: { home: "Home", shop: "Shop", about: "About" },
    cta: "Shop Now",
    heroTagline: "Created by You.",
    heroCopy:
      "Moroccan DIY paint-pour figurines made for color, chaos, and one-of-one shelf energy.",
    featured: "Featured kits",
    how: "How It Works",
    about: "Made in Morocco for creators who want their hands in the art.",
    order: "Order via WhatsApp"
  },
  fr: {
    nav: { home: "Accueil", shop: "Shop", about: "A propos" },
    cta: "Shop Now",
    heroTagline: "Created by You.",
    heroCopy:
      "Figurines DIY paint-pour marocaines pour la couleur, le chaos et une piece vraiment unique.",
    featured: "Kits en vedette",
    how: "Comment ca marche",
    about: "Cree au Maroc pour les creators qui veulent mettre les mains dans l'art.",
    order: "Commander via WhatsApp"
  }
} as const;
