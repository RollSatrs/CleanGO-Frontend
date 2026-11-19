"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

type Order = {
  id: string; status: string; address: string; area: number;
  cleaningType: "regular" | "general" | "renovation";
  price: number | null; latitude?: string | number | null; longitude?: string | number | null;
};
const names = { regular: "Поддерживающая уборка", general: "Генеральная уборка", renovation: "После ремонта" };
const terminal = new Set(["completed", "cancelled", "unassigned", "expired", "failed", "no_cleaner"]);
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
  const [networkError,setNetworkError]=useState(false);
  const [progress,setProgress]=useState<{sent:number;awaiting:number;declined:number;cleaner:{name:string;phone:string|null}|null}|null>(null);
  const [mapError,setMapError]=useState("");
  const [progressError,setProgressError]=useState(false);
  const [mapReady,setMapReady]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [statsExpanded,setStatsExpanded]=useState(false);
  const [mapNode,setMapNode]=useState<HTMLDivElement|null>(null);
  const mapReadyRef=useRef(false);
  const isPending=order.status==="pending";
  const isAccepted=["accepted","in_progress","completed"].includes(order.status);

  useEffect(()=>{
    if(!token || terminal.has(order.status))return;
    let active=true;
    const refresh=async()=>{
      try {
        const response=await fetch(`/api/backend/orders/${encodeURIComponent(initialOrder.id)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        if(!response.ok)throw new Error("Request failed");
        const current:Order=await response.json();
        if(active){if(current)setOrder(current);setNetworkError(false);}
      } catch {if(active)setNetworkError(true);}
    };
    void refresh();
    const interval=window.setInterval(()=>void refresh(),5000);
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
    if(!["pending","accepted","in_progress"].includes(order.status))return()=>{active=false;};
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
    return()=>{disposed=true;window.clearTimeout(timeout);map?.remove();};
  },[latitude,longitude,mapNode]);

  const title=isPending?"Ищем клинера":isAccepted?"Клинер найден":order.status==="cancelled"?"Заказ отменён":order.status==="unassigned"?"Клинер не найден":"Поиск завершён";
  const searchStage=isPending?(progress===null?"Подбираем исполнителей":progress.awaiting>0?"Ожидаем подтверждения клинера":progress.sent>0?"Продолжаем поиск исполнителя":"Подбираем исполнителей"):"";
  const subtitle=isPending?"Подбираем исполнителя и ожидаем ответа":order.status==="unassigned"?"Поиск завершился без подходящего исполнителя. Можно оформить новый заказ.":"Статус подтверждён сервером CleanGo";
  return <section className="fixed inset-0 z-[1000] overflow-hidden bg-[#F5FAF8] text-[#152535] cleango-map-viewport">
    <div ref={setMapNode} className="absolute inset-0 min-h-full w-full" style={{minHeight:"100%"}} aria-label="Карта адреса уборки" />
    {!mapReady&&<div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-[#6D8880]">{mapError || "Загружаем карту района…"}</div>}
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white/95 via-white/70 to-transparent px-4 pb-8 cleango-tracking-header">
      <div className="flex items-center justify-between">
        <Link href="/client/orders" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="Мои заказы"><ArrowLeft size={20}/></Link>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-bold tracking-wide text-[#087F71] shadow-sm">CleanGo · Заказ</span>
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[min(80%,650px)] flex-col rounded-t-[28px] bg-white shadow-[0_-12px_50px_rgba(20,65,57,0.12)] cleango-tracking-sheet">
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5">
      <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-label="Показать подробности заказа" className="flex w-full justify-center py-3"><span className="h-1.5 w-12 rounded-full bg-[#D9E8E4]"/></button>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E3F8F2] text-[#079B8D]">{isAccepted?<CheckCircle2 size={25}/>:<Sparkles size={25} className={isPending?"animate-pulse":""}/>}</div>
        <div className="min-w-0 flex-1"><h1 className="text-xl font-extrabold tracking-tight">{title}</h1><p className="mt-1 text-xs leading-5 text-[#738C84]">{subtitle}</p></div>
        {isPending&&<span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0A9C8D] opacity-40"/><span className="relative inline-flex h-3 w-3 rounded-full bg-[#0A9C8D]"/></span>}
      </div>
      {isPending&&<div className="mt-5 flex items-center gap-2 text-xs text-[#66877E]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#079B8D]"/>Поиск выполняется — время ответа зависит от клинеров</div>}
      {isPending&&<div className="mt-4 rounded-2xl bg-[#EAF8F4] p-4" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#174E45]"><CheckCircle2 size={17} className="text-[#079B8D]"/>Заказ оформлен</div>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#174E45]">{progress&&progress.sent>0?<CheckCircle2 size={17} className="text-[#079B8D]"/>:<Clock3 size={17} className="text-[#079B8D]"/>}Предложения клинерам {progress&&progress.sent>0?"отправлены":"подбираются"}</div>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#174E45]"><span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#079B8D]"/>{searchStage}</div>
      </div>}
      {isPending&&<div className="mt-3 rounded-2xl border border-[#E2EEE9]">
        <button type="button" onClick={()=>setStatsExpanded(value=>!value)} aria-expanded={statsExpanded} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#174E45]">
          <span>Подробности поиска</span><span className="text-xs text-[#60827A]">{statsExpanded?"Скрыть −":"Показать +"}</span>
        </button>
        {statsExpanded&&<div className="grid grid-cols-3 gap-2 border-t border-[#E2EEE9] p-3 text-center">
          {([{value:progress?.sent,label:"Отправлено"},{value:progress?.awaiting,label:"Ожидают"},{value:progress?.declined,label:"Отказались"}]).map(item=><div key={item.label} className="rounded-xl bg-[#F1F9F6] px-1 py-3"><div className="text-xl font-extrabold text-[#087F71]">{item.value??"—"}</div><div className="mt-1 text-[10px] text-[#6B8980]">{item.label}</div></div>)}
          <p className="col-span-3 text-left text-[11px] leading-4 text-[#708981]">Отправленные предложения не означают, что клинеры их просмотрели.</p>
          {progressError&&<p role="status" className="col-span-3 text-left text-xs text-amber-700">Не удалось обновить статистику. Показываем последние подтверждённые данные.</p>}
        </div>}
      </div>}
      {isAccepted&&progressError&&!progress?.cleaner&&<p role="status" className="mt-3 text-xs text-amber-700">Не удалось загрузить данные исполнителя. Повторяем запрос автоматически.</p>}
      {isAccepted&&progress?.cleaner&&<div className="mt-4 rounded-2xl bg-[#EAF8F4] p-4">
        <p className="text-xs font-semibold text-[#578078]">Ваш исполнитель</p>
        <p className="mt-1 text-lg font-extrabold">{progress.cleaner.name}</p>
        {progress.cleaner.phone&&<a className="mt-2 inline-block text-sm font-semibold text-[#087F71]" href={`tel:${progress.cleaner.phone}`}>Позвонить исполнителю</a>}
      </div>}
      <div className="mt-5 flex items-center gap-2 text-sm text-[#617B74]"><MapPin size={16} className="shrink-0 text-[#079B8D]"/><span className="truncate">{order.address}</span></div>
      {expanded&&<div className="mt-4 space-y-3 border-t border-[#EDF3F0] pt-4">
        <div className="flex justify-between gap-3 text-sm"><span className="text-[#7A908A]">Уборка</span><strong className="text-right">{names[order.cleaningType]}</strong></div>
        <div className="flex justify-between gap-3 text-sm"><span className="text-[#7A908A]">Площадь</span><strong>{order.area} м²</strong></div>
        <div className="flex justify-between gap-3 text-sm"><span className="text-[#7A908A]">Стоимость</span><strong>{order.price==null?"Уточняется":`${Number(order.price).toLocaleString("ru-RU")} ₸`}</strong></div>
        <p className="flex items-start gap-2 text-xs leading-5 text-[#6B8980]"><ShieldCheck size={16} className="shrink-0 text-[#079B8D]"/>Точный адрес доступен исполнителю только после принятия заказа.</p>
      </div>}
      {networkError&&<p role="status" className="mt-3 text-xs text-amber-700">Нет связи с сервером. Показываем последний подтверждённый статус.</p>}
      {isPending&&<p className="mt-3 flex items-center gap-2 text-xs text-[#79918B]"><Clock3 size={14}/>Статус обновляется каждые 5 секунд</p>}
      </div>
      <div className="shrink-0 px-4 pt-3 sm:px-5"><Link href="/client/orders" className="flex min-h-12 items-center justify-center rounded-2xl bg-[#079B8D] px-4 font-bold text-white">Мои заказы</Link></div>
    </div>
  </section>;
}
