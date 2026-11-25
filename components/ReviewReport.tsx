"use client";
import {useRef,useState} from "react";
import {Flag,LoaderCircle,CheckCircle2} from "lucide-react";
import {useAuth} from "@/components/providers/AuthProvider";

const reasons=[["abuse","Оскорбления или угрозы"],["personal_data","Личные данные"],["irrelevant","Не относится к уборке"],["other","Другое"]];
export default function ReviewReport({orderId,reported=false}:{orderId:string;reported?:boolean}){
 const {token}=useAuth();
 const [open,setOpen]=useState(false),[reason,setReason]=useState(""),[comment,setComment]=useState(""),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const lock=useRef(false);
 async function submit(){
  if(!token||lock.current||!reason||(reason==="other"&&!comment.trim()))return;
  lock.current=true;setBusy(true);setError("");
  try{
   const response=await fetch(`/api/backend/orders/${encodeURIComponent(orderId)}/review-report`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({reason,comment})});
   const result=await response.json().catch(()=>null);
   if(!response.ok)throw Error(typeof result?.message==="string"?result.message:"Не удалось отправить жалобу");
   setSent(true);setOpen(false);
  }catch(e){setError(e instanceof Error?e.message:"Ошибка соединения");}
  finally{lock.current=false;setBusy(false);}
 }
 if(reported||sent)return <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-[#137D79]"><CheckCircle2 size={14}/> Жалоба зарегистрирована. Оценка не удаляется автоматически.</p>;
 if(!open)return <button type="button" onClick={()=>setOpen(true)} className="cg-press mt-3 flex items-center gap-1.5 text-xs font-semibold cg-muted"><Flag size={14}/> Пожаловаться на отзыв</button>;
 return <div className="cg-order-enter mt-3 space-y-2.5 rounded-xl border border-[#E6E7E4] p-3">
 <p className="text-xs font-semibold">Причина жалобы</p>
 {reasons.map(([id,label])=><label key={id} className="flex items-center gap-2 text-xs"><input type="radio" name={"review-"+orderId} checked={reason===id} disabled={busy} onChange={()=>setReason(id)} className="accent-[#137D79]"/>{label}</label>)}
 <textarea aria-label="Комментарий к жалобе" value={comment} disabled={busy} maxLength={1000} rows={3} onChange={e=>setComment(e.target.value)} placeholder={reason==="other"?"Уточните причину":"Комментарий (необязательно)"} className="cg-field w-full p-2.5 text-sm"/>
 <p className="text-[11px] cg-muted">Низкая оценка сама по себе не является основанием для удаления. Жалоба будет сохранена для рассмотрения.</p>
 {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 <div className="flex gap-2"><button type="button" disabled={busy||!reason||(reason==="other"&&!comment.trim())} onClick={()=>void submit()} className="cg-primary cg-press flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold disabled:opacity-40">{busy&&<LoaderCircle size={14} className="cg-loading-spin"/>} Отправить</button><button type="button" disabled={busy} onClick={()=>setOpen(false)} className="cg-press rounded-xl border px-3 text-xs">Назад</button></div>
 </div>;
}
