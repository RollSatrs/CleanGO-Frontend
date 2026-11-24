
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";

type Mode = "login" | "register";
type Step = "phone" | "code";

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
  };
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem(
      "cleango_access_token",
    );

    if (token) {
      router.replace("/");
    }
  }, [router]);

  async function requestCode() {
    setError("");
    setNotice("");

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError(
        "Введите номер в формате +77001234567",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/phone/send-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Не удалось отправить SMS. Проверьте настройки SMS-сервиса.",
        );
      }

      setStep("code");
      setNotice("Код подтверждения отправлен");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ошибка соединения",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/phone/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone,
            code,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Неверный код или срок его действия истёк",
        );
      }

      const result =
        (await response.json()) as AuthResponse;

      sessionStorage.setItem(
        "cleango_access_token",
        result.accessToken,
      );

      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ошибка подтверждения",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loginTelegram() {
    setError("");
    setLoading(true);

    try {
      const telegram = (
        window as Window & {
          Telegram?: {
            WebApp?: {
              initData?: string;
            };
          };
        }
      ).Telegram?.WebApp;

      if (!telegram?.initData) {
        throw new Error(
          "Откройте CleanGo через Telegram-бота",
        );
      }

      const response = await fetch(
        `${API_URL}/auth/telegram`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData: telegram.initData,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Не удалось войти через Telegram",
        );
      }

      const result =
        (await response.json()) as AuthResponse;

      sessionStorage.setItem(
        "cleango_access_token",
        result.accessToken,
      );

      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ошибка Telegram",
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setStep("phone");
    setCode("");
    setError("");
    setNotice("");
  }

  return (
    <main className="min-h-[100dvh] bg-[#EAF4F9] text-[#132236]">
      <section className="relative mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_10%,#FFFFFF_0%,#F4FAFE_43%,#E5F3FB_100%)] cleango-onboarding-content shadow-[0_0_55px_rgba(23,79,110,0.12)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full bg-[#89E7F3]/60 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-white/90 blur-xl"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[370px] flex-1 flex-col">
          <div className="mt-8 flex justify-center">
            <div className="relative flex h-[58px] w-[58px] items-center justify-center">
              <div className="absolute left-2 top-3 h-5 w-5 rotate-45 rounded-[3px] bg-[#20C7DC]" />
              <div className="absolute right-2 top-2 h-5 w-5 rotate-45 rounded-[3px] bg-[#059EE9]" />
              <div className="absolute bottom-2 left-[20px] h-5 w-5 rotate-45 rounded-[3px] bg-[#11BDD5]" />
              <Sparkles className="relative z-10 h-4 w-4 text-white" />
            </div>
          </div>

          <h1 className="mt-5 text-center text-[27px] font-extrabold leading-[1.12] tracking-[-0.055em]">
            Добро пожаловать
            <br />
            в CleanGo
          </h1>

          <div className="mt-8 flex rounded-full bg-[#E3EFF7] p-1 shadow-[inset_0_2px_6px_rgba(76,125,155,0.05)]">
            {(["login", "register"] as const).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeMode(item)}
                  className={`h-11 flex-1 rounded-full text-[14px] transition-all ${
                    mode === item
                      ? "bg-white font-bold text-[#172334] shadow-[0_5px_15px_rgba(50,92,125,0.10)]"
                      : "font-medium text-[#547085]"
                  }`}
                >
                  {item === "login"
                    ? "Вход"
                    : "Регистрация"}
                </button>
              ),
            )}
          </div>

          <div className="mt-5 space-y-3">
            {step === "code" && (
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError("");
                }}
                className="flex items-center gap-2 text-sm text-[#64849A]"
              >
                <ArrowLeft className="h-4 w-4" />
                Изменить номер
              </button>
            )}

            <label className="flex h-[54px] items-center gap-3 rounded-[19px] bg-white/85 px-4 shadow-[0_7px_20px_rgba(61,110,144,0.07)]">
              <Phone className="h-[19px] w-[19px] shrink-0 text-[#7898AD]" />
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                disabled={step === "code"}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="Номер телефона"
                className="w-full bg-transparent text-[14px] text-[#25394C] outline-none placeholder:text-[#7B94A7] disabled:opacity-60"
              />
            </label>

            {step === "code" && (
              <label className="flex h-[54px] items-center gap-3 rounded-[19px] bg-white/85 px-4 shadow-[0_7px_20px_rgba(61,110,144,0.07)]">
                <LockKeyhole className="h-[19px] w-[19px] text-[#7898AD]" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10),
                    )
                  }
                  placeholder="Код из SMS"
                  className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#7B94A7]"
                />
              </label>
            )}

            {step === "phone" ? (
              <p className="text-right text-[12px] text-[#66849B]">
                Вход по одноразовому SMS-коду
              </p>
            ) : (
              <button
                type="button"
                onClick={requestCode}
                disabled={loading}
                className="block w-full text-right text-[12px] text-[#5688A7]"
              >
                Отправить код повторно
              </button>
            )}

            {notice && (
              <p className="flex items-center gap-2 text-[12px] text-[#168B7C]">
                <CheckCircle2 className="h-4 w-4" />
                {notice}
              </p>
            )}

            {error && (
              <p role="alert" className="text-[12px] text-red-600">
                {error}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={
              step === "phone"
                ? requestCode
                : verifyCode
            }
            className="mt-7 flex h-[56px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#05B5E8] to-[#079BE2] text-[17px] font-bold text-white shadow-[0_10px_25px_rgba(0,160,218,0.18)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading
              ? "Подождите..."
              : step === "phone"
                ? "Получить код"
                : "Войти"}
          </button>

          <div className="mt-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D4E5EF]" />
            <span className="text-[12px] text-[#6E879B]">
              или войти через
            </span>
            <div className="h-px flex-1 bg-[#D4E5EF]" />
          </div>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={loginTelegram}
              disabled={loading}
              aria-label="Войти через Telegram"
              className="flex h-[58px] items-center gap-3 rounded-full bg-white px-6 text-[14px] font-semibold text-[#263E53] shadow-[0_7px_22px_rgba(52,107,145,0.10)] transition-transform active:scale-[0.97]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6F8FE]">
                <Send className="h-5 w-5 fill-[#12A8E3] text-[#12A8E3]" />
              </span>
              Telegram
            </button>
          </div>

          <p className="mt-auto pt-10 text-center text-[11px] leading-5 text-[#8AA0AF]">
            Продолжая, вы подтверждаете согласие
            <br />
            с условиями использования CleanGo
          </p>
        </div>
      </section>
    </main>
  );
}
