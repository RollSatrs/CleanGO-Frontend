"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

type Offer = {
  offerId: string;
  orderId: string;
  expiresAt: string;
  cleaningType: string;
  area: number;
  price: number;
  approximateArea: string | null;
  createdAt: string;
};

const API_URL = "/api/backend";
const typeLabels: Record<string, string> = {
  regular: "Поддерживающая уборка",
  general: "Генеральная уборка",
  renovation: "Уборка после ремонта",
};

export default function CleanerJobs() {
  const { user, token, status } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!token || user?.role !== "cleaner" || !user.phoneVerifiedAt) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/orders/offers/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 403
        ? "Подтвердите номер телефона клинера"
        : "Не удалось получить предложения");
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error("Неожиданный ответ сервера");
      setOffers(result as Offer[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, user?.phoneVerifiedAt]);

  useEffect(() => {
    void load();
    if (!token || user?.role !== "cleaner") return;
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load, token, user?.role]);

  async function respond(orderId: string, action: "accept" | "decline") {
    if (!token || busyId) return;
    setBusyId(orderId);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/${action}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(response.status === 409
          ? "Предложение уже недоступно. Обновите список."
          : (body?.message ?? "Не удалось обработать предложение"));
      }
      setMessage(action === "accept" ? "Заказ принят. Проверьте детали в личном кабинете." : "Предложение отклонено.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка соединения");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppPageShell role="cleaner" eyebrow="Для исполнителя" title="Мои предложения"
      description="Только персональные предложения. Точный адрес доступен после назначения заказа.">
      {status === "authenticated" && user?.role !== "cleaner" && (
        <AppCard><p className="text-sm">Этот раздел доступен только клинерам.</p></AppCard>
      )}
      {user?.role === "cleaner" && !user.phoneVerifiedAt && (
        <AppCard><p className="text-sm">Для получения предложений подтвердите номер телефона в профиле.</p></AppCard>
      )}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {loading && <p className="text-sm text-slate-500">Загружаем предложения…</p>}
      {!loading && user?.role === "cleaner" && user.phoneVerifiedAt && offers.length === 0 && !error && (
        <AppCard className="py-8 text-center">
          <h2 className="text-lg font-bold">Пока нет предложений</h2>
          <p className="mt-2 text-sm text-slate-500">Новые предложения появятся здесь автоматически. Обновление каждые 15 секунд.</p>
        </AppCard>
      )}
      <div className="space-y-3">
        {offers.map(offer => {
          const expired = new Date(offer.expiresAt).getTime() <= Date.now();
          return (
            <AppCard key={offer.offerId}>
              <h2 className="text-base font-bold">{typeLabels[offer.cleaningType] ?? offer.cleaningType}</h2>
              <p className="mt-2 text-sm text-slate-600">Площадь: {offer.area} м²</p>
              <p className="mt-1 text-sm text-slate-600">Район: {offer.approximateArea || "Уточняется"}</p>
              <p className="mt-2 text-lg font-bold text-teal-700">{Number(offer.price).toLocaleString("ru-RU")} ₸</p>
              <p className="mt-1 text-xs text-slate-500">Действует до: {new Date(offer.expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" disabled={expired || busyId !== null} onClick={() => void respond(offer.orderId, "accept")}
                  className="flex-1 rounded-xl bg-teal-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50">Принять</button>
                <button type="button" disabled={expired || busyId !== null} onClick={() => void respond(offer.orderId, "decline")}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Отказаться</button>
              </div>
            </AppCard>
          );
        })}
      </div>
      {user?.role === "cleaner" && user.phoneVerifiedAt && (
        <button type="button" onClick={() => void load()} className="mt-4 w-full rounded-xl border border-teal-200 px-4 py-3 text-sm font-semibold text-teal-700">Обновить предложения</button>
      )}
    </AppPageShell>
  );
}
