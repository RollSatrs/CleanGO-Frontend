"use client";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function OrderSkeleton({rows=3,label="Загружаем заказы…",detail=false}:{rows?:number;label?:string;detail?:boolean}){
  return <div role="status" aria-live="polite" className="space-y-2.5">
    <p className="flex items-center gap-2 text-xs cg-muted"><LoaderCircle size={15} className="cg-loading-spin text-[#137D79]" aria-hidden="true"/>{label}</p>
    {Array.from({length:rows},(_,i)=><div key={i} aria-hidden="true" className={`cg-card cg-skeleton-card p-2.5 ${detail?"space-y-3":"flex items-center gap-3"}`}>
      <div className={`cg-skeleton rounded-xl ${detail?"aspect-[2.65/1] w-full":"h-[100px] w-[29%] shrink-0"}`}/>
      <div className="min-w-0 flex-1 space-y-2"><div className="cg-skeleton h-4 w-2/5 rounded-full"/><div className="cg-skeleton h-5 w-1/2 rounded-md"/><div className="cg-skeleton h-3 w-4/5 rounded-full"/><div className="cg-skeleton h-3 w-3/5 rounded-full"/></div>
    </div>)}
  </div>;
}

export function RefreshButton({busy,label="Обновить",className="",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{busy:boolean;label?:string}){
  return <button {...props} type="button" disabled={props.disabled||busy} aria-busy={busy} className={`cg-press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E6E7E4] bg-white px-3 text-xs font-semibold text-[#137D79] disabled:opacity-60 ${className}`}>
    <RefreshCw size={15} className={busy?"cg-loading-spin":""} aria-hidden="true"/>{busy?"Обновляем…":label}
  </button>;
}

export function OrderPagination({page,total,busy,onChange,direction}:{page:number;total:number;busy:boolean;onChange:(page:number)=>void;direction?:-1|1|null}){
  const pages=Math.max(1,Math.ceil(total/5));
  if(pages<=1&&page===1)return null;
  return <div className="flex items-center justify-between gap-2 py-1" aria-label="Страницы заказов">
    <button type="button" disabled={busy||page<=1} onClick={()=>onChange(page-1)} className="cg-press flex h-10 items-center gap-1 rounded-xl border border-[#E6E7E4] bg-white px-3 text-xs font-semibold disabled:opacity-40">{busy&&direction===-1?<LoaderCircle size={15} className="cg-loading-spin"/>:<ChevronLeft size={15}/>} Назад</button>
    <span className="flex items-center gap-1.5 text-xs cg-muted" role="status">{busy&&!direction&&<LoaderCircle size={13} className="cg-loading-spin"/>}{page} из {Math.max(page,pages)}</span>
    <button type="button" disabled={busy||page>=pages} onClick={()=>onChange(page+1)} className="cg-press flex h-10 items-center gap-1 rounded-xl border border-[#E6E7E4] bg-white px-3 text-xs font-semibold disabled:opacity-40">Далее {busy&&direction===1?<LoaderCircle size={15} className="cg-loading-spin"/>:<ChevronRight size={15}/>}</button>
  </div>;
}
