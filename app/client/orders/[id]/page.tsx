"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
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

  if (order) {
    const latitude = Number(order.latitude);
    const longitude = Number(order.longitude);
    if (order.latitude != null && order.longitude != null
      && Number.isFinite(latitude) && Number.isFinite(longitude)
      && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return <OrderTracking initialOrder={order} latitude={latitude} longitude={longitude} />;
    }
    return <main className="mx-auto max-w-md p-6 text-slate-800">
      <h1 className="text-xl font-bold">Карта недоступна</h1>
      <p className="mt-3 text-sm">Для этого заказа не сохранены координаты. Статус можно посмотреть в списке заказов.</p>
      <Link className="mt-5 inline-block font-semibold text-teal-700" href="/client/orders">Вернуться к заказам</Link>
    </main>;
  }
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center text-slate-800">
    <h1 className="text-xl font-bold">Просмотр заказа</h1>
    <p className="text-sm text-slate-600">{loading ? "Загружаем заказ и карту…" : error || "Для просмотра войдите как клиент и подтвердите телефон."}</p>
    <Link href="/client/orders" className="font-semibold text-teal-700">Вернуться к заказам</Link>
  </main>;
}
