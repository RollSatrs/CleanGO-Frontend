"use client";
import { Search } from "lucide-react";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

export default function CleanerJobs() {
  return <AppPageShell role="cleaner" eyebrow="Для исполнителя" title="Доступные заявки" description="Заказы клиентов появятся здесь после подключения ленты заявок.">
    <AppCard className="py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#E7F8F4]"><Search className="h-7 w-7 text-[#20B4A4]" aria-hidden="true" /></div>
      <h2 className="mt-5 text-lg font-bold">Пока нет доступных заявок</h2>
      <p className="mt-2 text-sm leading-6 text-[#80919A]">Мы не показываем вымышленные заказы. Лента будет работать с реальными данными backend.</p>
    </AppCard>
  </AppPageShell>;
}
