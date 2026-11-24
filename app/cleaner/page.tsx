"use client";
import ServiceImage from "@/components/ServiceImage";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {useCleanerShift,shiftState} from "@/components/providers/CleanerShiftProvider";
import BottomNav from "@/components/navigation/BottomNav";
import { ArrowRight, ClipboardList, ShieldCheck, Wallet, MapPin, ChevronRight } from "lucide-react";
import { AppHeader, AppCard } from "@/components/ui/clean-go";

export default function CleanerPage() {
  const { user, token } = useAuth();
  const {profile,now,error:profileError}=useCleanerShift();
  const [offers,setOffers]=useState<{offerId:string;cleaningType:string;area:number;price:number;approximateArea:string|null;expiresAt:string}[]>([]);
  const [offerState,setOfferState]=useState<"loading"|"ready"|"error">("loading");
  useEffect(() => {
    if (!token || user?.role !== "cleaner") return;
    let active = true;
    const refreshOffers=async()=>{
      try{const response=await fetch("/api/backend/orders/offers/mine",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});if(!response.ok)throw Error("unavailable");const data=await response.json();if(!Array.isArray(data))throw Error("invalid");if(active){setOffers(data);setOfferState("ready");}}catch{if(active)setOfferState("error");}
    };
    void refreshOffers();
    const timer = window.setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible"){void refresh();void refreshOffers();} }, 10000);
    const onFocus = () => {void refresh();void refreshOffers();};
    window.addEventListener("focus", onFocus);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [token, user?.role]);
  const {remaining,active:activeShift,receiving:receivingOffers}=shiftState(profile,now);
  return <main className="cleango-page-frame">
    <div className="cleango-page-scroll w-full">
      <AppHeader role="cleaner" className="cleango-client-header px-4 pb-3" />
      <div className="px-4">
      <div className="mt-3"><p className="text-sm cg-muted">Здравствуйте{user?.firstName ? `, ${user.firstName}` : ""}!</p><h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.04em]">Ваш рабочий день</h1></div>
      <Link href="/cleaner/settings" className="cg-card mt-4 flex items-center gap-3 px-3 py-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${receivingOffers ? "bg-emerald-500" : activeShift||profile?.hasActiveOrder ? "bg-amber-400" : "bg-slate-300"}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{profileError?"Статус недоступен":!profile?"Проверяем статус…":profile.hasActiveOrder?"На заказе":receivingOffers?"На линии":activeShift?"Заявки приостановлены":"Не на линии"}</span>
          <span className="block text-xs text-[#748B8A]">{profileError?"Проверьте подключение":!profile?"Загружаем рабочие настройки":profile.hasActiveOrder?"Новые предложения приостановлены":receivingOffers?`Смена: ещё ${remaining} мин`:activeShift?`Осталось ${remaining} мин · обновите геопозицию`:"Включить смену"}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#8CA7A0]" />
      </Link>
      <section className="mt-6">
        <div className="flex items-center justify-between"><h2 className="text-[17px] font-bold">Новые заявки</h2><Link href="/cleaner/jobs" className="inline-flex items-center gap-1 text-xs font-semibold text-[#137D79]">Все <ChevronRight size={15}/></Link></div>
        <div className="mt-3 space-y-2">
          {offers.filter(item=>now===null||new Date(item.expiresAt).getTime()>now).slice(0,3).map(item=><Link href="/cleaner/jobs" key={item.offerId} className="cg-card flex gap-3 p-2.5">
            <ServiceImage type={item.cleaningType} className="h-[83px] w-[83px] shrink-0 rounded-[10px]" sizes="83px" illustrative/><div className="min-w-0 flex-1"><span className="cg-soft rounded-full px-2 py-1 text-[10px] font-semibold">Новый заказ</span><p className="mt-1.5 text-lg font-bold">{Number(item.price).toLocaleString("ru-RU")} ₸</p><p className="text-xs font-semibold">{({regular:"Поддерживающая",general:"Генеральная",renovation:"После ремонта"} as Record<string,string>)[item.cleaningType]??"Уборка"} · {item.area} м²</p><p className="mt-1 flex items-center gap-1 text-[11px] cg-muted"><MapPin size={12}/>{item.approximateArea||"Район уточняется"}</p></div><ChevronRight size={16} className="self-center text-[#909895]"/>
          </Link>)}
          {offers.filter(item=>now===null||new Date(item.expiresAt).getTime()>now).length===0&&<AppCard><p className="text-sm font-semibold">{offerState==="loading"?"Загружаем заявки…":offerState==="error"?"Заявки недоступны":"Пока нет новых заявок"}</p><p className="mt-1 text-xs cg-muted">{offerState==="error"?"Откройте раздел «Заявки» для повторной проверки.":"Предложения появятся автоматически."}</p><Link href="/cleaner/jobs" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#137D79]">К заявкам <ArrowRight size={14}/></Link></AppCard>}
        </div>
      </section>
      <h2 className="mt-6 text-[17px] font-bold">Рабочее пространство</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Link href="/cleaner/jobs"><AppCard><ClipboardList size={22} className="text-[#137D79]"/><p className="mt-3 text-sm font-semibold">Мои заказы</p><p className="mt-1 text-xs cg-muted">Текущие уборки</p></AppCard></Link>
        <Link href="/cleaner/earnings"><AppCard><Wallet size={22} className="text-[#137D79]"/><p className="mt-3 text-sm font-semibold">Доходы</p><p className="mt-1 text-xs cg-muted">История заработка</p></AppCard></Link>
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#EDEFEA] p-3"><ShieldCheck size={19} className="shrink-0 text-[#137D79]"/><p className="text-xs leading-5 cg-muted">Во время открытой смены геопозиция обновляется автоматически при наличии разрешения. Если приложение закрыто, обновления могут приостановиться.</p></div>
      </div>
    </div>
    <BottomNav role="cleaner"/>
  </main>;
}
