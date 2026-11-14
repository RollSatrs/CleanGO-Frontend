
"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  init,
  isTMA,
  viewport,
  miniApp,
} from "@telegram-apps/sdk-react";

import { AuthProvider } from "./AuthProvider";

type Props = {
  children: ReactNode;
};

export default function TelegramProvider({
  children,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setupTelegram() {
      try {
        const insideTelegram = await isTMA();

        if (cancelled) return;

        if (insideTelegram) {
          // Инициализируем SDK до AuthProvider.
          init();

          if (miniApp.mount.isAvailable()) {
            miniApp.mount();
          }

          if (viewport.mount.isAvailable()) {
            await viewport.mount();

            if (cancelled) return;

            if (viewport.expand.isAvailable()) {
              viewport.expand();
            }

            if (viewport.bindCssVars.isAvailable()) {
              viewport.bindCssVars();
            }
          }

          document.documentElement.classList.add(
            "telegram-mini-app",
          );
        }
      } catch (error) {
        console.error(
          "Telegram initialization error:",
          error,
        );
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void setupTelegram();

    return () => {
      cancelled = true;

      document.documentElement.classList.remove(
        "telegram-mini-app",
      );
    };
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFF8FC]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#CBEAF4] border-t-[#0BADE0]" />

          <p className="mt-4 text-sm font-medium text-[#7891A3]">
            Запускаем CleanGo...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
