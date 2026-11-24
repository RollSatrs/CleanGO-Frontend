
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import ServiceImage from "@/components/ServiceImage";
import OrderForm from "@/components/OrderForm";
import CleanGoLogo from "@/components/branding/CleanGoLogo";
import { AppHeader } from "@/components/ui/clean-go";



type CleaningType =
  | "regular"
  | "general"
  | "renovation";

type Service = {
  title: string;
  description: string;
  features: string[];
};

const services: Record<CleaningType, Service> = {
  regular: {
    title: "Поддерживающая уборка",
    description:
      "Быстрая уборка для поддержания чистоты и порядка в вашем доме.",
    features: [
      "Удаление пыли с доступных поверхностей",
      "Влажная уборка полов",
      "Уборка кухни",
      "Уборка санузла",
    ],
  },

  general: {
    title: "Генеральная уборка",
    description:
      "Тщательная уборка основных помещений вашего дома.",
    features: [
      "Удаление пыли и загрязнений",
      "Тщательная уборка полов",
      "Уборка кухни и санузла",
      "Очистка доступных поверхностей",
    ],
  },

  renovation: {
    title: "Уборка после ремонта",
    description:
      "Уборка помещений после завершения ремонтных работ.",
    features: [
      "Удаление строительной пыли",
      "Влажная уборка поверхностей",
      "Очистка полов",
      "Уборка кухни и санузла",
    ],
  },
};

function isCleaningType(
  value: string | null,
): value is CleaningType {
  return (
    value === "regular" ||
    value === "general" ||
    value === "renovation"
  );
}

function OrderContent() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");

  if (!isCleaningType(serviceId)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CleanGoLogo
            size={72}
            showName
            className="mb-6 justify-center"
          />

          <h1 className="text-2xl font-bold text-slate-900">
            Услуга не выбрана
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Вернитесь на главную страницу и выберите
            подходящий вид уборки.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#137D79] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#106A67]"
          >
            Вернуться к услугам
          </Link>
        </div>
      </main>
    );
  }

  const service = services[serviceId];

  return (
    <main className="cleango-page-frame">
      <div className="cleango-page-scroll w-full">
        <AppHeader role="client" className="cleango-client-header px-4 pb-3" />
        <div className="px-5 pt-5 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#47716A]">← К услугам</Link>
          <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#2A9183]">Оформление заказа</p>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.04em]">Оформление уборки</h1>
          <p className="mt-2 text-sm leading-6 text-[#718380]">Укажите адрес и площадь — мы рассчитаем стоимость.</p>
        </div>
        <div className="space-y-5 px-4 pt-5 sm:px-6">
          <section className="cg-card p-3.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7A9290]">Ваша услуга</p>
              <span className="rounded-full bg-[#E7F8F2] px-3 py-1 text-xs font-semibold text-[#168675]">Выбрано ✓</span>
            </div>
            <ServiceImage type={serviceId} className="mb-3 aspect-[2.5/1] w-full rounded-xl" sizes="(max-width: 520px) 90vw, 470px"/>
            <h2 className="text-xl font-bold tracking-tight">{service.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#718380]">{service.description}</p>
            <details className="group mt-4 border-t border-[#EEF3F1] pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#267E73] [&::-webkit-details-marker]:hidden">
                Что входит в уборку <span className="text-lg transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm leading-5 text-[#607673]">
                    <span className="font-bold text-[#2AAB96]">✓</span>{feature}
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <section className="cg-card p-3.5 sm:p-6">
            <div className="mb-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7A9290]">Параметры уборки</p>
              <h2 className="text-xl font-bold tracking-tight">Куда приедет клинер?</h2>
              <p className="mt-1 text-sm text-[#81918F]">Укажите точный адрес и площадь помещения</p>
            </div>
            <OrderForm cleaningType={serviceId} />
          </section>
          <p className="px-4 text-center text-xs leading-5 text-[#91A19E]">Стоимость рассчитывается автоматически по текущим тестовым тарифам CleanGo.</p>
        </div>
      </div>
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-600">
            Загрузка страницы...
          </p>
        </main>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
