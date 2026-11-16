"use client";
import { ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

export default function ClientProfile() {
  const { user } = useAuth();
  return <AppPageShell role="client" eyebrow="Мой аккаунт" title="Профиль">
    <div className="space-y-4">
      <AppCard className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E1F7F2] text-[#21B3A4]"><UserRound className="h-7 w-7" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="break-words font-bold">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Пользователь CleanGo"}</p><p className="mt-1 text-xs text-[#8B9AA4]">Клиент CleanGo</p></div>
      </AppCard>
      <AppCard>
        <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#20B4A4]" aria-hidden="true" /><h2 className="text-sm font-bold">Номер телефона</h2></div>
        <p className="mt-3 break-words text-sm text-[#617885]">{user?.phone || "Номер не подключён"}</p>
        <p className="mt-2 text-xs text-[#8B9AA4]">{user?.phoneVerifiedAt ? "Подтверждён через Telegram" : "Требуется подтверждение через Telegram"}</p>
      </AppCard>
    </div>
  </AppPageShell>;
}
