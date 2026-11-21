"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { Bell, LoaderCircle } from "lucide-react";
import CleanGoLogo from "@/components/branding/CleanGoLogo";
import BottomNav from "@/components/navigation/BottomNav";

type ButtonVariant = "primary" | "secondary" | "ghost";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-[#26B8A9] text-white hover:bg-[#1FA99B]",
  secondary: "border border-[#DDEFEA] bg-white text-[#177E76] hover:bg-[#F0FAF8]",
  ghost: "bg-transparent text-[#177E76] hover:bg-[#EAF8F5]",
};

export function AppButton({ variant = "primary", loading = false, className = "", disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return <button {...props} disabled={disabled || loading} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant]} ${className}`}>
    {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>;
}

export function AppLinkButton({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: ButtonVariant; className?: string }) {
  return <Link href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors active:scale-[0.99] ${buttonStyles[variant]} ${className}`}>{children}</Link>;
}

export function AppCard({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-[24px] border border-[#E6F1EF] bg-white p-5 ${className}`}>{children}</div>;
}

type Notice = { id: string; orderId: string; type: string; createdAt: string };
const noticeLabels: Record<string, string> = {
  new_offer: "🔔 Вам предложен новый заказ",
  cleaner_order_accepted: "✅ Вы приняли заказ",
  cleaner_job_completed: "✨ Вы завершили уборку",
  cleaner_order_cancelled: "❌ Ваш заказ отменён",
  order_accepted: "✅ Заказ принят клинером",
  cleaner_en_route: "🚗 Клинер выехал",
  cleaner_arrived: "📍 Клинер прибыл",
  cleaning_started: "🧽 Уборка началась",
  cleaning_completed: "✨ Клинер передал результат — подтвердите уборку",
  completion_reminder_sent: "🔔 Подтвердите выполненную уборку",
  completion_confirmed: "✅ Уборка подтверждена",
  completion_issue_reported: "⚠️ Заявлена проблема с уборкой",
  matching_timeout: "⌛ Клинер не найден",
  order_cancelled: "❌ Заказ отменён",
};

export function NotificationBell() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const storageKey = user?.id ? `cleango-notifications-read:${user.id}` : "";
  useEffect(() => {
    if (!storageKey) return;
    try { setReadIds(JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[]); }
    catch { setReadIds([]); }
  }, [storageKey]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/backend/orders/notifications", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        if (!response.ok) throw new Error("Не удалось загрузить уведомления");
        const data: unknown = await response.json();
        if (active && Array.isArray(data)) {
          setItems(data as Notice[]);
          setError("");
        }
      } catch {
        if (active) setError("Не удалось обновить уведомления");
      }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [token]);
  const roleLabels: Record<string, string> = user?.role === "cleaner"
    ? {
        order_accepted: "✅ Вы приняли заказ",
        cleaner_en_route: "🚗 Вы выехали к клиенту",
        cleaner_arrived: "📍 Вы прибыли к клиенту",
        cleaning_started: "🧽 Вы начали уборку",
        cleaning_completed: "✨ Вы завершили уборку",
        order_cancelled: "❌ Заказ отменён",
      }
    : {};
  const unread = items.filter(item => !readIds.includes(item.id)).length;
  const markRead = () => {
    const ids = [...new Set([...readIds, ...items.map(item => item.id)])].slice(-300);
    setReadIds(ids);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(ids));
  };
  return <div className="relative">
    <button type="button" onClick={() => setOpen(value => !value)}
      aria-label={`Уведомления, непрочитанных: ${unread}`}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E4F1EE] bg-white">
      <Bell className="h-5 w-5 text-[#20B4A4]" aria-hidden="true" />
      {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-[min(85vw,340px)] rounded-2xl border border-[#DDEFEA] bg-white p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <strong className="text-sm">Уведомления</strong>
        <button type="button" onClick={markRead} className="text-xs font-semibold text-[#177E76]">Прочитать все</button>
      </div>
      {error && <p role="status" className="mb-2 text-xs text-rose-600">{error}</p>}
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {items.length === 0 && <p className="py-5 text-center text-sm text-slate-500">Пока нет уведомлений</p>}
        {items.map(item => <Link key={item.id}
          href={user?.role === "cleaner" ? "/cleaner/jobs" : "/client/orders"}
          onClick={() => { markRead(); setOpen(false); }}
          className={`block rounded-xl p-3 text-sm hover:bg-[#F0FAF8] ${readIds.includes(item.id) ? "bg-white" : "bg-[#EAF8F5]"}`}>
          <span className="font-semibold">{roleLabels[item.type] ?? noticeLabels[item.type] ?? "Обновление заказа"}</span>
          <span className="mt-1 block text-xs font-medium text-[#177E76]">Заказ №{item.orderId.slice(0, 8).toUpperCase()}</span>
          <span className="mt-1 block text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
        </Link>)}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Отметки о прочтении хранятся на этом устройстве.</p>
    </div>}
  </div>;
}

export function AppHeader({ role, subtitle, className = "" }: { role: "client" | "cleaner"; subtitle?: string; className?: string }) {
  return <header className={`flex items-center justify-between gap-3 ${className}`}>
    <CleanGoLogo size={44} showName showTagline priority />
    <NotificationBell />
  </header>;
}

export function LoadingState({ label = "Загружаем...", rows = 2 }: { label?: string; rows?: number }) {
  return <div role="status" aria-live="polite" className="space-y-3">
    <div className="flex items-center gap-2 text-sm text-[#688A86]"><LoaderCircle className="h-4 w-4 animate-spin text-[#20B4A4]" aria-hidden="true" />{label}</div>
    {Array.from({ length: rows }, (_, i) => <div key={i} aria-hidden="true" className="animate-pulse rounded-[20px] border border-[#E6F1EF] bg-white p-4">
      <div className="h-3 w-2/5 rounded-full bg-[#E6F4F1]" />
      <div className="mt-3 h-3 w-4/5 rounded-full bg-[#F0F7F5]" />
    </div>)}
  </div>;
}

export function AppPageShell({ role, eyebrow, title, description, children }: { role: "client" | "cleaner"; eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return <main className="min-h-dvh bg-[#F8FCFB] pb-28 text-[#152535]">
    <div className="mx-auto w-full max-w-[520px]">
      <AppHeader role={role} className="cleango-client-header min-h-[84px] px-5 pb-4 pt-6" />
      <div className="px-5">
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#23B3A5]">{eyebrow}</p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-[#80919A]">{description}</p>}
        </div>
        <div className="mt-7">{children}</div>
      </div>
    </div>
    <BottomNav role={role} />
  </main>;
}
