"use client";
import Link from "next/link";
import { Settings2, ArrowRight, Activity } from "lucide-react";
import { AppPageShell } from "@/components/ui/clean-go";
import ProfileEditor from "@/components/ProfileEditor";
export default function CleanerProfile(){
  return <AppPageShell role="cleaner" eyebrow="Для исполнителя" title="Профиль клинера">
    <ProfileEditor role="cleaner"/>
    <Link href="/cleaner/settings" className="mt-4 flex items-center gap-3 rounded-[14px] border border-[#E6E7E4] bg-white p-3.5 text-sm font-semibold text-[#137D79]">
      <Settings2 className="h-5 w-5"/> Доступность, услуги и геопозиция <ArrowRight className="ml-auto h-4 w-4"/>
    </Link>
    <Link href="/cleaner/diagnostics" className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#E6E7E4] bg-white p-3.5 text-sm font-semibold text-[#137D79]">
      <Activity className="h-5 w-5"/> Диагностика соединения <ArrowRight className="ml-auto h-4 w-4"/>
    </Link>
  </AppPageShell>;
}
