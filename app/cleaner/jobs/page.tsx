"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

type AssignedJob = { id: string; status: string; cleaningType: string; area: number; price: number | null; address: string; latitude: string | number | null; longitude: string | number | null; createdAt: string; clientFirstName: string | null; clientLastName: string | null; clientPhone: string | null };

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
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [routeEstimate,setRouteEstimate]=useState<Record<string,{km:number;minutes:number}|null>>({});
  const [routeBusy,setRouteBusy]=useState<string|null>(null);
  const [sharingOrderId,setSharingOrderId]=useState<string|null>(null);
  const watchId=useRef<number|null>(null);
  const lastSent=useRef(0);
  const sendTripLocation=useCallback(async (orderId:string,coords:{latitude:number;longitude:number}|null)=>{
    if(!token)return;
    const response=await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/trip-location`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(coords??{latitude:null,longitude:null})});
    if(!response.ok)throw new Error("Не удалось обновить передачу геопозиции");
  },[token]);
  useEffect(()=>{
    if(!sharingOrderId)return;
    if(!navigator.geolocation){setError("Геолокация недоступна");setSharingOrderId(null);return;}
    watchId.current=navigator.geolocation.watchPosition(position=>{
      if(Date.now()-lastSent.current<10000)return;
      lastSent.current=Date.now();
      void sendTripLocation(sharingOrderId,{latitude:position.coords.latitude,longitude:position.coords.longitude}).catch(()=>setError("Не удалось отправить геопозицию"));
    },()=>{setError("Разрешите геолокацию для передачи местоположения");setSharingOrderId(null);},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    return()=>{if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current);watchId.current=null;void sendTripLocation(sharingOrderId,null).catch(()=>{});};
  },[sharingOrderId,sendTripLocation]);

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
      const jobsResponse = await fetch(`${API_URL}/orders/cleaner/jobs`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!jobsResponse.ok) throw new Error("Не удалось загрузить назначенные заказы");
      const assigned: unknown = await jobsResponse.json();
      if (!Array.isArray(assigned)) throw new Error("Некорректный список назначенных заказов");
      setJobs(assigned as AssignedJob[]);
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
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    const refreshOnReturn = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("pageshow", refreshOnReturn);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refreshOnReturn); window.removeEventListener("focus", refreshOnReturn); window.removeEventListener("pageshow", refreshOnReturn); };
  }, [load, token, user?.role]);

  async function calculateRoute(job:AssignedJob) {
    if(routeBusy)return;
    const destinationLat=Number(job.latitude);
    const destinationLon=Number(job.longitude);
    if(job.latitude==null || job.longitude==null || !Number.isFinite(destinationLat) || !Number.isFinite(destinationLon)){
      setError("Для расчёта маршрута нужны точные координаты адреса.");return;
    }
    if(!navigator.geolocation){setError("Геолокация недоступна в этом браузере. Откройте маршрут в навигаторе.");return;}
    setRouteBusy(job.id);setError("");
    const getPosition=(highAccuracy:boolean,timeout:number,maximumAge:number)=>new Promise<GeolocationPosition>((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:highAccuracy,timeout,maximumAge});
    });
    try {
      let position:GeolocationPosition;
      try {
        // Cached fixes avoid needless GPS warm-up when returning to Telegram.
        position=await getPosition(false,12000,120000);
      }catch(firstError){
        const error=firstError as GeolocationPositionError;
        if(error.code===1)throw new Error("Доступ к геопозиции запрещён. Разрешите его в настройках Telegram или браузера.");
        try {
          position=await getPosition(true,20000,300000);
        }catch(secondError){
          const fallback=secondError as GeolocationPositionError;
          if(fallback.code===1)throw new Error("Доступ к геопозиции запрещён. Проверьте разрешения Telegram и телефона.");
          if(fallback.code===3)throw new Error("Не удалось получить координаты вовремя. Проверьте GPS и интернет, затем повторите попытку.");
          throw new Error("Не удалось определить геопозицию. Попробуйте открыть маршрут в навигаторе.");
        }
      }
      // Coordinates are sent to a third-party router only after pressing this button.
      const url=`https://router.project-osrm.org/route/v1/driving/${position.coords.longitude},${position.coords.latitude};${destinationLon},${destinationLat}?overview=false`;
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error("Сервис расчёта маршрутов временно недоступен. Откройте Google Maps.");
      const data=await response.json() as {routes?:{distance:number;duration:number}[]};
      const route=data.routes?.[0];
      if(!route)throw new Error("Не удалось построить маршрут по дорогам. Проверьте адрес в навигаторе.");
      setRouteEstimate(current=>({...current,[job.id]:{km:Math.round(route.distance/100)/10,minutes:Math.max(1,Math.ceil(route.duration/60))}}));
    }catch(e){setError(e instanceof Error?e.message:"Ошибка расчёта маршрута");}
    finally{setRouteBusy(null);}
  }

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

  async function transition(orderId: string, action: "en-route" | "arrived" | "start" | "complete") {
    if (!token || busyId) return;
    if (action === "complete" && !window.confirm("Подтвердить завершение уборки?")) return;
    if(sharingOrderId===orderId)setSharingOrderId(null);
    setBusyId(orderId);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/${action}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.message === "string" ? body.message : "Не удалось обновить заказ");
      }
      setMessage(({ "en-route":"Вы отметили, что направляетесь к клиенту.", arrived:"Прибытие подтверждено.", start:"Уборка начата.", complete:"Уборка завершена. Вы снова можете получать предложения, если смена и GPS актуальны." })[action]);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка соединения"); }
    finally { setBusyId(null); }
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
      {!loading && user?.role === "cleaner" && user.phoneVerifiedAt && offers.length === 0 && jobs.length === 0 && !error && (
        <AppCard className="py-8 text-center">
          <h2 className="text-lg font-bold">Пока нет предложений</h2>
          <p className="mt-2 text-sm text-slate-500">Новые предложения появятся здесь автоматически. Обновление каждые 5 секунд, пока приложение открыто.</p>
        </AppCard>
      )}
      {jobs.length > 0 && <section className="mb-6 space-y-3">
        <h2 className="text-lg font-bold">Мои текущие уборки</h2>
        {jobs.map(job => <AppCard key={job.id}>
          <p className="text-sm font-semibold">{typeLabels[job.cleaningType] ?? job.cleaningType}</p>
          <p className="mt-2 text-sm text-slate-600">{job.area} м² · {job.address}</p>
          <div className="mt-3 rounded-2xl border border-teal-100 bg-teal-50 p-3">
            <p className="text-sm font-semibold text-teal-900">Адрес уборки на карте</p>
            <p className="mt-1 text-xs text-teal-800">Маршрут откроется в навигаторе от вашего текущего местоположения.</p>
            <a href={job.latitude != null && job.longitude != null && Number.isFinite(Number(job.latitude)) && Number.isFinite(Number(job.longitude)) ? `https://www.google.com/maps/dir/?api=1&destination=${Number(job.latitude)},${Number(job.longitude)}&travelmode=driving` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-bold text-white">Открыть маршрут на карте</a>
            <button type="button" disabled={routeBusy!==null} onClick={()=>void calculateRoute(job)} className="mt-2 w-full rounded-xl border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-800 disabled:opacity-50">{routeBusy===job.id?"Рассчитываем маршрут…":"Рассчитать расстояние и время"}</button>
            {routeEstimate[job.id]&&<p className="mt-2 text-sm font-bold text-teal-900">По дорогам: {routeEstimate[job.id]?.km} км · примерно {routeEstimate[job.id]?.minutes} мин</p>}
            <p className="mt-2 text-[11px] text-teal-700">Расчёт приблизительный, без учёта пробок. При нажатии координаты передаются внешнему сервису маршрутов OSRM. Проверьте маршрут в навигаторе перед поездкой.</p>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-800">Клиент после принятия заказа</p>
            <p className="mt-1 text-sm font-semibold">{[job.clientFirstName,job.clientLastName].filter(Boolean).join(" ") || "Клиент CleanGo"}</p>
            {job.clientPhone&&<a href={`tel:${job.clientPhone}`} className="mt-1 inline-block text-sm font-medium text-teal-700">Позвонить клиенту</a>}
          </div>
          <p className="mt-2 text-sm font-medium text-teal-700">{({accepted:"Заказ принят",en_route:"Направляетесь к клиенту",arrived:"Вы прибыли",in_progress:"Уборка выполняется"} as Record<string,string>)[job.status] ?? job.status}</p>
          {job.status==="en_route"&&<button type="button" onClick={()=>{setError("");setSharingOrderId(current=>current===job.id?null:job.id);}} className="mt-3 w-full rounded-xl border border-teal-600 px-4 py-3 text-sm font-semibold text-teal-800">{sharingOrderId===job.id?"Остановить передачу геопозиции":"Поделиться геопозицией с клиентом"}</button>}
          {sharingOrderId===job.id&&<p className="mt-2 text-xs text-teal-700">Геопозиция передаётся только во время поездки, пока этот экран открыт. Можно отключить в любой момент.</p>}
          <button type="button" disabled={busyId !== null}
            onClick={() => void transition(job.id, job.status === "accepted" ? "en-route" : job.status === "en_route" ? "arrived" : job.status === "arrived" ? "start" : "complete")}
            className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {({accepted:"Я выехал к клиенту",en_route:"Я прибыл",arrived:"Начать уборку",in_progress:"Завершить уборку"} as Record<string,string>)[job.status] ?? "Обновить статус"}
          </button>
        </AppCard>)}
      </section>}
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
