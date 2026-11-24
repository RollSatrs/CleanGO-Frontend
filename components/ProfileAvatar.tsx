"use client";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export function ProfileAvatar({name,photo,className=""}:{name:string;photo?:string|null;className?:string}){
  const [failedPhoto,setFailedPhoto]=useState<string|null>(null);
  const initials=name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join("");
  return <div className={`cg-soft relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold ${className}`}>
    {photo?.startsWith("data:image/jpeg;base64,")&&failedPhoto!==photo?<img src={photo} alt="Фото профиля" onError={()=>setFailedPhoto(photo)} className="h-full w-full object-cover"/>: <span aria-hidden="true">{initials||<UserRound size={24}/>}</span>}
  </div>;
}

export function CounterpartAvatar({orderId,name,enabled,className=""}:{orderId:string;name:string;enabled:boolean;className?:string}){
  const {token,user}=useAuth();
  const [result,setResult]=useState<{key:string;photo:string|null}|null>(null);
  const key=orderId+":"+(user?.id??"");
  useEffect(()=>{
    if(!token||!enabled)return;
    let active=true;
    const refresh=async()=>{
      try{
        const response=await fetch(`/api/backend/orders/${encodeURIComponent(orderId)}/counterpart-avatar`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        if(!response.ok){if(active)setResult({key,photo:null});return;}
        const data=await response.json() as {avatar?:string|null};
        if(active)setResult({key,photo:data.avatar??null});
      }catch{if(active)setResult({key,photo:null});}
    };
    void refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},30000);
    return()=>{active=false;window.clearInterval(timer);};
  },[token,enabled,orderId,key]);
  return <ProfileAvatar name={name} photo={enabled&&result?.key===key?result.photo:null} className={className}/>;
}
