"use client";
import {useEffect,useRef,useState} from "react";
import {AlertCircle,Clock3,LoaderCircle,Camera,CheckCircle2} from "lucide-react";
import {useAuth} from "@/components/providers/AuthProvider";
import PhotoReport from "@/components/PhotoReport";

type Action="cancel"|"release"|"replacement"|"issue"|"wait";
type Reason={id:string;label:string};
const reasons:Record<string,Reason>=Object.fromEntries([
 ["changed_plans","Изменились планы"],["wrong_address","Неверный адрес"],["cleaner_delay","Клинер задерживается"],["cleaner_unreachable","Клинер не отвечает"],["client_absent","Клиент не открывает дверь"],["client_unreachable","Клиент не отвечает"],["unsafe","Небезопасные условия"],["illness","Плохое самочувствие"],["equipment","Проблема с оборудованием"],["quality","Проблема с качеством уборки"],["other","Другая причина"]
].map(([id,label])=>[id,{id,label}]));
function options(role:"client"|"cleaner",status:string,action:Action){
 if(action==="replacement")return status==="replacement_pending"?["changed_plans"]:["cleaner_delay","cleaner_unreachable","other"];
 if(action==="cancel")return ["changed_plans","wrong_address",...(status==="pending"||status==="replacement_pending"?[]:["cleaner_delay","cleaner_unreachable"]), "other"];
 if(role==="cleaner")return [...(status==="arrived"?["client_absent","client_unreachable"]:[]),"unsafe","illness","equipment","wrong_address","other"];
 return ["quality","unsafe","cleaner_delay","cleaner_unreachable","other"];
}
async function compress(file:File):Promise<string>{
 if(file.size>10*1024*1024||!file.type.startsWith("image/"))throw Error("Выберите изображение до 10 МБ");
 const url=URL.createObjectURL(file);
 try{
 const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("Не удалось открыть фото"));image.src=url;});
 const canvas=document.createElement("canvas"),scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));
 canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Не удалось обработать фото");ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
 for(const quality of [.75,.6,.45,.3]){const data=canvas.toDataURL("image/jpeg",quality);if(data.startsWith("data:image/jpeg;base64,")&&data.length<=400000)return data;}
 throw Error("Фото слишком большое");
 }finally{URL.revokeObjectURL(url);}
}
export default function OrderException({orderId,status,role,onDone,disabled=false}:{orderId:string;status:string;role:"client"|"cleaner";onDone:()=>void|Promise<void>;disabled?:boolean}){
 const {token}=useAuth();
 const [action,setAction]=useState<Action|null>(null),[reason,setReason]=useState(""),[comment,setComment]=useState(""),[photos,setPhotos]=useState<string[]>([]);
 const [busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [waitStarted,setWaitStarted]=useState<string|null>(null),[now,setNow]=useState(0);
 const requestId=useRef<string|null>(null),lock=useRef(false);
 const canCancel=role==="client"&&["pending","accepted","en_route","arrived","replacement_pending"].includes(status);
 const canReplace=role==="client"&&["accepted","en_route","replacement_pending"].includes(status);
 const canRelease=role==="cleaner"&&["accepted","en_route","arrived"].includes(status);
 const canIssue=["accepted","en_route","arrived","in_progress","pending_confirmation"].includes(status)||(role==="client"&&status==="completed");
 const canWait=role==="cleaner"&&status==="arrived";
 useEffect(()=>{
   if(!canWait||!token)return;
   let alive=true;setNow(Date.now());
   const refresh=async()=>{try{const res=await fetch(`/api/backend/orders/${encodeURIComponent(orderId)}/exception`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});if(res.ok){const data=await res.json();if(alive)setWaitStarted(data.waitStartedAt??null);}}catch{/* preserve known timer */}};
   void refresh();const timer=window.setInterval(()=>setNow(Date.now()),1000);
   return()=>{alive=false;window.clearInterval(timer);};
 },[canWait,token,orderId]);
 const left=waitStarted?Math.max(0,Math.ceil((Date.parse(waitStarted)+600000-now)/1000)):600;
 const noShow=["client_absent","client_unreachable"].includes(reason);
 function open(next:Action){if(lock.current)return;setAction(next);setReason(next==="replacement"&&status==="replacement_pending"?"changed_plans":"");setComment("");setPhotos([]);setError("");setNotice("");requestId.current=null;}
 async function addPhotos(files:File[]){if(lock.current||photoBusy)return;setPhotoBusy(true);setError("");try{if(files.length>3-photos.length)throw Error("Не более 3 фотографий");const items=await Promise.all(files.map(compress));setPhotos(v=>[...v,...items]);requestId.current=null;}catch(e){setError(e instanceof Error?e.message:"Ошибка фото");}finally{setPhotoBusy(false);}}
 async function submit(next:Action){
   if(!token||lock.current||disabled)return;
   if(next!=="wait"&&(!reason||reason==="other"&&!comment.trim())){setError("Укажите причину и при необходимости комментарий");return;}
   if(next!=="wait"&&noShow&&(!waitStarted||left>0)){setError("Сначала дождитесь окончания 10 минут ожидания");return;}
   lock.current=true;setBusy(true);setError("");setNotice("");
   const id=next==="wait"?crypto.randomUUID():(requestId.current??=crypto.randomUUID());
   try{
      const response=await fetch(`/api/backend/orders/${encodeURIComponent(orderId)}/exception`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action:next,reason:next==="wait"?"client_absent":reason,expectedStatus:status,requestId:id,...(next==="wait"?{}:{comment,photos})})});
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw Error(typeof data?.message==="string"?data.message:"Не удалось отправить. Проверьте соединение и повторите.");
      if(next==="wait"){setWaitStarted(data.waitStartedAt);setNow(Date.now());setNotice("Ожидание начато");}
      else{setNotice(next==="issue"?"Обращение зарегистрировано":"Действие подтверждено");setAction(null);requestId.current=null;await onDone();}
   }catch(e){setError(e instanceof Error?e.message:"Ошибка соединения. Повторите отправку.");}
   finally{lock.current=false;setBusy(false);}
 }
 if(!canCancel&&!canReplace&&!canRelease&&!canIssue&&!canWait)return null;
 return <div className="cg-card space-y-2.5 p-3">
 <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertCircle size={17} className="text-[#697174]"/> Помощь с заказом</h2>
 {canWait&&<div className="rounded-xl bg-[#F4F5F2] p-3"><p className="flex items-center gap-2 text-xs font-semibold"><Clock3 size={15}/> Клиент не открывает дверь?</p>{waitStarted?<p className="mt-2 text-lg font-bold tabular-nums">{left>0?`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`:"Время ожидания прошло"}</p>:<button type="button" disabled={busy||disabled} onClick={()=>void submit("wait")} className="cg-press mt-2 text-xs font-semibold text-[#137D79]">Начать ожидание · 10 мин</button>}<p className="mt-1 text-[11px] cg-muted">Таймер не устанавливает виновность автоматически. При опасности ждать не нужно.</p></div>}
 {!action&&<div className="space-y-2">{canReplace&&<button type="button" disabled={disabled||busy} onClick={()=>open("replacement")} className="cg-press cg-primary min-h-10 w-full rounded-xl text-xs font-semibold disabled:opacity-50">{status==="replacement_pending"?"Найти другого клинера":"Запросить замену"}</button>}
 {canCancel&&<button type="button" disabled={disabled||busy} onClick={()=>open("cancel")} className="cg-press min-h-10 w-full rounded-xl border border-[#E6E7E4] text-xs font-semibold text-red-700 disabled:opacity-50">Отменить заказ</button>}
 {canRelease&&<button type="button" disabled={disabled||busy} onClick={()=>open("release")} className="cg-press min-h-10 w-full rounded-xl border border-[#E6E7E4] text-xs font-semibold text-red-700 disabled:opacity-50">Отказаться от заказа</button>}
 {canIssue&&<button type="button" disabled={disabled||busy} onClick={()=>open("issue")} className="cg-press min-h-10 w-full rounded-xl border border-[#E6E7E4] text-xs font-semibold text-[#137D79]">Сообщить о проблеме</button>}</div>}
 {action&&<div className="cg-order-enter space-y-3 rounded-xl border border-[#E6E7E4] p-3">
 <p className="text-sm font-bold">{action==="cancel"?"Отмена заказа":action==="replacement"?"Замена исполнителя":action==="release"?"Отказ от заказа":"Что произошло?"}</p>
 {action==="replacement"&&status==="replacement_pending"?<p className="text-xs cg-muted">Подтвердите повторный поиск. Адрес, площадь и цена сохранятся.</p>:<div className="space-y-1.5">{options(role,status,action).map(id=><label key={id} className="flex items-center gap-2 rounded-lg bg-[#F4F5F2] p-2 text-xs"><input type="radio" name={`reason-${orderId}`} checked={reason===id} disabled={busy} onChange={()=>{setReason(id);requestId.current=null;}} className="accent-[#137D79]"/>{reasons[id].label}</label>)}</div>}
 <textarea value={comment} disabled={busy} onChange={e=>{setComment(e.target.value);requestId.current=null;}} maxLength={1000} rows={3} placeholder={reason==="other"?"Уточните причину (обязательно)":"Комментарий (необязательно)"} className="cg-field w-full p-2.5 text-sm"/>
 {(action==="issue"||action==="release")&&<><p className="flex items-center gap-1.5 text-xs font-semibold"><Camera size={14}/> Фото по желанию · до 3</p><PhotoReport photos={photos} busy={photoBusy} disabled={busy||photoBusy||photos.length>=3} onAdd={files=>void addPhotos(files)} onRemove={i=>{if(!busy&&!photoBusy){setPhotos(v=>v.filter((_,j)=>j!==i));requestId.current=null;}}}/></>}
 <p className="text-[11px] leading-4 cg-muted">{action==="issue"?"Обращение сохраняется для рассмотрения. При незавершённом заказе обычные переходы приостанавливаются.":action==="release"?"Клиент сможет подтвердить замену или отменить заказ. При неявке создаётся спор.":"Действие изменит текущий статус заказа."} Денежные штрафы и выплаты не применяются автоматически.</p>
 <div className="flex gap-2"><button type="button" disabled={busy||photoBusy||!reason||disabled||(noShow&&(!waitStarted||left>0))} onClick={()=>void submit(action)} className="cg-press cg-primary flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold disabled:opacity-50">{busy&&<LoaderCircle size={15} className="cg-loading-spin"/>} Подтвердить</button><button type="button" disabled={busy||photoBusy} onClick={()=>{setAction(null);setError("");}} className="cg-press rounded-xl border px-3 text-xs">Назад</button></div>
 </div>}
 {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 {notice&&<p role="status" className="flex items-center gap-1 text-xs text-[#137D79]"><CheckCircle2 size={14}/>{notice}</p>}
 </div>;
}
