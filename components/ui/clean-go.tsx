"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { Bell, LoaderCircle } from "lucide-react";
import BottomNav from "@/components/navigation/BottomNav";

type ButtonVariant = "primary" | "secondary" | "ghost";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "cg-primary",
  secondary: "border border-[#E6E7E4] bg-white text-[#176E6B] hover:bg-[#D9EFED]",
  ghost: "bg-transparent text-[#177E76] hover:bg-[#EAF8F5]",
};

export function AppButton({ variant = "primary", loading = false, className = "", disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return <button {...props} disabled={disabled || loading} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant]} ${className}`}>
    {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>;
}

export function AppLinkButton({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: ButtonVariant; className?: string }) {
  return <Link href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors active:scale-[0.99] ${buttonStyles[variant]} ${className}`}>{children}</Link>;
}

export function AppCard({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`cg-card p-3.5 ${className}`}>{children}</div>;
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
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEEFEA]">
      <Bell className="h-5 w-5 text-[#15191D]" aria-hidden="true" />
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
    <Link href={role==="cleaner"?"/cleaner":"/"} aria-label="CleanGo — главная" className="text-[25px] font-extrabold leading-none tracking-[-0.06em] text-[#15191D]">Clean<span className="text-[#259E9B]">Go</span></Link>
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

export function AppPageShell({ role, eyebrow, title, description, children, detailHeader, footer }: { role: "client" | "cleaner"; eyebrow: string; title: string; description?: string; children: ReactNode; detailHeader?: ReactNode; footer?: ReactNode }) {
  return <main className="cleango-page-frame">
    {detailHeader&&<div className="cg-detail-header">{detailHeader}</div>}
    <div key={detailHeader?"detail":"list"} className="cleango-page-scroll w-full">
      {!detailHeader&&<AppHeader role={role} className="cleango-client-header px-4 pb-3" />}
      <div className="px-4">
        {!detailHeader&&<div className="mt-3">
          <p className="sr-only">{eyebrow}</p>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.035em]">{title}</h1>
          {description && <p className="mt-1.5 text-xs leading-5 text-[#697174]">{description}</p>}
        </div>}
        <div className={detailHeader?"space-y-2.5 pt-1":"mt-4 space-y-3"}>{children}</div>
      </div>
    </div>
    {footer?<div className="cg-detail-footer">{footer}</div>:<BottomNav role={role} />}
  </main>;
}
