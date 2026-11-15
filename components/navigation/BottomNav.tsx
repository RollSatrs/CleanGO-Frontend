"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, UserRound, Wallet, Search } from "lucide-react";

export default function BottomNav({ role }: { role: "client" | "cleaner" }) {
  const pathname = usePathname();
  const links = role === "client"
    ? [
        { href: "/", label: "Главная", icon: Home },
        { href: "/client/orders", label: "Заказы", icon: ClipboardList },
        { href: "/client/profile", label: "Профиль", icon: UserRound },
      ]
    : [
        { href: "/cleaner", label: "Главная", icon: Home },
        { href: "/cleaner/jobs", label: "Заявки", icon: Search },
        { href: "/cleaner/earnings", label: "Доходы", icon: Wallet },
        { href: "/cleaner/profile", label: "Профиль", icon: UserRound },
      ];
  return (
    <nav aria-label="Основная навигация" className="cleango-bottom-nav fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] border-t border-[#E7F2F0] bg-white/95 px-4 pt-2 backdrop-blur-xl">
      <div className="flex items-center justify-around gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${active ? "text-[#19AD9E]" : "text-[#879BA5]"}`}>
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>;
        })}
      </div>
    </nav>
  );
}
