"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestCleanGoLocation } from "@/lib/geo-location";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";
import PhotoReport from "@/components/PhotoReport";

type AssignedJob = { id: string; status: string; cleaningType: string; area: number; price: number | null; address: string; latitude: string | number | null; longitude: string | number | null; createdAt: string; clientFirstName: string | null; clientLastName: string | null; clientPhone: string | null; inspectionMethod?:"personal"|"photos" };

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
  const [sharingOrderId,setSharingOrderId]=useState<string|null>(null);
  const [photoFiles,setPhotoFiles]=useState<Record<string,string[]>>({});
  const [photoBusy,setPhotoBusy]=useState<string|null>(null);
  const [photoErrors,setPhotoErrors]=useState<Record<string,string>>({});
  const photoLock=useRef(false);
  const [travelMode,setTravelMode]=useState<"car"|"walking"|"transit">("car");
  const lastSent=useRef(0);
  const sendTripLocation=useCallback(async (orderId:string,coords:{latitude:number;longitude:number}|null)=>{
    if(!token)return;
    const response=await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/trip-location`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(coords??{latitude:null,longitude:null})});
    if(!response.ok)throw new Error("Не удалось обновить передачу геопозиции");
  },[token]);
  useEffect(()=>{
    if(!sharingOrderId)return;
    let stopped=false;
    let inFlight=false;
    lastSent.current=0;
    const update=async()=>{
      if(stopped || inFlight || document.visibilityState!=="visible")return;
      inFlight=true;
      try {
        const coords=await requestCleanGoLocation();
        if(stopped)return;
        if(Date.now()-lastSent.current<9000)return;
        await sendTripLocation(sharingOrderId,coords);
        if(!stopped){lastSent.current=Date.now();setError("");}
      }catch(err){
        if(!stopped)setError(err instanceof Error ? err.message : "Не удалось передать геопозицию");
      }finally{inFlight=false;}
    };
    void update();
    const timer=window.setInterval(()=>void update(),10000);
    const onVisible=()=>{if(document.visibilityState==="visible")void update();};
    document.addEventListener("visibilitychange",onVisible);
    return()=>{
      stopped=true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange",onVisible);
      void sendTripLocation(sharingOrderId,null).catch(()=>{});
    };
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


  async function preparePhotos(orderId:string,files:File[]) {
    if(!files.length||photoLock.current||busyId)return;
    const existing=photoFiles[orderId]??[];
    if(files.length>5-existing.length){
      setPhotoErrors(old=>({...old,[orderId]:`Можно добавить ещё не более ${5-existing.length} фото.`}));
      return;
    }
    photoLock.current=true;
    setPhotoBusy(orderId);
    setPhotoErrors(old=>({...old,[orderId]:""}));
    try{
      const results:string[]=[];
      for(const file of files){
        if((file.type&&!file.type.startsWith("image/"))||file.size>10*1024*1024)throw new Error("Выберите изображение размером до 10 МБ.");
        const img=await new Promise<HTMLImageElement>((resolve,reject)=>{
          const url=URL.createObjectURL(file);const image=new Image();
          image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
          image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Не удалось открыть фото. Попробуйте другой файл."));};
          image.src=url;
        });
        const canvas=document.createElement("canvas");const factor=Math.min(1,1280/Math.max(img.width,img.height));
        canvas.width=Math.max(1,Math.round(img.width*factor));canvas.height=Math.max(1,Math.round(img.height*factor));
        const context=canvas.getContext("2d");if(!context)throw new Error("Ошибка обработки фото");
        context.drawImage(img,0,0,canvas.width,canvas.height);
        let data=canvas.toDataURL("image/jpeg",0.75);
        for(const quality of [0.65,0.55,0.45,0.35]){
          if(data.length<=420000)break;
          data=canvas.toDataURL("image/jpeg",quality);
        }
        if(data.length>420000||!data.startsWith("data:image/jpeg;base64,"))throw new Error("Не удалось сжать фото. Выберите другое изображение.");
        results.push(data);
      }
      setPhotoFiles(old=>({...old,[orderId]:[...(old[orderId]??[]),...results].slice(0,5)}));
    }catch(error){setPhotoErrors(old=>({...old,[orderId]:error instanceof Error?error.message:"Не удалось подготовить фото"}));}
    finally{photoLock.current=false;setPhotoBusy(null);}
  }

  async function transition(orderId: string, action: "en-route" | "arrived" | "start" | "complete") {
    if (!token || busyId) return;
    if (action === "complete") {
      const job=jobs.find(item=>item.id===orderId);
      if(job?.inspectionMethod!=="personal" && (photoFiles[orderId]?.length??0)<3){setError("Клиент выбрал проверку по фото: загрузите 3–5 фотографий.");return;}
      if(!window.confirm("Отправить результат клиенту? Вы сможете уйти, не ожидая подтверждения в приложении."))return;
    }
    if(sharingOrderId===orderId)setSharingOrderId(null);
    setBusyId(orderId);
    setError("");
    setMessage("");
    try {
      let departure: {travelMode:string;latitude?:number;longitude?:number}|undefined;
      if(action==="en-route") {
        departure={travelMode};
        try {
          const coords=await requestCleanGoLocation();
          departure={...departure,latitude:coords.latitude,longitude:coords.longitude};
        } catch { setMessage("Не удалось получить свежую геопозицию. Попробуем последние сохранённые координаты."); }
      }
      const response = await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/${action}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, ...(departure||action==="complete"?{"Content-Type":"application/json"}:{}) },
        ...(departure?{body:JSON.stringify(departure)}:action==="complete"?{body:JSON.stringify({photos:photoFiles[orderId]??[]})}:{}),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.message === "string" ? body.message : "Не удалось обновить заказ");
      }
      if(action==="complete")setPhotoFiles(old=>{const next={...old};delete next[orderId];return next;});
      setMessage(({ "en-route":"Вы отметили, что направляетесь к клиенту.", arrived:"Прибытие подтверждено.", start:"Уборка начата.", complete:"Результат передан клиенту. Можно уходить: подтверждение он сделает в приложении." })[action]);
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
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-800">Клиент после принятия заказа</p>
            <p className="mt-1 text-sm font-semibold">{[job.clientFirstName,job.clientLastName].filter(Boolean).join(" ") || "Клиент CleanGo"}</p>
            {job.clientPhone&&<a href={`tel:${job.clientPhone}`} className="mt-1 inline-block text-sm font-medium text-teal-700">Позвонить клиенту</a>}
          </div>
          <p className="mt-2 text-sm font-medium text-teal-700">{({accepted:"Заказ принят",en_route:"Направляетесь к клиенту",arrived:"Вы прибыли",in_progress:"Уборка выполняется"} as Record<string,string>)[job.status] ?? job.status}</p>
          {job.status==="en_route"&&<button type="button" onClick={()=>{setError("");setSharingOrderId(current=>current===job.id?null:job.id);}} className="mt-3 w-full rounded-xl border border-teal-600 px-4 py-3 text-sm font-semibold text-teal-800">{sharingOrderId===job.id?"Остановить передачу геопозиции":"Поделиться геопозицией с клиентом"}</button>}
          {sharingOrderId===job.id&&<p className="mt-2 text-xs text-teal-700">Геопозиция передаётся только во время поездки, пока этот экран открыт. Можно отключить в любой момент.</p>}
          {job.status==="accepted"&&<label className="mt-3 block text-xs font-semibold text-slate-600">Как доберётесь до клиента?
            <select value={travelMode} onChange={event=>setTravelMode(event.target.value as "car"|"walking"|"transit")} className="mt-2 w-full rounded-xl border border-teal-200 bg-white px-3 py-3 text-sm text-slate-800">
              <option value="car">На автомобиле</option>
              <option value="walking">Пешком</option>
              <option value="transit">Общественный транспорт</option>
            </select>
          </label>}
          {job.status==="in_progress"&&<div className="mt-4 rounded-[22px] border border-[#E1EEE8] bg-white p-3.5">
            <p className="mb-3 text-xs font-semibold text-[#58796F]">{job.inspectionMethod==="personal"?"Личная проверка · фото необязательны":"Клиент проверит уборку по фотографиям"}</p>
            <PhotoReport photos={photoFiles[job.id]??[]} required={job.inspectionMethod!=="personal"}
              busy={photoBusy===job.id} disabled={busyId!==null||photoBusy!==null}
              onAdd={files=>void preparePhotos(job.id,files)}
              onRemove={index=>{
                if(photoLock.current||busyId)return;
                setPhotoFiles(old=>({...old,[job.id]:(old[job.id]??[]).filter((_,i)=>i!==index)}));
                setPhotoErrors(old=>({...old,[job.id]:""}));
              }}/>
            {photoErrors[job.id]&&<p className="mt-2 text-xs text-red-700" role="alert">{photoErrors[job.id]}</p>}
            <p className="mt-3 text-[11px] leading-4 text-[#81968D]">Снимайте результат уборки, не включайте в кадр людей и личные документы.</p>
          </div>}
          <button type="button" disabled={busyId !== null || photoBusy!==null || (job.status==="in_progress" && job.inspectionMethod!=="personal" && (photoFiles[job.id]?.length??0)<3)}
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
