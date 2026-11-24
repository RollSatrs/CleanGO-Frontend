"use client";

import { useEffect, useRef, useState } from "react";
import { OrderSkeleton, OrderPagination, RefreshButton } from "@/components/ui/order-loading";
import ServiceImage from "@/components/ServiceImage";
import Link from "next/link";
import { MapPin, CalendarDays, ChevronRight, Star, RotateCcw } from "lucide-react";
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
  rating?:number|null;
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
  const [section, setSection] = useState<"active" | "completed" | "cancelled">("active");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing,setRefreshing]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const [direction,setDirection]=useState<-1|1|null>(null);
  const [motionKey,setMotionKey]=useState(0);
  const listRef=useRef<HTMLDivElement>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function refresh(){
    setRefreshing(true);setError("");setAttempt(v=>v+1);
  }
  function changePage(next:number){
    if(loading||refreshing||cancellingId||next===page)return;
    setDirection(next>page?1:-1);setLoading(true);setError("");setOrders([]);setPage(next);
    listRef.current?.scrollIntoView({block:"start",behavior:"instant"});
  }
  useEffect(()=>{
    if(!token||user?.role!=="client"||!user.phoneVerifiedAt){setLoading(false);setRefreshing(false);return;}
    const controller=new AbortController();
    let inFlight=false;
    const load=async(initial=false)=>{
      if(inFlight||controller.signal.aborted)return;
      inFlight=true;
      try{
        const response=await fetch(`/api/backend/orders/history?section=${section}&page=${page}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:controller.signal});
        if(!response.ok)throw new Error(response.status===401?"Сессия истекла. Откройте приложение заново.":"Не удалось загрузить заказы");
        const data=await response.json() as {items:Order[];total:number};
        if(!Array.isArray(data.items)||!Number.isFinite(data.total))throw new Error("Некорректный ответ сервера");
        if(controller.signal.aborted)return;
        setOrders(data.items);setTotal(data.total);setError("");
        if(page>1&&!data.items.length){setLoading(true);setPage(Math.max(1,Math.ceil(data.total/5)));return;}
        if(initial)setMotionKey(v=>v+1);
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Ошибка загрузки заказов");}
      finally{inFlight=false;if(!controller.signal.aborted){setLoading(false);setRefreshing(false);}}
    };
    void load(true);
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);
    return()=>{controller.abort();window.clearInterval(timer);};
  },[token,user?.role,user?.phoneVerifiedAt,section,page,attempt]);

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
      refresh();
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
      <div className="flex gap-2" role="group" aria-label="Раздел заказов">{(["active", "completed", "cancelled"] as const).map(value => <button key={value} type="button" aria-pressed={section === value} onClick={() => { if(section===value||cancellingId)return; setSection(value);setPage(1);setOrders([]);setTotal(0);setError("");setDirection(null);setLoading(true); }} className={`cg-press flex-1 rounded-[11px] px-3 py-2.5 text-xs font-semibold ${section === value ? "cg-primary" : "bg-[#EDEEEB] text-[#51595A]"}`}>{value === "active" ? "Активные" : value==="completed"?"Завершённые":"Отменённые"}</button>)}</div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div ref={listRef} className="scroll-mt-3"/>
      {loading&&user?.role==="client"&&user.phoneVerifiedAt&&<OrderSkeleton label={direction?"Загружаем страницу…":"Загружаем заказы…"}/>}
      {!loading && !error && user?.role === "client" && user.phoneVerifiedAt && orders.length === 0 && (
        <AppCard>
          <h2 className="text-lg font-bold">{section==="active"?"Активных заказов нет":section==="completed"?"Нет завершённых заказов":"Нет отменённых заказов"}</h2>
          <p className="mt-2 text-sm text-slate-500">{section==="active"?"Выберите уборку, чтобы оформить заказ.":section==="completed"?"Подтверждённые уборки появятся здесь.":"Отменённые и неназначенные заказы появятся здесь."}</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-teal-700">Выбрать уборку</Link>
        </AppCard>
      )}
      <div key={motionKey} aria-busy={loading||refreshing} className={`cg-order-enter space-y-3 ${direction===1?"cg-enter-forward":direction===-1?"cg-enter-back":""}`}>
        {!loading&&user?.role==="client"&&user.phoneVerifiedAt&&orders.map(order => (
          <AppCard key={order.id} className="cg-order-card !p-2.5">
            <Link href={`/client/orders/${encodeURIComponent(order.id)}`} className="flex items-stretch gap-3">
              <ServiceImage type={order.cleaningType} className="min-h-[108px] w-[29%] shrink-0 rounded-[11px]" sizes="(max-width: 520px) 29vw, 145px" illustrative/>
              <div className="min-w-0 flex-1 py-1">
                <span className="cg-soft inline-flex rounded-full px-2 py-1 text-[10px] font-semibold leading-tight">{statuses[order.status] ?? order.status}</span>
                <p className="mt-1.5 text-[19px] font-bold tracking-tight">{order.price==null?"Цена уточняется":`${Number(order.price).toLocaleString("ru-RU")} ₸`}</p>
                <h2 className="mt-1 text-xs font-semibold">{labels[order.cleaningType]??order.cleaningType} · {order.area} м²</h2>
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 cg-muted"><MapPin size={13} className="shrink-0"/><span className="line-clamp-2">{order.address}</span></p>
                {order.rating!=null&&<p className="mt-1 flex items-center gap-1 text-xs"><Star size={12} className="fill-[#E9B54E] text-[#E9B54E]"/>{Number(order.rating).toFixed(1)}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-[11px] cg-muted"><CalendarDays size={13} className="shrink-0"/>{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 self-center text-[#909895]"/>
            </Link>
            {order.status==="completed"&&<Link href={`/order?service=${encodeURIComponent(order.cleaningType)}&repeat=${encodeURIComponent(order.id)}`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#E6E7E4] py-2.5 text-xs font-semibold text-[#137D79]"><RotateCcw size={14}/> Повторить заказ</Link>}
            {order.status==="pending"&&<button type="button" disabled={cancellingId!==null} onClick={()=>void cancelOrder(order)} className="mt-2 w-full rounded-[10px] border border-[#E6E7E4] px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50">{cancellingId===order.id?"Отменяем…":"Отменить заказ"}</button>}
          </AppCard>
        ))}
      </div>
      {user?.role==="client"&&user.phoneVerifiedAt&&<>
        <OrderPagination page={page} total={total} busy={loading||refreshing||!!cancellingId} direction={direction} onChange={changePage}/>
        <RefreshButton busy={refreshing} disabled={loading||!!cancellingId} label="Обновить заказы" onClick={refresh}/>
      </>}
    </AppPageShell>
  );
}
