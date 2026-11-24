"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, X, ZoomIn } from "lucide-react";

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
    <div className="space-y-2">
      {editable&&<div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#15191D]">Фотоотчёт</p>
        <span className="text-xs cg-muted tabular-nums">{photos.length} из 5 фото</span>
      </div>}
      {editable&&<input ref={input} type="file" accept="image/*" multiple hidden disabled={busy||disabled||remaining<=0} onChange={event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value="";if(files.length)onAdd?.(files);}}/>}
      <div className="cg-photo-strip">
        {photos.map((src,index)=><div key={index} className="relative min-w-0">
          <button type="button" onClick={()=>setView(index)} aria-label={`Посмотреть фото ${index+1}`} className="relative block aspect-square w-full overflow-hidden rounded-[11px] bg-[#EDEDE9]">
            <img src={src} alt={`Фото уборки ${index+1}`} className="h-full w-full object-cover"/>
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 p-1 text-white"><ZoomIn size={13}/></span>
          </button>
          {editable&&onRemove&&<button type="button" disabled={busy||disabled} onClick={()=>onRemove(index)} aria-label={`Удалить фото ${index+1}`} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-[#182B27]/85 text-white disabled:opacity-40"><X size={16}/></button>}
        </div>)}
        {editable&&remaining>0&&<button type="button" disabled={busy||disabled} onClick={()=>input.current?.click()} aria-label="Добавить фотографии" className="cg-add-photo flex flex-col items-center justify-center gap-1 rounded-[11px] border border-dashed border-[#C9D6D3] bg-[#F1F2EF] text-[#137D79] disabled:opacity-60">
          {busy?<LoaderCircle size={22} className="animate-spin"/>:<ImagePlus size={23}/>}
          <span className="text-[10px] font-semibold">{busy?"Загрузка":"Добавить"}</span>
        </button>}
      </div>
      {editable&&<p className="text-[11px] leading-4 cg-muted" role="status">{busy?"Подготавливаем фотографии…":required&&photos.length<3?`Добавьте ещё ${3-photos.length} фото для завершения.`:photos.length?"Нажмите на снимок для просмотра.": "Фотографии по желанию."}</p>}
      {view!==null&&<PhotoViewer photos={photos} startIndex={view} onClose={()=>setView(null)}/>}
    </div>
  );
}
