
"use client";

import { useState } from "react";
import { ArrowRight, Check, House, Sparkles, SprayCan } from "lucide-react";

type Role = "client" | "cleaner";

type RoleSelectionProps = {
  onContinue: (role: Role) => Promise<void> | void;
  loading?: boolean;
};

export default function RoleSelection({
  onContinue,
  loading = false,
}: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleContinue = async () => {
    if (!selectedRole || loading) return;
    await onContinue(selectedRole);
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F8FCFF] px-6 pb-8 pt-12 text-[#102334]">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-cyan-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-200/60 blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#00BDEB] to-[#168EDB] shadow-lg shadow-sky-200">
          <Sparkles className="h-9 w-9 text-white" strokeWidth={2.2} />
        </div>

        <span className="mt-3 text-[23px] font-bold tracking-tight">
          Clean<span className="text-[#08A9E2]">Go</span>
        </span>
      </div>

      {/* Heading */}
      <div className="relative z-10 mt-12 text-center">
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

      {/* Role cards */}
      <div className="relative z-10 mt-10 flex flex-col gap-4">
        <button
          type="button"
          disabled={loading}
          onClick={() => setSelectedRole("client")}
          className={`flex w-full items-center gap-4 rounded-[24px] border-2 bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            selectedRole === "client"
              ? "border-[#09ADE5] shadow-lg shadow-sky-100"
              : "border-[#E9F1F6] hover:border-sky-200"
          }`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#E9F8FF]">
            <House className="h-8 w-8 text-[#0BA9E1]" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold">Я клиент</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Хочу заказать уборку
              для дома или офиса
            </p>
          </div>

          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedRole === "client"
                ? "border-[#09ADE5] bg-[#09ADE5]"
                : "border-slate-200"
            }`}
          >
            {selectedRole === "client" && (
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            )}
          </div>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => setSelectedRole("cleaner")}
          className={`flex w-full items-center gap-4 rounded-[24px] border-2 bg-white p-5 text-left shadow-sm transition-all duration-200 ${
            selectedRole === "cleaner"
              ? "border-[#09ADE5] shadow-lg shadow-sky-100"
              : "border-[#E9F1F6] hover:border-sky-200"
          }`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#E7FAF8]">
            <SprayCan className="h-8 w-8 text-[#12B9B1]" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold">Я клинер</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Хочу выполнять заказы
              и зарабатывать
            </p>
          </div>

          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedRole === "cleaner"
                ? "border-[#09ADE5] bg-[#09ADE5]"
                : "border-slate-200"
            }`}
          >
            {selectedRole === "cleaner" && (
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            )}
          </div>
        </button>
      </div>

      {/* Bottom button */}
      <div className="relative z-10 mt-auto pt-10">
        <button
          type="button"
          disabled={!selectedRole || loading}
          onClick={handleContinue}
          className="flex h-[58px] w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#05B9ED] to-[#078FDE] text-[16px] font-semibold text-white shadow-lg shadow-sky-200 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Подождите..." : "Продолжить"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </button>

        <p className="mt-5 text-center text-[12px] text-slate-400">
          Безопасный вход через Telegram
        </p>
      </div>
    </main>
  );
}
