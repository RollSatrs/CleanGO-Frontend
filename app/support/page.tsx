"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Headphones,ShieldCheck,RefreshCw} from "lucide-react";
import {useAuth} from "@/components/providers/AuthProvider";
import {AppPageShell,AppCard,AppButton} from "@/components/ui/clean-go";
type Case={id:string;orderId:string;kind:string;reason:string;comment:string|null;status:string;response:string|null;createdAt:string};
const labels:Record<string,string>={issue:"Проблема с заказом",review_report:"Жалоба на отзыв",release:"Неявка клиента",cancel:"Отмена заказа"};
const statuses:Record<string,string>={open:"Ожидает рассмотрения",in_review:"На рассмотрении",resolved:"Решено"};
export default function SupportPage(){
 const {token,user}=useAuth();const role=user?.role==="cleaner"?"cleaner":"client";
 const [items,setItems]=useState<Case[]>([]),[page,setPage]=useState(1),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[staff,setStaff]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!token)return;const ac=new AbortController();setLoading(true);setError("");setItems([]);setStaff(false);
 const request=(path:string)=>fetch("/api/backend/support/"+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:ac.signal});
 void request("mine?page="+page).then(async r=>{if(!r.ok)throw Error("Не удалось загрузить обращения");const data=await r.json();if(!ac.signal.aborted){setItems(data.items);setMore(data.hasMore);}}).catch(e=>{if(!ac.signal.aborted)setError(e.message);}).finally(()=>{if(!ac.signal.aborted)setLoading(false);});
 void request("access").then(async r=>{if(r.ok){const data=await r.json();if(!ac.signal.aborted)setStaff(data.staff===true);}}).catch(()=>{});
 return()=>ac.abort();},[token,page,attempt]);
 return <AppPageShell role={role} eyebrow="Поддержка" title="Мои обращения" description="Статус и ответы по вашим обращениям.">
 <Link href={role==="cleaner"?"/cleaner/profile":"/client/profile"} className="flex items-center gap-2 text-sm text-[#137D79]"><ArrowLeft size={16}/>Назад в профиль</Link>
 {staff&&<Link href="/support/admin" className="cg-card flex items-center gap-3 p-4 text-sm font-semibold"><ShieldCheck size={20}/>Панель сотрудника<ArrowRight size={16} className="ml-auto"/></Link>}
 <AppButton variant="secondary" onClick={()=>setAttempt(x=>x+1)} loading={loading}><RefreshCw size={16}/>Обновить</AppButton>
 {error&&<AppCard><p role="alert" className="text-sm text-red-700">{error}</p></AppCard>}
 {!loading&&!error&&items.length===0&&<AppCard><Headphones size={24} className="text-[#137D79]"/><p className="mt-2 font-semibold">Обращений пока нет</p><p className="mt-1 text-xs text-[#697174]">Сообщить о проблеме можно в карточке заказа, а о нарушении в отзыве — через жалобу на отзыв.</p></AppCard>}
 {items.map(item=><AppCard key={item.id}><div className="flex justify-between gap-2"><strong className="text-sm">{labels[item.kind]??"Обращение"}</strong><span className="text-xs text-[#137D79]">{statuses[item.status]??item.status}</span></div><p className="mt-1 text-xs text-[#697174]">Заказ №{item.orderId.slice(0,8)} · {new Date(item.createdAt).toLocaleDateString("ru-RU")}</p>{item.comment&&<p className="mt-3 whitespace-pre-wrap break-words text-sm">{item.comment}</p>}{item.response&&<div className="mt-3 rounded-xl bg-[#EFF7F5] p-3 text-sm"><b className="text-xs">Ответ поддержки</b><p className="mt-1 whitespace-pre-wrap break-words">{item.response}</p></div>}</AppCard>)}
 <div className="flex justify-between"><AppButton variant="ghost" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Назад</AppButton><AppButton variant="ghost" disabled={!more||loading} onClick={()=>setPage(p=>p+1)}>Далее</AppButton></div>
 </AppPageShell>;
}
