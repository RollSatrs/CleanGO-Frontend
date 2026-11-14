
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  isTMA,
  retrieveLaunchParams,
} from "@telegram-apps/sdk-react";

import {
  ExternalLink,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================

export type AuthUser = {
  id: string;
  telegramId: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type AuthStatus =
  | "loading"
  | "authenticated"
  | "outside-telegram"
  | "error";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  retry: () => void;
};

// ==========================================
// CONFIG
// ==========================================

const AuthContext =
  createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "cleango_access_token";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

const BOT_URL =
  "https://t.me/cleaninggoo_bot";

// ==========================================
// TELEGRAM INIT DATA
// ==========================================

function getTelegramInitData(): string {
  try {
    const params = retrieveLaunchParams();

    if (
      typeof params.initDataRaw === "string" &&
      params.initDataRaw.length > 0
    ) {
      return params.initDataRaw;
    }
  } catch {
    // Telegram SDK пока недоступен.
  }

  if (typeof window !== "undefined") {
    const telegramWindow = window as Window & {
      Telegram?: {
        WebApp?: {
          initData?: string;
        };
      };
    };

    const initData =
      telegramWindow.Telegram?.WebApp?.initData;

    if (
      typeof initData === "string" &&
      initData.length > 0
    ) {
      return initData;
    }
  }

  return "";
}

// ==========================================
// LOADING SCREEN
// ==========================================

function LoadingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F0F9FD] px-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#E0F7FA]">
          <Sparkles className="h-10 w-10 text-[#0BAFBD]" />
        </div>

        <h1 className="text-[30px] font-extrabold tracking-[-0.06em] text-[#15273A]">
          Clean
          <span className="text-[#0BAFBD]">
            Go
          </span>
        </h1>

        <LoaderCircle className="mt-7 h-7 w-7 animate-spin text-[#0BAFBD]" />

        <p className="mt-4 text-sm text-[#7892A5]">
          Выполняем вход через Telegram...
        </p>
      </div>
    </main>
  );
}

// ==========================================
// OUTSIDE TELEGRAM SCREEN
// ==========================================

function OutsideTelegramScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#EAF4FA] px-5">
      <section className="w-full max-w-105 rounded-4xl bg-white px-7 py-12 text-center shadow-[0_20px_60px_rgba(30,94,128,0.08)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#E4F8FC]">
          <Send className="h-9 w-9 text-[#0BAFDC]" />
        </div>

        <h1 className="mt-7 text-[26px] font-extrabold leading-tight tracking-[-0.04em] text-[#15273A]">
          Откройте CleanGo
          <br />
          в Telegram
        </h1>

        <p className="mt-4 text-[14px] leading-6 text-[#7892A5]">
          CleanGo работает внутри Telegram.
          Откройте нашего бота, чтобы
          заказать уборку.
        </p>

        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-linear-to-r from-[#08B8E7] to-[#079CE0] text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(0,160,220,0.16)]"
        >
          Открыть Telegram
          <ExternalLink className="h-4 w-4" />
        </a>

        <div className="mt-7 flex items-center justify-center gap-2 text-xs text-[#8DA2B1]">
          <ShieldCheck className="h-4 w-4" />
          Без паролей и регистрации
        </div>
      </section>
    </main>
  );
}

// ==========================================
// ERROR SCREEN
// ==========================================

function ErrorScreen({
  retry,
}: {
  retry: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F0F9FD] px-5">
      <div className="w-full max-w-95 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#E1F7FA]">
          <ShieldCheck className="h-9 w-9 text-[#0BAFBD]" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-[#15273A]">
          Не удалось войти
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#7892A5]">
          Не получилось подтвердить
          авторизацию Telegram.
          Попробуйте открыть приложение
          заново через бота.
        </p>

        <button
          type="button"
          onClick={retry}
          className="mt-7 h-14 w-full rounded-full bg-[#0AAEE0] font-bold text-white"
        >
          Попробовать снова
        </button>
      </div>
    </main>
  );
}

// ==========================================
// AUTH PROVIDER
// ==========================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] =
    useState<AuthStatus>("loading");

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      setStatus("loading");

      try {
        // 1. Проверяем, что приложение
        // запущено внутри Telegram.

        const insideTelegram = await isTMA();

        if (cancelled) return;

        if (!insideTelegram) {
          sessionStorage.removeItem(TOKEN_KEY);

          setUser(null);
          setToken(null);
          setStatus("outside-telegram");

          return;
        }

        // 2. Проверяем существующую сессию.

        const existingToken =
          sessionStorage.getItem(TOKEN_KEY);

        if (existingToken) {
          try {
            const response = await fetch(
              `${API_URL}/auth/me`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${existingToken}`,
                },
                cache: "no-store",
              },
            );

            if (response.ok) {
              const currentUser =
                (await response.json()) as AuthUser;

              if (cancelled) return;

              setUser(currentUser);
              setToken(existingToken);
              setStatus("authenticated");

              return;
            }
          } catch {
            // Если сессия недоступна,
            // попробуем авторизоваться заново.
          }

          sessionStorage.removeItem(TOKEN_KEY);
        }

        // 3. Получаем данные Telegram.

        const initData = getTelegramInitData();

        console.info("[CleanGo Auth] Telegram environment:", {
          insideTelegram,
          hasInitData: initData.length > 0,
          apiUrl: API_URL,
        });

        if (!initData) {
          throw new Error("Telegram initData отсутствует");
        }


        // 4. Отправляем initData на backend.
        // Backend проверяет подпись Telegram.

        const response = await fetch(
          `${API_URL}/auth/telegram`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData,
            }),
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Telegram auth failed: ${response.status}`,
          );
        }

        const result =
          (await response.json()) as AuthResponse;

        if (
          !result.accessToken ||
          !result.user?.id
        ) {
          throw new Error(
            "Некорректный ответ авторизации",
          );
        }

        if (cancelled) return;

        // 5. Сохраняем сессию.

        sessionStorage.setItem(
          TOKEN_KEY,
          result.accessToken,
        );

        setToken(result.accessToken);
        setUser(result.user);

        // 6. Открываем приложение.

        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "CleanGo authentication error:",
          error,
        );

        setUser(null);
        setToken(null);
        setStatus("error");
      }
    }

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        status,
        retry,
      }}
    >
      {status === "loading" && (
        <LoadingScreen />
      )}

      {status === "outside-telegram" && (
        <OutsideTelegramScreen />
      )}

      {status === "error" && (
        <ErrorScreen retry={retry} />
      )}

      {status === "authenticated" &&
        children}
    </AuthContext.Provider>
  );
}

// ==========================================
// AUTH HOOK
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider",
    );
  }

  return context;
}
