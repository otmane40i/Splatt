import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

function whatsappHref() {
  const number = process.env.WHATSAPP_NUMBER ?? "212600000000";
  return `https://wa.me/${number}?text=${encodeURIComponent("Salam SPLATT., I have a question about an order.")}`;
}

export default function ContactPage() {
  return (
    <main className="container-page py-14">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-splatt-pink">Contact us</p>
          <h1 className="mt-3 font-space text-5xl font-black text-white">Need help with a figure, color, or order?</h1>
          <p className="mt-4 text-white/55">Message us on WhatsApp for the fastest reply. For custom figurines, send the model, size, and the colors you have in mind.</p>
          <Button asChild className="mt-6">
            <a href={whatsappHref()} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactCard icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" value="Fastest support" detail="Orders, delivery, custom requests" />
          <ContactCard icon={<MapPin className="h-5 w-5" />} label="Location" value="Morocco" detail="DIY paint-pour figurines" />
          <ContactCard icon={<Phone className="h-5 w-5" />} label="Phone" value={process.env.WHATSAPP_NUMBER ?? "212600000000"} detail="No plus sign needed on WhatsApp" />
          <ContactCard icon={<Mail className="h-5 w-5" />} label="Email" value="hello@splatt.ma" detail="For partnerships and bigger requests" />
        </div>
      </section>
    </main>
  );
}

function ContactCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="glass p-5">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-splatt-pink/15 text-splatt-pink">{icon}</div>
      <p className="mt-4 text-xs font-black uppercase text-white/40">{label}</p>
      <h2 className="mt-1 font-space text-2xl font-black text-white">{value}</h2>
      <p className="mt-2 text-sm text-white/50">{detail}</p>
    </article>
  );
}
