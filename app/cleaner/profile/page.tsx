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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E7F8F4]"><UserRound className="h-6 w-6 text-[#20B4A4]" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="break-words font-bold">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Исполнитель"}</p><p className="mt-1 text-xs text-[#8B9AA4]">CleanGo · Клинер</p></div>
      </div>
      <div className="mt-6 border-t border-[#EAF2F0] pt-5">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#20B4A4]" aria-hidden="true" /><h2 className="text-xs font-semibold text-[#8B9AA4]">Телефон</h2></div>
        <p className="mt-2 break-words text-sm font-semibold">{user?.phone || "Не подключён"}</p>
        <p className="mt-2 text-xs text-[#20A797]">{user?.phoneVerifiedAt ? "Подтверждён через Telegram" : "Ожидает подтверждения"}</p>
      </div>
    </AppCard>
    <Link href="/cleaner/settings" className="mt-4 flex items-center gap-3 rounded-[20px] border border-[#CDEFE8] bg-white p-4 text-sm font-bold text-[#168C80]">
      <Settings2 className="h-5 w-5"/> Доступность, услуги и геопозиция <ArrowRight className="ml-auto h-4 w-4"/>
    </Link>
    <Link href="/cleaner/diagnostics" className="mt-3 flex items-center gap-3 rounded-[20px] border border-[#CDEFE8] bg-white p-4 text-sm font-bold text-[#168C80]">
      <Activity className="h-5 w-5"/> Диагностика соединения <ArrowRight className="ml-auto h-4 w-4"/>
    </Link>
  </AppPageShell>;
}
