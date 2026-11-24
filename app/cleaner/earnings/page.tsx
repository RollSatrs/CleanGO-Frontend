"use client";
import { Wallet } from "lucide-react";
import { AppPageShell } from "@/components/ui/clean-go";

export default function CleanerEarnings() {
  return <AppPageShell role="cleaner" eyebrow="Для исполнителя" title="Мои доходы">
    <section className="cg-card p-4">
      <Wallet className="h-7 w-7 text-[#137D79]" aria-hidden="true" />
      <p className="mt-3 text-xs font-medium cg-muted">Статистика заработка</p>
      <h2 className="mt-2 text-xl font-bold">Пока недоступна</h2>
      <p className="mt-2 text-xs leading-5 cg-muted">Подключим после реализации учёта выполненных заказов и выплат.</p>
    </section>
  </AppPageShell>;
}
