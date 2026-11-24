"use client";
import { AppCard } from "@/components/ui/clean-go";

export default function ProfileSkeleton({role,verified=true}:{role:"client"|"cleaner";verified?:boolean}){
  return <div role="status" aria-busy="true" className="space-y-3">
    <span className="sr-only">Загружаем профиль</span>
    <AppCard aria-hidden="true" className="!p-4">
      <div className="flex items-center gap-3">
        <div className="cg-skeleton h-[76px] w-[76px] shrink-0 rounded-full"/>
        <div className="min-w-0 flex-1 space-y-2"><div className="cg-skeleton h-[19px] w-4/5 rounded-md"/><div className="cg-skeleton h-3 w-2/3 rounded-full"/></div>
        <div className="cg-skeleton h-[42px] w-[42px] shrink-0 rounded-full"/>
      </div>
      <div className="cg-skeleton mt-3 h-[38px] w-full rounded-xl"/>
    </AppCard>
    {role==="cleaner"&&<AppCard aria-hidden="true"><div className="cg-skeleton h-4 w-32 rounded-full"/><div className="mt-3 grid grid-cols-3 gap-2">{[0,1,2].map(i=><div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-[#F4F5F2] p-2.5"><div className="cg-skeleton h-[23px] w-10 rounded-md"/><div className="cg-skeleton h-3 w-12 rounded-full"/></div>)}</div></AppCard>}
    <AppCard aria-hidden="true"><div className="flex items-center gap-3"><div className="cg-skeleton h-10 w-10 shrink-0 rounded-full"/><div className="min-w-0 flex-1 space-y-2"><div className="cg-skeleton h-3 w-24 rounded-full"/><div className="cg-skeleton h-4 w-36 max-w-full rounded-md"/><div className="cg-skeleton h-3 w-3/4 rounded-full"/></div></div>{!verified&&<div className="cg-skeleton mt-3 h-3 w-36 rounded-full"/>}</AppCard>
  </div>;
}
