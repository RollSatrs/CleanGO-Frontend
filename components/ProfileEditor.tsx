"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard } from "@/components/ui/clean-go";
import { ProfileAvatar } from "@/components/ProfileAvatar";

type Profile={firstName:string|null;lastName:string|null;avatar:string|null;reputation:{completedOrders:number;reviewCount:number;rating:number|null}|null};
async function prepareAvatar(file:File):Promise<string>{
  if(file.size>12*1024*1024|| (file.type&&!file.type.startsWith("image/")))throw new Error("Выберите фотографию до 12 МБ");
  const url=URL.createObjectURL(file);
  try {
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Не удалось открыть фото. Попробуйте JPEG или PNG."));img.src=url;});
    const side=Math.min(image.naturalWidth,image.naturalHeight);
    if(!side)throw new Error("Некорректная фотография");
    const canvas=document.createElement("canvas");canvas.width=canvas.height=Math.min(side,512);
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Не удалось обработать фото");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,canvas.width,canvas.height);
    for(const quality of [0.86,0.72,0.58,0.44,0.30]){
      const encoded=canvas.toDataURL("image/jpeg",quality);
      if(encoded.startsWith("data:image/jpeg;base64,")&&encoded.length<=175000)return encoded;
    }
    throw new Error("Не удалось уменьшить фото. Выберите другое изображение.");
  }finally{URL.revokeObjectURL(url);}
}

export default function ProfileEditor({role}:{role:"client"|"cleaner"}){
  const {token,user,refreshUser}=useAuth();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [editing,setEditing]=useState(false);
  const [first,setFirst]=useState("");
  const [last,setLast]=useState("");
  const [avatar,setAvatar]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [attempt,setAttempt]=useState(0);
  const fileRef=useRef<HTMLInputElement>(null);
  const locked=useRef(false);
  const userId=user?.id;
  useEffect(()=>{
    if(!token||!userId)return;
    let active=true;
    void fetch("/api/backend/auth/profile",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("Не удалось загрузить профиль");
      const data=await response.json() as Profile;if(active){setProfile(data);setError("");}
    }).catch(()=>{if(active)setError("Не удалось загрузить профиль. Попробуйте снова.");});
    return()=>{active=false;};
  },[token,userId,attempt]);

  function edit(){
    if(!profile)return;
    setFirst(profile.firstName??"");setLast(profile.lastName??"");setAvatar(profile.avatar??null);setError("");setNotice("");setEditing(true);
  }
  async function choose(file:File){
    if(locked.current)return;
    locked.current=true;setPhotoBusy(true);setError("");
    try{setAvatar(await prepareAvatar(file));}catch(e){setError(e instanceof Error?e.message:"Ошибка фотографии");}
    finally{locked.current=false;setPhotoBusy(false);}
  }
  async function save(){
    if(!token||locked.current||!profile)return;
    if(!first.trim()){setError("Введите имя");return;}
    locked.current=true;setBusy(true);setError("");
    try{
      const patch={firstName:first.trim(),lastName:last.trim(),...(avatar!==profile.avatar?{avatar}:{})};
      const response=await fetch("/api/backend/auth/profile",{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(patch)});
      const data=await response.json();
      if(!response.ok)throw new Error(typeof data?.message==="string"?data.message:Array.isArray(data?.message)?data.message.join(". "):"Не удалось сохранить профиль");
      setProfile(data as Profile);setEditing(false);setNotice("Профиль обновлён");
      void refreshUser().catch(()=>{});
    }catch(e){setError(e instanceof Error?e.message:"Не удалось сохранить профиль");}
    finally{locked.current=false;setBusy(false);}
  }
  const displayName=[profile?.firstName??user?.firstName,profile?profile.lastName:user?.lastName].filter(Boolean).join(" ");
  return <div className="space-y-3">
    <AppCard className="!p-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <ProfileAvatar name={editing?[first,last].join(" "):displayName} photo={editing?avatar:profile?.avatar} className="h-[76px] w-[76px] text-xl"/>
          {editing&&<button type="button" disabled={busy||photoBusy} onClick={()=>fileRef.current?.click()} aria-label="Выбрать фото" className="cg-primary absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white"><Camera size={15}/></button>}
        </div>
        <div className="min-w-0 flex-1"><p className="break-words text-[19px] font-bold leading-tight">{displayName||"Пользователь CleanGo"}</p><p className="mt-1 text-xs cg-muted">{role==="cleaner"?"Клинер CleanGo":"Клиент CleanGo"}</p></div>
        {!editing&&<button type="button" disabled={!profile||!user?.phoneVerifiedAt} onClick={edit} aria-label="Редактировать профиль" className="cg-icon-button disabled:opacity-40"><Pencil size={17}/></button>}
      </div>
      {editing&&<div className="mt-4 space-y-3 border-t border-[#E6E7E4] pt-4">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value="";if(file)void choose(file);}}/>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy||photoBusy} onClick={()=>fileRef.current?.click()} className="cg-soft flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold"><Camera size={15}/>{photoBusy?"Обработка…":"Выбрать фото"}</button>{avatar&&<button type="button" disabled={busy||photoBusy} onClick={()=>setAvatar(null)} className="flex items-center gap-1.5 rounded-xl border border-[#E6E7E4] px-3 py-2.5 text-xs text-red-700"><Trash2 size={14}/> Удалить</button>}</div>
        <p className="text-[11px] leading-4 cg-muted">Фото видно вам и второй стороне активного назначенного заказа. Кадр обрезается до квадрата.</p>
        <label className="block text-xs font-semibold">Имя<input value={first} onChange={e=>setFirst(e.target.value)} maxLength={60} autoComplete="given-name" className="cg-field mt-1.5 h-11 w-full px-3 text-base font-normal"/></label>
        <label className="block text-xs font-semibold">Фамилия<input value={last} onChange={e=>setLast(e.target.value)} maxLength={60} autoComplete="family-name" className="cg-field mt-1.5 h-11 w-full px-3 text-base font-normal"/></label>
        <div className="flex gap-2"><button type="button" disabled={busy||photoBusy} onClick={()=>void save()} className="cg-primary min-h-11 flex-1 rounded-xl text-sm font-semibold disabled:opacity-50">{busy?"Сохранение…":"Сохранить"}</button><button type="button" disabled={busy||photoBusy} onClick={()=>{setEditing(false);setError("");}} className="min-h-11 rounded-xl border border-[#E6E7E4] px-4 text-sm font-medium">Отмена</button></div>
      </div>}
      {!editing&&profile&&<button type="button" onClick={edit} disabled={!user?.phoneVerifiedAt} className="mt-3 w-full rounded-xl border border-[#E6E7E4] py-2.5 text-xs font-semibold text-[#137D79] disabled:opacity-40">Редактировать профиль</button>}
      {!profile&&!error&&<p className="mt-3 text-xs cg-muted">Загружаем профиль…</p>}
      {error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      {!profile&&error&&<button type="button" onClick={()=>{setError("");setAttempt(i=>i+1);}} className="mt-2 text-xs font-semibold text-[#137D79]">Повторить</button>}
      {notice&&<p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-[#137D79]"><CheckCircle2 size={15}/>{notice}</p>}
    </AppCard>
    {role==="cleaner"&&profile?.reputation&&<AppCard><h2 className="text-sm font-semibold">Моя репутация</h2><div className="mt-3 grid grid-cols-3 gap-2 text-center">{[{value:profile.reputation.rating?.toFixed(1)??"—",label:"Рейтинг"},{value:profile.reputation.completedOrders,label:"Уборок"},{value:profile.reputation.reviewCount,label:"Оценок"}].map(item=><div key={item.label} className="rounded-xl bg-[#F4F5F2] p-2.5"><p className="text-lg font-bold">{item.value}</p><p className="text-[11px] cg-muted">{item.label}</p></div>)}</div></AppCard>}
    <AppCard><div className="flex items-center gap-3"><span className="cg-soft grid h-10 w-10 shrink-0 place-items-center rounded-full"><ShieldCheck size={19}/></span><div className="min-w-0 flex-1"><p className="text-xs cg-muted">Номер телефона</p><p className="mt-1 break-words text-sm font-semibold">{user?.phone||"Не подключён"}</p><p className="mt-1 text-xs cg-muted">{user?.phoneVerifiedAt?"Подтверждён через Telegram":"Требуется подтверждение"}</p></div></div>{!user?.phoneVerifiedAt&&<Link href="/verify-phone" className="mt-3 block text-xs font-semibold text-[#137D79]">Подтвердить телефон</Link>}</AppCard>
  </div>;
}
