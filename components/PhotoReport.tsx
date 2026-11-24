"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, X, ZoomIn } from "lucide-react";

type Props = {
  photos: readonly string[];
  onAdd?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  busy?: boolean;
  disabled?: boolean;
  required?: boolean;
};

function PhotoViewer({photos, startIndex, onClose}: {photos: readonly string[]; startIndex:number; onClose:()=>void}) {
  const [index,setIndex]=useState(startIndex);
  const dialog=useRef<HTMLDialogElement>(null);
  const start=useRef<{x:number;y:number}|null>(null);
  const current=Math.min(index,photos.length-1);

  useEffect(()=>{
    const node=dialog.current;
    if(!node)return;
    node.showModal();
    return ()=>{if(node.open)node.close();};
  },[]);
  useEffect(()=>{
    if(!photos.length)onClose();
  },[photos.length,onClose]);

  const move=(delta:number)=>setIndex(value=>Math.max(0,Math.min(photos.length-1,value+delta)));
  return (
    <dialog ref={dialog} onCancel={event=>{event.preventDefault();onClose();}}
      onKeyDown={event=>{if(event.key==="ArrowLeft")move(-1);if(event.key==="ArrowRight")move(1);}}
      aria-label="Просмотр фотографий уборки"
      className="cleango-photo-viewer fixed inset-0 m-0 overflow-hidden bg-[#101D20] p-0 text-white backdrop:bg-[#101D20]">
      <div className="cleango-photo-viewer-content flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 py-2">
          <div><p className="text-sm font-bold">Фотоотчёт</p><p className="mt-1 text-xs text-white/60">{current+1} из {photos.length}</p></div>
          <button type="button" autoFocus onClick={onClose} aria-label="Закрыть просмотр" className="grid h-11 w-11 place-items-center rounded-full bg-white/10"><X size={22}/></button>
        </header>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          onTouchStart={event=>{const t=event.touches[0];start.current=event.touches.length===1?{x:t.clientX,y:t.clientY}:null;}}
          onTouchEnd={event=>{const from=start.current;start.current=null;const t=event.changedTouches[0];if(!from||!t)return;const dx=t.clientX-from.x,dy=t.clientY-from.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)move(dx<0?1:-1);}}>
          {current>=0&&<img src={photos[current]} alt={`Фото результата ${current+1}`} draggable={false} className="h-full w-full select-none object-contain"/>}
          {current>0&&<button type="button" onClick={()=>move(-1)} aria-label="Предыдущее фото" className="absolute left-0 grid h-11 w-11 place-items-center rounded-full bg-black/55"><ChevronLeft size={24}/></button>}
          {current<photos.length-1&&<button type="button" onClick={()=>move(1)} aria-label="Следующее фото" className="absolute right-0 grid h-11 w-11 place-items-center rounded-full bg-black/55"><ChevronRight size={24}/></button>}
        </div>
        <div className="cleango-photo-viewer-thumbnails mt-3 flex shrink-0 justify-center gap-2 overflow-x-auto py-2">
          {photos.map((src,i)=><button type="button" key={i} onClick={()=>setIndex(i)} aria-label={`Открыть фото ${i+1}`} aria-current={i===current?"true":undefined} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 ${i===current?"border-[#81D4CD]":"border-transparent opacity-60"}`}><img src={src} alt="" className="h-full w-full object-cover"/></button>)}
        </div>
      </div>
    </dialog>
  );
}

export default function PhotoReport({photos,onAdd,onRemove,busy=false,disabled=false,required=true}:Props){
  const [view,setView]=useState<number|null>(null);
  const input=useRef<HTMLInputElement>(null);
  const editable=Boolean(onAdd);
  const remaining=5-photos.length;
  return (
    <div className="space-y-2.5">
      {editable&&<div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#D9EFED] text-[#137D79]"><Camera size={22}/></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#152535]">Фотоотчёт</p><p className="mt-0.5 text-xs text-[#6B847C]">{required?"Добавьте 3–5 фотографий":"До 5 фотографий, по желанию"}</p></div>
        <span className="rounded-full bg-[#EDEEEB] px-2.5 py-1 text-xs font-bold tabular-nums text-[#176E6B]">{photos.length}/5</span>
      </div>}
      {editable&&<div className="flex h-1.5 gap-1" aria-hidden="true">{Array.from({length:5},(_,i)=><span key={i} className={`flex-1 rounded-full ${i<photos.length?"bg-[#259E9B]":"bg-[#E6E7E4]"}`}/>)}</div>}
      {photos.length>0&&<div className="grid grid-cols-3 gap-2">
        {photos.map((src,index)=><div key={index} className="relative min-w-0">
          <button type="button" onClick={()=>setView(index)} aria-label={`Посмотреть фото ${index+1}`} className="relative block aspect-square w-full overflow-hidden rounded-xl border border-[#E6E7E4] bg-[#EDEDE9]">
            <img src={src} alt={`Фото уборки ${index+1}`} className="h-full w-full object-cover"/>
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 pb-1 pt-4 text-[11px] font-bold text-white"><span>{index+1}</span><ZoomIn size={14}/></span>
          </button>
          {editable&&onRemove&&<button type="button" disabled={busy||disabled} onClick={()=>onRemove(index)} aria-label={`Удалить фото ${index+1}`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-[#182B27]/85 text-white disabled:opacity-40"><X size={16}/></button>}
        </div>)}
      </div>}
      {editable&&<>
        <input ref={input} type="file" accept="image/*" multiple hidden disabled={busy||disabled||remaining<=0} onChange={event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value="";if(files.length)onAdd?.(files);}}/>
        {remaining>0&&<button type="button" disabled={busy||disabled} onClick={()=>input.current?.click()} className="flex min-h-[76px] w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[#C2D5D2] bg-[#F7F7F5] px-3 py-3 text-left disabled:opacity-60">
          {busy?<LoaderCircle size={24} className="shrink-0 animate-spin text-[#137D79]"/>:<ImagePlus size={26} className="shrink-0 text-[#079B8D]"/>}
          <span><span className="block text-sm font-bold text-[#137D79]">{busy?"Подготавливаем фото…":photos.length?"Добавить ещё фото":"Добавить фотографии"}</span><span className="mt-0.5 block text-[11px] text-[#6B847C]">{busy?"Пожалуйста, не закрывайте экран":`Камера или галерея · осталось ${remaining}`}</span></span>
        </button>}
        {required&&photos.length<3&&!busy&&<p className="text-xs text-[#6B847C]">Для завершения уборки нужно ещё {3-photos.length} фото.</p>}
        {photos.length>0&&<p className="text-[11px] text-[#789087]">Нажмите на фото, чтобы открыть его полностью.</p>}
      </>}
      {view!==null&&<PhotoViewer photos={photos} startIndex={view} onClose={()=>setView(null)}/>}
    </div>
  );
}
