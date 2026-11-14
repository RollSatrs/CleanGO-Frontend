
"use client";

import Image from "next/image";
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

      {/* Облако из PNG */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[9%] z-10 flex justify-center"
      >
        <div className="relative w-[115%] max-w-[650px] shrink-0">
          <Image
            src="/images/cleango/clouds.png"
            alt=""
            width={1600}
            height={1000}
            priority
            sizes="(max-width: 520px) 115vw, 650px"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

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
          transition={{
            duration: reduceMotion ? 0 : 0.65,
          }}
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

        {/* Кнопки поверх облака */}
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
            duration: reduceMotion ? 0 : 0.6,
            delay: reduceMotion ? 0 : 0.2,
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
    </main>
  );
}
