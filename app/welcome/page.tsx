
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const appear = (delay = 0) => ({
    initial: {
      opacity: 1,
      y: reduceMotion ? 0 : 10,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    transition: {
      duration: reduceMotion ? 0 : 0.45,
      delay: reduceMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  // Временная проверка кнопки
  const handleStart = () => {
    alert("Кнопка работает!");

    router.push("/onboarding");
  };

  const handleLogin = () => {
    alert("Кнопка входа работает!");

    router.push("/login");
  };

  return (
    <main className="min-h-[100dvh] bg-[#24B7EB] font-sans">
      <section
        className="
          cleango-screen
          relative isolate mx-auto flex
          w-full max-w-[520px] flex-col
          overflow-hidden
          bg-gradient-to-br
          from-[#079DE8] via-[#27B8F1] to-[#7BDCF5]
          px-5 text-white
        "
      >
        {/* Мягкий свет */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_at_75%_15%,rgba(255,255,255,0.18),transparent_55%)]
          "
        />

        {/* Логотип и описание */}
        <div
          className="
            relative z-10 flex min-h-0
            flex-1 flex-col items-center
            justify-center pb-24 text-center
          "
        >
          <motion.div {...appear(0.05)}>
            <Sparkles
              className="mx-auto mb-7 h-14 w-14"
              strokeWidth={1.8}
            />

            <h1 className="text-[54px] font-bold tracking-[-0.06em]">
              CleanGo
            </h1>

            <p className="mt-5 text-[18px] leading-7 text-white/95">
              Профессиональная
              <br />
              уборка вашего дома
            </p>
          </motion.div>
        </div>

        {/* Облака */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute
            bottom-[4%] left-[56%] z-0
            w-[160%] -translate-x-1/2
          "
        >
          <Image
            src="/images/cleango/clouds.png"
            alt=""
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 640px) 160vw, 650px"
            className="h-auto w-full"
          />
        </div>

        {/* Нижние кнопки */}
        <motion.div
          {...appear(0.12)}
          className="
            relative z-20 mt-auto
            shrink-0 space-y-4
            pb-[max(56px,calc(env(safe-area-inset-bottom)+32px))]
          "
        >
          {/* Начать */}
          <button
            type="button"
            onClick={handleStart}
            className="
              relative z-30
              flex h-[60px] w-full
              cursor-pointer
              items-center justify-center
              rounded-full bg-white px-6
              text-[17px] font-semibold
              text-[#102033]
              shadow-[0_12px_35px_rgba(0,55,95,0.16)]
              transition-transform
              active:scale-[0.98]
              touch-manipulation
            "
          >
            <span className="flex-1 text-center">
              Начать
            </span>

            <ArrowRight className="h-6 w-6" />
          </button>

          {/* Вход */}
          <button
            type="button"
            onClick={handleLogin}
            className="
              relative z-30
              block w-full cursor-pointer
              text-center text-sm font-medium
              text-white/90
              touch-manipulation
            "
          >
            У меня уже есть аккаунт
          </button>
        </motion.div>
      </section>
    </main>
  );
}
