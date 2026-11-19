"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

type Order = {
  id: string;
  cleaningType: string;
  area: number;
  address: string;
  status: string;
  price: number | string | null;
  createdAt: string;
};
const labels: Record<string, string> = {
  regular: "Поддерживающая уборка",
  general: "Генеральная уборка",
  renovation: "После ремонта",
};
const statuses: Record<string, string> = {
  pending: "Ищем клинера",
  accepted: "Клинер принял заказ",
  in_progress: "Уборка выполняется",
  completed: "Завершён",
  cancelled: "Отменён",
  unassigned: "Клинер не найден",
  expired: "Поиск завершён",
  failed: "Не удалось найти клинера",
  no_cleaner: "Клинер не найден",
};

export default function ClientOrders() {
  const { token, user, status } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [section, setSection] = useState<"active" | "archive">("active");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || user?.role !== "client" || !user.phoneVerifiedAt) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/backend/orders/history?section=${section}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 401
        ? "Сессия истекла. Откройте приложение заново."
        : `Не удалось загрузить заказы (HTTP ${response.status})`);
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items)) throw new Error("Некорректный ответ сервера");
      const result = data as { items: Order[]; total: number };
      setOrders(result.items);
      setTotal(result.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, user?.phoneVerifiedAt, section, page]);

  useEffect(() => {
    void load();
    if (!token || user?.role !== "client") return;
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [load, token, user?.role]);

  const cancelOrder = async (order: Order) => {
    if (!token || cancellingId || order.status !== "pending") return;
    if (!window.confirm("Отменить заказ? Поиск клинера будет остановлен.")) return;
    setCancellingId(order.id);
    setError("");
    try {
      const response = await fetch(`/api/backend/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(response.status === 409
          ? "Заказ уже принят или недоступен для отмены. Обновите список."
          : result?.message || `Не удалось отменить заказ (HTTP ${response.status})`);
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка отмены заказа");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <AppPageShell role="client" eyebrow="CleanGo" title="Мои заказы"
      description="Активные заказы и история уборок. Статусы обновляются каждые 15 секунд.">
      {status === "authenticated" && user?.role !== "client" && (
        <AppCard><p className="text-sm">Раздел доступен клиентам.</p></AppCard>
      )}
      {user?.role === "client" && !user.phoneVerifiedAt && (
        <AppCard><p className="text-sm">Подтвердите телефон, чтобы увидеть заказы.</p></AppCard>
      )}
      <div className="flex gap-2" role="group" aria-label="Раздел заказов">{(["active", "archive"] as const).map(value => <button key={value} type="button" aria-pressed={section === value} onClick={() => { setSection(value); setPage(1); setLoading(true); }} className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold ${section === value ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-800"}`}>{value === "active" ? "Активные" : "Архив"}</button>)}</div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Загружаем заказы…</p>}
      {!loading && !error && user?.role === "client" && user.phoneVerifiedAt && orders.length === 0 && (
        <AppCard>
          <h2 className="text-lg font-bold">{section === "archive" ? "Архив пока пуст" : "Активных заказов нет"}</h2>
          <p className="mt-2 text-sm text-slate-500">{section === "archive" ? "Завершённые, отменённые и неназначенные заказы появятся здесь." : "Выберите уборку, чтобы оформить заказ."}</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-teal-700">Выбрать уборку</Link>
        </AppCard>
      )}
      <div className="space-y-3">
        {orders.map(order => (
          <AppCard key={order.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold">{labels[order.cleaningType] ?? order.cleaningType}</h2>
              <span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                {statuses[order.status] ?? order.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{order.area} м² · {order.address}</p>
            <p className="mt-2 font-bold text-teal-700">
              {order.price == null ? "Цена уточняется" : `${Number(order.price).toLocaleString("ru-RU")} ₸`}
            </p>
            <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
            {order.status === "pending" && <button type="button" disabled={cancellingId !== null} onClick={() => void cancelOrder(order)} className="mt-3 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">{cancellingId === order.id ? "Отменяем…" : "Отменить заказ"}</button>}
          </AppCard>
        ))}
      </div>
      {user?.role === "client" && user.phoneVerifiedAt && total > 10 && (
        <div className="flex items-center justify-between gap-3 py-3">
          <button type="button" disabled={page === 1} onClick={() => { setPage(p => p - 1); setLoading(true); }} className="rounded-xl border px-3 py-2 disabled:opacity-40">Назад</button>
          <span className="text-sm text-slate-500">Страница {page} из {Math.ceil(total / 10)}</span>
          <button type="button" disabled={page * 10 >= total} onClick={() => { setPage(p => p + 1); setLoading(true); }} className="rounded-xl border px-3 py-2 disabled:opacity-40">Далее</button>
        </div>
      )}
      {user?.role === "client" && user.phoneVerifiedAt && (
        <button type="button" onClick={() => void load()}
          className="mt-4 w-full rounded-xl border border-teal-200 px-4 py-3 font-semibold text-teal-700">
          Обновить заказы
        </button>
      )}
    </AppPageShell>
  );
}
