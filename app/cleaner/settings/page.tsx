"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Check,Clock3,LocateFixed,MapPin,Navigation,Power,RefreshCw,ShieldCheck,LoaderCircle} from "lucide-react";
import {useAuth} from "@/components/providers/AuthProvider";
import {useCleanerShift,shiftState} from "@/components/providers/CleanerShiftProvider";
import {getTelegramLocationManager} from "@/lib/geo-location";
import {AppCard,AppPageShell} from "@/components/ui/clean-go";
import {RefreshButton} from "@/components/ui/order-loading";
import ServiceImage from "@/components/ServiceImage";

const TYPES=[{id:"regular",label:"Поддерживающая"},{id:"general",label:"Генеральная"},{id:"renovation",label:"После ремонта"}] as const;
const fmt=(value:string)=>new Date(value).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
function SettingsSkeleton(){return <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">Загружаем настройки</span>{[0,1,2].map(i=><AppCard key={i} className="space-y-3"><div className="cg-skeleton h-4 w-2/5 rounded-full"/><div className="cg-skeleton h-8 w-3/5 rounded-xl"/><div className="cg-skeleton h-11 w-full rounded-xl"/></AppCard>)}</div>;}
export default function CleanerSettings(){
 const {user}=useAuth();
 const {profile,now,busy,geoBusy,error,geoError,refresh,start,stop,savePreferences,refreshLocation,autoEnabled}=useCleanerShift();
 const [hours,setHours]=useState<1|2|4>(1);
 const [draft,setDraft]=useState<{serviceRadiusKm:number;serviceTypes:string[]}|null>(null);
 const [notice,setNotice]=useState("");
 const prefs=draft??{serviceRadiusKm:profile?.serviceRadiusKm??5,serviceTypes:profile?.serviceTypes??[]};
 const dirty=Boolean(draft&&profile&&(draft.serviceRadiusKm!==profile.serviceRadiusKm||[...draft.serviceTypes].sort().join(",")!==[...profile.serviceTypes].sort().join(",")));
 useEffect(()=>{if(!dirty&&draft)setDraft(null);},[dirty,draft]);
 const {active,fresh,receiving,remaining}=shiftState(profile,now);
 const status=profile?.hasActiveOrder?"На заказе":receiving?"На линии":active?"Подбор приостановлен":profile?.isAvailable?"Смена закончилась":"Не на линии";
 const startAllowed=!!prefs.serviceTypes.length;
 return <AppPageShell role="cleaner" eyebrow="Рабочий профиль" title="Рабочие настройки" detailHeader={<div className="flex items-center justify-between gap-2"><Link href="/cleaner/profile" aria-label="Назад в профиль" className="cg-icon-button cg-press"><ArrowLeft size={20}/></Link><h1 className="text-sm font-bold">Рабочие настройки</h1><button type="button" onClick={()=>void refresh()} disabled={busy||geoBusy} aria-label="Обновить статус" className="cg-icon-button cg-press disabled:opacity-50"><RefreshCw size={18} className={busy?"cg-loading-spin":""}/></button></div>}>
 {!profile?(error?<><AppCard><p role="alert" className="text-sm text-red-700">{error}</p></AppCard><RefreshButton busy={busy} onClick={()=>void refresh()} label="Повторить"/></>:<SettingsSkeleton/>):<div className="cg-order-enter space-y-3">
 <AppCard className="!p-4">
 <div className="flex items-start justify-between gap-3"><div><p className="text-xs cg-muted">Рабочая смена</p><h2 className="mt-1 flex items-center gap-2 text-[23px] font-bold tracking-tight"><span className={`h-2.5 w-2.5 rounded-full ${receiving?"bg-emerald-500":profile.hasActiveOrder||active?"bg-amber-400":"bg-[#B7BDB9]"}`}/>{status}</h2></div><span className="cg-soft grid h-11 w-11 shrink-0 place-items-center rounded-full"><Power size={21}/></span></div>
 <p className="mt-2 text-xs leading-5 cg-muted">{profile.hasActiveOrder?"Новые заявки не подбираются, пока текущая уборка не закончена.":receiving?"Вы участвуете в подборе заказов рядом с вами.":active?"Обновите геопозицию, чтобы снова получать предложения.":"Выберите длительность смены и выйдите на линию."}</p>
 {active&&profile.availableUntil?<div className="mt-4 rounded-xl bg-[#F4F5F2] p-3"><div className="flex items-center gap-2 text-xs cg-muted"><Clock3 size={15}/> До {fmt(profile.availableUntil)}</div><p className="mt-1 text-xl font-bold">{remaining>=60?Math.floor(remaining/60)+" ч ":""}{remaining%60} мин</p></div>:<div className="mt-4 grid grid-cols-3 gap-2">{([1,2,4] as const).map(value=><button key={value} type="button" onClick={()=>setHours(value)} aria-pressed={hours===value} disabled={busy} className={`cg-press rounded-xl border py-3 text-sm font-semibold ${hours===value?"cg-primary border-[#137D79]":"border-[#E6E7E4] bg-[#F7F7F5]"}`}>{value} ч</button>)}</div>}
 <button type="button" disabled={busy||(!active&&!startAllowed)} onClick={()=>{setNotice("");void(active?stop():start(hours,prefs));}} className={`cg-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${active?"border border-[#E6E7E4] bg-white text-[#15191D]":"cg-primary"}`}>{busy?<LoaderCircle size={17} className="cg-loading-spin"/>:<Power size={17}/>} {busy?"Обновляем…":active?"Завершить смену":"Выйти на линию"}</button>
 <p className="mt-2 text-[11px] leading-4 cg-muted">Выход на линию разрешает обновлять рабочую геопозицию во время смены, пока Mini App открыто. Завершение смены не отменяет текущий заказ.</p>
 </AppCard>
 <AppCard>
 <div className="flex items-center gap-3"><span className="cg-soft grid h-10 w-10 shrink-0 place-items-center rounded-xl"><LocateFixed size={20}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Геопозиция</h2><p className="mt-1 text-xs cg-muted">{geoBusy?"Определяем местоположение…":profile.lastLocationAt?`Обновлена в ${fmt(profile.lastLocationAt)}`:"Ещё не определена"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${fresh?"cg-soft":"bg-[#F4F5F2] text-[#697174]"}`}>{fresh?"Актуальна":"Неактуальна"}</span></div>
 <div className="mt-3 rounded-xl bg-[#F4F5F2] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Navigation size={15} className="text-[#137D79]"/> {autoEnabled?"Автообновление включено":"Автообновление неактивно"}</div><p className="mt-1 text-[11px] leading-4 cg-muted">Раз в 5 минут на открытой смене, если доступ к GPS разрешён. Без свежих данных более 30 минут подбор приостанавливается. Во время уборки автоматический запрос пропускается.</p></div>
 {active&&<RefreshButton busy={geoBusy} disabled={busy} className="mt-3" label="Обновить геопозицию" onClick={()=>void refreshLocation()}/>}
 {!active&&<p className="mt-3 text-xs cg-muted">При выходе на линию получим свежую точку.</p>}
 {geoError&&<div className="mt-3"><p role="alert" className="text-xs leading-5 text-amber-800">{geoError}</p><button type="button" onClick={()=>{try{getTelegramLocationManager()?.openSettings();}catch{setNotice("Проверьте разрешения Telegram в настройках телефона.");}}} className="mt-2 text-xs font-semibold text-[#137D79]">Настройки геолокации</button></div>}
 </AppCard>
 <AppCard>
 <h2 className="text-sm font-bold">Виды уборки</h2><p className="mt-1 text-xs cg-muted">Выберите услуги, которые готовы выполнять.</p>
 <div className="mt-3 space-y-2">{TYPES.map(type=>{const checked=prefs.serviceTypes.includes(type.id);return <button type="button" key={type.id} aria-pressed={checked} disabled={busy} onClick={()=>{setNotice("");setDraft({...prefs,serviceTypes:checked?prefs.serviceTypes.filter(id=>id!==type.id):[...prefs.serviceTypes,type.id]});}} className={`cg-press flex w-full items-center gap-3 rounded-xl border p-2 text-left ${checked?"border-[#B7D9D5] bg-[#F3F9F8]":"border-[#E6E7E4] bg-white"}`}><ServiceImage type={type.id} className="h-11 w-14 shrink-0 rounded-lg" sizes="56px"/><span className="min-w-0 flex-1 text-sm font-semibold">{type.label}</span><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${checked?"cg-primary border-[#137D79]":"border-[#D1D8D4] bg-white"}`}>{checked&&<Check size={15}/>}</span></button>})}</div>
 </AppCard>
 <AppCard><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold"><MapPin size={17} className="text-[#137D79]"/> Радиус работы</h2><strong className="text-xl tabular-nums">{prefs.serviceRadiusKm} км</strong></div><input aria-label="Радиус работы" type="range" min={1} max={30} value={prefs.serviceRadiusKm} disabled={busy} onChange={e=>{setNotice("");setDraft({...prefs,serviceRadiusKm:Number(e.target.value)});}} className="mt-4 w-full accent-[#137D79]"/><div className="mt-1 flex justify-between text-[11px] cg-muted"><span>1 км</span><span>30 км</span></div><p className="mt-2 text-xs cg-muted">Расстояние по прямой от вашей последней геопозиции.</p></AppCard>
 {dirty&&<button type="button" disabled={busy||!startAllowed} onClick={()=>{setNotice("");void savePreferences(prefs);}} className="cg-primary cg-press flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50">{busy&&<LoaderCircle size={16} className="cg-loading-spin"/>} Сохранить услуги и радиус</button>}
 {!startAllowed&&<p className="text-xs text-amber-800">Выберите минимум один вид уборки.</p>}
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
 {notice&&<p role="status" className="text-xs cg-muted">{notice}</p>}
 <Link href="/cleaner/jobs" className="cg-press cg-card flex items-center justify-between gap-2 p-3.5 text-sm font-semibold text-[#137D79]">К заказам <ArrowRight size={17}/></Link>
 <div className="flex items-start gap-2 px-1 text-[11px] leading-4 cg-muted"><ShieldCheck size={16} className="shrink-0 text-[#137D79]"/> Рабочая геопозиция используется для подбора заказов. Это не непрерывное отслеживание поездки.</div>
 </div>}
 </AppPageShell>;
}
