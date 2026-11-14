
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import CleanGoLogo from "@/components/branding/CleanGoLogo";

type Role = "client" | "cleaner";

type RoleSelectionProps = {
  onContinue: (role: Role) => Promise<void> | void;
  loading?: boolean;
};

const roles = [
  {
    id: "client" as const,
    title: "Я клиент",
    description: "Хочу заказать уборку для дома или офиса",
    image: "/images/cleango/client-role.png",
    imageAlt: "3D-домик — клиент CleanGo",
  },
  {
    id: "cleaner" as const,
    title: "Я клинер",
    description: "Хочу выполнять заказы и зарабатывать",
    image: "/images/cleango/cleaner-role.png",
    imageAlt: "3D-принадлежности для уборки — клинер CleanGo",
  },
];

export default function RoleSelection({
  onContinue,
  loading = false,
}: RoleSelectionProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [selectedRole, setSelectedRole] = useState<Role | null>(
    null,
  );

  async function handleContinue() {
    if (!selectedRole || loading) return;

    await onContinue(selectedRole);
  }

  function handleBack() {
    router.push("/onboarding");
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#F6FCFB] font-sans text-[#102334]">
      {/* Фоновое мятное свечение */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_18%,#D9FAF4_0%,transparent_55%),radial-gradient(ellipse_at_10%_90%,#E3F9F7_0%,transparent_55%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))]">

        {/* Кнопка назад */}
        <div className="pt-[max(20px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Назад"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#12303A] shadow-sm transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Логотип CleanGo */}
        <motion.div
          initial={{
            opacity: 0,
            y: reduceMotion ? 0 : 14,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.4,
          }}
          className="mt-2 flex justify-center"
        >
          <CleanGoLogo
            size={78}
            showName
            priority
            className="flex-col gap-1"
          />
        </motion.div>

        {/* Заголовок */}
        <motion.div
          initial={{
            opacity: 0,
            y: reduceMotion ? 0 : 14,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.4,
            delay: reduceMotion ? 0 : 0.08,
          }}
          className="mt-8 text-center"
        >
          <h1 className="text-[clamp(26px,7vw,34px)] font-bold leading-[1.16] tracking-[-0.045em]">
            Добро пожаловать
            <br />
            в CleanGo!
          </h1>

          <p className="mx-auto mt-4 max-w-[300px] text-[15px] leading-6 text-slate-500">
            Выберите, как вы хотите пользоваться нашим сервисом
          </p>
        </motion.div>

        {/* Карточки выбора роли */}
        <div className="mt-9 flex flex-col gap-4">
          {roles.map((role, index) => {
            const selected = selectedRole === role.id;

            return (
              <motion.button
                key={role.id}
                type="button"
                disabled={loading}
                onClick={() => setSelectedRole(role.id)}
                aria-pressed={selected}
                initial={{
                  opacity: 0,
                  y: reduceMotion ? 0 : 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion
                    ? 0
                    : 0.12 + index * 0.08,
                }}
                className={`flex w-full items-center gap-3 rounded-[26px] border-2 bg-white p-3 text-left shadow-[0_10px_30px_rgba(17,91,91,0.05)] transition-colors ${
                  selected
                    ? "border-[#12B6A6] bg-[#F7FFFD]"
                    : "border-[#E6F0F0]"
                }`}
              >
                {/* Новая объёмная PNG-иконка */}
                <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-[23px] bg-gradient-to-br from-[#F2FFFC] via-[#D9F8F2] to-[#BCEEE6]">
                  <Image
                    src={role.image}
                    alt={role.imageAlt}
                    width={160}
                    height={160}
                    sizes="84px"
                    className="h-[94%] w-[94%] object-contain"
                  />
                </div>

                {/* Текст роли */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-bold leading-6">
                    {role.title}
                  </h2>

                  <p className="mt-1 text-[13px] leading-5 text-slate-500">
                    {role.description}
                  </p>
                </div>

                {/* Индикатор выбора */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? "border-[#12B6A6] bg-[#12B6A6]"
                      : "border-[#D8E2E6]"
                  }`}
                >
                  {selected && (
                    <Check
                      className="h-4 w-4 text-white"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Нижняя кнопка */}
        <div className="mt-auto pt-8">
          <button
            type="button"
            disabled={!selectedRole || loading}
            onClick={handleContinue}
            className="flex h-[58px] w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#12B6A6] to-[#079EAB] text-[16px] font-semibold text-white shadow-[0_12px_24px_rgba(18,182,166,0.2)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? "Подождите..." : "Продолжить"}

            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Безопасный вход через Telegram
          </p>
        </div>
      </div>
    </main>
  );
}
