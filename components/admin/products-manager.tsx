"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMad, slugify } from "@/lib/utils";
import type { StoreProduct } from "@/lib/catalog";

type ProductDraft = Omit<StoreProduct, "id" | "createdAt" | "updatedAt"> & { id?: string };

const blankProduct: ProductDraft = {
  slug: "",
  nameEN: "",
  nameFR: "",
  descEN: "",
  descFR: "",
  price: 300,
  image: "/products/bear.svg",
  model3d: null,
  category: "Figures",
  inStock: true,
  featured: false
};

export function ProductsManager({ products }: { products: StoreProduct[] }) {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    if (!draft) return;
    const method = draft.id ? "PUT" : "POST";
    startTransition(async () => {
      await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
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

  async function upload(file: File, field: "image" | "model3d") {
    const data = new FormData();
    data.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: data });
    if (!response.ok) return;
    const result = (await response.json()) as { path: string };
    setDraft((value) => value ? { ...value, [field]: result.path } : value);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-space text-4xl font-black">Products</h1>
        <Button onClick={() => setDraft(blankProduct)}><Plus className="h-4 w-4" />Add</Button>
      </div>
      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-white/10 text-white/50">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Price</th>
              <th className="p-4">Category</th>
              <th className="p-4">3D</th>
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
                <td className="p-4">{product.inStock ? "Yes" : "No"}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => setDraft(product)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => remove(product.id)} disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name EN" value={draft.nameEN} onChange={(value) => setDraft({ ...draft, nameEN: value, slug: draft.slug || slugify(value) })} />
              <Field label="Name FR" value={draft.nameFR} onChange={(value) => setDraft({ ...draft, nameFR: value })} />
              <Field label="Slug" value={draft.slug} onChange={(value) => setDraft({ ...draft, slug: slugify(value) })} />
              <Field label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
              <Field label="Price" type="number" value={String(draft.price)} onChange={(value) => setDraft({ ...draft, price: Number(value) })} />
              <Field label="Image path" value={draft.image} onChange={(value) => setDraft({ ...draft, image: value })} />
              <Field label="3D model path" value={draft.model3d ?? ""} onChange={(value) => setDraft({ ...draft, model3d: value || null })} />
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="upload">Upload image</Label>
                <Input id="upload" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] ? upload(event.target.files[0], "image") : undefined} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="model-upload">Upload 3D model</Label>
                <Input id="model-upload" type="file" accept=".stl,.obj" onChange={(event) => event.target.files?.[0] ? upload(event.target.files[0], "model3d") : undefined} />
              </div>
              <Area label="Description EN" value={draft.descEN} onChange={(value) => setDraft({ ...draft, descEN: value })} />
              <Area label="Description FR" value={draft.descFR} onChange={(value) => setDraft({ ...draft, descFR: value })} />
              <Toggle label="In stock" checked={draft.inStock} onChange={(value) => setDraft({ ...draft, inStock: value })} />
              <Toggle label="Featured" checked={draft.featured} onChange={(value) => setDraft({ ...draft, featured: value })} />
              <Button className="md:col-span-2" onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save product"}</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return <div className="grid gap-2 md:col-span-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
