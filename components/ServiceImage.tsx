import Image from "next/image";
import { ImageIcon } from "lucide-react";

const visuals: Record<string, {src:string; position:string}> = {
  regular: {src:"/images/cleango/services/regular.png",position:"42% 55%"},
  general: {src:"/images/cleango/services/general.png",position:"55% 65%"},
  renovation: {src:"/images/cleango/services/renovation.png",position:"37% 55%"},
};

/** Illustrative service imagery, not a photo of the customer's property. */
export default function ServiceImage({type,className="",sizes="120px",illustrative=false}:{
  type:string; className?:string; sizes?:string; illustrative?:boolean;
}){
  const visual=visuals[type];
  return <div className={`relative overflow-hidden bg-[#EDEDE9] ${className}`}>
    {visual?<Image src={visual.src} alt="" fill sizes={sizes} className="object-cover" style={{objectPosition:visual.position}}/>:
      <div className="absolute inset-0 grid place-items-center text-[#999F9B]"><ImageIcon size={24} strokeWidth={1.3}/></div>}
    {illustrative&&visual&&<span className="pointer-events-none absolute bottom-1 left-1 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[9px] leading-tight text-white">Вид услуги</span>}
  </div>;
}
