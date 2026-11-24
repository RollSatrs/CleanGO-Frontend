"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Sparkles, Star, ChevronDown, Phone, CalendarDays, Camera, BrushCleaning, Navigation, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { CounterpartAvatar } from "@/components/ProfileAvatar";
import ServiceImage from "@/components/ServiceImage";
import PhotoReport from "@/components/PhotoReport";

type Order = {
  id: string; status: string; address: string; area: number;
  cleaningType: "regular" | "general" | "renovation";
  price: number | null; latitude?: string | number | null; longitude?: string | number | null;
  inspectionMethod?: "personal"|"photos"; completionPhotos?: string[]|null;
  completionSubmittedAt?: string|null; rating?:number|null; createdAt?:string;
};
const names = { regular: "Поддерживающая уборка", general: "Генеральная уборка", renovation: "После ремонта" };
const terminal = new Set(["completed", "cancelled", "unassigned", "expired", "failed", "no_cleaner", "disputed"]);
const style = "https://tiles.openfreemap.org/styles/liberty";
const cdn = "https://unpkg.com/maplibre-gl@5.9.0/dist/";
type MapInstance = { on(event:string,cb:()=>void):void; getStyle():{layers?:{id:string;type:string}[]}; setPaintProperty(id:string,property:string,value:string):void; remove():void };
type MapLibrary = NonNullable<Window["maplibregl"]>;
let loadingLibrary: Promise<MapLibrary> | null = null;
function loadLibrary(): Promise<MapLibrary> {
  if (loadingLibrary) return loadingLibrary;
  loadingLibrary = (async () => {
    let css = document.getElementById("cleango-maplibre-css") as HTMLLinkElement | null;
    if (!css) {
      css = document.createElement("link");
      css.id = "cleango-maplibre-css";
      css.rel = "stylesheet";
      css.href = cdn + "maplibre-gl.css";
      document.head.appendChild(css);
    }
    if (!css.sheet) {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Не загрузились стили карты")), 12000);
        css!.addEventListener("load", () => { window.clearTimeout(timer); resolve(); }, { once: true });
        css!.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("Стили карты недоступны")); }, { once: true });
        if (css!.sheet) { window.clearTimeout(timer); resolve(); }
      });
    }
    if (window.maplibregl?.Map) return window.maplibregl;
    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("cleango-maplibre-script") as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("MapLibre недоступен")), { once: true });
        if (window.maplibregl?.Map) resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = "cleango-maplibre-script";
      script.src = cdn + "maplibre-gl.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Не удалось загрузить карту"));
      document.head.appendChild(script);
    });
    if (!window.maplibregl?.Map) throw new Error("MapLibre не загрузился");
    return window.maplibregl;
  })().catch(error => { loadingLibrary = null; throw error; });
  return loadingLibrary;
}

export default function OrderTracking({ initialOrder, latitude, longitude }: {
  initialOrder: Order; latitude: number; longitude: number;
}) {
  const {token}=useAuth();
  const [order,setOrder]=useState(initialOrder);
  const [completionBusy,setCompletionBusy]=useState(false);
  const inspectionSavingRef=useRef(false);
  const [inspectionSaving,setInspectionSaving]=useState(false);
  const [completionError,setCompletionError]=useState("");
  const [rating,setRating]=useState(0);
  const [reviewText,setReviewText]=useState("");
  const [reviewDone,setReviewDone]=useState(false);
  const [reputation,setReputation]=useState<{completedOrders:number;reviewCount:number;rating:number|null;reviews:{rating:number|null;reviewText:string|null}[]}|null>(null);
  const [reputationOpen,setReputationOpen]=useState(false);
  const [networkError,setNetworkError]=useState(false);
  const [progress,setProgress]=useState<{sent:number;awaiting:number;declined:number;cleaner:{name:string;phone:string|null}|null;tripLocation?:{latitude:number;longitude:number}|null;travelMode?:string|null;etaMinutes?:number|null;etaCalculatedAt?:string|null}|null>(null);
  const [arrivalEstimate,setArrivalEstimate]=useState<{km:number;minutes:number}|null>(null);
  const [arrivalBusy,setArrivalBusy]=useState(false);
  const [mapError,setMapError]=useState("");
  const [progressError,setProgressError]=useState(false);
  const [mapReady,setMapReady]=useState(false);
  const [sheetPosition,setSheetPosition]=useState<"collapsed"|"normal"|"expanded">("normal");
  const skipHandleClick=useRef(false);
  const gestureStart=useRef<{y:number;position:"collapsed"|"normal"|"expanded"}|null>(null);
  const expanded=sheetPosition==="expanded";
  const mapPhase=["pending","accepted","en_route"].includes(order.status);
  const hasCoordinates=Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
  const immersive=mapPhase&&hasCoordinates;
  const collapsed=immersive&&sheetPosition==="collapsed";
  const [detailMapOpen,setDetailMapOpen]=useState(false);
  const detailMapRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{if(!immersive&&detailMapOpen)detailMapRef.current?.scrollIntoView({block:"nearest",behavior:"smooth"});},[immersive,detailMapOpen]);
  const handleSheetStart=(event:React.PointerEvent<HTMLButtonElement>)=>{
    if(event.pointerType==="mouse"&&event.button!==0)return;
    gestureStart.current={y:event.clientY,position:sheetPosition};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleSheetEnd=(event:React.PointerEvent<HTMLButtonElement>)=>{
    const start=gestureStart.current;
    gestureStart.current=null;
    if(!start)return;
    const delta=event.clientY-start.y;
    if(Math.abs(delta)<35)return;
    skipHandleClick.current=true;
    const positions=["collapsed","normal","expanded"] as const;
    const index=positions.indexOf(start.position);
    setSheetPosition(positions[Math.max(0,Math.min(2,index+(delta<0?1:-1)))]);
  };
  const [statsExpanded,setStatsExpanded]=useState(false);
  const [mapNode,setMapNode]=useState<HTMLDivElement|null>(null);
  const mapReadyRef=useRef(false);
  const liveMapRef=useRef<InstanceType<MapLibrary["Map"]>|null>(null);
  const cleanerMarkerRef=useRef<{ remove():void; setLngLat(point:[number,number]):void }|null>(null);
  const isPending=order.status==="pending";
  const isAccepted=["accepted","en_route","arrived","in_progress","pending_confirmation","completed","disputed"].includes(order.status);

  useEffect(()=>{
    if(!token || terminal.has(order.status))return;
    let active=true;
    const refresh=async()=>{
      try {
        const response=await fetch(`/api/backend/orders/${encodeURIComponent(initialOrder.id)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        if(!response.ok)throw new Error("Request failed");
        const current:Order=await response.json();
        if(active){if(current&&!inspectionSavingRef.current)setOrder(current);setNetworkError(false);}
      } catch {if(active)setNetworkError(true);}
    };
    void refresh();
    const interval=window.setInterval(()=>void refresh(),order.status==="pending_confirmation"?30000:5000);
    return()=>{active=false;window.clearInterval(interval);};
  },[token,initialOrder.id,order.status]);

  useEffect(()=>{
    if(!token)return;
    let active=true;
    const refresh=async()=>{
      try {
        const response=await fetch(`/api/backend/orders/${encodeURIComponent(initialOrder.id)}/progress`,{
          headers:{Authorization:`Bearer ${token}`},cache:"no-store"
        });
        if(!response.ok)throw new Error("Progress unavailable");
        const data=await response.json();
        if(active){setProgress(data);setProgressError(false);}
      }catch{if(active)setProgressError(true);/* Keep last confirmed progress. */}
    };
    void refresh();
    if(!["pending","accepted","en_route","arrived","in_progress"].includes(order.status))return()=>{active=false;};
    const timer=window.setInterval(()=>void refresh(),5000);
    return()=>{active=false;window.clearInterval(timer);};
  },[token,initialOrder.id,order.status]);

  useEffect(()=>{
    if(!mapNode || !Number.isFinite(latitude) || !Number.isFinite(longitude))return;
    let disposed=false;
    setMapReady(false);
    mapReadyRef.current=false;
    setMapError("");
    const timeout=window.setTimeout(()=>{if(!disposed&&!mapReadyRef.current)setMapError("Карта загружается слишком долго. Проверьте интернет и откройте экран снова.");},16000);
    let map:InstanceType<MapLibrary["Map"]>|null=null;
    void loadLibrary().then(lib=>{
      if(disposed)return;
      map=new lib.Map({container:mapNode,style,center:[longitude,latitude],zoom:15,attributionControl:false,dragRotate:false,pitchWithRotate:false,touchPitch:false});
      liveMapRef.current=map;
      const el=document.createElement("div");
      el.style.cssText="width:22px;height:22px;border-radius:50%;background:#009B8F;border:5px solid white;box-shadow:0 0 0 12px #009B8F24,0 4px 15px #004E4855";
      new lib.Marker({element:el,anchor:"center"}).setLngLat([longitude,latitude]).addTo(map);
      map.on("idle",()=>{if(!disposed&&map&&map.queryRenderedFeatures().length>0){mapReadyRef.current=true;setMapReady(true);setMapError("");window.clearTimeout(timeout);}});
      map.on("error",()=>{if(!disposed&&!mapReadyRef.current)setMapError("Не удалось загрузить картографические данные.");});
      window.setTimeout(()=>{if(!disposed)map?.resize();},350);
      // Keep the exact vector style used by the working address picker.
      // Do not mutate its layers during initial tile loading.
      map.on("load",()=>{if(!disposed){mapReadyRef.current=true;setMapReady(true);setMapError("");window.clearTimeout(timeout);map?.resize();}});

    }).catch(error=>{if(!disposed)setMapError(error instanceof Error?error.message:"Не удалось загрузить карту");});
    return()=>{disposed=true;window.clearTimeout(timeout);cleanerMarkerRef.current?.remove();cleanerMarkerRef.current=null;liveMapRef.current=null;map?.remove();};
  },[latitude,longitude,mapNode]);

  useEffect(()=>{
    const map=liveMapRef.current;
    if(!map || !mapReady)return;
    const coords=order.status==="en_route"?progress?.tripLocation:null;
    if(!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)){
      cleanerMarkerRef.current?.remove();cleanerMarkerRef.current=null;return;
    }
    if(cleanerMarkerRef.current){cleanerMarkerRef.current.setLngLat([coords.longitude,coords.latitude]);return;}
    const lib=window.maplibregl;
    if(!lib)return;
    const marker=document.createElement("div");
    marker.style.cssText="height:30px;width:30px;border-radius:50%;background:#152535;border:4px solid white;box-shadow:0 2px 12px #15253566;display:grid;place-items:center;color:white;font-size:15px";
    marker.textContent="●";
    cleanerMarkerRef.current=new lib.Marker({element:marker,anchor:"center"}).setLngLat([coords.longitude,coords.latitude]).addTo(map);
  },[progress?.tripLocation?.latitude,progress?.tripLocation?.longitude,order.status,mapReady]);

  const calculateArrival=async()=>{
    const coords=progress?.tripLocation;
    if(!coords || arrivalBusy)return;
    setArrivalBusy(true);
    try {
      const url=`https://router.project-osrm.org/route/v1/driving/${coords.longitude},${coords.latitude};${longitude},${latitude}?overview=false`;
      const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error("Routing unavailable");
      const data=await response.json() as {routes?:{distance:number;duration:number}[]};
      const route=data.routes?.[0];
      if(!route)throw new Error("No route");
      setArrivalEstimate({km:Math.round(route.distance/100)/10,minutes:Math.max(1,Math.ceil(route.duration/60))});
    }catch{setArrivalEstimate(null);}
    finally{setArrivalBusy(false);}
  };
  useEffect(()=>{setArrivalEstimate(null);},[progress?.tripLocation?.latitude,progress?.tripLocation?.longitude]);


  async function selectInspection(method:"personal"|"photos") {
    if(!token || inspectionSavingRef.current || order.inspectionMethod===method)return;
    const previous=order.inspectionMethod;
    inspectionSavingRef.current=true;
    setInspectionSaving(true);
    setCompletionError("");
    setOrder(current=>({...current,inspectionMethod:method}));
    try {
      const response=await fetch(`/api/backend/orders/${encodeURIComponent(order.id)}/inspection`,{
        method:"PATCH",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({method}),
      });
      if(!response.ok){
        const detail=await response.json().catch(()=>null);
        throw new Error(typeof detail?.message==="string"?detail.message:"Не удалось сохранить способ проверки");
      }
      const result=await response.json() as {inspectionMethod?:"personal"|"photos"};
      setOrder(current=>({...current,inspectionMethod:result.inspectionMethod??method}));
    }catch(error){
      setOrder(current=>({...current,inspectionMethod:previous}));
      setCompletionError(error instanceof Error?error.message:"Не удалось сохранить выбор");
    }finally{
      inspectionSavingRef.current=false;
      setInspectionSaving(false);
    }
  }
  useEffect(()=>{
    if(!token || !progress?.cleaner || !isAccepted)return;
    let active=true;
    void fetch(`/api/backend/orders/${encodeURIComponent(order.id)}/cleaner-reputation`,{
      headers:{Authorization:`Bearer ${token}`},cache:"no-store",
    }).then(async response=>{
      if(!response.ok)throw new Error("rating unavailable");
      const result=await response.json();
      if(active)setReputation(result);
    }).catch(()=>{});
    return ()=>{active=false;};
  },[token,order.id,progress?.cleaner?.name,isAccepted]);
  async function orderAction(path:string, body?:object) {
    if(!token||completionBusy)return;
    setCompletionBusy(true);setCompletionError("");
    try{
      const response=await fetch(`/api/backend/orders/${encodeURIComponent(order.id)}/${path}`,{
        method:path==="review"?"POST":"PATCH",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify(body??{}),
      });
      if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(typeof error?.message==="string"?error.message:"Не удалось сохранить действие");}
      if(path==="review"){setReviewDone(true);}else{
        const refreshed=await fetch(`/api/backend/orders/${encodeURIComponent(order.id)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        if(refreshed.ok)setOrder(await refreshed.json() as Order);
      }
    }catch(error){setCompletionError(error instanceof Error?error.message:"Ошибка соединения");}
    finally{setCompletionBusy(false);}
  }
  const title=isPending?"Ищем клинера":order.status==="en_route"?"Клинер направляется к вам":order.status==="arrived"?"Клинер прибыл":order.status==="in_progress"?"Уборка выполняется":order.status==="pending_confirmation"?"Подтвердите уборку":order.status==="disputed"?"Обращение в поддержку":order.status==="completed"?"Уборка завершена":isAccepted?"Клинер найден":order.status==="cancelled"?"Заказ отменён":order.status==="unassigned"?"Клинер не найден":"Поиск завершён";
  const searchStage=isPending?(progress===null?"Подбираем исполнителей":progress.awaiting>0?"Ожидаем подтверждения клинера":progress.sent>0?"Продолжаем поиск исполнителя":"Подбираем исполнителей"):"";
  const subtitle=isPending?"Подбираем исполнителя и ожидаем ответа":order.status==="accepted"?"Исполнитель подтвердил заказ. Ожидаем начала поездки.":order.status==="en_route"?(progress?.tripLocation?"Исполнитель направляется по адресу.":"Исполнитель в пути, геопозиция пока недоступна."):order.status==="arrived"?"Исполнитель отметил прибытие по адресу.":order.status==="in_progress"?"Исполнитель начал уборку.":order.status==="pending_confirmation"?"Клинер завершил работу. Подтвердите результат или сообщите о проблеме.":order.status==="disputed"?"Заказ ожидает рассмотрения поддержкой.":order.status==="completed"?"Вы подтвердили выполнение уборки.":order.status==="unassigned"?"Поиск завершился без подходящего исполнителя. Можно оформить новый заказ.":"Статус подтверждён сервером CleanGo";
  const stages=["Назначен","В пути","Уборка","Проверка","Готово"];
  const stageIndex=({accepted:0,en_route:1,arrived:2,in_progress:2,pending_confirmation:3,completed:4} as Record<string,number>)[order.status];
  const statusCard=<div className="flex items-center gap-3 py-1">
    <div className="cg-soft grid h-11 w-11 shrink-0 place-items-center rounded-xl">
      {isPending?<Sparkles size={22} className="animate-pulse"/>:order.status==="en_route"?<Navigation size={22}/>:order.status==="in_progress"?<BrushCleaning size={22}/>:order.status==="pending_confirmation"?<Camera size={22}/>:order.status==="completed"||order.status==="accepted"||order.status==="arrived"?<CheckCircle2 size={22}/>:<Clock3 size={22}/>}
    </div>
    <div className="min-w-0 flex-1"><h1 className="text-[19px] font-bold leading-tight tracking-[-0.035em]">{title}</h1><p className="mt-1 text-xs leading-4 cg-muted">{subtitle}</p></div>
  </div>;
  const mapContent=<>
    <div ref={setMapNode} className="absolute inset-0 h-full w-full" aria-label="Карта адреса уборки"/>
    {!mapReady&&<div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#F4F5F2]/70 px-5 text-center text-xs cg-muted">{mapError||"Загружаем карту…"}</div>}
  </>;
  const summary=<div className="cg-card p-2.5">
    <ServiceImage type={order.cleaningType} className="aspect-[3.1/1] w-full rounded-[11px]" sizes="(max-width: 520px) 90vw, 470px" illustrative/>
    <div className="px-1 pb-1 pt-2.5">
      <p className="text-[24px] font-bold leading-tight tracking-tight">{order.price==null?"Цена уточняется":`${Number(order.price).toLocaleString("ru-RU")} ₸`}</p>
      <p className="mt-1 text-xs font-medium">{names[order.cleaningType]??"Уборка"} · {order.area} м²</p>
      <p className="mt-2 flex items-start gap-1.5 text-xs leading-4 cg-muted"><MapPin size={14} className="shrink-0"/>{order.address}</p>
      {order.createdAt&&<p className="mt-1.5 flex items-center gap-1.5 text-[11px] cg-muted"><CalendarDays size={13}/>Создан {new Date(order.createdAt).toLocaleString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</p>}
    </div>
  </div>;
  const progressCard=stageIndex!==undefined&&<div className="cg-card p-3">
    <p className="mb-3 text-sm font-semibold">Статус заказа</p>
    <div className="flex items-start">
      {stages.map((label,index)=><div key={label} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
        {index<stages.length-1&&<span aria-hidden="true" className={`absolute left-1/2 top-[9px] h-0.5 w-full ${index<stageIndex?"bg-[#259E9B]":"bg-[#DDE2DF]"}`}/>}
        <span className={`relative z-10 grid h-5 w-5 place-items-center rounded-full border-2 ${index<stageIndex?"border-[#259E9B] bg-[#259E9B] text-white":index===stageIndex?"border-[#259E9B] bg-white text-[#259E9B]":"border-[#CBD2CE] bg-white"}`}>{index<stageIndex?<CheckCircle2 size={12}/>:index===stageIndex?<span className="h-2 w-2 rounded-full bg-[#259E9B]"/>:null}</span>
        <span className={`text-center text-[10px] leading-3 ${index===stageIndex?"font-bold text-[#137D79]":"cg-muted"}`}>{label}</span>
      </div>)}
    </div>
  </div>;
  const cleanerCard=<>
    {!collapsed&&isAccepted&&progressError&&!progress?.cleaner&&<p role="status" className="text-xs text-amber-700">Не удалось загрузить данные исполнителя.</p>}
    {!collapsed&&isAccepted&&progress?.cleaner&&<div className="cg-card overflow-hidden">
      <div className="p-3">
        <p className="mb-2.5 text-xs font-semibold cg-muted">Ваш исполнитель</p>
        <div className="flex items-center gap-2.5">
          <CounterpartAvatar orderId={order.id} name={progress.cleaner.name} enabled={["accepted","en_route","arrived","in_progress","pending_confirmation"].includes(order.status)} className="h-11 w-11 text-base"/>
          <button type="button" onClick={()=>setReputationOpen(open=>!open)} aria-expanded={reputationOpen} className="min-w-0 flex-1 text-left">
            <p className="flex items-center gap-1 text-[15px] font-bold"><span className="truncate">{progress.cleaner.name}</span><ChevronDown size={14} className={reputationOpen?"shrink-0 rotate-180":"shrink-0"}/></p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] cg-muted"><span className="inline-flex items-center gap-1"><Star size={12} className="fill-[#E9B54E] text-[#E9B54E]"/>{reputation?.rating!=null?reputation.rating.toFixed(1):"Нет оценок"}</span>{reputation&&<span>{reputation.completedOrders} уборок</span>}</p>
          </button>
          {progress.cleaner.phone&&<a href={`tel:${progress.cleaner.phone}`} aria-label="Позвонить исполнителю" className="cg-soft grid h-11 w-11 shrink-0 place-items-center rounded-full"><Phone size={19}/></a>}
        </div>
                    {order.status==="en_route"&&<div className="mt-3 rounded-xl bg-[#F4F5F2] p-3">
              <p className="text-[11px] font-medium text-[#728A82]">Ориентировочное прибытие</p>
              <p className="mt-1 text-lg font-extrabold text-[#174E45]">{progress.etaMinutes!=null&&progress.etaCalculatedAt?(()=>{
                const minutesLeft=progress.etaMinutes-Math.max(0,Math.floor((Date.now()-new Date(progress.etaCalculatedAt).getTime())/60000));
                return minutesLeft<=0?"Время уточняется":`${Math.max(1,Math.floor(minutesLeft*.85))}–${Math.max(6,Math.ceil(minutesLeft*1.35)+5)} мин`;
              })():"Время уточняется"}</p>
              <p className="mt-1 text-[11px] text-[#81968D]">{progress.travelMode==="walking"?"Оценка пешком":progress.travelMode==="transit"?"Приблизительно на общественном транспорте":"По автомобильному маршруту"} · без пробок</p>
            </div>}

      </div>
              {reputationOpen&&<div className="border-t border-[#E7F0ED] bg-[#FCFEFD] px-4 py-4">
          <p className="text-sm font-bold text-[#152535]">Профиль исполнителя</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#F4F5F2] p-2"><p className="text-base font-extrabold text-[#174E45]">{reputation?.rating!=null?reputation.rating.toFixed(1):"—"}</p><p className="text-[10px] text-[#718A81]">Рейтинг</p></div>
            <div className="rounded-xl bg-[#F0F8F5] p-2"><p className="text-base font-extrabold text-[#174E45]">{reputation?.completedOrders??"—"}</p><p className="text-[10px] text-[#718A81]">Уборок</p></div>
            <div className="rounded-xl bg-[#F0F8F5] p-2"><p className="text-base font-extrabold text-[#174E45]">{reputation?.reviewCount??"—"}</p><p className="text-[10px] text-[#718A81]">Оценок</p></div>
          </div>
          {reputation?.reviews?.length?<div className="mt-3 space-y-2">{reputation.reviews.slice(0,3).map((review,index)=><div key={index} className="rounded-xl border border-[#E5EFEB] bg-white p-3"><span className="text-xs font-bold text-[#C49024]">{review.rating} ★</span><p className="mt-1 text-xs leading-5 text-[#52756B]">{review.reviewText}</p></div>)}</div>:<p className="mt-3 text-xs text-[#789087]">Пока нет опубликованных текстовых отзывов.</p>}
          <p className="mt-3 text-[11px] leading-4 text-[#829790]">Оценки основаны на подтверждённых заказах CleanGo.</p>
        </div>}

    </div>}
  </>;
  const inspectionCard=<>
      {!collapsed&&["accepted","en_route","arrived","in_progress"].includes(order.status)&&<div className="cg-card p-3">
        <div className="flex items-center gap-2"><span className="cg-soft grid h-9 w-9 shrink-0 place-items-center rounded-full"><Camera size={18}/></span><p className="text-sm font-semibold">Как проверите уборку?</p></div>
        <p className="mt-1 text-xs cg-muted">Выбираете вы. По умолчанию — фотоотчёт.</p>
        <div className="mt-3 flex gap-2">
          <button disabled={inspectionSaving} type="button" onClick={()=>void selectInspection("personal")} className={`flex-1 rounded-xl border px-2 py-3 text-xs font-semibold ${order.inspectionMethod==="personal"?"border-[#137D79] cg-primary":"border-[#E6E7E4] bg-white text-[#176E6B]"}`}>Проверю лично</button>
          <button disabled={inspectionSaving} type="button" onClick={()=>void selectInspection("photos")} className={`flex-1 rounded-xl border px-2 py-3 text-xs font-semibold ${order.inspectionMethod!=="personal"?"border-[#137D79] cg-primary":"border-[#E6E7E4] bg-white text-[#176E6B]"}`}>По фотографиям</button>
        </div>
        {inspectionSaving&&<p className="mt-2 text-[11px] text-teal-700" role="status">Сохраняем ваш выбор…</p>}
      </div>}

  </>;
  const confirmationCard=order.status==="pending_confirmation"&&<div className="cg-card p-3.5">
    <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Результат уборки</h2>{!!order.completionPhotos?.length&&<span className="text-xs cg-muted">{order.completionPhotos.length} фото</span>}</div>
    {order.completionPhotos?.length?<PhotoReport photos={order.completionPhotos}/>:<p className="text-xs leading-5 cg-muted">{order.inspectionMethod==="personal"?"Вы выбрали личную проверку. Фотографии необязательны.":"Фотографии пока недоступны."}</p>}
    <p className="mt-2 text-xs leading-5 cg-muted">Проверьте результат. Если есть проблема, сообщите о ней вместо подтверждения.</p>
  </div>;
  const detailHeader=<div className="flex items-center justify-between gap-2">
    <Link href="/client/orders" className="cg-icon-button" aria-label="К заказам"><ArrowLeft size={20}/></Link>
    <p className="truncate text-sm font-bold">Заказ №{order.id.slice(0,8).toUpperCase()}</p>
    <button type="button" onClick={()=>{if(immersive)setSheetPosition(value=>value==="expanded"?"normal":"expanded");else if(hasCoordinates)setDetailMapOpen(open=>!open);}} disabled={!hasCoordinates} aria-label={immersive?"Изменить размер панели":"Показать или скрыть карту"} className="cg-icon-button disabled:opacity-30">{immersive?<ChevronsUpDown size={19}/>:<MapPin size={19}/>}</button>
  </div>;
  const errors=<>{completionError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{completionError}</p>}{networkError&&<p role="status" className="text-xs text-amber-700">Нет связи с сервером. Показываем последний подтверждённый статус.</p>}</>;
  const footer=order.status==="pending_confirmation"?<div className="space-y-2">
    <button type="button" disabled={completionBusy} onClick={()=>void orderAction("confirm-completion")} className="cg-primary min-h-12 w-full rounded-[13px] px-4 text-sm font-semibold disabled:opacity-50">{completionBusy?"Сохраняем…":"Подтвердить уборку"}</button>
    <button type="button" disabled={completionBusy} onClick={()=>void orderAction("completion-issue")} className="min-h-10 w-full rounded-xl border border-[#E6E7E4] bg-white text-sm font-semibold text-red-700 disabled:opacity-50">Есть проблема</button>
    {completionError&&<p role="alert" className="text-xs text-red-700">{completionError}</p>}
  </div>:<Link href="/client/orders" className="cg-primary flex min-h-12 items-center justify-center rounded-[13px] px-4 text-sm font-semibold">Мои заказы</Link>;

  if(immersive)return <section className="fixed inset-0 z-[1000] overflow-hidden bg-[#F7F7F5] text-[#15191D] cleango-map-viewport">
    {mapContent}
    <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#F7F7F5] via-[#F7F7F5]/90 to-transparent pb-5 cleango-tracking-header">{detailHeader}</div>
    <div className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[22px] bg-[#F7F7F5] shadow-[0_-8px_30px_rgba(20,65,57,0.10)] transition-[height] duration-300 cleango-tracking-sheet cg-tracking-panel ${collapsed?"h-[154px]":expanded?"h-[min(84dvh,850px)]":"h-[min(52dvh,460px)]"}`}>
      <button type="button" onPointerDown={handleSheetStart} onPointerUp={handleSheetEnd} onPointerCancel={()=>{gestureStart.current=null;}} onClick={()=>{if(skipHandleClick.current){skipHandleClick.current=false;return;}setSheetPosition(value=>value==="expanded"?"normal":"expanded");}} aria-label="Изменить размер панели" aria-expanded={expanded} className="flex w-full shrink-0 cursor-grab touch-none select-none justify-center py-3"><span className="h-1 w-10 rounded-full bg-[#CBDDD8]"/></button>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-3">
        {statusCard}
              {!collapsed&&isPending&&<div className="mt-3 flex items-center gap-2 text-xs text-[#66877E]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#137D79]"/>Поиск выполняется — время ответа зависит от клинеров</div>}
      {!collapsed&&isPending&&<div className="mt-3 rounded-2xl bg-[#F4F5F2] p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#174E45]"><CheckCircle2 size={17} className="text-[#079B8D]"/>Заказ оформлен</div>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#174E45]">{progress&&progress.sent>0?<CheckCircle2 size={17} className="text-[#079B8D]"/>:<Clock3 size={17} className="text-[#079B8D]"/>}Предложения клинерам {progress&&progress.sent>0?"отправлены":"подбираются"}</div>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#174E45]"><span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#137D79]"/>{searchStage}</div>
      </div>}
      {!collapsed&&isPending&&<div className="mt-3 rounded-2xl border border-[#E2EEE9]">
        <button type="button" onClick={()=>setStatsExpanded(value=>!value)} aria-expanded={statsExpanded} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#174E45]">
          <span>Подробности поиска</span><span className="text-xs text-[#60827A]">{statsExpanded?"Скрыть −":"Показать +"}</span>
        </button>
        {statsExpanded&&<div className="grid grid-cols-3 gap-2 border-t border-[#E2EEE9] p-3 text-center">
          {([{value:progress?.sent,label:"Отправлено"},{value:progress?.awaiting,label:"Ожидают"},{value:progress?.declined,label:"Отказались"}]).map(item=><div key={item.label} className="rounded-xl bg-[#F4F5F2] px-1 py-3"><div className="text-xl font-extrabold text-[#087F71]">{item.value??"—"}</div><div className="mt-1 text-[10px] text-[#6B8980]">{item.label}</div></div>)}
          <p className="col-span-3 text-left text-[11px] leading-4 text-[#708981]">Отправленные предложения не означают, что клинеры их просмотрели.</p>
          {progressError&&<p role="status" className="col-span-3 text-left text-xs text-amber-700">Не удалось обновить статистику. Показываем последние подтверждённые данные.</p>}
        </div>}
      </div>}

        {cleanerCard}
        {!collapsed&&inspectionCard}
        {!collapsed&&summary}
        {!collapsed&&errors}
      </div>
      {!collapsed&&<div className="shrink-0 border-t border-[#E6E7E4] px-4 pt-2.5">{footer}</div>}
    </div>
  </section>;

  return <section className="fixed inset-0 z-[1000] bg-[#F7F7F5]"><div className="cleango-page-frame">
    <div className="cg-detail-header">{detailHeader}</div>
    <div className="cleango-page-scroll w-full">
      <div className="space-y-2.5 px-4 pt-1">
        <div className="cg-card p-3">{statusCard}</div>
        {confirmationCard}
              {!collapsed&&order.status==="completed"&&order.rating==null&&!reviewDone&&<div className="cg-card p-3.5">
        <p className="text-sm font-bold">Оцените клинера — по желанию</p>
        <div className="mt-3 flex flex-wrap items-center gap-1" role="group" aria-label="Выберите оценку с шагом ползвезды">
          {[1,2,3,4,5].map(n=><div key={n} className="relative h-11 w-11 shrink-0 select-none" aria-hidden={false}>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-[37px] leading-none text-[#D6E0DC]">★</span>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden text-[#F2B544]" style={{width:rating>=n?"100%":rating===n-0.5?"50%":"0%"}}>
              <span className="flex h-full w-11 items-center justify-center text-[37px] leading-none">★</span>
            </span>
            <button type="button" className="absolute inset-y-0 left-0 w-1/2 rounded-l-md focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" onClick={()=>setRating(n-0.5)} aria-label={`Оценить на ${(n-0.5).toLocaleString("ru-RU")} из 5`} aria-pressed={rating===n-0.5}/>
            <button type="button" className="absolute inset-y-0 right-0 w-1/2 rounded-r-md focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" onClick={()=>setRating(n)} aria-label={`Оценить на ${n} из 5`} aria-pressed={rating===n}/>
          </div>)}
          <span className="ml-2 min-w-9 text-sm font-extrabold tabular-nums text-[#92691D]" aria-live="polite">{rating?rating.toLocaleString("ru-RU"):"—"}</span>
        </div>
        <p className="mt-1 text-[11px] text-[#7E918A]">Нажмите на левую половину звезды, чтобы поставить 0,5.</p>
        <textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} maxLength={1000} placeholder="Отзыв (необязательно)" className="mt-3 w-full rounded-xl border p-3 text-sm" rows={2}/>
        <div className="mt-2 flex gap-2"><button type="button" disabled={!rating||completionBusy} onClick={()=>void orderAction("review",{rating,reviewText})} className="flex-1 rounded-xl bg-[#137D79] p-3 text-sm font-bold text-white disabled:opacity-50">Отправить</button><button type="button" onClick={()=>setReviewDone(true)} className="rounded-xl border px-4 text-sm">Пропустить</button></div>
      </div>}

              {!collapsed&&["completed","disputed"].includes(order.status)&&!!order.completionPhotos?.length&&<div className="cg-card p-3.5"><p className="mb-2 text-sm font-semibold">Фотоотчёт уборки</p><PhotoReport photos={order.completionPhotos}/></div>}
      {!collapsed&&order.status==="disputed"&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Обращение зарегистрировано. Поддержка должна рассмотреть заказ; автоматической выплаты нет.</p>}

        {summary}
        {cleanerCard}
        {inspectionCard}
        {progressCard}
        {hasCoordinates&&<div ref={detailMapRef} className="cg-card overflow-hidden"><button type="button" onClick={()=>setDetailMapOpen(open=>!open)} aria-expanded={detailMapOpen} className="flex w-full items-center gap-2.5 p-3 text-left"><span className="cg-soft grid h-9 w-9 shrink-0 place-items-center rounded-full"><MapPin size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Адрес на карте</span><span className="mt-0.5 block truncate text-xs cg-muted">{order.address}</span></span><ChevronDown size={17} className={detailMapOpen?"rotate-180":""}/></button>{detailMapOpen&&<div className="relative mx-2 mb-2 h-40 overflow-hidden rounded-xl">{mapContent}</div>}</div>}
        {errors}
      </div>
    </div>
    <div className="cg-detail-footer">{footer}</div>
  </div></section>;
}
