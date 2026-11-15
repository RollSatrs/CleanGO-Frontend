import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || !apiUrl.startsWith("https://")) {
    return NextResponse.json({ message: "Backend URL is not configured" }, { status: 503 });
  }

  try {
    const upstream = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/me`, {
      method: "GET",
      headers: { Authorization: authorization, "ngrok-skip-browser-warning": "true" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Не удалось связаться с backend через proxy" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
