import { NextResponse } from "next/server";

const allowedHosts = new Set(["firebasestorage.googleapis.com", "storage.googleapis.com"]);

function isAllowedModelUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (allowedHosts.has(url.hostname) || url.hostname.endsWith(".firebasestorage.app"));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("url");

  if (!source || !isAllowedModelUrl(source)) {
    return NextResponse.json({ error: "Invalid model URL" }, { status: 400 });
  }

  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: "Could not load model" }, { status: response.status });
  }

  const body = await response.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
