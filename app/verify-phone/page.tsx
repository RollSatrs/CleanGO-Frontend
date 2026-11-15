"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function VerifyPhonePage() {
  const { user, sendPhoneCode, verifyPhoneCode } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSentAt, setLastSentAt] = useState(0);

  const normalized = phone.replace(/[\s()\-]/g, "");
  const valid = /^\+[1-9]\d{7,14}$/.test(normalized);

  async function send() {
    if (!valid || busy || Date.now() - lastSentAt < 60000) return;
    setBusy(true);
    setError("");
    try {
      await sendPhoneCode(normalized);
      setSent(true);
      setLastSentAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить SMS");
    } finally { setBusy(false); }
  }

  async function verify() {
    if (!/^\d{4,10}$/.test(code) || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await verifyPhoneCode(normalized, code);
      router.replace(updated.role === "cleaner" ? "/cleaner" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось подтвердить номер");
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#F1FFFB] via-white to-[#E3F8F7] px-5 text-[#102334]">
      <section className="w-full max-w-[420px] rounded-[30px] bg-white p-7 shadow-[0_20px_70px_rgba(13,117,111,0.09)]">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#DDF8F2]">
          {sent ? <ShieldCheck className="h-8 w-8 text-[#0AAE9E]" /> : <Phone className="h-8 w-8 text-[#0AAE9E]" />}
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Подтвердите номер</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Номер нужен, чтобы клиент и клинер могли связаться по заказу. Мы отправим код подтверждения по SMS.</p>
        <label htmlFor="phone" className="mt-7 block text-sm font-semibold">Номер телефона</label>
        <input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} disabled={sent || busy}
          onChange={e => setPhone(e.target.value)} placeholder="+7 777 123 45 67"
          className="mt-2 h-14 w-full rounded-2xl border border-[#D9EBE8] px-4 outline-none focus:border-[#0AAE9E]" />
        {sent && <>
          <label htmlFor="code" className="mt-5 block text-sm font-semibold">Код из SMS</label>
          <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Введите код"
            className="mt-2 h-14 w-full rounded-2xl border border-[#D9EBE8] px-4 outline-none focus:border-[#0AAE9E]" />
        </>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={busy || (sent ? !/^\d{4,10}$/.test(code) : !valid)}
          onClick={() => void (sent ? verify() : send())}
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0AAE9E] font-semibold text-white disabled:opacity-40">
          {busy ? "Подождите..." : sent ? "Подтвердить номер" : "Отправить SMS"}
          {!busy && <ArrowRight className="h-5 w-5" />}
        </button>
        {sent && <button type="button" onClick={() => { setSent(false); setCode(""); setError(""); }}
          className="mt-4 w-full text-center text-sm text-[#087F77]">Изменить номер или запросить новый код</button>}
        <p className="mt-5 text-center text-xs text-slate-400">Номер будет привязан к вашему аккаунту CleanGo.</p>
      </section>
    </main>
  );
}
