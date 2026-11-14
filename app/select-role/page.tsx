
"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

import CleanGoLogo from "@/components/branding/CleanGoLogo";

type Role = "client" | "cleaner";

const roles = [
  {
    id: "client" as const,
    title: "Я клиент",
    description:
      "Хочу заказать уборку для дома или офиса",
    image: "/images/cleango/client-role.png",
    alt: "3D-иконка домика",
  },
  {
    id: "cleaner" as const,
    title: "Я клинер",
    description:
      "Хочу выполнять заказы и зарабатывать",
    image: "/images/cleango/cleaner-role.png",
    alt: "3D-иконка средств для уборки",
  },
];

export default function RoleSelection() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [selectedRole, setSelectedRole] =
    useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!selectedRole || loading) return;
    setLoading(true);
    router.push(selectedRole === "client" ? "/" : "/cleaner");
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F8FCFF] px-6 pb-8 pt-6 text-[#102334]">
      {/* Фон */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-teal-100/60 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />

      {/* Стрелка назад */}
      <div className="relative z-10">
        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-start text-[#102334] transition-opacity active:opacity-60"
        >
          <ArrowLeft
            className="h-[18px] w-[18px]"
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Логотип */}
      <div className="relative z-10 mt-1 flex flex-col items-center">
        <CleanGoLogo
          size={88}
          showName
          priority
          className="flex-col gap-1"
        />
      </div>

      {/* Приветствие */}
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
        className="relative z-10 mt-8 text-center"
      >
        <h1 className="text-[30px] font-bold leading-[1.15] tracking-tight">
          Добро пожаловать
          <br />
          в CleanGo!
        </h1>

        <p className="mx-auto mt-4 max-w-[280px] text-[15px] leading-6 text-slate-500">
          Выберите, как вы хотите
          пользоваться нашим сервисом
        </p>
      </motion.div>

      {/* Карточки выбора роли */}
      <div className="relative z-10 mt-9 flex flex-col gap-4">
        {roles.map((role, index) => {
          const selected = selectedRole === role.id;

          return (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.08 + index * 0.07 }}
              type="button"
              disabled={loading}
              onClick={() => setSelectedRole(role.id)}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-[24px] border-2 bg-white p-3 text-left shadow-sm transition-colors duration-200 ${
                selected
                  ? "border-[#12B6A6] shadow-lg shadow-teal-100"
                  : "border-[#E9F1F6] hover:border-teal-200"
              }`}
            >
              {/* 3D PNG-иконка */}
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[20px] bg-[#E9F9F6]">
                <Image
                  src={role.image}
                  alt={role.alt}
                  width={160}
                  height={160}
                  sizes="88px"
                  className="h-[94%] w-[94%] object-contain"
                />
              </div>

              {/* Информация о роли */}
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-bold">
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
                    : "border-slate-200"
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

      {/* Кнопка продолжения */}
      <div className="relative z-10 mt-auto pt-10">
        <button
          type="button"
          disabled={!selectedRole || loading}
          onClick={handleContinue}
          className="flex h-[58px] w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#12B6A6] to-[#079EAB] text-[16px] font-semibold text-white shadow-lg shadow-teal-100 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Подождите..." : "Продолжить"}

          {!loading && (
            <ArrowRight className="h-5 w-5" />
          )}
        </button>

        <p className="mt-5 text-center text-[12px] text-slate-400">
          Безопасный вход через Telegram
        </p>
      </div>
    </main>
  );
}
