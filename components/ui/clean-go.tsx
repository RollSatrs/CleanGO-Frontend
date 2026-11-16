"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Bell, LoaderCircle } from "lucide-react";
import CleanGoLogo from "@/components/branding/CleanGoLogo";

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

export function NotificationBell() {
  return <span role="img" aria-label="Уведомления — скоро" title="Уведомления скоро появятся" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E4F1EE] bg-white">
    <Bell className="h-5 w-5 text-[#20B4A4]" aria-hidden="true" />
  </span>;
}

export function AppHeader({ role, subtitle, className = "" }: { role: "client" | "cleaner"; subtitle?: string; className?: string }) {
  return <header className={`flex items-center justify-between gap-3 ${className}`}>
    {role === "client"
      ? <CleanGoLogo size={44} showName showTagline priority />
      : <div><p className="text-[13px] font-semibold text-[#20AFA1]">CleanGo</p><p className="mt-1 text-[11px] text-[#8397A0]">{subtitle ?? "Кабинет исполнителя"}</p></div>}
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
