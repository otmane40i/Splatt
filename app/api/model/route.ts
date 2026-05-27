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

async function fetchModel(source: string, range: string | null) {
  const normalized = normalizeFirebaseUrl(source);
  const headers = range ? { Range: range } : undefined;
  const response = await fetch(normalized, { cache: "no-store", headers });
  if (response.ok || !normalized.includes("%3d")) return response;

  return fetch(normalized.replaceAll("%3d", "%203d").replaceAll("%3D", "%203d"), { cache: "no-store", headers });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("url");

  if (!source || !isAllowedModelUrl(source)) {
    return NextResponse.json({ error: "Invalid model URL" }, { status: 400 });
  }

  const response = await fetchModel(source, request.headers.get("range"));
  if (!response.ok) {
    return NextResponse.json({ error: "Could not load model" }, { status: response.status });
  }

  const headers = new Headers({
    "Content-Type": response.headers.get("content-type") || "application/octet-stream",
    "Accept-Ranges": response.headers.get("accept-ranges") || "bytes",
    "Cache-Control": "public, max-age=3600"
  });
  const contentLength = response.headers.get("content-length");
  const contentRange = response.headers.get("content-range");
  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);

  return new NextResponse(response.body, { status: response.status, headers });
}
