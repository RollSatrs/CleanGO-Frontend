"use client";
import { useEffect,useState } from "react";
import { ArrowLeft,ChevronRight,RefreshCw,Star,CalendarDays } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import ServiceImage from "@/components/ServiceImage";
import PhotoReport from "@/components/PhotoReport";
import { AppCard } from "@/components/ui/clean-go";
type Job={id:string;cleaningType:string;area:number;price:number|null;status:string;createdAt:string;completionSubmittedAt?:string|null;clientConfirmedAt?:string|null;rating?:number|null;reviewText?:string|null;inspectionMethod?:string;completionPhotos?:string[]|null};
const labels:Record<string,string>={regular:"Поддерживающая уборка",general:"Генеральная уборка",renovation:"После ремонта"};
const statuses:Record<string,string>={pending_confirmation:"Ожидает подтверждения",disputed:"На рассмотрении",completed:"Завершён",cancelled:"Отменён",unassigned:"Не назначен",expired:"Истёк",failed:"Не выполнен",no_cleaner:"Не назначен"};
const date=(value:string)=>new Date(value).toLocaleString("ru-RU",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const price=(value:number|null)=>value==null?"Цена уточняется":Number(value).toLocaleString("ru-RU")+" ₸";

export default function CleanerHistory(){
 const {token,user}=useAuth();
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<string|null>(null);
 const [result,setResult]=useState<{key:string;items:Job[];total:number}|null>(null);
 const [detail,setDetail]=useState<{key:string;item:Job}|null>(null);
 const [error,setError]=useState("");
 const [attempt,setAttempt]=useState(0);
 const key=(user?.id??"")+":"+page, detailKey=(user?.id??"")+":"+selected;
 useEffect(()=>{
   if(!token||user?.role!=="cleaner"||!user.phoneVerifiedAt||selected)return;
   let active=true,inFlight=false;
   const load=async()=>{if(inFlight)return;inFlight=true;
     try{const response=await fetch(`/api/backend/orders/cleaner/history?page=${page}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
       if(!response.ok)throw new Error("Не удалось загрузить историю");
       const data=await response.json() as {items:Job[];total:number};if(active){setResult({key,...data});setError("");if(page>1&&data.items.length===0)setPage(Math.max(1,Math.ceil(data.total/5)));}}
     catch(e){if(active)setError(e instanceof Error?e.message:"Ошибка загрузки");}finally{inFlight=false;}
   };void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);
   return()=>{active=false;window.clearInterval(timer);};
 },[token,user?.role,user?.phoneVerifiedAt,page,key,selected,attempt]);
 useEffect(()=>{
   if(!token||!selected||user?.role!=="cleaner"||!user.phoneVerifiedAt)return;
   let active=true,inFlight=false;
   const load=async()=>{if(inFlight)return;inFlight=true;try{
     const response=await fetch(`/api/backend/orders/cleaner/history/${encodeURIComponent(selected)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
     if(!response.ok)throw new Error(response.status===404?"Заказ недоступен":"Не удалось загрузить заказ");
     const item=await response.json() as Job;if(active){setDetail({key:detailKey,item});setError("");}
   }catch(e){if(active){setDetail(null);setError(e instanceof Error?e.message:"Ошибка загрузки");}}finally{inFlight=false;}};
   void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);
   return()=>{active=false;window.clearInterval(timer);};
 },[token,selected,detailKey,user?.role,user?.phoneVerifiedAt,attempt]);
 if(user?.role!=="cleaner"||!user.phoneVerifiedAt)return null;
 const items=result?.key===key?result.items:null;
 const job=detail?.key===detailKey?detail.item:null;
 return <div className="space-y-3">
 {selected&&<button type="button" onClick={()=>{setSelected(null);setDetail(null);setError("");}} className="flex items-center gap-2 text-xs font-semibold text-[#137D79]"><ArrowLeft size={17}/> К истории</button>}
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
 {selected?job?<><AppCard className="!p-2.5"><ServiceImage type={job.cleaningType} className="aspect-[2.65/1] w-full rounded-xl" sizes="90vw" illustrative/><div className="p-2"><span className="cg-soft rounded-full px-2 py-1 text-[11px] font-semibold">{statuses[job.status]??"Статус уточняется"}</span><p className="mt-2 text-2xl font-bold">{price(job.price)}</p><p className="text-[11px] cg-muted">Стоимость заказа · не выплата</p><p className="mt-2 text-sm font-semibold">{labels[job.cleaningType]??"Уборка"} · {job.area} м²</p><p className="mt-1 text-xs cg-muted">Заказ №{job.id.slice(0,8).toUpperCase()} · {date(job.createdAt)}</p></div></AppCard>
 <AppCard><h2 className="text-sm font-semibold">Результат работы</h2><p className="mt-2 text-xs cg-muted">{job.status==="pending_confirmation"?"Результат отправлен. Клиент ещё не подтвердил уборку.":job.status==="disputed"?"Клиент сообщил о проблеме. Заказ ожидает рассмотрения.":job.status==="completed"?"Клиент подтвердил уборку.":"Заказ закрыт без подтверждения уборки."}</p>{job.completionSubmittedAt&&<p className="mt-2 text-xs">Отправлено: {date(job.completionSubmittedAt)}</p>}{job.clientConfirmedAt&&<p className="mt-1 text-xs">Подтверждено: {date(job.clientConfirmedAt)}</p>}</AppCard>
 {!!job.completionPhotos?.length&&<AppCard><h2 className="mb-2 text-sm font-semibold">Фотоотчёт · {job.completionPhotos.length}</h2><PhotoReport photos={job.completionPhotos}/></AppCard>}
 {job.status==="completed"&&<AppCard><h2 className="text-sm font-semibold">Отзыв клиента</h2>{job.rating!=null?<><p className="mt-2 flex items-center gap-1.5 font-semibold"><Star size={16} className="fill-[#E9B54E] text-[#E9B54E]"/>{Number(job.rating).toFixed(1)}</p>{job.reviewText&&<p className="mt-2 break-words text-xs">{job.reviewText}</p>}</>:<p className="mt-2 text-xs cg-muted">Оценка ещё не оставлена.</p>}</AppCard>}
 </>:!error&&<p className="text-xs cg-muted">Загружаем заказ…</p>:<>
 {!items&&!error&&<p className="text-xs cg-muted">Загружаем историю…</p>}
 {items?.length===0&&!error&&<AppCard><h2 className="font-semibold">История пока пуста</h2><p className="mt-2 text-xs cg-muted">После отправки результата заказ появится здесь.</p></AppCard>}
 {items?.map(item=><button type="button" key={item.id} onClick={()=>{setSelected(item.id);setDetail(null);setError("");}} className="cg-card flex w-full items-center gap-3 p-2.5 text-left"><ServiceImage type={item.cleaningType} className="h-[100px] w-[28%] shrink-0 rounded-xl" sizes="28vw" illustrative/><div className="min-w-0 flex-1"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status==="disputed"?"bg-amber-50 text-amber-800":"cg-soft"}`}>{statuses[item.status]??"Статус уточняется"}</span><p className="mt-2 text-lg font-bold">{price(item.price)}</p><p className="text-xs font-medium">{labels[item.cleaningType]??"Уборка"} · {item.area} м²</p><p className="mt-1 flex items-center gap-1 text-[11px] cg-muted"><CalendarDays size={12}/>{date(item.createdAt)}</p>{item.rating!=null&&<p className="mt-1 flex items-center gap-1 text-xs"><Star size={12} className="fill-[#E9B54E] text-[#E9B54E]"/>{Number(item.rating).toFixed(1)}</p>}</div><ChevronRight size={16} className="shrink-0 cg-muted"/></button>)}
 {result?.key===key&&result.total>5&&<div className="flex items-center justify-between gap-2"><button type="button" disabled={page===1} onClick={()=>{setPage(p=>p-1);setError("");}} className="cg-card px-3 py-2 text-xs disabled:opacity-40">Назад</button><span className="text-xs cg-muted">{page} из {Math.ceil(result.total/5)}</span><button type="button" disabled={page*5>=result.total} onClick={()=>{setPage(p=>p+1);setError("");}} className="cg-card px-3 py-2 text-xs disabled:opacity-40">Далее</button></div>}
 </>}
 <button type="button" onClick={()=>{setError("");setAttempt(a=>a+1);}} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E6E7E4] bg-white py-2.5 text-xs font-semibold text-[#137D79]"><RefreshCw size={14}/> Обновить</button>
 </div>;
}
