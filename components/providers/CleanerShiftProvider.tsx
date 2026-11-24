"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {useAuth} from "@/components/providers/AuthProvider";
import {requestCleanGoLocation,requestGrantedCleanGoLocation} from "@/lib/geo-location";

export type ShiftProfile={isAvailable:boolean;effectiveAvailable:boolean;locationNeedsRefresh:boolean;availableUntil:string|null;lastLocationAt:string|null;hasLocation:boolean;hasActiveOrder:boolean;serviceRadiusKm:number;serviceTypes:string[]};
type Preferences={serviceRadiusKm:number;serviceTypes:string[]};
type Hours=1|2|4;
type Context={profile:ShiftProfile|null;now:number|null;busy:boolean;geoBusy:boolean;error:string;geoError:string;refresh:()=>Promise<void>;start:(hours:Hours,prefs:Preferences)=>Promise<void>;stop:()=>Promise<void>;savePreferences:(prefs:Preferences)=>Promise<void>;refreshLocation:()=>Promise<void>;autoEnabled:boolean};
const C=createContext<Context|null>(null);
const INTERVAL=5*60_000;
export function useCleanerShift(){const value=useContext(C);if(!value)throw Error("CleanerShiftProvider missing");return value;}
export function shiftState(profile:ShiftProfile|null,now:number|null){
  const remaining=profile?.availableUntil&&now!==null?Math.max(0,Math.ceil((Date.parse(profile.availableUntil)-now)/60000)):0;
  const active=Boolean(profile?.isAvailable&&remaining>0);
  const fresh=Boolean(profile?.lastLocationAt&&now!==null&&now-Date.parse(profile.lastLocationAt)<=30*60_000);
  const receiving=Boolean(active&&fresh&&profile?.effectiveAvailable&&!profile.hasActiveOrder);
  return {remaining,active,fresh,receiving};
}
export default function CleanerShiftProvider({children}:{children:ReactNode}){
 const {user,token}=useAuth();
 return <Session key={user?.id??"anonymous"} token={user?.role==="cleaner"&&user.phoneVerifiedAt?token:null} userId={user?.id??""}>{children}</Session>;
}
function Session({children,token,userId}:{children:ReactNode;token:string|null;userId:string}){
 const [profile,setProfile]=useState<ShiftProfile|null>(null);
 const [now,setNow]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [geoBusy,setGeoBusy]=useState(false);
 const [error,setError]=useState("");
 const [geoError,setGeoError]=useState("");
 const [consent,setConsent]=useState<string|null>(null);
 const latest=useRef<ShiftProfile|null>(null),lock=useRef(false),gpsLock=useRef(false),readLock=useRef(false),version=useRef(0),mounted=useRef(true),lastAttempt=useRef(0);
 const storageKey="cleango-auto-location:"+userId;
 function update(value:ShiftProfile){latest.current=value;if(mounted.current)setProfile(value);}
 function remember(expiry:string|null){setConsent(expiry);try{if(expiry)localStorage.setItem(storageKey,expiry);else localStorage.removeItem(storageKey);}catch{/* optional local preference */}}
 async function request(path:string,body?:object):Promise<ShiftProfile>{
   if(!token)throw Error("Войдите как клинер");
   const response=await fetch("/api/backend/orders/cleaner/"+path,{method:body?"PATCH":"GET",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
   if(!response.ok){const data=await response.json().catch(()=>null);throw Error(Array.isArray(data?.message)?data.message.join("; "):typeof data?.message==="string"?data.message:"Не удалось обновить рабочий статус");}
   return await response.json() as ShiftProfile;
 }
 async function read(manual=false){
   if(!token||readLock.current||lock.current||gpsLock.current)return;
   readLock.current=true;const v=version.current;if(manual)setBusy(true);
   try{const data=await request("profile");if(mounted.current&&v===version.current){update(data);setError("");}}
   catch(e){if(mounted.current&&v===version.current)setError(e instanceof Error?e.message:"Ошибка соединения");}
   finally{readLock.current=false;if(manual&&mounted.current&&!lock.current)setBusy(false);}
 }
 async function operation(action:()=>Promise<void>){
   if(lock.current||!token)return;
   lock.current=true;version.current++;setBusy(true);setError("");
   try{await action();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:"Не удалось сохранить изменения");}
   finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 async function start(hours:Hours,prefs:Preferences){
   await operation(async()=>{
     const coords=await requestCleanGoLocation();
     if(!mounted.current)return;
     const data=await request("profile",{...prefs,isAvailable:true,availabilityHours:hours,...coords});
     if(mounted.current){update(data);remember(data.availableUntil);setGeoError("");lastAttempt.current=Date.now();}
   });
 }
 async function stop(){await operation(async()=>{
   const p=latest.current;if(!p)return;
   const data=await request("profile",{isAvailable:false,serviceRadiusKm:p.serviceRadiusKm,serviceTypes:p.serviceTypes.length?p.serviceTypes:["regular"]});
   if(mounted.current){update(data);remember(null);setGeoError("");}
 });}
 async function savePreferences(prefs:Preferences){await operation(async()=>{const data=await request("preferences",prefs);if(mounted.current)update(data);});}
 async function location(manual:boolean){
   const p=latest.current;
   if(!token||!p?.isAvailable||!p.availableUntil||Date.parse(p.availableUntil)<=Date.now()||gpsLock.current||lock.current||(!manual&&p.hasActiveOrder))return;
   const expiry=p.availableUntil,v=version.current;
   gpsLock.current=true;lastAttempt.current=Date.now();setGeoBusy(true);if(manual)setGeoError("");
   try{
     const coords=await (manual?requestCleanGoLocation():requestGrantedCleanGoLocation());
     if(!mounted.current||v!==version.current||document.visibilityState!=="visible"||latest.current?.availableUntil!==expiry)return;
     const data=await request("location",{...coords,availableUntil:expiry});
     if(mounted.current&&v===version.current){update(data);setGeoError("");if(manual)remember(data.availableUntil);}
   }catch(e){if(mounted.current&&v===version.current)setGeoError(e instanceof Error?e.message:"Не удалось обновить геопозицию");}
   finally{gpsLock.current=false;if(mounted.current)setGeoBusy(false);}
 }
 useEffect(()=>{
   mounted.current=true;setNow(Date.now());try{setConsent(localStorage.getItem(storageKey));}catch{/* optional */}
   return()=>{mounted.current=false;version.current++;};
 },[storageKey]);
 useEffect(()=>{
   if(!token)return;
   void read();
   const timer=window.setInterval(()=>{setNow(Date.now());if(document.visibilityState==="visible")void read();},15000);
   const resume=()=>{setNow(Date.now());if(document.visibilityState==="visible")void read();};
   document.addEventListener("visibilitychange",resume);window.addEventListener("focus",resume);
   return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",resume);window.removeEventListener("focus",resume);version.current++;};
 // Token scopes all server calls; foreground polling does not request GPS.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token]);
 const autoEnabled=Boolean(consent&&consent===profile?.availableUntil&&profile.isAvailable&&now!==null&&Date.parse(consent)>now);
 useEffect(()=>{
   if(!token||!autoEnabled)return;
   const tick=()=>{
     const p=latest.current;
     if(!p?.isAvailable||p.availableUntil!==consent||p.hasActiveOrder||document.visibilityState!=="visible"||Date.parse(consent!)<=Date.now())return;
     const last=p.lastLocationAt?Date.parse(p.lastLocationAt):0;
     if(Date.now()-Math.max(last,lastAttempt.current)>=INTERVAL)void location(false);
   };
   tick();const timer=window.setInterval(tick,15000);
   document.addEventListener("visibilitychange",tick);window.addEventListener("focus",tick);
   return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",tick);window.removeEventListener("focus",tick);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token,autoEnabled,consent]);
 return <C.Provider value={{profile,now,busy,geoBusy,error,geoError,refresh:()=>read(true),start,stop,savePreferences,refreshLocation:()=>location(true),autoEnabled}}>{children}</C.Provider>;
}
