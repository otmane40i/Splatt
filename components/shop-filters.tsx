import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ShopFilters({ categories, active }: { categories: string[]; active?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant={!active ? "default" : "outline"} size="sm">
        <Link href="/shop">All</Link>
      </Button>
      {categories.map((category) => (
        <Button key={category} asChild variant={active === category ? "default" : "outline"} size="sm">
          <Link href={`/shop?category=${encodeURIComponent(category)}`}>{category}</Link>
        </Button>
      ))}
    </div>
  );
}
