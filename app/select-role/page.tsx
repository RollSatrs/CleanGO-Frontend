
"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  House,
  SprayCan,
} from "lucide-react";

import CleanGoLogo from "@/components/branding/CleanGoLogo";

type Role = "client" | "cleaner";

type RoleSelectionProps = {
  onContinue: (role: Role) => Promise<void> | void;
  loading?: boolean;
};

export default function RoleSelection({
  onContinue,
  loading = false,
}: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] =
    useState<Role | null>(null);

  const handleContinue = async () => {
    if (!selectedRole || loading) return;

    await onContinue(selectedRole);
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F8FCFF] px-6 pb-8 pt-12 text-[#102334]">
      {/* Фон */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-teal-100/60 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />

      {/* Логотип */}
      <div className="relative z-10 flex flex-col items-center">
        <CleanGoLogo
          size={88}
          showName
          priority
          className="flex-col gap-1"
        />
      </div>

      {/* Приветствие */}
      <div className="relative z-10 mt-10 text-center">
        <h1 className="text-[30px] font-bold leading-[1.15] tracking-tight">
          Добро пожаловать
          <br />
          в CleanGo!
        </h1>

        <p className="mx-auto mt-4 max-w-[280px] text-[15px] leading-6 text-slate-500">
          Выберите, как вы хотите
          пользоваться нашим сервисом
        </p>
      </div>

      {/* Выбор роли */}
      <div className="relative z-10 mt-10 flex flex-col gap-4">
        {/* Клиент */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setSelectedRole("client")}
          className={`flex w-full items-center gap-4 rounded-[24px] border-2 bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            selectedRole === "client"
              ? "border-[#12B6A6] shadow-lg shadow-teal-100"
              : "border-[#E9F1F6] hover:border-teal-200"
          }`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#E9F9F6]">
            <House
              className="h-8 w-8 text-[#12B6A6]"
              strokeWidth={1.8}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold">
              Я клиент
            </h2>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Хочу заказать уборку
              для дома или офиса
            </p>
          </div>

          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedRole === "client"
                ? "border-[#12B6A6] bg-[#12B6A6]"
                : "border-slate-200"
            }`}
          >
            {selectedRole === "client" && (
              <Check
                className="h-4 w-4 text-white"
                strokeWidth={3}
              />
            )}
          </div>
        </button>

        {/* Клинер */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setSelectedRole("cleaner")}
          className={`flex w-full items-center gap-4 rounded-[24px] border-2 bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            selectedRole === "cleaner"
              ? "border-[#12B6A6] shadow-lg shadow-teal-100"
              : "border-[#E9F1F6] hover:border-teal-200"
          }`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#E7FAF8]">
            <SprayCan
              className="h-8 w-8 text-[#12B6A6]"
              strokeWidth={1.8}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold">
              Я клинер
            </h2>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Хочу выполнять заказы
              и зарабатывать
            </p>
          </div>

          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedRole === "cleaner"
                ? "border-[#12B6A6] bg-[#12B6A6]"
                : "border-slate-200"
            }`}
          >
            {selectedRole === "cleaner" && (
              <Check
                className="h-4 w-4 text-white"
                strokeWidth={3}
              />
            )}
          </div>
        </button>
      </div>

      {/* Продолжить */}
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
