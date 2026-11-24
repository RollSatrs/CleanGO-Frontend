
"use client";

import ServiceImage from "@/components/ServiceImage";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import CleanGoLogo from "@/components/branding/CleanGoLogo";

export default function WelcomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  function handleStart() {
    router.push("/onboarding");
  }

  function handleLogin() {
    router.replace("/select-role");
  }

  return (
    <main className="relative isolate cleango-screen overflow-hidden bg-[#F7F7F5] font-sans text-[#15191D]">
      {/* Содержимое экрана */}
      <div className="relative z-20 mx-auto flex cleango-screen w-full max-w-[520px] flex-col px-6">
        {/* Логотип и название */}
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
          className="flex flex-col items-center cleango-welcome-intro text-center"
        >
          <CleanGoLogo
            size={118}
            priority
            className="justify-center"
          />

          <h1 className="mt-4 text-[clamp(43px,12vw,60px)] font-extrabold leading-none tracking-[-0.065em] text-[#15191D]">
            Clean
            <span className="text-[#259E9B]">
              Go
            </span>
          </h1>

          <p className="mt-7 max-w-[310px] text-[clamp(17px,4.7vw,21px)] font-medium leading-[1.45] cg-muted">
            Профессиональная уборка
            <br />
            вашего дома
          </p>
        </motion.div>

        <div className="my-6 flex flex-1 items-center"><ServiceImage type="regular" className="aspect-[4/3] w-full rounded-[18px]" sizes="(max-width: 520px) 90vw, 470px"/></div>

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
          className="relative z-30 cleango-welcome-actions"
        >
          <button
            type="button"
            onClick={handleStart}
            className="relative flex h-14 w-full touch-manipulation items-center justify-center rounded-[14px] cg-primary px-7 text-base font-semibold transition-transform active:scale-[0.98]"
          >
            Начать

            <ArrowRight className="absolute right-7 h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-7 block w-full touch-manipulation text-center text-[15px] font-medium text-[#137D79]"
          >
            У меня уже есть аккаунт
          </button>
        </motion.div>
      </div>
    </main>
  );
}
