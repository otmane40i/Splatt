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

function normalizeFirebaseUrl(value: string) {
  const url = new URL(value);
  if (url.hostname !== "firebasestorage.googleapis.com") return url.toString();

  const tokens = url.searchParams.getAll("token").filter(Boolean);
  const lastToken = tokens[tokens.length - 1];
  if (lastToken) url.searchParams.set("token", lastToken);
  url.searchParams.set("alt", url.searchParams.get("alt") || "media");
  return url.toString();
}

async function fetchModel(source: string) {
  const normalized = normalizeFirebaseUrl(source);
  const response = await fetch(normalized, { cache: "no-store" });
  if (response.ok || !normalized.includes("%3d")) return response;

  return fetch(normalized.replaceAll("%3d", "%20").replaceAll("%3D", "%20"), { cache: "no-store" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("url");

  if (!source || !isAllowedModelUrl(source)) {
    return NextResponse.json({ error: "Invalid model URL" }, { status: 400 });
  }

  const response = await fetchModel(source);
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
