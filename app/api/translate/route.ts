import { NextResponse } from "next/server";

type TranslateRequest = {
  text?: string;
  from?: string;
  to?: string;
};

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as TranslateRequest;
  const text = body.text?.trim();
  const from = body.from?.trim() || "en";
  const to = body.to?.trim() || "fr";

  if (!text) {
    return NextResponse.json({ translatedText: "" });
  }

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${from}|${to}`);

  try {
    const response = await fetch(url, { next: { revalidate: 0 } });
    if (!response.ok) throw new Error("Translation request failed");
    const result = (await response.json()) as MyMemoryResponse;
    const translatedText = result.responseData?.translatedText?.trim();
    return NextResponse.json({ translatedText: translatedText || text });
  } catch {
    return NextResponse.json({ translatedText: text }, { status: 200 });
  }
}
