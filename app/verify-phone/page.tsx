"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

type TelegramWebApp = {
  requestContact?: (callback?: (sent: boolean, event?: unknown) => void) => void;
};
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export default function VerifyPhonePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;
    let attempts = 0;
    const interval = setInterval(() => {
      if (++attempts > 45) {
        clearInterval(interval);
        if (!cancelled) {
          setWaiting(false);
          setError("Подтверждение не получено. Попробуйте ещё раз.");
        }
        return;
      }
      void refreshUser().then(updated => {
        if (cancelled || !updated.phoneVerifiedAt) return;
        clearInterval(interval);
        router.replace(updated.role === "cleaner" ? "/cleaner" : "/");
      }).catch(() => {});
    }, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [waiting, refreshUser, router]);

  function requestContact() {
    setError("");
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.requestContact) {
      setError("Откройте CleanGo в обновлённом приложении Telegram.");
      return;
    }
    setRequesting(true);
    try {
      webApp.requestContact(sent => {
        setRequesting(false);
        if (sent) setWaiting(true);
        else setError("Разрешите передачу своего номера в Telegram, чтобы продолжить.");
      });
    } catch {
      setRequesting(false);
      setError("Не удалось запросить номер. Обновите Telegram и попробуйте снова.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#F1FFFB] via-white to-[#E3F8F7] px-5 text-[#102334]">
      <section className="w-full max-w-[420px] rounded-[30px] bg-white p-7 shadow-[0_20px_70px_rgba(13,117,111,0.09)]">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#DDF8F2]">
          {waiting ? <ShieldCheck className="h-8 w-8 text-[#0AAE9E]" /> : <Phone className="h-8 w-8 text-[#0AAE9E]" />}
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Подтвердите номер</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Для связи по заказам CleanGo нужен ваш номер телефона. Поделитесь им через Telegram — SMS и код вводить не потребуется.
        </p>
        {waiting && <p role="status" className="mt-6 rounded-2xl bg-[#E5F8F3] p-4 text-sm text-[#087F77]">
          Ожидаем подтверждение от Telegram... Обычно это занимает несколько секунд.
        </p>}
        {error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={requesting || waiting} onClick={requestContact}
          className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-[#0AAE9E] px-4 font-semibold text-white disabled:opacity-50">
          {waiting ? "Проверяем номер..." : requesting ? "Ожидаем Telegram..." : "Поделиться номером через Telegram"}
        </button>
        {waiting && <button type="button" className="mt-4 w-full text-center text-sm text-[#087F77]"
          onClick={() => { setWaiting(false); setError(""); }}>Повторить запрос</button>}
        <p className="mt-5 text-center text-xs text-slate-400">
          Номер будет сохранён в вашем профиле CleanGo. {user?.firstName ?? ""}
        </p>
      </section>
    </main>
  );
}
