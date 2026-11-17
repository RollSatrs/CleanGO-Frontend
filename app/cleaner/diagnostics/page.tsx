"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

type Result = { name: string; status: string; detail: string; elapsedMs: number };
function safeEndpoint() {
  try {
    const url = new URL(API_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "Адрес API некорректен";
  }
}
function describeStatus(status: number) {
  if (status === 200) return "Ответ получен";
  if (status === 401) return "401 — требуется повторный вход";
  if (status === 403) return "403 — нет доступа или не подтверждён телефон";
  if (status === 404) return "404 — маршрут не найден";
  if (status >= 500) return `${status} — ошибка backend`;
  return `HTTP ${status}`;
}

export default function CleanerDiagnostics() {
  const { token, user, status: authStatus } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  async function run() {
    if (running) return;
    setRunning(true);
    setResults([]);
    const next: Result[] = [];
    async function check(name: string, path: string, authorized: boolean) {
      const start = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`${API_URL}${path}`, {
          method: "GET",
          cache: "no-store",
          headers: authorized && token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        next.push({ name, status: String(response.status), detail: describeStatus(response.status), elapsedMs: Math.round(performance.now() - start) });
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";
        next.push({
          name, status: aborted ? "timeout" : "network",
          detail: aborted ? "Нет ответа за 10 секунд" : "Браузер заблокировал запрос или сеть недоступна. Проверьте URL, CORS и ngrok.",
          elapsedMs: Math.round(performance.now() - start),
        });
      } finally {
        clearTimeout(timeout);
        setResults([...next]);
      }
    }
    try {
      await check("Публичный backend", "/", false);
      if (token && user?.role === "cleaner") {
        await check("Профиль клинера (JWT)", "/orders/cleaner/profile", true);
        await check("Предложения клинера (JWT)", "/orders/offers/mine", true);
      }
    } finally {
      setRunning(false);
    }
  }

  const report = [
    "CleanGo API diagnostics",
    `API: ${safeEndpoint()}`,
    `Telegram auth status: ${authStatus}`,
    `Role: ${user?.role === "cleaner" ? "cleaner" : "other/unknown"}`,
    `JWT present: ${Boolean(token)}`,
    `Phone verified: ${Boolean(user?.phoneVerifiedAt)}`,
    ...results.map(item => `${item.name}: ${item.status} — ${item.detail} (${item.elapsedMs}ms)`),
  ].join("\n");

  return (
    <AppPageShell role="cleaner" eyebrow="Проверка соединения" title="Диагностика API"
      description="Проверка запускается только по кнопке. Токены, данные Telegram и личная информация не включаются в отчёт.">
      <AppCard>
        <p className="text-xs font-semibold text-slate-500">Адрес API</p>
        <p className="mt-1 break-all text-sm font-medium">{safeEndpoint()}</p>
        <p className="mt-3 text-sm">Авторизация: {authStatus === "authenticated" ? "активна" : authStatus}</p>
        <p className="mt-1 text-sm">JWT: {token ? "есть" : "нет"} · Роль: {user?.role === "cleaner" ? "клинер" : "другая"}</p>
        <p className="mt-1 text-sm">Телефон: {user?.phoneVerifiedAt ? "подтверждён" : "не подтверждён"}</p>
      </AppCard>
      <button type="button" disabled={running} onClick={() => void run()}
        className="w-full rounded-xl bg-teal-600 px-4 py-4 font-bold text-white disabled:opacity-50">
        {running ? "Проверяем соединение…" : "Проверить соединение"}
      </button>
      {results.length > 0 && (
        <AppCard>
          <h2 className="mb-3 font-bold">Результаты</h2>
          <div className="space-y-3">
            {results.map(result => (
              <div key={result.name} className="border-b border-slate-100 pb-3 last:border-0">
                <p className="text-sm font-semibold">{result.name}</p>
                <p className="mt-1 text-sm">{result.status}: {result.detail}</p>
                <p className="mt-1 text-xs text-slate-500">{result.elapsedMs} мс</p>
              </div>
            ))}
          </div>
        </AppCard>
      )}
      <button type="button" disabled={results.length === 0 || running}
        onClick={() => { void navigator.clipboard.writeText(report).catch(() => window.prompt("Скопируйте отчёт", report)); }}
        className="w-full rounded-xl border border-teal-200 px-4 py-3 font-semibold text-teal-700 disabled:opacity-50">
        Скопировать безопасный отчёт
      </button>
      <Link href="/cleaner/profile" className="block py-3 text-center text-sm text-teal-700">Вернуться в профиль</Link>
    </AppPageShell>
  );
}
