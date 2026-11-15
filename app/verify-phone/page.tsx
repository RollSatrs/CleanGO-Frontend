"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, LockKeyhole, RefreshCw, Send, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

type TelegramWebApp = {
  requestContact?: (callback?: (sent: boolean, event?: unknown) => void) => void;
};
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type Stage = "connect" | "waiting" | "success";

export default function VerifyPhonePage() {
  const { user, refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>("connect");
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [diagnostic, setDiagnostic] = useState("");
  const verifiedRef = useRef(false);

  const goToApp = useCallback((role?: string) => {
    window.location.replace(role === "cleaner" ? "/cleaner" : "/");
  }, []);

  useEffect(() => {
    if (user?.phoneVerifiedAt && !verifiedRef.current) {
      verifiedRef.current = true;
      setStage("success");
    }
  }, [user?.phoneVerifiedAt]);

  useEffect(() => {
    if (stage !== "waiting") return;

    let cancelled = false;
    let busy = false;
    let attempts = 0;
    let lastError = "";

    async function checkVerification() {
      if (cancelled || busy) return;
      busy = true;
      setChecking(true);
      try {
        const updated = await refreshUser();
        if (cancelled) return;
        setDiagnostic(updated.phoneVerifiedAt ? "Номер подтверждён" : "Ожидаем ответ Telegram");
        if (updated.phoneVerifiedAt) {
          verifiedRef.current = true;
          setStage("success");
        }
      } catch (cause) {
        lastError = cause instanceof Error ? cause.message : "Не удалось проверить статус";
        if (!cancelled) setDiagnostic(lastError);
      } finally {
        busy = false;
        if (!cancelled) setChecking(false);
      }
    }

    void checkVerification();
    const interval = window.setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      if (attempts >= 45) {
        window.clearInterval(interval);
        setStage("connect");
        setError(lastError || "Не удалось получить подтверждение. Попробуйте ещё раз.");
        return;
      }
      void checkVerification();
    }, 2000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVerification();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [stage, refreshUser]);

  function requestContact() {
    setError("");
    setDiagnostic("");
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.requestContact) {
      setError("Откройте CleanGo в обновлённом приложении Telegram.");
      return;
    }
    setRequesting(true);
    try {
      webApp.requestContact(sent => {
        setRequesting(false);
        if (sent) setStage("waiting");
        else setError("Разрешите передачу номера в Telegram, чтобы продолжить.");
      });
    } catch {
      setRequesting(false);
      setError("Не удалось отправить запрос. Обновите Telegram и попробуйте снова.");
    }
  }

  const isWaiting = stage === "waiting";
  const isSuccess = stage === "success";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F8FCFB] text-[#152535]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-[#E3F9F5] blur-[72px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#D8F5F3] blur-[88px]" />

      <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-7">
        <header className="flex items-center justify-between">
          <span className="text-[19px] font-extrabold tracking-[-0.7px]">Clean<span className="text-[#22B5A6]">Go</span></span>
          <span className="rounded-full border border-[#E2EFEC] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#6A8885]">
            Подключение номера
          </span>
        </header>

        <div aria-label="Этап подключения" className="mt-9 flex items-center justify-center gap-2">
          {[0, 1, 2].map((step) => (
            <span key={step} className={`h-1.5 w-12 rounded-full transition-colors duration-700 ${step <= (isSuccess ? 2 : isWaiting ? 1 : 0) ? "bg-[#36BDAE]" : "bg-[#DCEDEB]"}`} />
          ))}
        </div>

        <div key={`illustration-${stage}`} className="motion-safe:animate-[cleanGoEnter_850ms_cubic-bezier(0.22,1,0.36,1)_both] relative mx-auto mt-8 flex h-[190px] w-full max-w-[280px] items-center justify-center sm:mt-12">
          <div className="absolute h-36 w-52 rotate-[-17deg] rounded-[55%] bg-[#E0F8F4]" />
          <div className="absolute h-32 w-44 rotate-[22deg] rounded-[55%] border border-[#B4EBE5]" />
          {isSuccess ? (
            <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-[#80E4D6] to-[#19B6A5] text-white shadow-[0_18px_34px_rgba(23,169,151,0.2)] motion-safe:animate-[bounce_2.5s_ease-in-out_infinite]">
              <Check className="h-14 w-14" strokeWidth={3} />
            </div>
          ) : (
            <div className={`relative flex h-28 w-28 rotate-[-8deg] items-center justify-center rounded-[32px] border border-white bg-gradient-to-br from-white via-[#F4FFFF] to-[#BCEFE8] shadow-[10px_17px_30px_rgba(34,148,139,0.16)] ${isWaiting ? "motion-safe:animate-pulse" : "motion-safe:animate-[bounce_4s_ease-in-out_infinite]"}`}>
              <Send className="h-14 w-14 translate-x-0.5 -rotate-3 fill-[#23A9E6] text-[#23A9E6]" strokeWidth={1.4} />
            </div>
          )}
          <Sparkles className="absolute right-8 top-4 h-6 w-6 text-[#6AD9CB]" strokeWidth={1.8} />
          <div className="absolute bottom-6 left-8 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#1DB9A7] shadow-[0_5px_15px_rgba(30,140,130,0.1)]">
            {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
        </div>

        <div key={`copy-${stage}`} className="mt-2 text-center motion-safe:animate-[cleanGoEnter_760ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <h1 className="text-[27px] font-extrabold leading-[1.18] tracking-[-1px] sm:text-[30px]">
            {isSuccess ? "Номер подключён!" : isWaiting ? "Проверяем номер..." : <>Подключите номер<br />телефона</>}
          </h1>
          <p className="mx-auto mt-4 max-w-[310px] text-[13px] leading-[1.75] text-[#70818E]">
            {isSuccess
              ? "Готово! Теперь вы можете пользоваться всеми возможностями CleanGo."
              : isWaiting
                ? "Ожидаем подтверждение от Telegram. Обычно это занимает несколько секунд."
                : "Подтвердите свой номер через Telegram, чтобы мы могли связываться с вами по заказам. Без SMS и кодов."}
          </p>
        </div>

        <section key={`status-${stage}`} className="mt-8 motion-safe:animate-[cleanGoEnter_850ms_cubic-bezier(0.22,1,0.36,1)_both] rounded-[22px] border border-[#E5F3F0] bg-[#F0FAF8] px-5 py-2">
          {isSuccess ? (
            <>
              <StatusLine icon={<Check className="h-[17px] w-[17px]" />} text="Аккаунт подключён" />
              <StatusLine icon={<Check className="h-[17px] w-[17px]" />} text="Номер подтверждён" />
              <StatusLine icon={<Check className="h-[17px] w-[17px]" />} text="Всё готово к работе" last />
            </>
          ) : isWaiting ? (
            <>
              <StatusLine icon={<CheckCircle2 className="h-[17px] w-[17px]" />} text="Запрос отправлен" />
              <StatusLine icon={<RefreshCw className={`h-[17px] w-[17px] ${checking ? "motion-safe:animate-spin" : ""}`} />} text="Ожидаем подтверждение" last />
            </>
          ) : (
            <>
              <StatusLine icon={<ShieldCheck className="h-[17px] w-[17px]" />} text="Безопасно" />
              <StatusLine icon={<Zap className="h-[17px] w-[17px]" />} text="Быстро — без SMS" />
              <StatusLine icon={<LockKeyhole className="h-[17px] w-[17px]" />} text="Номер сохранится в профиле" last />
            </>
          )}
        </section>

        {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-center text-xs leading-5 text-red-700">{error}</p>}

        <div key={`actions-${stage}`} className="mt-auto pt-8 motion-safe:animate-[cleanGoEnter_820ms_cubic-bezier(0.22,1,0.36,1)_both]">
          {isSuccess ? (
            <button type="button" onClick={() => goToApp(user?.role)} className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#26B8A8] px-5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(28,169,153,0.15)] transition active:scale-[0.99]">
              Продолжить <ArrowRight className="h-4 w-4" />
            </button>
          ) : isWaiting ? (
            <>
              <div role="status" className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#DDF5F1] text-[13px] font-semibold text-[#198E83]">
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" /> Ожидаем Telegram
              </div>
              <button type="button" onClick={() => { setStage("connect"); setError(""); }} className="mt-4 w-full py-2 text-center text-[13px] font-medium text-[#278F85]">
                Повторить запрос
              </button>
              {diagnostic && (
                <div className="mt-2 text-center">
                  <button type="button" onClick={() => setShowDetails(value => !value)} className="text-[11px] text-[#9AAEAE] underline underline-offset-2">
                    {showDetails ? "Скрыть сведения" : "Сведения о проверке"}
                  </button>
                  {showDetails && <p className="mt-1 break-words text-[11px] text-[#819696]">{diagnostic}</p>}
                </div>
              )}
            </>
          ) : (
            <button type="button" onClick={requestContact} disabled={requesting} className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-[#53CDBF] to-[#20AE9F] px-4 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(28,169,153,0.15)] transition active:scale-[0.99] disabled:opacity-60">
              <Send className="h-[17px] w-[17px] fill-white" strokeWidth={1.5} />
              {requesting ? "Ожидаем Telegram..." : "Подключить через Telegram"}
              {!requesting && <ArrowRight className="ml-auto h-4 w-4" />}
            </button>
          )}
          {!isSuccess && <p className="mt-5 text-center text-[11px] leading-5 text-[#99A9B2]">Номер будет сохранён в вашем профиле CleanGo.</p>}
        </div>
      </div>
      <style jsx global>{`@keyframes cleanGoEnter { from { opacity: 0; transform: translateY(18px) scale(0.975); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </main>
  );
}

function StatusLine({ icon, text, last = false }: { icon: React.ReactNode; text: string; last?: boolean }) {
  return (
    <div className={`flex min-h-11 items-center gap-3 text-[13px] font-medium text-[#29424B] ${last ? "" : "border-b border-[#DDEFEA]"}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#25B5A6]">{icon}</span>
      {text}
    </div>
  );
}
