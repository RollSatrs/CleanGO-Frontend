"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { OrderSkeleton } from "@/components/ui/order-loading";
import OrderTracking from "@/components/OrderTracking";

type Order = {
  id: string;
  status: string;
  address: string;
  area: number;
  cleaningType: "regular" | "general" | "renovation";
  price: number | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

export default function ClientOrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { token, user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== "client" || !user.phoneVerifiedAt) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/backend/orders/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 404
        ? "Заказ не найден или у вас нет к нему доступа."
        : `Не удалось загрузить заказ (HTTP ${response.status})`);
      return response.json() as Promise<Order>;
    }).then(data => { if (active) setOrder(data); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Ошибка загрузки"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token, user?.role, user?.phoneVerifiedAt]);

  if (loading) return <main className="cleango-page-frame"><div className="cleango-page-scroll px-4 pt-4"><Link href="/client/orders" className="cg-press mb-4 inline-block text-sm font-semibold text-[#137D79]">← К заказам</Link><OrderSkeleton detail rows={1} label="Загружаем заказ…"/></div></main>;
  if (order) {
    const latitude = Number(order.latitude);
    const longitude = Number(order.longitude);
    const valid=order.latitude!=null&&order.longitude!=null&&Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
    return <OrderTracking initialOrder={order} latitude={valid?latitude:NaN} longitude={valid?longitude:NaN} />;
  }
  return <main className="cleango-page-frame flex flex-col justify-center gap-4 px-6 text-center text-slate-800">
    <h1 className="text-xl font-bold">Просмотр заказа</h1>
    <p className="text-sm text-slate-600">{loading ? "Загружаем заказ и карту…" : error || "Для просмотра войдите как клиент и подтвердите телефон."}</p>
    <Link href="/client/orders" className="font-semibold text-teal-700">Вернуться к заказам</Link>
  </main>;
}
