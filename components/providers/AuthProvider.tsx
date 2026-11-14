
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

type AuthUser = {
  id: string;
  telegramId: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
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

type CheckStatus =
  | "waiting"
  | "success"
  | "failed";

type Check = {
  status: CheckStatus;
  detail: string;
};

type Diagnostics = {
  environment: Check;
  webApp: Check;
  urlData: Check;
  sdkData: Check;
  backend: Check;
  authorization: Check;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string;
    };
  };
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "cleango_access_token";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

function initialDiagnostics(): Diagnostics {
  const waiting = (): Check => ({
    status: "waiting",
    detail: "Ожидание проверки",
  });

  return {
    environment: waiting(),
    webApp: waiting(),
    urlData: waiting(),
    sdkData: waiting(),
    backend: waiting(),
    authorization: waiting(),
  };
}

// ==========================================
// TELEGRAM WEBAPP DATA
// ==========================================

function readWebAppData(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const telegramWindow =
    window as TelegramWindow;

  return (
    telegramWindow.Telegram?.WebApp?.initData ??
    ""
  );
}

// ==========================================
// TELEGRAM URL DATA
// ==========================================

function readUrlData(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const query = new URLSearchParams(
    window.location.search,
  );

  const queryData = query.get("tgWebAppData");

  if (queryData) {
    return queryData;
  }

  const hash = window.location.hash.replace(
    /^#/,
    "",
  );

  const hashParams = new URLSearchParams(hash);

  return hashParams.get("tgWebAppData") ?? "";
}

// ==========================================
// TELEGRAM SDK DATA
// ==========================================

function readSdkData(): string {
  try {
    const params = retrieveLaunchParams();

    return typeof params.initDataRaw === "string"
      ? params.initDataRaw
      : "";
  } catch {
    return "";
  }
}

// ==========================================
// SAFE FIELD DIAGNOSTICS
// ==========================================

function inspectInitData(data: string) {
  if (!data) {
    return {
      fields: [] as string[],
      hasHash: false,
      hasUser: false,
      hasAuthDate: false,
      hasSignature: false,
      duplicateKeys: [] as string[],
    };
  }

  const params = new URLSearchParams(data);
  const fields = [...params.keys()];

  const counts = new Map<string, number>();

  for (const key of fields) {
    counts.set(
      key,
      (counts.get(key) ?? 0) + 1,
    );
  }

  return {
    fields,
    hasHash: Boolean(params.get("hash")),
    hasUser: Boolean(params.get("user")),
    hasAuthDate: Boolean(
      params.get("auth_date"),
    ),
    hasSignature: Boolean(
      params.get("signature"),
    ),
    duplicateKeys: [
      ...counts.entries(),
    ]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  };
}

// ==========================================
// STATUS INDICATOR
// ==========================================

function StatusIndicator({
  status,
}: {
  status: CheckStatus;
}) {
  const styles: Record<CheckStatus, string> = {
    waiting: "bg-slate-300",
    success: "bg-emerald-500",
    failed: "bg-red-500",
  };

  return (
    <span
      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${styles[status]}`}
    />
  );
}

// ==========================================
// DIAGNOSTIC SCREEN
// ==========================================

function DiagnosticScreen({
  diagnostics,
  retry,
}: {
  diagnostics: Diagnostics;
  retry: () => void;
}) {
  const [clickCount, setClickCount] =
    useState(0);

  const items: {
    title: string;
    key: keyof Diagnostics;
  }[] = [
    {
      title: "Telegram Mini App",
      key: "environment",
    },
    {
      title: "window.Telegram.WebApp",
      key: "webApp",
    },
    {
      title: "tgWebAppData (URL)",
      key: "urlData",
    },
    {
      title: "SDK initDataRaw",
      key: "sdkData",
    },
    {
      title: "Backend",
      key: "backend",
    },
    {
      title: "JWT",
      key: "authorization",
    },
  ];

  const report = items
    .map(({ title, key }) => {
      const item = diagnostics[key];

      return `${title}: ${item.status} — ${item.detail}`;
    })
    .join("\n");

  const handleRetry = () => {
    setClickCount((value) => value + 1);
    retry();
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(
        report,
      );

      window.alert("Отчёт скопирован");
    } catch {
      window.prompt(
        "Скопируй этот отчёт:",
        report,
      );
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#EFF8FC] px-4 py-8">
      <section className="w-full max-w-[430px] rounded-3xl bg-white p-6 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
          🔍
        </div>

        <h1 className="mt-5 text-center text-2xl font-bold text-slate-800">
          Диагностика CleanGo
        </h1>

        <p className="mt-2 text-center text-sm text-slate-500">
          Проверяем данные Telegram и
          авторизацию.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-2">
          {items.map(({ title, key }) => {
            const item = diagnostics[key];

            return (
              <div
                key={key}
                className="flex gap-3 border-b border-slate-200 py-3 last:border-0"
              >
                <StatusIndicator
                  status={item.status}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {title}
                  </p>

                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-sky-50 p-3 text-center">
          <p className="text-sm font-medium text-sky-700">
            Нажатий: {clickCount}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          className="mt-4 h-13 w-full cursor-pointer rounded-2xl bg-sky-500 font-semibold text-white active:bg-sky-600"
        >
          Повторить диагностику
        </button>

        <button
          type="button"
          onClick={() => {
            void copyReport();
          }}
          className="mt-3 h-12 w-full cursor-pointer rounded-2xl border border-slate-200 font-medium text-slate-700"
        >
          Скопировать результат
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Токены, подписи и значения
          пользовательских данных в отчёт
          не включаются.
        </p>
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
      initialDiagnostics,
    );

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const update = (
      key: keyof Diagnostics,
      checkStatus: CheckStatus,
      detail: string,
    ) => {
      if (cancelled) {
        return;
      }

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
      setDiagnostics(
        initialDiagnostics(),
      );

      try {
        // ==================================
        // 1. TELEGRAM ENVIRONMENT
        // ==================================

        const insideTelegram =
          await isTMA();

        if (cancelled) {
          return;
        }

        update(
          "environment",
          insideTelegram
            ? "success"
            : "failed",
          insideTelegram
            ? "Telegram обнаружен"
            : "Приложение открыто вне Telegram",
        );

        if (!insideTelegram) {
          setStatus("outside-telegram");
          return;
        }

        // ==================================
        // 2. WEBAPP
        // ==================================

        const telegramWindow =
          window as TelegramWindow;

        const webAppExists = Boolean(
          telegramWindow.Telegram?.WebApp,
        );

        const webAppData =
          readWebAppData();

        update(
          "webApp",
          webAppData
            ? "success"
            : "failed",
          !webAppExists
            ? "Объект WebApp отсутствует"
            : webAppData
              ? "WebApp доступен, initData получены"
              : "WebApp доступен, но initData пустые",
        );

        // ==================================
        // 3. URL DATA
        // ==================================

        const urlData = readUrlData();

        const inspected =
          inspectInitData(urlData);

        const fieldsText =
          inspected.fields.length > 0
            ? inspected.fields.join(", ")
            : "нет полей";

        const validationText = [
          `hash: ${inspected.hasHash ? "есть" : "нет"}`,
          `user: ${inspected.hasUser ? "есть" : "нет"}`,
          `auth_date: ${inspected.hasAuthDate ? "есть" : "нет"}`,
          `signature: ${inspected.hasSignature ? "есть" : "нет"}`,
        ].join("; ");

        const duplicateText =
          inspected.duplicateKeys.length > 0
            ? `; повторяющиеся поля: ${inspected.duplicateKeys.join(", ")}`
            : "";

        update(
          "urlData",
          urlData
            ? "success"
            : "failed",
          urlData
            ? `tgWebAppData обнаружен. Поля: ${fieldsText}. Проверка: ${validationText}${duplicateText}`
            : "tgWebAppData не найден",
        );

        // ==================================
        // 4. SDK DATA
        // ==================================

        const sdkData = readSdkData();

        update(
          "sdkData",
          sdkData
            ? "success"
            : "failed",
          sdkData
            ? "SDK получил initDataRaw"
            : "SDK не получил initDataRaw",
        );

        // ==================================
        // 5. CHOOSE INIT DATA
        // ==================================

        const initData =
          webAppData ||
          sdkData ||
          urlData;

        if (!initData) {
          update(
            "authorization",
            "failed",
            "Данные авторизации Telegram отсутствуют",
          );

          setStatus("error");
          return;
        }

        // ==================================
        // 6. EXISTING SESSION
        // ==================================

        const existingToken =
          sessionStorage.getItem(
            TOKEN_KEY,
          );

        if (existingToken) {
          try {
            const response = await fetch(
              `${API_URL}/auth/me`,
              {
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

              if (cancelled) {
                return;
              }

              update(
                "backend",
                "success",
                `HTTP ${response.status}`,
              );

              update(
                "authorization",
                "success",
                "Сессия подтверждена",
              );

              setUser(currentUser);
              setToken(existingToken);
              setStatus(
                "authenticated",
              );

              return;
            }
          } catch {
            // Попробуем Telegram login.
          }

          sessionStorage.removeItem(
            TOKEN_KEY,
          );
        }

        // ==================================
        // 7. TELEGRAM LOGIN
        // ==================================

        const response = await fetch(
          `${API_URL}/auth/telegram`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              initData,
            }),
            cache: "no-store",
          },
        );

        if (cancelled) {
          return;
        }

        update(
          "backend",
          "success",
          `HTTP ${response.status}`,
        );

        if (!response.ok) {
          const errorBody =
            await response
              .json()
              .catch(() => null);

          const serverMessage =
            errorBody &&
            typeof errorBody.message ===
              "string"
              ? errorBody.message
              : "Неизвестная ошибка";

          update(
            "authorization",
            "failed",
            `HTTP ${response.status}: ${serverMessage}`,
          );

          setStatus("error");
          return;
        }

        // ==================================
        // 8. JWT RESPONSE
        // ==================================

        const result =
          (await response.json()) as AuthResponse;

        if (
          !result.accessToken ||
          !result.user?.id
        ) {
          update(
            "authorization",
            "failed",
            "Некорректный ответ сервера",
          );

          setStatus("error");
          return;
        }

        sessionStorage.setItem(
          TOKEN_KEY,
          result.accessToken,
        );

        setUser(result.user);
        setToken(
          result.accessToken,
        );

        update(
          "authorization",
          "success",
          "JWT получен",
        );

        setStatus("authenticated");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "CleanGo auth diagnostic error:",
          error,
        );

        update(
          "backend",
          "failed",
          "Ошибка выполнения запроса",
        );

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
      {status === "authenticated" ? (
        children
      ) : status === "outside-telegram" ? (
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
          <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold">
              Откройте CleanGo в Telegram
            </h1>

            <a
              href="https://t.me/cleaninggoo_bot"
              className="mt-5 inline-block rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white"
            >
              Перейти к боту
            </a>
          </div>
        </main>
      ) : (
        <DiagnosticScreen
          diagnostics={diagnostics}
          retry={retry}
        />
      )}
    </AuthContext.Provider>
  );
}

// ==========================================
// USE AUTH
// ==========================================

export function useAuth() {
  const context = useContext(
    AuthContext,
  );

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider",
    );
  }

  return context;
}
