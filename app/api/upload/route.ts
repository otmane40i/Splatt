import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const extension = path.extname(file.name).toLowerCase() || ".webp";
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
  const uploadDir = path.join(process.cwd(), "public", "products");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, safeName), buffer);

  return NextResponse.json({ path: `/products/${safeName}` });
}
