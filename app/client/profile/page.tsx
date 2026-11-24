"use client";
import { ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

export default function ClientProfile() {
  const { user } = useAuth();
  return <AppPageShell role="client" eyebrow="Мой аккаунт" title="Профиль">
    <div className="space-y-3">
      <AppCard className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#D9EFED] text-[#137D79]"><UserRound className="h-7 w-7" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="break-words font-bold">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Пользователь CleanGo"}</p><p className="mt-1 text-xs text-[#697174]">Клиент CleanGo</p></div>
      </AppCard>
      <AppCard>
        <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#137D79]" aria-hidden="true" /><h2 className="text-sm font-bold">Номер телефона</h2></div>
        <p className="mt-3 break-words text-sm text-[#617885]">{user?.phone || "Номер не подключён"}</p>
        <p className="mt-2 text-xs text-[#697174]">{user?.phoneVerifiedAt ? "Подтверждён через Telegram" : "Требуется подтверждение через Telegram"}</p>
      </AppCard>
    </div>
  </AppPageShell>;
}
