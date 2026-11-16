"use client";
import { Wallet } from "lucide-react";
import { AppPageShell } from "@/components/ui/clean-go";

export default function CleanerEarnings() {
  return <AppPageShell role="cleaner" eyebrow="Для исполнителя" title="Мои доходы">
    <section className="rounded-[24px] border border-[#D8F1EB] bg-[#E4F8F3] p-6">
      <Wallet className="h-7 w-7 text-[#20B4A4]" aria-hidden="true" />
      <p className="mt-4 text-sm font-semibold text-[#65847E]">Статистика заработка</p>
      <h2 className="mt-2 text-2xl font-extrabold">Пока недоступна</h2>
      <p className="mt-2 text-xs leading-5 text-[#65847E]">Подключим после реализации учёта выполненных заказов и выплат.</p>
    </section>
  </AppPageShell>;
}
