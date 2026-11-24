"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestCleanGoLocation } from "@/lib/geo-location";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";
import { CounterpartAvatar } from "@/components/ProfileAvatar";
import ServiceImage from "@/components/ServiceImage";
import { OrderSkeleton, RefreshButton } from "@/components/ui/order-loading";
import CleanerHistory from "@/components/CleanerHistory";
import PhotoReport from "@/components/PhotoReport";
import { MapPin, Phone, ChevronRight, CalendarDays, ArrowLeft, RefreshCw, Camera } from "lucide-react";

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
  const [selectedJobId,setSelectedJobId]=useState<string|null>(null);
  const [tab,setTab]=useState<"offers"|"jobs"|"history">("offers");
  const [loading, setLoading] = useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [motionKey,setMotionKey]=useState(0);
  const loadVersion=useRef(0);
  const refreshLock=useRef(false);
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

  const load = useCallback(async (manual=false) => {
    if(!manual&&refreshLock.current)return;
    const version=++loadVersion.current;
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
      if(version!==loadVersion.current)return;
      setOffers(result as Offer[]);
      const jobsResponse = await fetch(`${API_URL}/orders/cleaner/jobs`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!jobsResponse.ok) throw new Error("Не удалось загрузить назначенные заказы");
      const assigned: unknown = await jobsResponse.json();
      if (!Array.isArray(assigned)) throw new Error("Некорректный список назначенных заказов");
      if(version!==loadVersion.current)return;
      setJobs(assigned as AssignedJob[]);
      setError("");
    } catch (err) {
      if(version===loadVersion.current)setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      if(version===loadVersion.current)setLoading(false);
    }
  }, [token, user?.role, user?.phoneVerifiedAt]);

  async function refresh(){
    if(refreshLock.current)return;
    refreshLock.current=true;setRefreshing(true);
    try{await load(true);setMotionKey(v=>v+1);}finally{refreshLock.current=false;setRefreshing(false);}
  }

  useEffect(() => {
    void load();
    if (!token || user?.role !== "cleaner") return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    const refreshOnReturn = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("pageshow", refreshOnReturn);
    return () => { loadVersion.current++;clearInterval(timer); document.removeEventListener("visibilitychange", refreshOnReturn); window.removeEventListener("focus", refreshOnReturn); window.removeEventListener("pageshow", refreshOnReturn); };
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
      if(action==="accept")setTab("jobs");
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
      if(action==="complete"){setPhotoFiles(old=>{const next={...old};delete next[orderId];return next;});setSelectedJobId(null);setTab("history");}
      setMessage(({ "en-route":"Вы отметили, что направляетесь к клиенту.", arrived:"Прибытие подтверждено.", start:"Уборка начата.", complete:"Результат передан клиенту. Можно уходить: подтверждение он сделает в приложении." })[action]);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка соединения"); }
    finally { setBusyId(null); }
  }

  const selectedJob=jobs.find(job=>job.id===selectedJobId);
  return (
    <AppPageShell role="cleaner" eyebrow="Для исполнителя" title={selectedJob?"Детали заказа":"Заказы"} detailHeader={selectedJob?<div className="flex items-center justify-between gap-2"><button type="button" aria-label="К заказам" onClick={()=>{setSelectedJobId(null);setTab("jobs");}} className="cg-icon-button"><ArrowLeft size={20}/></button><h1 className="min-w-0 truncate text-sm font-bold">Заказ №{selectedJob.id.slice(0,8).toUpperCase()}</h1><button type="button" aria-label="Обновить заказ" aria-busy={refreshing} disabled={refreshing} onClick={()=>void refresh()} className="cg-icon-button cg-press disabled:opacity-60"><RefreshCw size={17} className={refreshing?"cg-loading-spin":""}/></button></div>:undefined} footer={selectedJob?<button type="button" disabled={busyId !== null || photoBusy!==null || (selectedJob.status==="in_progress" && selectedJob.inspectionMethod!=="personal" && (photoFiles[selectedJob.id]?.length??0)<3)}
            onClick={() => void transition(selectedJob.id, selectedJob.status === "accepted" ? "en-route" : selectedJob.status === "en_route" ? "arrived" : selectedJob.status === "arrived" ? "start" : "complete")}
            className="cg-primary min-h-12 w-full rounded-[13px] px-4 py-3.5 text-sm font-semibold disabled:opacity-50">
            {({accepted:"Я выехал к клиенту",en_route:"Я прибыл",arrived:"Начать уборку",in_progress:"Завершить уборку"} as Record<string,string>)[selectedJob.status] ?? "Обновить статус"}
          </button>:undefined}>
      {status === "authenticated" && user?.role !== "cleaner" && (
        <AppCard><p className="text-sm">Этот раздел доступен только клинерам.</p></AppCard>
      )}
      {user?.role === "cleaner" && !user.phoneVerifiedAt && (
        <AppCard><p className="text-sm">Для получения предложений подтвердите номер телефона в профиле.</p></AppCard>
      )}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {loading&&tab!=="history"&&user?.role==="cleaner"&&user.phoneVerifiedAt&&<OrderSkeleton label="Загружаем заказы…"/>}
      {!selectedJob&&<div className="flex gap-2" role="group" aria-label="Раздел заявок">
        <button type="button" aria-pressed={tab==="offers"} onClick={()=>setTab("offers")} className={`cg-press flex-1 rounded-[11px] px-3 py-2.5 text-xs font-semibold ${tab==="offers"?"cg-primary":"bg-[#EDEEEB] text-[#51595A]"}`}>Доступные · {offers.length}</button>
        <button type="button" aria-pressed={tab==="jobs"} onClick={()=>setTab("jobs")} className={`cg-press flex-1 rounded-[11px] px-3 py-2.5 text-xs font-semibold ${tab==="jobs"?"cg-primary":"bg-[#EDEEEB] text-[#51595A]"}`}>Мои заказы · {jobs.length}</button>
        <button type="button" aria-pressed={tab==="history"} onClick={()=>setTab("history")} className={`cg-press flex-1 rounded-[11px] px-2 py-2.5 text-xs font-semibold ${tab==="history"?"cg-primary":"bg-[#EDEEEB] text-[#51595A]"}`}>История</button>
      </div>}
      {!selectedJob&&tab==="history"&&<CleanerHistory/>}
      {!loading && !selectedJob && user?.role === "cleaner" && user.phoneVerifiedAt && tab!=="history" && (tab==="offers"?offers.length===0:jobs.length===0) && !error && (
        <AppCard className="py-8 text-center">
          <h2 className="text-lg font-bold">{tab==="offers"?"Пока нет предложений":"Нет текущих заказов"}</h2>
          <p className="mt-2 text-sm text-slate-500">{tab==="offers"?"Новые предложения появятся автоматически.":"Принятые заказы появятся здесь."}</p>
        </AppCard>
      )}
      {!loading&&!selectedJob&&tab==="jobs"&&jobs.length>0&&<section key={motionKey} className="cg-order-enter space-y-2.5">
        {jobs.map(job=><button key={job.id} type="button" onClick={()=>setSelectedJobId(job.id)} className="cg-card cg-order-card cg-press flex w-full items-center gap-3 p-2.5 text-left">
          <ServiceImage type={job.cleaningType} className="h-[100px] w-[28%] shrink-0 rounded-[10px]" sizes="(max-width: 520px) 28vw, 140px" illustrative/>
          <div className="min-w-0 flex-1"><span className="cg-soft rounded-full px-2 py-1 text-[10px] font-semibold">{({accepted:"Принят",en_route:"В пути",arrived:"Прибыл",in_progress:"В работе"} as Record<string,string>)[job.status]??job.status}</span><p className="mt-2 text-lg font-bold">{job.price==null?"Цена уточняется":`${Number(job.price).toLocaleString("ru-RU")} ₸`}</p><p className="text-xs font-medium">{typeLabels[job.cleaningType]??job.cleaningType} · {job.area} м²</p><p className="mt-1 flex items-start gap-1 text-[11px] cg-muted"><MapPin size={13} className="shrink-0"/><span className="line-clamp-2">{job.address}</span></p></div><ChevronRight size={16} className="shrink-0 text-[#929A96]"/>
        </button>)}
      </section>}
      {selectedJob&&<section className="cg-order-enter space-y-3">
        {[selectedJob].map(job => <div key={job.id} className="space-y-3">
          <AppCard className="!p-2.5">
            <div className="relative aspect-[2.65/1] rounded-[12px]"><ServiceImage type={job.cleaningType} className="h-full w-full rounded-[12px]" sizes="(max-width: 520px) 90vw, 470px" illustrative/><span className="cg-soft absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold">{({accepted:"Заказ принят",en_route:"В пути",arrived:"Прибыл",in_progress:"В работе"} as Record<string,string>)[job.status]??job.status}</span></div>
            <div className="px-1 pb-1 pt-2.5"><p className="text-[25px] font-bold tracking-tight">{job.price==null?"Цена уточняется":`${Number(job.price).toLocaleString("ru-RU")} ₸`}</p><p className="mt-1 text-sm font-medium">{typeLabels[job.cleaningType]??job.cleaningType} · {job.area} м²</p><p className="mt-1 flex items-start gap-1.5 text-xs cg-muted"><MapPin size={14} className="shrink-0"/>{job.address}</p></div>
          </AppCard>
          <AppCard className="flex items-center gap-3">
            <CounterpartAvatar orderId={job.id} name={[job.clientFirstName,job.clientLastName].filter(Boolean).join(" ")} enabled={["accepted","en_route","arrived","in_progress"].includes(job.status)} className="h-11 w-11 text-sm"/>
            <div className="min-w-0 flex-1"><p className="text-[11px] cg-muted">Клиент</p><p className="mt-0.5 truncate text-sm font-bold">{[job.clientFirstName,job.clientLastName].filter(Boolean).join(" ")||"Клиент CleanGo"}</p></div>
            {job.clientPhone&&<a href={`tel:${job.clientPhone}`} aria-label="Позвонить клиенту" className="cg-soft grid h-11 w-11 place-items-center rounded-full"><Phone size={19}/></a>}
          </AppCard>
          <AppCard className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">Маршрут</h3><p className="mt-1 text-xs leading-5 cg-muted">{job.address}</p><a href={job.latitude!=null&&job.longitude!=null&&Number.isFinite(Number(job.latitude))&&Number.isFinite(Number(job.longitude))?`https://www.google.com/maps/dir/?api=1&destination=${Number(job.latitude)},${Number(job.longitude)}&travelmode=driving`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#137D79]">Открыть на карте <ChevronRight size={14}/></a></div>
            <div className="cg-placeholder grid h-[65px] w-[88px] shrink-0 place-items-center rounded-xl"><MapPin size={23} strokeWidth={1.5}/></div>
          </AppCard>
          {job.status==="en_route"&&<button type="button" onClick={()=>{setError("");setSharingOrderId(current=>current===job.id?null:job.id);}} className="w-full rounded-xl border border-[#C8DAD7] bg-white px-4 py-3 text-xs font-semibold text-[#137D79]">{sharingOrderId===job.id?"Остановить передачу геопозиции":"Поделиться геопозицией с клиентом"}</button>}
          {sharingOrderId===job.id&&<p className="mt-2 text-xs text-teal-700">Геопозиция передаётся только во время поездки, пока этот экран открыт. Можно отключить в любой момент.</p>}
          {job.status==="accepted"&&<label className="mt-3 block text-xs font-semibold text-slate-600">Как доберётесь до клиента?
            <select value={travelMode} onChange={event=>setTravelMode(event.target.value as "car"|"walking"|"transit")} className="cg-field mt-2 w-full px-3 py-3 text-sm text-[#15191D]">
              <option value="car">На автомобиле</option>
              <option value="walking">Пешком</option>
              <option value="transit">Общественный транспорт</option>
            </select>
          </label>}
          {job.status==="in_progress"&&<><AppCard className="flex items-center gap-3"><div className="cg-soft grid h-10 w-10 shrink-0 place-items-center rounded-full"><Camera size={19}/></div><div><p className="text-sm font-semibold">{job.inspectionMethod==="personal"?"Личная проверка":"Проверка по фотографиям"}</p><p className="mt-1 text-xs cg-muted">{job.inspectionMethod==="personal"?"Фотографии по желанию":"Сделайте 3–5 снимков результата"}</p></div></AppCard><AppCard>
            <PhotoReport photos={photoFiles[job.id]??[]} required={job.inspectionMethod!=="personal"}
              busy={photoBusy===job.id} disabled={busyId!==null||photoBusy!==null}
              onAdd={files=>void preparePhotos(job.id,files)}
              onRemove={index=>{
                if(photoLock.current||busyId)return;
                setPhotoFiles(old=>({...old,[job.id]:(old[job.id]??[]).filter((_,i)=>i!==index)}));
                setPhotoErrors(old=>({...old,[job.id]:""}));
              }}/>
            {photoErrors[job.id]&&<p className="mt-2 text-xs text-red-700" role="alert">{photoErrors[job.id]}</p>}
            <p className="mt-2 text-[11px] leading-4 cg-muted">Снимайте результат уборки, не включайте в кадр людей и личные документы.</p>
          </AppCard></>}
        </div>)}
      </section>}
      {!loading&&!selectedJob&&tab==="offers"&&<div key={motionKey} className="cg-order-enter space-y-3">
        {offers.map(offer => {
          const expired = new Date(offer.expiresAt).getTime() <= Date.now();
          return (
            <AppCard key={offer.offerId} className="!p-2.5">
              <div className="flex gap-3"><ServiceImage type={offer.cleaningType} className="min-h-[106px] w-[30%] shrink-0 rounded-[11px]" sizes="(max-width: 520px) 30vw, 150px" illustrative/><div className="min-w-0 flex-1 py-1"><span className="cg-soft rounded-full px-2 py-1 text-[10px] font-semibold">{expired?"Истекло":"Новый заказ"}</span><p className="mt-2 text-[19px] font-bold">{Number(offer.price).toLocaleString("ru-RU")} ₸</p><h2 className="mt-1 text-xs font-semibold">{typeLabels[offer.cleaningType]??offer.cleaningType} · {offer.area} м²</h2><p className="mt-1.5 flex items-start gap-1 text-[11px] cg-muted"><MapPin size={13} className="shrink-0"/>{offer.approximateArea||"Район уточняется"}</p><p className="mt-1 flex items-center gap-1 text-[11px] cg-muted"><CalendarDays size={13}/> До {new Date(offer.expiresAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</p></div></div>
              <div className="mt-4 flex gap-2">
                <button type="button" disabled={expired || busyId !== null} onClick={() => void respond(offer.orderId, "accept")}
                  className="cg-primary flex-1 rounded-[10px] px-3 py-2.5 text-xs font-semibold disabled:opacity-50">Принять</button>
                <button type="button" disabled={expired || busyId !== null} onClick={() => void respond(offer.orderId, "decline")}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Отказаться</button>
              </div>
            </AppCard>
          );
        })}
      </div>}
      {!selectedJob&&tab!=="history"&&user?.role === "cleaner" && user.phoneVerifiedAt && (
        <RefreshButton busy={refreshing} disabled={loading||!!busyId} label={tab==="jobs"?"Обновить заказы":"Обновить предложения"} onClick={()=>void refresh()}/>
      )}
    </AppPageShell>
  );
}
