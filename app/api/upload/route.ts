import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { authOptions } from "@/lib/auth";
import { getFirebaseBucket } from "@/lib/firebase";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const extension = path.extname(file.name).toLowerCase() || ".webp";
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = getFirebaseBucket();

  if (bucket) {
    const token = randomUUID();
    const storagePath = `products/${safeName}`;
    const storageFile = bucket.file(storagePath);
    await storageFile.save(buffer, {
      metadata: {
        contentType: file.type || contentTypeForExtension(extension),
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      },
      resumable: false
    });
    const encodedPath = encodeURIComponent(storagePath);
    return NextResponse.json({ path: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}` });
  }

  const uploadDir = path.join(process.cwd(), "public", "products");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), buffer);

  return NextResponse.json({ path: `/products/${safeName}` });
}

function contentTypeForExtension(extension: string) {
  if (extension === ".stl") return "model/stl";
  if (extension === ".obj") return "model/obj";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}
