"use client";

import Link from "next/link";
import { Menu, Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LogoText } from "@/components/logo-text";
import { dictionary } from "@/lib/i18n";
import { useLanguage } from "@/components/language-provider";
import { CartDrawer } from "@/components/cart-drawer";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { locale, setLocale } = useLanguage();
  const t = dictionary[locale];

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/shop", label: t.nav.shop },
    { href: "/faq", label: t.nav.faq },
    { href: "/contact", label: t.nav.contact },
    { href: "/track-order", label: t.nav.track },
    { href: "/about", label: t.nav.about }
  ];

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-fit items-center rounded-xl px-1 py-2" aria-label="SPLATT. home">
          <LogoText />
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-white/70 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <div className="rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(["en", "fr"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition ${locale === item ? "bg-primary text-white" : "text-white/60 hover:text-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <Button asChild>
            <Link href="/shop">{t.cta}</Link>
          </Button>
          <Button size="icon" variant="outline" onClick={() => setSearchOpen(true)} aria-label="Search products">
            <Search className="h-4 w-4" />
          </Button>
          <Button asChild size="icon" variant="outline" aria-label="Admin account">
            <Link href="/admin/login"><UserRound className="h-4 w-4" /></Link>
          </Button>
          <CartDrawer />
          <Button asChild variant="outline">
            <Link href="/admin/login">Admin</Link>
          </Button>
        </div>
        <button className="rounded-full p-2 text-white md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open ? (
        <div className="container-page grid gap-3 pb-5 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm font-bold">
              {link.label}
            </Link>
          ))}
          <button type="button" onClick={() => { setOpen(false); setSearchOpen(true); }} className="rounded-xl bg-white/[0.04] px-4 py-3 text-left text-sm font-bold">
            Search products
          </button>
          <Link href="/admin/login" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-splatt-pink">
            Admin
          </Link>
          <CartDrawer compact />
          <div className="flex gap-2">
            <Button variant={locale === "en" ? "default" : "outline"} onClick={() => setLocale("en")}>EN</Button>
            <Button variant={locale === "fr" ? "default" : "outline"} onClick={() => setLocale("fr")}>FR</Button>
          </div>
        </div>
      ) : null}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Search SPLATT.</DialogTitle></DialogHeader>
          <form onSubmit={submitSearch} className="grid gap-3">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bear, pup, phantom..." autoFocus />
            <Button type="submit"><Search className="h-4 w-4" /> Search shop</Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
