"use client";
import { ArrowRight, ClipboardList } from "lucide-react";
import { AppCard, AppLinkButton, AppPageShell } from "@/components/ui/clean-go";

export default function ClientOrders() {
  return <AppPageShell role="client" eyebrow="CleanGo" title="Мои заказы" description="Здесь появятся ваши текущие и завершённые уборки.">
    <AppCard className="py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#E7F8F4]"><ClipboardList className="h-7 w-7 text-[#20B4A4]" aria-hidden="true" /></div>
      <h2 className="mt-5 text-lg font-bold">Заказов пока нет</h2>
      <p className="mt-2 text-sm leading-6 text-[#82939C]">Выберите услугу, чтобы оформить первую уборку.</p>
      <AppLinkButton href="/" className="mt-6">Выбрать уборку <ArrowRight className="h-4 w-4" aria-hidden="true" /></AppLinkButton>
    </AppCard>
  </AppPageShell>;
}
