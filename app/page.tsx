import Link from "next/link";
import Image from "next/image";
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
  const steps = [
    {
      image: "/how-it-works/choose-figurine.jpeg",
      title: "Choose your figurine",
      text: "Pick your favorite figurine and colors."
    },
    {
      image: "/how-it-works/paint-it.jpeg",
      title: "Paint it your way",
      text: "Pour your colors and create something uniquely yours."
    },
    {
      image: "/how-it-works/dry-display.jpeg",
      title: "Dry & display",
      text: "Let it dry, then display it, gift it, or share it."
    }
  ];

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
      <section className="border-y border-white/10 bg-white/[0.02] py-20">
        <div className="container-page">
          <Reveal>
            <p className="text-sm font-black uppercase text-splatt-orange">How it works</p>
            <h2 className="font-space text-4xl font-black">From blank figure to one-of-one.</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <div className="relative aspect-[4/5] overflow-hidden bg-black">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">
                    0{index + 1}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-space text-2xl font-black">{step.title}</h3>
                  <p className="mt-3 text-white/62">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
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
        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="glass p-8 text-center text-white/60">
            The first SPLATT. drop is being prepared.
          </div>
        )}
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
