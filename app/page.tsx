"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import ServiceImage from "@/components/ServiceImage";
import BottomNav from "@/components/navigation/BottomNav";
import { AppHeader } from "@/components/ui/clean-go";
import { useAuth } from "@/components/providers/AuthProvider";

type CleaningType = "regular" | "general" | "renovation";
const services = [
  { id:"regular", title:"Поддерживающая", fullTitle:"Поддерживающая уборка", price:8000, description:"Чистота и порядок на каждый день", features:["Влажная уборка","Удаление пыли","Кухня и санузел"] },
  { id:"general", title:"Генеральная", fullTitle:"Генеральная уборка", price:15000, description:"Тщательная уборка вашего дома", features:["Глубокая уборка","Очистка поверхностей","Кухня и санузел"] },
  { id:"renovation", title:"После ремонта", fullTitle:"Уборка после ремонта", price:20000, description:"Уберём пыль и следы ремонта", features:["Строительная пыль","Очистка полов","Влажная уборка"] },
] as const;
const statusNames:Record<string,string>={pending:"Ищем клинера",accepted:"Клинер найден",en_route:"Клинер в пути",arrived:"Клинер прибыл",in_progress:"В работе",pending_confirmation:"Подтвердите уборку",disputed:"На рассмотрении"};
type ActiveOrder={id:string; cleaningType:string; status:string; area:number; price:number|null; address:string};

export default function HomePage(){
  const router=useRouter();
  const {token,user}=useAuth();
  const [selectedService,setSelectedService]=useState<CleaningType|null>(null);
  const [orders,setOrders]=useState<ActiveOrder[]>([]);
  const [ordersState,setOrdersState]=useState<"loading"|"ready"|"error">("loading");
  const service=services.find(item=>item.id===selectedService);
  useEffect(()=>{
    if(!token||user?.role!=="client"||!user.phoneVerifiedAt)return;
    let active=true;
    const refresh=async()=>{
      try {
        const response=await fetch("/api/backend/orders/history?section=active&page=1",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        if(!response.ok)throw Error("unavailable");
        const result=await response.json() as {items?:ActiveOrder[]};
        if(!Array.isArray(result.items))throw Error("invalid");
        if(active){setOrders(result.items);setOrdersState("ready");}
      } catch {if(active)setOrdersState("error");}
    };
    void refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},15000);
    return()=>{active=false;window.clearInterval(timer);};
  },[token,user?.role,user?.phoneVerifiedAt]);
  function order(){
    if(!service){document.getElementById("services")?.scrollIntoView({block:"start",behavior:"smooth"});return;}
    router.push(`/order?service=${service.id}`);
  }
  return <main className="cleango-page-frame">
    <div className="cleango-page-scroll w-full">
      <AppHeader role="client" className="cleango-client-header px-4 pb-3"/>
      <div className="px-4">
        <section className="pt-3">
          <h1 className="max-w-[360px] text-[27px] font-bold leading-[1.15] tracking-[-0.045em]">Профессиональная уборка для вашего дома</h1>
          <p className="mt-2 text-sm leading-5 cg-muted">Быстро, удобно и без лишних забот.</p>
        </section>
        <section id="services" className="mt-6 scroll-mt-3">
          <div className="flex items-center justify-between"><h2 className="text-[17px] font-bold tracking-tight">Виды уборки</h2><span className="text-xs cg-muted">3 услуги</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {services.map(item=><button key={item.id} type="button" aria-pressed={selectedService===item.id} onClick={()=>setSelectedService(item.id)}
              className={`min-w-0 overflow-hidden rounded-[14px] border bg-white text-left transition-colors ${selectedService===item.id?"border-[#259E9B] ring-1 ring-[#259E9B]":"border-[#E6E7E4]"}`}>
              <div className="relative aspect-[4/4.4] rounded-t-[13px]" aria-hidden="true">
                <ServiceImage type={item.id} className="h-full w-full rounded-t-[13px]" sizes="(max-width: 520px) 32vw, 160px"/>
                {selectedService===item.id&&<span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#137D79] text-white"><Check size={14}/></span>}
              </div>
              <div className="px-2 py-2.5"><h3 className="min-h-9 text-[11px] font-bold leading-[1.35] sm:text-sm">{item.title}<br/>{item.id!=="renovation"?"уборка":""}</h3><p className="mt-1 text-[11px] font-medium text-[#51595A]">от {item.price.toLocaleString("ru-RU")} ₸</p></div>
            </button>)}
          </div>
          {service&&<div className="cg-card mt-3 p-3">
            <h3 className="text-sm font-semibold">{service.fullTitle}</h3><p className="mt-1 text-xs cg-muted">{service.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{service.features.map(feature=><span key={feature} className="cg-soft inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px]"><Check size={12}/>{feature}</span>)}</div>
          </div>}
          <button onClick={order} type="button" className="cg-primary mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[13px] px-3 text-sm font-semibold">{service?"Продолжить оформление":"Выбрать уборку"}<ArrowRight size={17}/></button>
          <p className="mt-2 text-[11px] leading-4 cg-muted">Итоговая стоимость рассчитывается при оформлении заказа.</p>
        </section>
        <section className="mt-6">
          <div className="flex items-center justify-between"><h2 className="text-[17px] font-bold tracking-tight">Мои текущие заказы</h2><Link href="/client/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-[#137D79]">Все <ChevronRight size={15}/></Link></div>
          {orders.length>0?<div className="mt-3 space-y-2">{orders.slice(0,2).map(item=><Link href={`/client/orders/${encodeURIComponent(item.id)}`} key={item.id} className="cg-card flex gap-3 p-2.5">
            <ServiceImage type={item.cleaningType} className="h-[78px] w-[78px] shrink-0 rounded-[10px]" sizes="78px" illustrative/>
            <div className="min-w-0 flex-1"><span className="cg-soft inline-block rounded-full px-2 py-1 text-[10px] font-medium">{statusNames[item.status]??"Заказ"}</span><p className="mt-1 truncate text-sm font-semibold">{services.find(s=>s.id===item.cleaningType)?.fullTitle??"Уборка"}</p><p className="mt-1 flex items-center gap-1 text-xs cg-muted"><MapPin size={12} className="shrink-0"/><span className="truncate">{item.address}</span></p><p className="mt-1 text-xs cg-muted">{item.area} м²{item.price!=null?` · ${Number(item.price).toLocaleString("ru-RU")} ₸`:""}</p></div>
            <ChevronRight size={17} className="self-center text-[#8B9390]"/>
          </Link>)}</div>:<div className="cg-card mt-3 p-3 text-xs cg-muted">{ordersState==="loading"?"Загружаем заказы…":ordersState==="error"?"Не удалось загрузить заказы. Откройте раздел «Заказы».":"Пока нет активных заказов."}</div>}
        </section>
        <section className="mt-5 flex items-start gap-3 rounded-[16px] border border-[#E3E7E3] bg-[#EFF1EE] p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#137D79]"><ShieldCheck size={19}/></div>
          <div><h2 className="text-sm font-semibold">Чистота под вашим контролем</h2><p className="mt-1 text-xs leading-5 cg-muted">Следите за заказом и проверяйте результат лично или по фотографиям.</p></div>
        </section>
      </div>
    </div>
    <BottomNav role="client"/>
  </main>;
}
