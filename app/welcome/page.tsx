
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import CleanGoLogo from "@/components/branding/CleanGoLogo";

export default function WelcomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const handleStart = () => {
    router.push("/onboarding");
  };

  const handleLogin = () => {
    router.replace("/select-role");
  };

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#B8F3E9] font-sans text-[#083D40]">
      {/* Мятный фон */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_48%_25%,#F0FFFA_0%,#D6FAF2_35%,#A4ECE1_70%,#57D4C7_100%)]"
      />

      {/* Мягкое освещение */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-white/30 blur-[90px]"
      />

      {/* Основной контент */}
      <div className="relative z-20 mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-6">
        {/* Логотип */}
        <motion.div
          initial={{
            opacity: 0,
            y: reduceMotion ? 0 : 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{ duration: 0.65 }}
          className="flex flex-col items-center pt-[clamp(65px,13dvh,135px)] text-center"
        >
          <CleanGoLogo
            size={118}
            priority
            className="justify-center"
          />

          <h1 className="mt-4 text-[clamp(43px,12vw,60px)] font-extrabold leading-none tracking-[-0.065em] text-[#07474A]">
            Clean<span className="text-[#00AFA6]">Go</span>
          </h1>

          <p className="mt-7 max-w-[310px] text-[clamp(17px,4.7vw,21px)] font-medium leading-[1.45] text-[#315B60]">
            Профессиональная уборка
            <br />
            вашего дома
          </p>
        </motion.div>

        <div className="flex-1" />

        {/* Кнопки */}
        <motion.div
          initial={{
            opacity: 0,
            y: reduceMotion ? 0 : 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            delay: 0.2,
          }}
          className="relative z-30 pb-[max(42px,calc(env(safe-area-inset-bottom)+28px))]"
        >
          <button
            type="button"
            onClick={handleStart}
            className="relative flex h-[68px] w-full items-center justify-center rounded-full bg-white px-7 text-[20px] font-bold text-[#073D40] shadow-[0_18px_45px_rgba(0,111,108,0.18)] transition-transform active:scale-[0.98]"
          >
            Начать
            <ArrowRight className="absolute right-7 h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-7 block w-full text-center text-[15px] font-medium text-[#2B7775]"
          >
            У меня уже есть аккаунт
          </button>
        </motion.div>
      </div>

      {/* Объёмные облака */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[12%] z-10 h-[45%]"
      >
        {/* Центральное облако */}
        <div
          className="absolute bottom-[5%] left-[28%] h-[95%] w-[55%] rounded-[50%] bg-[radial-gradient(ellipse_at_28%_23%,#FFFFFF_0%,#E7FFFA_24%,#B1F2E9_57%,#44CFC1_100%)] shadow-[inset_-22px_-25px_45px_rgba(0,156,148,0.12),-15px_-10px_45px_rgba(255,255,255,0.45)]"
        />

        {/* Левое облако */}
        <div
          className="absolute bottom-[-5%] left-[-18%] h-[75%] w-[76%] rounded-[50%] bg-[radial-gradient(ellipse_at_30%_22%,#FFFFFF_0%,#E9FFFB_28%,#B2F0E8_63%,#49CEC2_100%)] shadow-[inset_-20px_-25px_40px_rgba(0,155,149,0.12)]"
        />

        {/* Правое облако */}
        <div
          className="absolute bottom-[-8%] right-[-23%] h-[84%] w-[77%] rounded-[50%] bg-[radial-gradient(ellipse_at_30%_20%,#FFFFFF_0%,#D9FAF3_31%,#91E7DB_64%,#26BDAF_100%)] shadow-[inset_-25px_-30px_45px_rgba(0,132,125,0.13)]"
        />

        {/* Нижняя часть облаков */}
        <div className="absolute inset-x-0 bottom-[-35%] h-[52%] bg-gradient-to-b from-[#6EDDD1] to-[#45CBBF]" />
      </div>
    </main>
  );
}
