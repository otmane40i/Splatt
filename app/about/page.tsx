import { Reveal } from "@/components/reveal";

export default function AboutPage() {
  return (
    <main className="container-page py-16">
      <Reveal className="max-w-4xl">
        <p className="text-sm font-black uppercase text-splatt-teal">About</p>
        <h1 className="font-space text-5xl font-black sm:text-7xl">SPLATT. is a Moroccan DIY paint-pour figurine brand.</h1>
        <p className="mt-6 text-lg text-white/62">
          We build blank collectible kits for people who want a physical object that feels like their own style. Every figure starts clean, then turns into something unpredictable through your pour, your colors, and your hands.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {["Made locally", "Designed for first-timers", "Built for one-of-one results"].map((item) => (
          <Reveal key={item} className="glass p-6">
            <h2 className="font-space text-2xl font-bold">{item}</h2>
            <p className="mt-3 text-sm text-white/60">Dark-mode energy, streetwear color, and kits that make the process simple without making the result boring.</p>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
