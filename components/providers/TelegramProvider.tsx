
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

const TELEGRAM_INIT_TIMEOUT = 5000;

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Telegram SDK timeout after ${milliseconds}ms`,
        ),
      );
    }, milliseconds);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export default function TelegramProvider({
  children,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setupTelegram() {
      try {
        console.time("CleanGo Telegram initialization");

        const insideTelegram = await withTimeout(
          Promise.resolve(isTMA()),
          TELEGRAM_INIT_TIMEOUT,
        );

        if (cancelled) return;

        console.info(
          "[CleanGo] Telegram detected:",
          insideTelegram,
        );

        if (insideTelegram) {
          init();

          if (miniApp.mount.isAvailable()) {
            miniApp.mount();
          }

          if (viewport.mount.isAvailable()) {
            try {
              await withTimeout(
                Promise.resolve(viewport.mount()),
                TELEGRAM_INIT_TIMEOUT,
              );
            } catch (error) {
              console.warn(
                "[CleanGo] Viewport initialization delayed:",
                error,
              );
            }

            if (cancelled) return;

            if (
              viewport.isMounted() &&
              viewport.expand.isAvailable()
            ) {
              viewport.expand();
            }

            if (
              viewport.isMounted() &&
              viewport.bindCssVars.isAvailable()
            ) {
              viewport.bindCssVars();
            }
          }

          document.documentElement.classList.add(
            "telegram-mini-app",
          );
        }
      } catch (error) {
        console.error(
          "[CleanGo] Telegram initialization error:",
          error,
        );
      } finally {
        console.timeEnd("CleanGo Telegram initialization");

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
