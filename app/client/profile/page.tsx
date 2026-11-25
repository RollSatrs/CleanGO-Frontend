"use client";
import Link from "next/link";
import {Headphones,ArrowRight} from "lucide-react";
import { AppPageShell } from "@/components/ui/clean-go";
import ProfileEditor from "@/components/ProfileEditor";
export default function ClientProfile(){
  return <AppPageShell role="client" eyebrow="Мой аккаунт" title="Профиль"><ProfileEditor role="client"/><Link href="/support" className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#E6E7E4] bg-white p-3.5 text-sm font-semibold text-[#137D79]"><Headphones size={20}/> Поддержка и обращения <ArrowRight size={16} className="ml-auto"/></Link></AppPageShell>;
}
