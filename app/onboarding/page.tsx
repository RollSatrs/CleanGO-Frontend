
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import { ArrowLeft, ArrowRight } from "lucide-react";

type OnboardingSlide = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

const slides: OnboardingSlide[] = [
  {
    title: "Чистый дом\nбез забот",
    description:
      "Закажите уборку, а мы подберём проверенного клинера",
    image: "/images/cleango/living-room.png",
    imageAlt: "Уютное кресло и комнатное растение",
  },
  {
    title: "Быстро,\nудобно, безопасно",
    description:
      "Прозрачная стоимость, надёжные исполнители и контроль качества",
    image: "/images/cleango/onboarding-cleaning-brush.png",
    imageAlt: "3D-щётка для уборки CleanGo",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState(0);

  const current = slides[step];

  function handleBack() {
    if (step > 0) {
      setStep((previous) => previous - 1);
    } else {
      router.push("/welcome");
    }
  }

  function handleNext() {
    if (step < slides.length - 1) {
      setStep((previous) => previous + 1);
    } else {
      router.push("/select-role");
    }
  }

  function handleSkip() {
    router.push("/select-role");
  }

  const appear = (delay = 0) => ({
    initial: {
      opacity: 0,
      y: reduceMotion ? 0 : 12,
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

  return (
    <main className="min-h-[100dvh] bg-[#F7F7F5] font-sans">
      <section className="cleango-screen mx-auto flex w-full max-w-[520px] flex-col bg-[#F7F7F5] px-5 text-[#15191D]">

        {/* Верхняя навигация */}
        <motion.header
          {...appear(0)}
          className="flex shrink-0 items-center justify-between cleango-onboarding-header"
        >
          <button
            type="button"
            onClick={handleBack}
            aria-label="Назад"
            className="flex h-11 w-11 items-center justify-start bg-transparent text-[#101B2C] transition-opacity active:opacity-60"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-[#8392A2] transition-opacity active:opacity-60"
          >
            Пропустить
          </button>
        </motion.header>

        {/* Центральная часть */}
        <div className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{
                opacity: 0,
                x: reduceMotion ? 0 : 14,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: reduceMotion ? 0 : -14,
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex w-full flex-col"
            >
              {/* Увеличенная иллюстрация */}
              <div
                className="
                  relative flex
                  h-[clamp(260px,42dvh,420px)]
                  w-full shrink-0
                  items-center justify-center
                "
              >
                <Image
                  src={current.image}
                  alt={current.imageAlt}
                  width={1024}
                  height={1024}
                  priority
                  sizes="(max-width: 520px) 100vw, 480px"
                  className="
                    h-auto max-h-full
                    w-[115%] max-w-none
                    object-contain
                  "
                />
              </div>

              {/* Индикаторы слайдов */}
              <div className="mt-2 flex justify-center gap-2">
                {slides.map((_, index) => (
                  <span
                    key={index}
                    className={`
                      h-2 rounded-full
                      transition-all duration-300
                      ${
                        index === step
                          ? "w-5 bg-[#12B6A6]"
                          : "w-2 bg-[#D6E4E7]"
                      }
                    `}
                  />
                ))}
              </div>

              {/* Заголовок и описание */}
              <div className="mt-7">
                <h1 className="whitespace-pre-line text-[clamp(28px,8vw,36px)] font-bold leading-[1.12] tracking-[-0.055em]">
                  {current.title}
                </h1>

                <p className="mt-4 max-w-[320px] text-[16px] leading-6 text-[#738294]">
                  {current.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Нижняя кнопка */}
        <motion.div
          {...appear(0.12)}
          className="cleango-safe-bottom shrink-0"
        >
          <motion.button
            type="button"
            onClick={handleNext}
            whileTap={
              reduceMotion
                ? undefined
                : { scale: 0.98 }
            }
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl cg-primary px-6 text-sm font-semibold transition-colors"
          >
            Продолжить
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </section>
    </main>
  );
}
