
"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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

import { AuthProvider, useAuth } from "./AuthProvider";

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

// Keep navigation in sync with the role returned by the backend.
function RoleRouteGuard({ children }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role;

  const needsPhone = (role === "client" || role === "cleaner") && !user?.phoneVerifiedAt;
  const target = needsPhone
    ? pathname === "/verify-phone" ? null : "/verify-phone"
    : pathname === "/verify-phone" && (role === "client" || role === "cleaner")
      ? role === "cleaner" ? "/cleaner" : "/"
      : role === "cleaner"
        ? (pathname === "/" || ["/welcome", "/onboarding", "/select-role", "/login"].includes(pathname) || pathname.startsWith("/client"))
          ? "/cleaner"
          : null
        : role === "client"
          ? (["/welcome", "/onboarding", "/select-role", "/login"].includes(pathname) || pathname.startsWith("/cleaner")) ? "/" : null
          : role === "unselected"
            ? ["/", "/cleaner", "/order", "/verify-phone"].includes(pathname) ? "/welcome" : null
            : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  // Do not flash an unauthorized or already-completed onboarding screen.
  if (target) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#EFF8FC]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#CBEAF4] border-t-[#0BADE0]" />
      </main>
    );
  }

  return <>{children}</>;
}

export default function TelegramProvider({
  children,
}: Props) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Telegram fullscreen uses a different content area than compact/fullsize.
  // Read its actual insets instead of applying a fixed top margin.
  useEffect(() => {
    type Insets = { top?: number; bottom?: number };
    type TelegramWebApp = {
      isFullscreen?: boolean;
      safeAreaInset?: Insets;
      contentSafeAreaInset?: Insets;
      onEvent?: (event: string, callback: () => void) => void;
      offEvent?: (event: string, callback: () => void) => void;
    };
    const root = document.documentElement;
    const getApp = () => (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
    const update = () => {
      const app = getApp();
      const fullscreen = app?.isFullscreen === true;
      const contentTop = Number(app?.contentSafeAreaInset?.top ?? 0);
      const safeTop = Number(app?.safeAreaInset?.top ?? 0);
      const safeBottom = Number(app?.safeAreaInset?.bottom ?? 0);
      const contentBottom = Number(app?.contentSafeAreaInset?.bottom ?? 0);
      root.style.setProperty("--cleango-telegram-top", `${fullscreen ? Math.max(0, contentTop, safeTop) : 0}px`);
      root.style.setProperty("--cleango-telegram-bottom", `${fullscreen ? Math.max(0, contentBottom, safeBottom) : 0}px`);
      root.classList.toggle("cleango-fullscreen", fullscreen);
    };
    const app = getApp();
    const events = ["fullscreenChanged", "safeAreaChanged", "contentSafeAreaChanged", "viewportChanged"];
    update();
    events.forEach((event) => app?.onEvent?.(event, update));
    window.addEventListener("resize", update);
    return () => {
      events.forEach((event) => app?.offEvent?.(event, update));
      window.removeEventListener("resize", update);
      root.classList.remove("cleango-fullscreen");
      root.style.removeProperty("--cleango-telegram-top");
      root.style.removeProperty("--cleango-telegram-bottom");
    };
  }, []);

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
      <RoleRouteGuard>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : -10 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-dvh w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
      </RoleRouteGuard>
    </AuthProvider>
  );
}
