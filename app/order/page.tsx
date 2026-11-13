
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import OrderForm from "@/components/OrderForm";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type CleaningType = "regular" | "general" | "renovation";

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
          <h1 className="text-2xl font-bold text-slate-900">
            Услуга не выбрана
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Вернитесь на главную страницу и выберите
            подходящий вид уборки.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Вернуться к услугам
          </Link>
        </div>
      </main>
    );
  }

  const service = services[serviceId];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-7">
        {/* Навигация */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
        >
          <span aria-hidden="true">←</span>
          Вернуться к услугам
        </Link>

        {/* Заголовок */}
        <header className="space-y-3">
          <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            CleanGo · Заказ уборки
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Оформление уборки
          </h1>

          <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Выберите параметры уборки, укажите адрес
            и узнайте предварительную стоимость.
          </p>
        </header>

        {/* Выбранная услуга */}
        <Card className="gap-4 rounded-2xl border-slate-200 bg-white py-6 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl font-bold text-slate-900">
                {service.title}
              </CardTitle>

              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                Выбрано
              </span>
            </div>

            <CardDescription className="text-sm leading-6 text-slate-600">
              {service.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Что входит в уборку
              </p>

              <ul className="grid gap-3 sm:grid-cols-2">
                {service.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 font-bold text-teal-600"
                    >
                      ✓
                    </span>

                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">
                Стоимость будет рассчитана автоматически
                после ввода площади помещения.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Форма заказа */}
        <Card className="gap-4 rounded-2xl border-slate-200 bg-white py-6 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl font-bold text-slate-900">
              Детали заказа
            </CardTitle>

            <CardDescription className="text-sm text-slate-600">
              Заполните информацию, чтобы зарегистрировать
              заявку на уборку.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <OrderForm cleaningType={serviceId} />
          </CardContent>
        </Card>

        {/* Информация */}
        <p className="text-center text-xs leading-5 text-slate-500">
          Стоимость рассчитывается сервером CleanGo
          по текущим тестовым тарифам.
          После оформления она сохраняется вместе с заказом.
        </p>
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
