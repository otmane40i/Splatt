"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Edit, ImageIcon, Languages, LinkIcon, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMad, slugify } from "@/lib/utils";
import type { StoreProduct } from "@/lib/catalog";

type ProductDraft = Omit<StoreProduct, "id" | "createdAt" | "updatedAt"> & { id?: string };

function createBlankProduct(): ProductDraft {
  return {
  slug: "",
  nameEN: "",
  nameFR: "",
  descEN: "",
  descFR: "",
  price: 300,
  image: "/products/bear.svg",
  model3d: null,
  stockQuantity: 10,
  bundleQuantity: 2,
  bundlePrice: null,
  filamentGrams: 187,
  printTimeMinutes: 240,
  productionCost: 90,
  category: "Figures",
  inStock: true,
  featured: false
};
}

export function ProductsManager({ products }: { products: StoreProduct[] }) {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function save() {
    if (!draft) return;
    setError("");
    const slug = draft.slug.trim().length >= 2 ? slugify(draft.slug) : slugify(draft.nameEN);
    const descEN = draft.descEN.trim() || "Created by You.";
    const method = draft.id ? "PUT" : "POST";
    const payload = {
      ...draft,
      slug,
      nameFR: draft.nameEN,
      descEN,
      descFR: draft.descFR.trim() || descEN,
      stockQuantity: draft.stockQuantity ?? null,
      bundleQuantity: draft.bundlePrice ? draft.bundleQuantity ?? 2 : null,
      bundlePrice: draft.bundlePrice ?? null
    };
    startTransition(async () => {
      const response = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
        const message = [data?.error, data?.details].filter(Boolean).join(": ");
        setError(message || "Could not save product. Check the name, description, price, and slug.");
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      router.refresh();
    });
  }

  async function upload(file: File) {
    const data = new FormData();
    data.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: data });
    if (!response.ok) return;
    const result = (await response.json()) as { path: string };
    setDraft((value) => value ? { ...value, image: result.path } : value);
  }

  async function translateDescription() {
    if (!draft?.descEN.trim()) return;
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.descEN, from: "en", to: "fr" })
      });
      const result = (await response.json()) as { translatedText?: string };
      setDraft((value) => value ? { ...value, descFR: result.translatedText || value.descEN } : value);
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-space text-4xl font-black">Products</h1>
        <Button onClick={() => { setError(""); setDraft(createBlankProduct()); }}><Plus className="h-4 w-4" />Add</Button>
      </div>
      {draft ? (
        <section className="glass mt-6 p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-splatt-pink">{draft.id ? "Edit product" : "Add product"}</p>
              <h2 className="font-space text-3xl font-black">{draft.nameEN || "New SPLATT. kit"}</h2>
            </div>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                {draft.image ? (
                  <div className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${draft.image}")` }} />
                ) : (
                  <div className="grid h-full place-items-center text-white/40"><ImageIcon className="h-10 w-10" /></div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upload" className="flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Product picture</Label>
                <Input id="upload" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] ? upload(event.target.files[0]) : undefined} />
              </div>
              <Field label="Image URL" value={draft.image} onChange={(value) => setDraft({ ...draft, image: value })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Product name"
                value={draft.nameEN}
                onChange={(value) => {
                  const currentAutoSlug = slugify(draft.nameEN);
                  const shouldUpdateSlug = !draft.slug || draft.slug === currentAutoSlug || draft.slug.length < 2;
                  setDraft({ ...draft, nameEN: value, nameFR: value, slug: shouldUpdateSlug ? slugify(value) : draft.slug });
                }}
              />
              <Field label="Slug" value={draft.slug} onChange={(value) => setDraft({ ...draft, slug: slugify(value) })} />
              <Field label="Price MAD" type="number" value={String(draft.price)} onChange={(value) => setDraft({ ...draft, price: Number(value) })} />
              <Field label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
              <Field label="Available units" type="number" value={String(draft.stockQuantity ?? 0)} onChange={(value) => setDraft({ ...draft, stockQuantity: Math.max(0, Number(value)) })} />
              <Field label="Filament grams" type="number" value={String(draft.filamentGrams)} onChange={(value) => setDraft({ ...draft, filamentGrams: Math.max(1, Number(value)) })} />
              <Field label="Print time minutes" type="number" value={String(draft.printTimeMinutes)} onChange={(value) => setDraft({ ...draft, printTimeMinutes: Math.max(1, Number(value)) })} />
              <Field label="Production cost MAD" type="number" value={String(draft.productionCost)} onChange={(value) => setDraft({ ...draft, productionCost: Math.max(0, Number(value)) })} />
              <div className="grid gap-2">
                <Label>Buy-together deal</Label>
                <div className="grid grid-cols-[0.7fr_1fr] gap-2">
                  <Input type="number" min={2} value={String(draft.bundleQuantity ?? 2)} onChange={(event) => setDraft({ ...draft, bundleQuantity: Math.max(2, Number(event.target.value)) })} aria-label="Bundle quantity" />
                  <Input type="number" min={0} value={String(draft.bundlePrice ?? "")} placeholder="Price MAD" onChange={(event) => setDraft({ ...draft, bundlePrice: event.target.value ? Number(event.target.value) : null })} aria-label="Bundle price" />
                </div>
                <p className="text-xs text-white/45">Example: quantity 2, price 650 means buy 2 for 650 MAD.</p>
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="model3d" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> 3D model Firebase URL</Label>
                <Input id="model3d" value={draft.model3d ?? ""} placeholder="https://firebasestorage.googleapis.com/..." onChange={(event) => setDraft({ ...draft, model3d: event.target.value || null })} />
                <p className="text-xs text-white/45">Upload STL/OBJ in Firebase Storage, then paste the download URL here.</p>
              </div>

              <div className="grid gap-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="descEN">Description</Label>
                  <Button type="button" size="sm" variant="outline" onClick={translateDescription} disabled={isTranslating || draft.descEN.trim().length < 8}>
                    <Languages className="h-4 w-4" /> {isTranslating ? "Translating..." : "Auto French"}
                  </Button>
                </div>
                <Textarea id="descEN" value={draft.descEN} placeholder="Optional. If empty, the product will use: Created by You." onChange={(event) => setDraft({ ...draft, descEN: event.target.value })} onBlur={() => { if (!draft.descFR && draft.descEN.trim().length >= 8) void translateDescription(); }} />
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/60">
                  <span className="font-bold text-white">French:</span> {draft.descFR || "Will be generated automatically."}
                </div>
              </div>

              <Toggle label="In stock" checked={draft.inStock} onChange={(value) => setDraft({ ...draft, inStock: value })} />
              <Toggle label="Featured" checked={draft.featured} onChange={(value) => setDraft({ ...draft, featured: value })} />
              {error ? <p className="md:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p> : null}
              <Button className="md:col-span-2" onClick={save} disabled={isPending || isTranslating}>{isPending ? "Saving..." : "Save product"}</Button>
            </div>
          </div>
        </section>
      ) : null}
      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-white/10 text-white/50">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Price</th>
              <th className="p-4">Category</th>
              <th className="p-4">3D</th>
              <th className="p-4">Available</th>
              <th className="p-4">Bundle</th>
              <th className="p-4">Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="p-4 font-bold">{product.nameEN}</td>
                <td className="p-4 text-white/60">{product.slug}</td>
                <td className="p-4">{formatMad(product.price)}</td>
                <td className="p-4">{product.category}</td>
                <td className="p-4">{product.model3d ? "Yes" : "No"}</td>
                <td className="p-4">{product.stockQuantity ?? "No limit"}</td>
                <td className="p-4">{product.bundleQuantity && product.bundlePrice ? `${product.bundleQuantity} for ${formatMad(product.bundlePrice)}` : "None"}</td>
                <td className="p-4">{product.inStock ? "Yes" : "No"}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => { setError(""); setDraft(product); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => remove(product.id)} disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
