import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { BrandSplash } from "@/components/brand-splash";
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
      <section
        className="relative flex h-[calc(100svh-4rem)] min-h-[520px] items-center overflow-hidden bg-cover bg-center bg-no-repeat sm:min-h-[calc(100vh-4rem)]"
        style={{ backgroundImage: "url('/images/hero-banner.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50 sm:bg-black/40" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-splatt-pink to-transparent" />
        <div className="container-page relative z-10 flex h-full items-center justify-center py-10 text-center sm:min-h-[calc(100vh-4rem)] sm:py-16">
          <Reveal className="mx-auto max-w-5xl">
            <h1 className="font-space text-4xl font-black leading-none tracking-normal text-white drop-shadow-2xl min-[380px]:text-5xl sm:text-7xl lg:text-8xl">
              No two are the same.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-base font-semibold leading-6 text-white drop-shadow-lg sm:mt-6 sm:max-w-2xl sm:text-2xl sm:leading-8">
              Pick your figure. Pour your colors. Own the chaos.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
              <Button asChild size="default"><Link href="/shop">Shop Now</Link></Button>
              <Button asChild variant="outline"><Link href="/about">Our story</Link></Button>
            </div>
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
      <section className="border-y border-white/10 bg-white/[0.02] py-20">
        <div className="container-page">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase text-splatt-orange">How it works</p>
            <h2 className="mt-3 font-space text-4xl font-black sm:text-5xl">From blank figure to one-of-one.</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-center backdrop-blur-xl">
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
                <div className="p-6">
                  <h3 className="font-space text-3xl font-black">{step.title}</h3>
                  <p className="mx-auto mt-4 max-w-xs text-lg leading-7 text-white/72">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="relative min-h-[600px] overflow-hidden border-y border-white/10 bg-black py-16 sm:py-20">
        <div className="pointer-events-none absolute -left-8 top-8 font-space text-[18vw] font-black leading-none text-white/[0.035]">
          SPLATT.
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,46,147,0.18),transparent_34%),radial-gradient(circle_at_85%_30%,rgba(31,168,160,0.12),transparent_30%)]" />
        <div className="container-page relative z-10 grid min-h-[600px] items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal className="max-w-3xl">
            <p className="border-l-4 border-splatt-pink pl-4 text-sm font-black uppercase tracking-wide text-splatt-pink">
              ABOUT SPLATT.
            </p>
            <h2 className="mt-5 font-space text-5xl font-black leading-tight text-white sm:text-6xl">
              A Moroccan DIY brand for people who want the art to feel personal.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
              We make blank figurine kits that let anyone create a collectible object without needing a studio, a canvas, or permission.
            </p>
            <Button asChild className="mt-8"><Link href="/about">Read more</Link></Button>
          </Reveal>
          <Reveal delay={0.12} className="relative h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_80px_rgba(255,46,147,0.16)] lg:h-full">
            <Image
              src="/images/about-bear.jpg"
              alt="Paint-pour SPLATT. bear figurine on a dark table"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 48vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </Reveal>
        </div>
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
