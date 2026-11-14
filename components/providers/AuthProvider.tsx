
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
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

type AuthUser = {
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

const AuthContext =
  createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "cleango_access_token";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

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

function getTelegramInitData(): string {
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

  try {
    const params = retrieveLaunchParams();

    if (
      typeof params.initDataRaw === "string" &&
      params.initDataRaw.length > 0
    ) {
      return params.initDataRaw;
    }
  } catch {
    // Telegram launch parameters недоступны.
  }

  return "";
}

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

function DiagnosticRow({
  title,
  item,
}: {
  title: string;
  item: DiagnosticItem;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <StatusIcon status={item.status} />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-1 break-words text-xs text-slate-500">
          {item.detail}
        </p>
      </div>
    </div>
  );
}

function DiagnosticScreen({
  diagnostics,
  retry,
  loading,
}: {
  diagnostics: Diagnostics;
  retry: () => void;
  loading: boolean;
}) {
  const [clickCount, setClickCount] = useState(0);

  function handleRetry() {
    setClickCount((value) => value + 1);

    window.alert("Кнопка нажимается!");

    retry();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#EFF8FC] px-4 py-8">
      <section className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
          <RefreshCw className="h-8 w-8 text-sky-500" />
        </div>

        <h1 className="mt-5 text-center text-2xl font-bold text-slate-800">
          Диагностика CleanGo
        </h1>

        <p className="mt-2 text-center text-sm text-slate-500">
          Проверяем Telegram и авторизацию.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-2">
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

        <div className="mt-5 rounded-xl bg-sky-50 p-4 text-center">
          <p className="text-sm font-semibold text-sky-700">
            Проверка нажатий
          </p>

          <p className="mt-1 text-sm text-sky-600">
            Количество нажатий: {clickCount}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          className="mt-5 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-500 font-semibold text-white active:bg-sky-600"
        >
          <RefreshCw className="h-5 w-5" />
          Повторить проверку
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Нажми кнопку и проверь,
          появляется ли сообщение.
        </p>
      </section>
    </main>
  );
}

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

  useEffect(() => {
    let cancelled = false;

    const update = (
      key: DiagnosticKey,
      checkStatus: CheckStatus,
      detail: string,
    ) => {
      if (cancelled) return;

      setDiagnostics((previous) => ({
        ...previous,
        [key]: {
          status: checkStatus,
          detail,
        },
      }));
    };

    async function authenticate() {
      setStatus("loading");

      setDiagnostics({
        telegram: {
          status: "checking",
          detail: "Проверяем Telegram...",
        },
        initData: INITIAL_DIAGNOSTICS.initData,
        backend: INITIAL_DIAGNOSTICS.backend,
        authorization:
          INITIAL_DIAGNOSTICS.authorization,
      });

      try {
        const insideTelegram = await isTMA();

        if (cancelled) return;

        if (!insideTelegram) {
          update(
            "telegram",
            "failed",
            "Открыто вне Telegram",
          );

          setStatus("outside-telegram");
          return;
        }

        update(
          "telegram",
          "success",
          "Telegram Mini App обнаружен",
        );

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
          "Данные получены",
        );

        update(
          "backend",
          "checking",
          "Подключаемся к серверу...",
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
                "Сессия подтверждена",
              );

              setUser(currentUser);
              setToken(existingToken);
              setStatus("authenticated");
              return;
            }
          } catch {
            // Переходим к Telegram авторизации.
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
          `HTTP ${response.status}`,
        );

        if (!response.ok) {
          update(
            "authorization",
            "failed",
            `Ошибка HTTP ${response.status}`,
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
            "Некорректный ответ backend",
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
          "JWT получен",
        );

        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "CleanGo authentication error:",
          error,
        );

        update(
          "backend",
          "failed",
          "Ошибка подключения",
        );

        setStatus("error");
      }
    }

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (status === "outside-telegram") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold">
            Откройте CleanGo в Telegram
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Приложение доступно через Telegram-бота.
          </p>

          <a
            href="https://t.me/cleaninggoo_bot"
            className="mt-6 inline-flex rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white"
          >
            Открыть Telegram
          </a>
        </div>
      </main>
    );
  }

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

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider",
    );
  }

  return context;
}
