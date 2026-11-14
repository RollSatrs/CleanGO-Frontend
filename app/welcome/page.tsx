
"use client";

import Image from "next/image";
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
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#70DED2] font-sans text-[#083D40]">
      {/* Основной мятный фон */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_24%,#F2FFFB_0%,#DEFBF5_34%,#AEF0E6_68%,#70DED2_100%)]"
      />

      {/* Продолжение цвета облака до низа экрана */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[45%] bg-gradient-to-b from-transparent via-[#81E4D8]/65 to-[#45C9BC]"
      />

      {/* 3D-облако из твоего PNG */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[7%] z-10 flex justify-center"
      >
        <div
          className="relative w-[145%] max-w-[780px] shrink-0"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 67%, rgba(0,0,0,0.9) 77%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 67%, rgba(0,0,0,0.9) 77%, transparent 100%)",
          }}
        >
          <Image
            src="/images/cleango/clouds.png"
            alt=""
            width={1600}
            height={1000}
            priority
            sizes="(max-width: 520px) 145vw, 780px"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

      {/* Содержимое экрана */}
      <div className="relative z-20 mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-6">
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
          className="flex flex-col items-center pt-[clamp(65px,13dvh,135px)] text-center"
        >
          <CleanGoLogo
            size={118}
            priority
            className="justify-center"
          />

          <h1 className="mt-4 text-[clamp(43px,12vw,60px)] font-extrabold leading-none tracking-[-0.065em] text-[#07474A]">
            Clean
            <span className="text-[#00AFA6]">
              Go
            </span>
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
            className="relative flex h-[68px] w-full touch-manipulation items-center justify-center rounded-full bg-white px-7 text-[20px] font-bold text-[#073D40] shadow-[0_18px_45px_rgba(0,111,108,0.18)] transition-transform active:scale-[0.98]"
          >
            Начать

            <ArrowRight className="absolute right-7 h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-7 block w-full touch-manipulation text-center text-[15px] font-medium text-[#246D6B]"
          >
            У меня уже есть аккаунт
          </button>
        </motion.div>
      </div>
    </main>
  );
}
