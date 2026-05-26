import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/components/language-provider";
import { CartProvider } from "@/components/cart-provider";
import { Navbar } from "@/components/navbar";
import { WhatsAppFloat } from "@/components/whatsapp-float";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: "SPLATT. | Created by You.",
  description: "Moroccan DIY paint-pour figurines, ordered via WhatsApp.",
  openGraph: {
    title: "SPLATT. | Created by You.",
    description: "Moroccan DIY paint-pour figurines, ordered via WhatsApp.",
    images: ["/brand/splatt-logo.jpeg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "SPLATT. | Created by You.",
    description: "Moroccan DIY paint-pour figurines, ordered via WhatsApp.",
    images: ["/brand/splatt-logo.jpeg"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.variable, space.variable, "font-sans")}>
        <LanguageProvider>
          <CartProvider>
            <Navbar />
            {children}
            <WhatsAppFloat />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
