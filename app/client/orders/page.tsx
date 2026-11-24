"use client";

import { useCallback, useEffect, useState } from "react";
import ServiceImage from "@/components/ServiceImage";
import Link from "next/link";
import { MapPin, CalendarDays, ChevronRight, RefreshCw } from "lucide-react";
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
  en_route: "Клинер в пути",
  arrived: "Клинер прибыл",
  in_progress: "Уборка выполняется",
  completed: "Завершён",
  pending_confirmation: "Ожидает вашего подтверждения",
  disputed: "Обращение в поддержку",
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
    <AppPageShell role="client" eyebrow="CleanGo" title="Заказы">
      {status === "authenticated" && user?.role !== "client" && (
        <AppCard><p className="text-sm">Раздел доступен клиентам.</p></AppCard>
      )}
      {user?.role === "client" && !user.phoneVerifiedAt && (
        <AppCard><p className="text-sm">Подтвердите телефон, чтобы увидеть заказы.</p></AppCard>
      )}
      <div className="flex gap-2" role="group" aria-label="Раздел заказов">{(["active", "archive"] as const).map(value => <button key={value} type="button" aria-pressed={section === value} onClick={() => { setSection(value); setPage(1); setLoading(true); }} className={`flex-1 rounded-[11px] px-3 py-2.5 text-xs font-semibold ${section === value ? "cg-primary" : "bg-[#EDEEEB] text-[#51595A]"}`}>{value === "active" ? "Активные" : "Архив"}</button>)}</div>
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
          <AppCard key={order.id} className="!p-2.5">
            <Link href={`/client/orders/${encodeURIComponent(order.id)}`} className="flex items-stretch gap-3">
              <ServiceImage type={order.cleaningType} className="min-h-[108px] w-[29%] shrink-0 rounded-[11px]" sizes="(max-width: 520px) 29vw, 145px" illustrative/>
              <div className="min-w-0 flex-1 py-1">
                <span className="cg-soft inline-flex rounded-full px-2 py-1 text-[10px] font-semibold leading-tight">{statuses[order.status] ?? order.status}</span>
                <p className="mt-1.5 text-[19px] font-bold tracking-tight">{order.price==null?"Цена уточняется":`${Number(order.price).toLocaleString("ru-RU")} ₸`}</p>
                <h2 className="mt-1 text-xs font-semibold">{labels[order.cleaningType]??order.cleaningType} · {order.area} м²</h2>
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 cg-muted"><MapPin size={13} className="shrink-0"/><span className="line-clamp-2">{order.address}</span></p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] cg-muted"><CalendarDays size={13} className="shrink-0"/>{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 self-center text-[#909895]"/>
            </Link>
            {order.status==="pending"&&<button type="button" disabled={cancellingId!==null} onClick={()=>void cancelOrder(order)} className="mt-2 w-full rounded-[10px] border border-[#E6E7E4] px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50">{cancellingId===order.id?"Отменяем…":"Отменить заказ"}</button>}
          </AppCard>
        ))}
      </div>
      {user?.role === "client" && user.phoneVerifiedAt && total > 5 && (
        <div className="flex items-center justify-between gap-3 py-3">
          <button type="button" disabled={page === 1} onClick={() => { setPage(p => p - 1); setLoading(true); }} className="rounded-xl border px-3 py-2 disabled:opacity-40">Назад</button>
          <span className="text-sm text-slate-500">Страница {page} из {Math.ceil(total / 5)}</span>
          <button type="button" disabled={page * 5 >= total} onClick={() => { setPage(p => p + 1); setLoading(true); }} className="rounded-xl border px-3 py-2 disabled:opacity-40">Далее</button>
        </div>
      )}
      {user?.role === "client" && user.phoneVerifiedAt && (
        <button type="button" onClick={() => void load()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E6E7E4] bg-white px-4 py-2.5 text-xs font-semibold text-[#137D79]">
          <RefreshCw size={14}/> Обновить заказы
        </button>
      )}
    </AppPageShell>
  );
}
