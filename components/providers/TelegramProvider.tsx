
"use client";

import { useEffect, type ReactNode } from "react";
import {
  init,
  isTMA,
  viewport,
  miniApp,
} from "@telegram-apps/sdk-react";

type Props = {
  children: ReactNode;
};

export default function TelegramProvider({ children }: Props) {
  useEffect(() => {
    let cancelled = false;

    async function setupTelegram() {
      try {
        const insideTelegram = await isTMA();

        if (!insideTelegram || cancelled) return;

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

        document.documentElement.classList.add("telegram-mini-app");
      } catch (error) {
        console.error("Telegram initialization error:", error);
      }
    }

    void setupTelegram();

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("telegram-mini-app");
    };
  }, []);

  return <>{children}</>;
}
