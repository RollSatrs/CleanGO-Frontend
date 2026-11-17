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
};

export default function ClientOrders() {
  const { token, user, status } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || user?.role !== "client" || !user.phoneVerifiedAt) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/backend/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 401
        ? "Сессия истекла. Откройте приложение заново."
        : `Не удалось загрузить заказы (HTTP ${response.status})`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Некорректный ответ сервера");
      setOrders(data as Order[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, user?.phoneVerifiedAt]);

  useEffect(() => {
    void load();
    if (!token || user?.role !== "client") return;
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [load, token, user?.role]);

  return (
    <AppPageShell role="client" eyebrow="CleanGo" title="Мои заказы"
      description="Текущие и предыдущие заказы. Статусы обновляются каждые 15 секунд.">
      {status === "authenticated" && user?.role !== "client" && (
        <AppCard><p className="text-sm">Раздел доступен клиентам.</p></AppCard>
      )}
      {user?.role === "client" && !user.phoneVerifiedAt && (
        <AppCard><p className="text-sm">Подтвердите телефон, чтобы увидеть заказы.</p></AppCard>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Загружаем заказы…</p>}
      {!loading && !error && user?.role === "client" && user.phoneVerifiedAt && orders.length === 0 && (
        <AppCard>
          <h2 className="text-lg font-bold">Заказов пока нет</h2>
          <p className="mt-2 text-sm text-slate-500">Выберите уборку, чтобы оформить первый заказ.</p>
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
          </AppCard>
        ))}
      </div>
      {user?.role === "client" && user.phoneVerifiedAt && (
        <button type="button" onClick={() => void load()}
          className="mt-4 w-full rounded-xl border border-teal-200 px-4 py-3 font-semibold text-teal-700">
          Обновить заказы
        </button>
      )}
    </AppPageShell>
  );
}
