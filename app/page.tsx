import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GradientOrbs } from "@/components/gradient-orbs";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { BrandSplash } from "@/components/brand-splash";
import { HeroLogoStage } from "@/components/hero-logo-stage";
import { getFeaturedProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <main>
      <BrandSplash />
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-black">
        <GradientOrbs />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-splatt-pink to-transparent" />
        <div className="container-page relative z-10 grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr]">
          <Reveal>
            <p className="mb-4 text-sm font-black uppercase text-splatt-teal">DIY paint-pour figures · Morocco</p>
            <h1 className="font-space text-6xl font-black leading-none tracking-normal text-white sm:text-7xl lg:text-8xl">
              Created by You.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/68">
              SPLATT. turns blank collectible figurines into loud one-of-one art kits. Pick a figure, pour your colors, own the chaos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="default"><Link href="/shop">Shop Now</Link></Button>
              <Button asChild variant="outline"><Link href="/about">Our story</Link></Button>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="relative">
            <HeroLogoStage />
          </Reveal>
        </div>
      </section>
      <section className="container-page py-20">
        <Reveal>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-splatt-pink">Collection 01</p>
              <h2 className="font-space text-4xl font-black">Featured products</h2>
            </div>
            <Button asChild variant="outline"><Link href="/shop">All kits</Link></Button>
          </div>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.02] py-20">
        <div className="container-page">
          <Reveal>
            <p className="text-sm font-black uppercase text-splatt-orange">How It Works</p>
            <h2 className="font-space text-4xl font-black">Pick. Pour. Post.</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["01", "Choose your figure", "Bear, Pup, Phantom or Atlas, all ready for paint."],
              ["02", "Pour the color", "Use the included paints and tools to create your flow."],
              ["03", "Let it become yours", "Dry it, display it, and send us the result."]
            ].map((step) => (
              <Reveal key={step[0]} className="glass p-6">
                <span className="text-sm font-black text-splatt-pink">{step[0]}</span>
                <h3 className="mt-5 font-space text-2xl font-bold">{step[1]}</h3>
                <p className="mt-3 text-white/60">{step[2]}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="container-page py-20">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-black uppercase text-splatt-teal">About SPLATT.</p>
          <h2 className="font-space text-4xl font-black">A Moroccan DIY brand for people who want the art to feel personal.</h2>
          <p className="mt-5 text-white/62">We make blank figurine kits that let anyone create a collectible object without needing a studio, a canvas, or permission.</p>
          <Button asChild className="mt-7"><Link href="/about">Read more</Link></Button>
        </Reveal>
      </section>
      <footer className="border-t border-white/10 py-8">
        <div className="container-page flex flex-col justify-between gap-4 text-sm text-white/50 sm:flex-row">
          <p>SPLATT. © 2026</p>
          <p>Made in Morocco · Ordered via WhatsApp</p>
        </div>
      </footer>
    </main>
  );
}
