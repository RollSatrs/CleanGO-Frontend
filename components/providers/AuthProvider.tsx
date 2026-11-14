
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
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
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

type CheckStatus =
  | "waiting"
  | "checking"
  | "success"
  | "failed";

type DiagnosticKey =
  | "telegram"
  | "initData"
  | "backend"
  | "authorization";

type DiagnosticItem = {
  status: CheckStatus;
  detail: string;
};

type Diagnostics = Record<
  DiagnosticKey,
  DiagnosticItem
>;

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

const INITIAL_DIAGNOSTICS: Diagnostics = {
  telegram: {
    status: "waiting",
    detail: "Ожидание проверки",
  },
  initData: {
    status: "waiting",
    detail: "Ожидание проверки",
  },
  backend: {
    status: "waiting",
    detail: "Ожидание проверки",
  },
  authorization: {
    status: "waiting",
    detail: "Ожидание проверки",
  },
};

// ==========================================
// TELEGRAM INIT DATA
// ==========================================

function getTelegramInitData(): string {
  // Сначала пробуем Telegram WebApp API.
  if (typeof window !== "undefined") {
    const telegramWindow = window as Window & {
      Telegram?: {
        WebApp?: {
          initData?: string;
        };
      };
    };

    const raw =
      telegramWindow.Telegram?.WebApp?.initData;

    if (
      typeof raw === "string" &&
      raw.length > 0
    ) {
      return raw;
    }
  }

  // Затем пробуем Telegram SDK.
  try {
    const params = retrieveLaunchParams();

    if (
      typeof params.initDataRaw === "string" &&
      params.initDataRaw.length > 0
    ) {
      return params.initDataRaw;
    }
  } catch {
    // SDK не смог получить launch parameters.
  }

  return "";
}

// ==========================================
// STATUS ICON
// ==========================================

function StatusIcon({
  status,
}: {
  status: CheckStatus;
}) {
  if (status === "success") {
    return (
      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    );
  }

  if (status === "failed") {
    return (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  }

  if (status === "checking") {
    return (
      <LoaderCircle className="h-5 w-5 animate-spin text-sky-500" />
    );
  }

  return (
    <div className="h-5 w-5 rounded-full border-2 border-slate-200" />
  );
}

// ==========================================
// DIAGNOSTIC ROW
// ==========================================

function DiagnosticRow({
  title,
  item,
}: {
  title: string;
  item: DiagnosticItem;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#EAF1F4] py-3 last:border-b-0">
      <div className="mt-0.5 shrink-0">
        <StatusIcon status={item.status} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#183046]">
          {title}
        </p>

        <p className="mt-1 break-words text-xs leading-5 text-[#7891A3]">
          {item.detail}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// DIAGNOSTIC SCREEN
// ==========================================

function DiagnosticScreen({
  diagnostics,
  retry,
  loading,
}: {
  diagnostics: Diagnostics;
  retry: () => void;
  loading: boolean;
}) {
  const report = [
    `Telegram: ${diagnostics.telegram.status} — ${diagnostics.telegram.detail}`,
    `initData: ${diagnostics.initData.status} — ${diagnostics.initData.detail}`,
    `Backend: ${diagnostics.backend.status} — ${diagnostics.backend.detail}`,
    `Authorization: ${diagnostics.authorization.status} — ${diagnostics.authorization.detail}`,
  ].join("\n");

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      // В некоторых Telegram WebView
      // Clipboard API может быть недоступен.
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#EFF8FC] px-4 py-8">
      <section className="w-full max-w-[420px] rounded-4xl bg-white p-6 shadow-[0_16px_50px_rgba(30,94,128,0.08)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E2F7FA]">
          <ShieldCheck className="h-8 w-8 text-[#0AAFC0]" />
        </div>

        <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight text-[#173047]">
          Диагностика CleanGo
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-[#8195A5]">
          Проверяем подключение и
          авторизацию через Telegram.
        </p>

        <div className="mt-6 rounded-2xl bg-[#F7FAFC] px-4 py-2">
          <DiagnosticRow
            title="Telegram Mini App"
            item={diagnostics.telegram}
          />

          <DiagnosticRow
            title="Telegram initData"
            item={diagnostics.initData}
          />

          <DiagnosticRow
            title="Подключение к backend"
            item={diagnostics.backend}
          />

          <DiagnosticRow
            title="Авторизация JWT"
            item={diagnostics.authorization}
          />
        </div>

        <button
          type="button"
          onClick={retry}
          disabled={loading}
          className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#0BADE0] font-semibold text-white disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}

          {loading
            ? "Проверяем..."
            : "Повторить проверку"}
        </button>

        <button
          type="button"
          onClick={() => void copyReport()}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-[#DFEBF0] text-sm font-semibold text-[#557487]"
        >
          Скопировать результат
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-[#97A9B6]">
          Диагностика не показывает
          токены и персональные данные.
        </p>
      </section>
    </main>
  );
}

// ==========================================
// OUTSIDE TELEGRAM
// ==========================================

function OutsideTelegramScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#EAF4FA] px-5">
      <section className="w-full max-w-[420px] rounded-4xl bg-white px-7 py-12 text-center shadow-[0_20px_60px_rgba(30,94,128,0.08)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#E4F8FC]">
          <Send className="h-9 w-9 text-[#0BAFDC]" />
        </div>

        <h1 className="mt-7 text-[26px] font-extrabold leading-tight tracking-[-0.04em] text-[#15273A]">
          Откройте CleanGo
          <br />
          в Telegram
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#7892A5]">
          CleanGo работает внутри Telegram.
          Откройте нашего бота, чтобы
          заказать уборку.
        </p>

        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-linear-to-r from-[#08B8E7] to-[#079CE0] font-bold text-white"
        >
          Открыть Telegram
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>
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

  const [diagnostics, setDiagnostics] =
    useState<Diagnostics>(
      INITIAL_DIAGNOSTICS,
    );

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  const updateDiagnostic = useCallback(
    (
      key: DiagnosticKey,
      diagnosticStatus: CheckStatus,
      detail: string,
    ) => {
      setDiagnostics((previous) => ({
        ...previous,
        [key]: {
          status: diagnosticStatus,
          detail,
        },
      }));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const update = (
      key: DiagnosticKey,
      checkStatus: CheckStatus,
      detail: string,
    ) => {
      if (!cancelled) {
        updateDiagnostic(
          key,
          checkStatus,
          detail,
        );
      }
    };

    async function authenticate() {
      setStatus("loading");
      setDiagnostics({
        telegram: {
          status: "checking",
          detail: "Определяем окружение...",
        },
        initData: INITIAL_DIAGNOSTICS.initData,
        backend: INITIAL_DIAGNOSTICS.backend,
        authorization:
          INITIAL_DIAGNOSTICS.authorization,
      });

      try {
        // ==================================
        // 1. TELEGRAM ENVIRONMENT
        // ==================================

        const insideTelegram = await isTMA();

        if (cancelled) return;

        if (!insideTelegram) {
          update(
            "telegram",
            "failed",
            "Приложение открыто вне Telegram",
          );

          setStatus("outside-telegram");
          return;
        }

        update(
          "telegram",
          "success",
          "Telegram Mini App обнаружен",
        );

        // ==================================
        // 2. INIT DATA
        // ==================================

        update(
          "initData",
          "checking",
          "Получаем данные Telegram...",
        );

        const initData = getTelegramInitData();

        if (!initData) {
          update(
            "initData",
            "failed",
            "initData отсутствует",
          );

          setStatus("error");
          return;
        }

        update(
          "initData",
          "success",
          "Данные Telegram получены",
        );

        // ==================================
        // 3. BACKEND CONNECTION
        // ==================================

        update(
          "backend",
          "checking",
          "Отправляем запрос на сервер...",
        );

        const existingToken =
          sessionStorage.getItem(TOKEN_KEY);

        if (existingToken) {
          try {
            const meResponse = await fetch(
              `${API_URL}/auth/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${existingToken}`,
                },
                cache: "no-store",
              },
            );

            if (meResponse.ok) {
              const currentUser =
                (await meResponse.json()) as AuthUser;

              if (cancelled) return;

              update(
                "backend",
                "success",
                "Сервер отвечает",
              );

              update(
                "authorization",
                "success",
                "Существующая сессия подтверждена",
              );

              setUser(currentUser);
              setToken(existingToken);
              setStatus("authenticated");
              return;
            }
          } catch {
            // Попробуем Telegram login.
          }

          sessionStorage.removeItem(TOKEN_KEY);
        }

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

        if (cancelled) return;

        update(
          "backend",
          "success",
          `Сервер ответил: HTTP ${response.status}`,
        );

        // ==================================
        // 4. AUTHORIZATION
        // ==================================

        update(
          "authorization",
          "checking",
          "Проверяем авторизацию...",
        );

        if (!response.ok) {
          update(
            "authorization",
            "failed",
            `Ошибка авторизации: HTTP ${response.status}`,
          );

          setStatus("error");
          return;
        }

        const result =
          (await response.json()) as AuthResponse;

        if (
          !result.accessToken ||
          !result.user?.id
        ) {
          update(
            "authorization",
            "failed",
            "Backend вернул неполные данные",
          );

          setStatus("error");
          return;
        }

        sessionStorage.setItem(
          TOKEN_KEY,
          result.accessToken,
        );

        setUser(result.user);
        setToken(result.accessToken);

        update(
          "authorization",
          "success",
          "JWT успешно получен",
        );

        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "CleanGo auth diagnostic:",
          error,
        );

        update(
          "backend",
          "failed",
          "Ошибка соединения или выполнения запроса",
        );

        setStatus("error");
      }
    }

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [attempt, updateDiagnostic]);

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
        <DiagnosticScreen
          diagnostics={diagnostics}
          retry={retry}
          loading
        />
      )}

      {status === "outside-telegram" && (
        <OutsideTelegramScreen />
      )}

      {status === "error" && (
        <DiagnosticScreen
          diagnostics={diagnostics}
          retry={retry}
          loading={false}
        />
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
