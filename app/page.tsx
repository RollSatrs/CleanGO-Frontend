
"use client";

import { useState } from "react";
import BottomNav from "@/components/navigation/BottomNav";
import CleanGoLogo from "@/components/branding/CleanGoLogo";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Home,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  SprayCan,
} from "lucide-react";

type CleaningType = "regular" | "general" | "renovation";

type Service = {
  id: CleaningType;
  title: string;
  description: string;
  price: number;
  icon: typeof Sparkles;
  features: string[];
};

const services: Service[] = [
  {
    id: "regular",
    title: "Поддерживающая уборка",
    description: "Чистота и порядок на каждый день",
    price: 8000,
    icon: SprayCan,
    features: [
      "Влажная уборка",
      "Удаление пыли",
      "Кухня и санузел",
    ],
  },
  {
    id: "general",
    title: "Генеральная уборка",
    description: "Тщательная уборка вашего дома",
    price: 15000,
    icon: Sparkles,
    features: [
      "Глубокая уборка",
      "Очистка поверхностей",
      "Кухня и санузел",
    ],
  },
  {
    id: "renovation",
    title: "Уборка после ремонта",
    description: "Уберём пыль и следы ремонта",
    price: 20000,
    icon: Paintbrush,
    features: [
      "Строительная пыль",
      "Очистка полов",
      "Влажная уборка",
    ],
  },
];

export default function HomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [selectedService, setSelectedService] =
    useState<CleaningType | null>(null);

  function handleOrder() {
    if (!selectedService) {
      document
        .getElementById("services")
        ?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });

      return;
    }

    router.push(`/order?service=${selectedService}`);
  }

  const appear = (delay = 0) => ({
    initial: {
      opacity: 0,
      y: reduceMotion ? 0 : 16,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    transition: {
      duration: reduceMotion ? 0 : 0.45,
      delay: reduceMotion ? 0 : delay,
    },
  });

  return (
    <main className="min-h-[100dvh] bg-[#F8FCFB] font-sans text-[#102033]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[520px] bg-white pb-24 shadow-[0_0_45px_rgba(20,70,100,0.05)]">

        {/* Шапка */}
        <header className="cleango-client-header flex items-center justify-between px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <CleanGoLogo size={44} showName showTagline priority />
          </div>

          <div className="flex items-center gap-2"><span className="hidden rounded-full border border-[#E3EFF1] bg-[#F6FBFC] px-3 py-2 text-xs font-medium text-[#718494] min-[390px]:inline-flex">Для вашего дома</span><span role="img" aria-label="Уведомления — скоро" title="Уведомления скоро появятся" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E4F1EE] bg-white"><Bell className="h-5 w-5 text-[#20B4A4]"/></span></div>
        </header>

        {/* Приветственный блок */}
        <motion.section
          {...appear(0.05)}
          className="px-5 pt-5"
        >
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#26B8A9] via-[#5ACFC0] to-[#A2E9DF] p-6 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-[#C8FFF3]/35 blur-2xl"
            />

            <div className="relative z-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Добро пожаловать в CleanGo
              </div>

              <h2 className="max-w-[300px] text-[32px] font-bold leading-[1.12] tracking-[-0.05em]">
                Чистый дом —
                <br />
                счастливый день
              </h2>

              <p className="mt-4 max-w-[290px] text-sm leading-6 text-white/90">
                Выбирайте подходящую уборку, а мы поможем
                позаботиться о чистоте вашего дома.
              </p>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("services")
                    ?.scrollIntoView({
                      behavior: reduceMotion ? "auto" : "smooth",
                    })
                }
                className="mt-7 inline-flex h-12 items-center gap-3 rounded-2xl bg-white px-5 text-sm font-bold text-[#168C80] shadow-[0_8px_25px_rgba(0,80,120,0.12)] transition-transform active:scale-[0.98]"
              >
                Выбрать уборку
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-7 right-5 opacity-20">
              <Sparkles className="h-24 w-24" strokeWidth={1} />
            </div>
          </div>
        </motion.section>

        {/* Преимущества */}
        <motion.section
          {...appear(0.12)}
          className="grid grid-cols-3 gap-2 px-5 pt-6"
        >
          {[
            {
              icon: Clock3,
              title: "Быстро",
              description: "Удобный заказ",
            },
            {
              icon: ShieldCheck,
              title: "Надёжно",
              description: "Контроль качества",
            },
            {
              icon: Home,
              title: "Комфортно",
              description: "Уборка дома",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex flex-col items-center rounded-2xl bg-[#F4FAFB] px-2 py-4 text-center"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1F7F3]">
                  <Icon className="h-5 w-5 text-[#0BAF9F]" />
                </div>

                <p className="text-xs font-bold text-[#102033]">
                  {item.title}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-[#8A9AA9]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </motion.section>

        {/* Услуги */}
        <section
          id="services"
          className="scroll-mt-6 px-5 pb-8 pt-9"
        >
          <motion.div
            {...appear(0.18)}
            className="mb-5 flex items-end justify-between"
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0BAF9F]">
                Наши услуги
              </p>

              <h2 className="text-[25px] font-bold tracking-[-0.04em]">
                Выберите уборку
              </h2>

              <p className="mt-2 text-sm text-[#8191A0]">
                Подберём подходящий вариант для вас
              </p>
            </div>

            <span className="rounded-full bg-[#EAF8F6] px-3 py-1.5 text-xs font-semibold text-[#0BAF9F]">
              3 услуги
            </span>
          </motion.div>

          <div className="space-y-3">
            {services.map((service, index) => {
              const Icon = service.icon;
              const selected =
                selectedService === service.id;

              return (
                <motion.button
                  key={service.id}
                  type="button"
                  {...appear(0.22 + index * 0.06)}
                  onClick={() =>
                    setSelectedService(service.id)
                  }
                  aria-pressed={selected}
                  className={`
                    w-full rounded-[24px] border-2
                    p-4 text-left
                    transition-colors duration-200
                    ${
                      selected
                        ? "border-[#19B9AA] bg-[#F0FCF9]"
                        : "border-[#E9F0F2] bg-white"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        flex h-14 w-14 shrink-0
                        items-center justify-center
                        rounded-2xl
                        ${
                          selected
                            ? "bg-[#CFF4ED]"
                            : "bg-[#EAF8F6]"
                        }
                      `}
                    >
                      <Icon className="h-7 w-7 text-[#0BAF9F]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold leading-5">
                        {service.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-[#8393A2]">
                        {service.description}
                      </p>

                      <p className="mt-3 text-sm font-bold text-[#0AAE9E]">
                        от{" "}
                        {service.price.toLocaleString("ru-RU")} ₸
                      </p>
                    </div>

                    <div
                      className={`
                        flex h-6 w-6 shrink-0
                        items-center justify-center
                        rounded-full border-2
                        ${
                          selected
                            ? "border-[#12B6A6] bg-[#12B6A6]"
                            : "border-[#D9E5E8]"
                        }
                      `}
                    >
                      {selected && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>

                  {selected && (
                    <div className="mt-4 border-t border-[#D6F0EB] pt-4">
                      <p className="mb-3 text-xs font-semibold text-[#426C69]">
                        Что входит в уборку:
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {service.features.map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-medium text-[#427D75]"
                          >
                            <Check className="h-3 w-3 text-[#0BAF9F]" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-[#93A1AD]">
            Итоговая стоимость рассчитывается по площади
            помещения при оформлении заказа.
          </p>
        </section>

        {/* Нижняя кнопка */}
        <div className="sticky bottom-0 z-20 border-t border-[#EAF0F2] bg-white/95 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleOrder}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#B9F2EA] px-6 text-[16px] font-bold text-[#087F77] shadow-[0_8px_24px_rgba(18,182,166,0.12)] transition-colors hover:bg-[#A5EAE1] active:scale-[0.99]"
          >
            {selectedService
              ? "Продолжить оформление"
              : "Выберите услугу"}

            {selectedService ? (
              <ArrowRight className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    <BottomNav role="client" />
    </main>
  );
}
