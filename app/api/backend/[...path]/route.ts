import { NextRequest, NextResponse } from "next/server";

// Explicit route allowlist: this endpoint must never become an open proxy.
function permitted(path: string, method: string): boolean {
  if (["GET","PATCH"].includes(method) && path === "auth/profile") return true;
  if (method === "GET" && (path === "" || path === "pricing/quote" || path === "orders/offers/mine" || path === "orders/cleaner/profile" || path === "orders/cleaner/jobs" || path === "orders" || path === "orders/history" || path === "orders/notifications")) return true;
  if (method === "GET" && (path === "orders/cleaner/history" || /^orders\/cleaner\/history\/[0-9a-f-]{36}$/i.test(path))) return true;
  if (method === "GET" && /^orders\/[0-9a-f-]{36}(?:\/(?:progress|cleaner-reputation|counterpart-avatar|exception))?$/i.test(path)) return true;
  if (method === "PATCH" && ["orders/cleaner/profile","orders/cleaner/preferences","orders/cleaner/location"].includes(path)) return true;
  if (method === "POST" && path === "orders") return true;
  if (method === "PATCH" && /^orders\/[0-9a-f-]{36}\/(accept|decline|en-route|arrived|trip-location|start|complete|cancel|inspection|confirm-completion|completion-issue)$/i.test(path)) return true;
  if (method === "POST" && /^orders\/[0-9a-f-]{36}\/(?:review|review-report|exception)$/i.test(path)) return true;
  if (method === "GET" && path === "support/mine") return true;

  return false;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!permitted(path, request.method)) {
    return NextResponse.json({ message: "Маршрут недоступен" }, { status: 404 });
  }
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base || !/^https:\/\/[^/]+$/i.test(base.replace(/\/$/, ""))) {
    return NextResponse.json({ message: "Backend URL is not configured" }, { status: 503 });
  }
  const upstreamUrl = new URL(`${base.replace(/\/$/, "")}/${path}`);
  upstreamUrl.search = request.nextUrl.search;
  const headers = new Headers({ "ngrok-skip-browser-warning": "true", Accept: "application/json" });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);
  const contentType = request.headers.get("content-type");
  if (contentType && ["POST", "PATCH"].includes(request.method)) headers.set("Content-Type", contentType);
  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ["POST", "PATCH"].includes(request.method) ? await request.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout((path.endsWith("/complete") || path.endsWith("/exception")) ? 45000 : 12000),
    });
    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    });
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ message: "Не удалось связаться с backend через Vercel" }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}
