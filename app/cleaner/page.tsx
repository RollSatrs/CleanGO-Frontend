"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import BottomNav from "@/components/navigation/BottomNav";
import { ArrowRight, ClipboardList, ShieldCheck, Wallet, Clock3 } from "lucide-react";
import { AppHeader, AppCard, AppLinkButton } from "@/components/ui/clean-go";

export default function CleanerPage() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<{ isAvailable: boolean; effectiveAvailable: boolean; locationNeedsRefresh: boolean; availableUntil: string | null } | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!token || user?.role !== "cleaner") return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/backend/orders/cleaner/profile", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) throw new Error("profile unavailable");
        const data = await response.json();
        if (active) { setProfile(data); setProfileError(false); }
      } catch { if (active) setProfileError(true); }
    };
    void refresh();
    const timer = window.setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") void refresh(); }, 15000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [token, user?.role]);
  const remaining = profile?.availableUntil ? Math.max(0, Math.ceil((new Date(profile.availableUntil).getTime() - now) / 60000)) : 0;
  const activeShift = Boolean(profile?.isAvailable && remaining > 0);
  const receivingOffers = Boolean(activeShift && profile?.effectiveAvailable && !profile?.locationNeedsRefresh);
  return <main className="min-h-dvh bg-[#F8FCFB] pb-28 text-[#152535]">
    <div className="mx-auto max-w-[520px]">
      <AppHeader role="cleaner" className="cleango-client-header min-h-[84px] px-5 pb-4 pt-6" />
      <div className="px-5">
      <div className="mt-9"><p className="text-sm text-[#82939C]">Здравствуйте{user?.firstName ? `, ${user.firstName}` : ""}!</p><h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight">Ваш рабочий день<br/>начинается здесь</h1></div>
      <Link href="/cleaner/settings" className="mt-6 flex items-center gap-3 rounded-[24px] border border-[#CDEFE8] bg-white p-4 shadow-sm">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${receivingOffers ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          <Clock3 className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">{profileError ? "Не удалось обновить статус" : receivingOffers ? "🟢 Вы на линии" : activeShift ? "🟠 Смена включена, но заявки недоступны" : "⚪ Вы не на линии"}</span>
          <span className="mt-1 block text-xs leading-5 text-[#748B8A]">
            {profileError ? "Нажмите, чтобы проверить настройки" : receivingOffers ? `Осталось ${remaining} мин · предложения активны` : activeShift ? "Обновите геопозицию или проверьте профиль" : "Включите смену, чтобы получать заказы"}
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#159A8E]"/>
      </Link>
      <section className="relative mt-7 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#DDF9F3] to-[#F2FCF9] p-6">
        <div className="absolute -right-9 -top-10 h-40 w-40 rounded-full border-[24px] border-white/50" aria-hidden="true"/>
        <div className="relative"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80"><ClipboardList className="h-5 w-5 text-[#1CB5A5]"/></div><h2 className="mt-5 max-w-[240px] text-xl font-extrabold tracking-tight">Новые заявки на уборку</h2><p className="mt-2 max-w-[260px] text-sm leading-6 text-[#66847E]">Просматривайте доступные заказы в одном месте.</p><AppLinkButton href="/cleaner/jobs" className="mt-5">Посмотреть заявки <ArrowRight className="h-4 w-4"/></AppLinkButton></div>
      </section>
      <h2 className="mt-9 text-lg font-extrabold">Рабочее пространство</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/cleaner/jobs" className="block"><AppCard><ClipboardList className="h-6 w-6 text-[#20B4A4]"/><p className="mt-5 text-sm font-bold">Заказы</p><p className="mt-1 text-xs leading-5 text-[#8A9AA2]">Новые заявки</p></AppCard></Link>
        <Link href="/cleaner/earnings" className="block"><AppCard><Wallet className="h-6 w-6 text-[#20B4A4]"/><p className="mt-5 text-sm font-bold">Доходы</p><p className="mt-1 text-xs leading-5 text-[#8A9AA2]">История заработка</p></AppCard></Link>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-[20px] bg-[#EDF9F6] p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-[#20B4A4]"/><p className="text-xs leading-5 text-[#67857E]">Доступность заказов зависит от подключения серверной логики и проверки профиля.</p></div>
      </div>
    </div>
    <BottomNav role="cleaner"/>
  </main>;
}
