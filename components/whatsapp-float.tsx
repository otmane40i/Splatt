import { MessageCircle } from "lucide-react";

export function WhatsAppFloat() {
  const number = process.env.WHATSAPP_NUMBER ?? "212600000000";
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-splatt-teal text-white shadow-2xl transition hover:scale-105"
      aria-label="Open WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
