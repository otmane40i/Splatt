import { TrackOrderForm } from "@/components/track-order-form";

export default function TrackOrderPage() {
  return (
    <main className="container-page py-14">
      <section className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-splatt-pink">Track order</p>
        <h1 className="mt-3 font-space text-5xl font-black text-white">Follow your SPLATT. box.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/55">Enter your order ID and WhatsApp number to see if your box is pending, confirmed, shipped, delivered, or returned.</p>
      </section>
      <div className="mt-10">
        <TrackOrderForm />
      </div>
    </main>
  );
}
