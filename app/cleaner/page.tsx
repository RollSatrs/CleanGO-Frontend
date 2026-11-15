"use client";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import BottomNav from "@/components/navigation/BottomNav";
import { ArrowRight, ClipboardList, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export default function CleanerPage() {
  const { user } = useAuth();
  return <main className="min-h-dvh bg-[#F8FCFB] px-5 pb-28 pt-8 cleango-app-top text-[#152535]">
    <div className="mx-auto max-w-[520px]">
      <header className="flex items-center justify-between">
        <div><p className="text-[20px] font-extrabold tracking-tight">Clean<span className="text-[#20B4A4]">Go</span></p><p className="mt-1 text-[11px] text-[#8397A0]">Кабинет исполнителя</p></div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E4F8F3]"><Sparkles className="h-5 w-5 text-[#20B4A4]"/></div>
      </header>
      <div className="mt-9"><p className="text-sm text-[#82939C]">Здравствуйте{user?.firstName ? `, ${user.firstName}` : ""}!</p><h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight">Ваш рабочий день<br/>начинается здесь</h1></div>
      <section className="relative mt-7 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#DDF9F3] to-[#F2FCF9] p-6">
        <div className="absolute -right-9 -top-10 h-40 w-40 rounded-full border-[24px] border-white/50" aria-hidden="true"/>
        <div className="relative"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80"><ClipboardList className="h-5 w-5 text-[#1CB5A5]"/></div><h2 className="mt-5 max-w-[240px] text-xl font-extrabold tracking-tight">Новые заявки на уборку</h2><p className="mt-2 max-w-[260px] text-sm leading-6 text-[#66847E]">Просматривайте доступные заказы в одном месте.</p><Link href="/cleaner/jobs" className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-[#26B7A8] px-4 text-sm font-semibold text-white">Посмотреть заявки <ArrowRight className="h-4 w-4"/></Link></div>
      </section>
      <h2 className="mt-9 text-lg font-extrabold">Рабочее пространство</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/cleaner/jobs" className="rounded-[22px] border border-[#E8F1EF] bg-white p-5"><ClipboardList className="h-6 w-6 text-[#20B4A4]"/><p className="mt-5 text-sm font-bold">Заказы</p><p className="mt-1 text-xs leading-5 text-[#8A9AA2]">Новые заявки</p></Link>
        <Link href="/cleaner/earnings" className="rounded-[22px] border border-[#E8F1EF] bg-white p-5"><Wallet className="h-6 w-6 text-[#20B4A4]"/><p className="mt-5 text-sm font-bold">Доходы</p><p className="mt-1 text-xs leading-5 text-[#8A9AA2]">История заработка</p></Link>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-[20px] bg-[#EDF9F6] p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-[#20B4A4]"/><p className="text-xs leading-5 text-[#67857E]">Доступность заказов зависит от подключения серверной логики и проверки профиля.</p></div>
    </div>
    <BottomNav role="cleaner"/>
  </main>;
}
