"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BadgePercent, Factory, LayoutDashboard, LogOut, Package, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoText } from "@/components/logo-text";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/production", label: "Production", icon: Factory },
    { href: "/admin/discounts", label: "Discounts", icon: BadgePercent },
    { href: "/admin/orders", label: "Orders", icon: ReceiptText }
  ];

  return (
    <main className="container-page grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="glass h-fit p-4">
        <Link href="/admin" className="block" aria-label="SPLATT. admin dashboard">
          <LogoText />
        </Link>
        <nav className="mt-6 grid gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="outline" className="mt-6 w-full" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </aside>
      <section>{children}</section>
    </main>
  );
}
