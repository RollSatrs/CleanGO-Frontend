"use client";
import Link from "next/link";
import { ShieldCheck, UserRound, Settings2, ArrowRight, Activity } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

export default function CleanerProfile() {
  const { user } = useAuth();
  return <AppPageShell role="cleaner" eyebrow="Для исполнителя" title="Профиль клинера">
    <AppCard>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#D9EFED]"><UserRound className="h-6 w-6 text-[#137D79]" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="break-words font-bold">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Исполнитель"}</p><p className="mt-1 text-xs text-[#697174]">CleanGo · Клинер</p></div>
      </div>
      <div className="mt-4 border-t border-[#E6E7E4] pt-3">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#137D79]" aria-hidden="true" /><h2 className="text-xs font-semibold text-[#697174]">Телефон</h2></div>
        <p className="mt-2 break-words text-sm font-semibold">{user?.phone || "Не подключён"}</p>
        <p className="mt-2 text-xs text-[#20A797]">{user?.phoneVerifiedAt ? "Подтверждён через Telegram" : "Ожидает подтверждения"}</p>
      </div>
    </AppCard>
    <Link href="/cleaner/settings" className="mt-4 flex items-center gap-3 rounded-[14px] border border-[#E6E7E4] bg-white p-3.5 text-sm font-semibold text-[#137D79]">
      <Settings2 className="h-5 w-5"/> Доступность, услуги и геопозиция <ArrowRight className="ml-auto h-4 w-4"/>
    </Link>
    <Link href="/cleaner/diagnostics" className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#E6E7E4] bg-white p-3.5 text-sm font-semibold text-[#137D79]">
      <Activity className="h-5 w-5"/> Диагностика соединения <ArrowRight className="ml-auto h-4 w-4"/>
    </Link>
  </AppPageShell>;
}
