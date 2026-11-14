"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ClipboardList, ShieldCheck, Sparkles } from "lucide-react";

export default function CleanerPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  return (
    <main className="min-h-dvh bg-[#F4FBFA] px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] text-[#102334]">
      <div className="mx-auto w-full max-w-[520px]">
        <button type="button" onClick={() => router.push("/select-role")} aria-label="Назад к выбору роли" className="flex h-10 w-10 items-center justify-start text-[#102334] active:opacity-60">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.35 }} className="mt-9">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#D9F8F1]">
            <Sparkles className="h-8 w-8 text-[#0AAE9E]" />
          </div>
          <p className="text-sm font-semibold text-[#0AAE9E]">CleanGo для исполнителей</p>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-tight">Работайте клинером с CleanGo</h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-500">Здесь появятся анкета исполнителя, проверка профиля и доступные заказы клиентов.</p>
        </motion.div>
        <div className="mt-9 space-y-3">
          <div className="flex items-start gap-4 rounded-[24px] bg-white p-5 shadow-sm">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#0AAE9E]" />
            <div><h2 className="font-semibold">Проверка профиля</h2><p className="mt-1 text-sm leading-6 text-slate-500">Перед доступом к заказам клинер проходит регистрацию и проверку.</p></div>
          </div>
          <div className="flex items-start gap-4 rounded-[24px] bg-white p-5 shadow-sm">
            <ClipboardList className="mt-0.5 h-6 w-6 shrink-0 text-[#0AAE9E]" />
            <div><h2 className="font-semibold">Доступные заказы</h2><p className="mt-1 text-sm leading-6 text-slate-500">Лента заказов откроется после подключения серверной логики и проверки исполнителя.</p></div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-slate-400">Это первый экран кабинета клинера. Регистрация и заказы пока не активны.</p>
      </div>
    </main>
  );
}
