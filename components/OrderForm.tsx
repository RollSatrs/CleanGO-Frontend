
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressPicker from "@/components/AddressPicker";
import { useAuth } from "@/components/providers/AuthProvider";

type CleaningType = "regular" | "general" | "renovation";

type OrderFormProps = {
  cleaningType: CleaningType;
};

type CreatedOrder = {
  id: string;
  address: string;
  area: number;
  status: string;
  cleaningType: CleaningType;
  price: number | null;
  createdAt: string;
};

type PriceQuote = {
  cleaningType: CleaningType;
  area: number;
  pricePerSquareMeter: number;
  minimumPrice: number;
  totalPrice: number;
  currency: string;
};

const API_URL = "/api/backend";

const cleaningTypeNames: Record<CleaningType, string> = {
  regular: "Поддерживающая уборка",
  general: "Генеральная уборка",
  renovation: "Уборка после ремонта",
};

export default function OrderForm({ cleaningType }: OrderFormProps) {
  const { token, user } = useAuth();
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("60");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [intercom, setIntercom] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  const [sheetLevel, setSheetLevel] = useState<"compact" | "medium" | "full">("medium");
  const [priceLoading, setPriceLoading] = useState(false);

  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");

  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(
    null,
  );

  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrder | null>(null);

  const parsedArea = Number(area);

  const isAreaValid =
    area.trim() !== "" &&
    Number.isInteger(parsedArea) &&
    parsedArea > 0 &&
    parsedArea <= 1000;

  const hasCurrentQuote =
    priceQuote !== null &&
    priceQuote.area === parsedArea &&
    priceQuote.cleaningType === cleaningType;

  // Автоматический расчёт стоимости через Backend
  useEffect(() => {
    if (!isAreaValid) {
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setPriceLoading(true);
      setPriceError("");

      try {
        const params = new URLSearchParams({
          cleaningType,
          area: String(parsedArea),
        });

        const response = await fetch(
          `${API_URL}/pricing/quote?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Не удалось рассчитать стоимость уборки.");
        }

        const data: PriceQuote = await response.json();

        if (!controller.signal.aborted) {
          setPriceQuote(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Ошибка расчёта стоимости:", err);

          setPriceQuote(null);
          setPriceError(
            err instanceof Error
              ? err.message
              : "Произошла ошибка расчёта.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPriceLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [cleaningType, parsedArea, isAreaValid]);

  // Создание заказа
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;
    if (!confirming) {
      if (!address.trim() || !coordinates || !isAreaValid || !hasCurrentQuote || priceLoading) {
        setError("Укажите точный адрес и площадь, дождитесь расчёта стоимости.");
        setSheetLevel("full");
        return;
      }
      setError("");
      setConfirming(true);
      return;
    }
    if (!token || user?.role !== "client" || !user.phoneVerifiedAt) {
      setError("Для заказа войдите как клиент и подтвердите номер телефона.");
      return;
    }

    setError("");
    setCreatedOrder(null);

    if (!address.trim()) {
      setError("Укажите адрес уборки.");
      return;
    }

    if (!coordinates) {
      setError("Выберите адрес из подсказок или точку на карте.");
      return;
    }

    if (!isAreaValid) {
      setError("Укажите площадь от 1 до 1000 м².");
      return;
    }

    if (!hasCurrentQuote || priceLoading) {
      setError("Дождитесь расчёта стоимости уборки.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: [address.trim(), entrance.trim() && `подъезд ${entrance.trim()}`, floor.trim() && `этаж ${floor.trim()}`, apartment.trim() && `кв./офис ${apartment.trim()}`, intercom.trim() && `домофон ${intercom.trim()}`, addressNote.trim() && `комментарий: ${addressNote.trim()}`].filter(Boolean).join(", "),
          area: parsedArea,
          cleaningType,
          ...(coordinates ?? {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        console.error("Ошибка создания заказа:", {
          status: response.status,
          data: errorData,
        });

        throw new Error(
          `Не удалось создать заказ (ошибка ${response.status}).`,
        );
      }

      const order: CreatedOrder = await response.json();

      setCreatedOrder(order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Произошла неизвестная ошибка.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Достоверный статус после создания: не имитируем найденного клинера.
  if (createdOrder) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-[#D9F1EC] bg-white shadow-[0_20px_55px_rgba(9,151,137,0.08)]">
        <div className="bg-gradient-to-br from-[#D9FAF4] via-[#F2FFFC] to-white px-6 pb-7 pt-9 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(10,154,137,0.12)]"><Search className="h-9 w-9 text-[#089B8D]" /></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#0A9A89]">Заказ создан</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#152535]">{createdOrder.status === "pending" ? "Ищем клинера" : "Заказ оформлен"}</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#66837D]">Следите за подтверждённым статусом заказа во вкладке «Мои заказы».</p>
          <div className="mx-auto mt-5 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-[#C6ECE5]"><div className="h-full w-1/3 animate-pulse rounded-full bg-[#0A9A89]" /></div>
        </div>
        <div className="space-y-4 px-5 py-6">
          <div className="rounded-[20px] border border-[#E1F1ED] bg-[#F8FDFC] p-4">
            <p className="text-sm font-bold text-[#152535]">{cleaningTypeNames[createdOrder.cleaningType]}</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-[#617A75]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0A9A89]" />{createdOrder.address}</p>
            <div className="mt-4 flex items-end justify-between border-t border-[#E2F0ED] pt-4"><span className="text-sm text-[#718B84]">{createdOrder.area} м²</span><strong className="text-2xl text-[#087F71]">{createdOrder.price == null ? "Цена уточняется" : `${Number(createdOrder.price).toLocaleString("ru-RU")} ₸`}</strong></div>
          </div>
          <p className="flex items-start gap-2 text-xs leading-5 text-[#718B84]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0A9A89]" />Назначение клинера подтверждается сервером. Время прибытия появится только после достоверного расчёта.</p>
          <Link href="/client/orders" className="flex h-14 items-center justify-center rounded-2xl bg-[#079B8D] text-base font-bold text-white shadow-[0_10px_24px_rgba(7,155,141,0.18)]">Следить за заказом</Link>
          <button type="button" className="w-full py-2 text-sm font-semibold text-[#168675]" onClick={() => { setCreatedOrder(null); setConfirming(false); setAddress(""); setArea(""); setEntrance(""); setFloor(""); setApartment(""); setIntercom(""); setAddressNote(""); setCoordinates(null); setPriceQuote(null); setPriceError(""); setError(""); }}>Оформить ещё одну уборку</button>
        </div>
      </section>
    );
  }

  if (confirming) {
    return (
      <section className="mx-auto max-w-xl overflow-hidden rounded-[30px] bg-white text-[#152535] shadow-[0_16px_50px_rgba(20,67,59,0.06)]">
        <div className="bg-gradient-to-b from-[#E8F9F4] to-white px-5 pb-5 pt-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0A9A89]">CleanGo / Шаг 2 из 2</p>
          <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight">Подтверждение</h2>
          <p className="mt-2 text-sm text-[#6B857E]">Проверьте детали перед поиском клинера.</p>
        </div>
        <div className="px-5 pb-6">
          <div className="divide-y divide-[#E9F0ED] rounded-[22px] border border-[#E6EFEB] bg-white px-4">
            {([
              ["Услуга", cleaningTypeNames[cleaningType]],
              ["Адрес", address],
              ["Площадь", `${area} м²`],
              ["Оплата", "После принятия заказа клинером"],
            ] as const).map(([label,value])=>(
              <div key={label} className="flex items-start justify-between gap-4 py-4">
                <span className="shrink-0 text-sm text-[#7B908A]">{label}</span>
                <span className="text-right text-sm font-semibold text-[#152535]">{value}</span>
              </div>
            ))}
          </div>
          {(entrance || floor || apartment || intercom || addressNote) && <p className="mt-3 text-xs leading-5 text-[#708B83]">{[entrance && `Подъезд ${entrance}`,floor && `Этаж ${floor}`,apartment && `Кв./офис ${apartment}`,intercom && `Домофон ${intercom}`,addressNote].filter(Boolean).join(" · ")}</p>}
          <div className="mt-4 rounded-[22px] bg-[#E4F8F2] p-4">
            <p className="text-xs font-medium text-[#547E74]">Стоимость уборки</p>
            <p className="mt-1 text-[32px] font-extrabold tracking-tight text-[#087E72]">{hasCurrentQuote ? `${priceQuote!.totalPrice.toLocaleString("ru-RU")} ₸` : "Уточняется"}</p>
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <button type="submit" disabled={loading || priceLoading || !hasCurrentQuote || !address.trim() || !coordinates} className="h-14 w-full rounded-[19px] bg-[#079B8D] text-base font-bold text-white disabled:opacity-50">{loading ? "Создаём заказ..." : "Подтвердить и найти клинера"}</button>
            <button type="button" onClick={()=>{setConfirming(false);setError("");}} className="h-12 w-full rounded-[19px] border border-[#D8EAE4] text-sm font-semibold text-[#168675]">Изменить данные</button>
          </form>
          <p className="mt-3 text-center text-xs text-[#8A9D98]">Оплата сейчас не списывается.</p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto max-w-xl overflow-hidden rounded-[30px] bg-[#F8FBFA] text-[#152535] shadow-[0_16px_50px_rgba(20,67,59,0.06)]">
      <div className="relative overflow-hidden bg-gradient-to-b from-[#E9F9F5] via-[#F2FAF8] to-[#F8FBFA] px-5 pb-7 pt-7">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D9B8E]">CleanGo / Заказ</span>
          <span className="rounded-full border border-[#BFE9E1] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#168678]">Шаг 1 из 2</span>
        </div>
        <h2 className="mt-5 text-[28px] font-extrabold leading-[1.1] tracking-tight">Куда приехать<br/>на уборку?</h2>
        <p className="mt-3 max-w-[310px] text-sm leading-6 text-[#69847D]">Выберите точку на карте и укажите площадь помещения.</p>
      </div>

      <div className="relative -mt-3 rounded-t-[30px] bg-white px-4 pb-5 pt-4 shadow-[0_-8px_30px_rgba(17,83,73,0.04)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0B9B8D]">Ваша услуга</p>
            <h3 className="mt-1 text-lg font-bold leading-snug">{cleaningTypeNames[cleaningType]}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-[#E6F7F2] px-3 py-1.5 text-xs font-semibold text-[#078A7B]">Выбрано ✓</span>
        </div>

        <div className="rounded-[23px] border border-[#E4EEEA] bg-[#FCFEFD] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-[#089D8D]" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{address || "Укажите адрес уборки"}</p>
          </div>
          <AddressPicker address={address} onChange={(nextAddress, nextCoordinates) => {
            setAddress(nextAddress);
            setCoordinates(nextCoordinates);
            setError("");
          }} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[22px] border border-[#E4EEEA] bg-white px-4 py-3.5">
          <div className="min-w-0">
            <label htmlFor="area" className="block text-xs font-medium text-[#748B85]">Площадь помещения</label>
            <div className="mt-1 flex items-baseline gap-1">
              <input id="area" type="number" min="1" max="1000" step="1" inputMode="numeric" value={area} onChange={(event) => setArea(event.target.value)} className="w-16 bg-transparent text-2xl font-extrabold outline-none" />
              <span className="text-sm font-semibold text-[#607E76]">м²</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" aria-label="Уменьшить площадь" onClick={() => setArea(String(Math.max(1, (Number(area) || 60) - 5)))} className="grid h-11 w-11 place-items-center rounded-full bg-[#EAF8F5] text-xl font-medium text-[#078E80]">−</button>
            <button type="button" aria-label="Увеличить площадь" onClick={() => setArea(String(Math.min(1000, (Number(area) || 60) + 5)))} className="grid h-11 w-11 place-items-center rounded-full bg-[#EAF8F5] text-xl font-medium text-[#078E80]">+</button>
          </div>
        </div>

        <details className="mt-3 rounded-[22px] border border-[#E4EEEA] bg-white p-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-[#24473F]">Подъезд, этаж и комментарий <span className="font-normal text-[#81958F]">· необязательно</span></summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([
              ["Подъезд", entrance, setEntrance, "2"],
              ["Этаж", floor, setFloor, "5"],
              ["Квартира / офис", apartment, setApartment, "42"],
              ["Домофон", intercom, setIntercom, "Код"],
            ] as const).map(([label, value, update, placeholder]) => (
              <label key={label} className="block text-xs font-medium text-[#648078]">{label}
                <input value={value} onChange={(event) => update(event.target.value)} maxLength={60} placeholder={placeholder} className="mt-1.5 h-11 w-full rounded-xl border border-[#DCEAE6] bg-[#FAFDFC] px-3 text-base text-[#152535] outline-none focus:border-[#0A9A89]" />
              </label>
            ))}
          </div>
          <label className="mt-3 block text-xs font-medium text-[#648078]">Комментарий клинеру
            <textarea value={addressNote} onChange={(event) => setAddressNote(event.target.value)} maxLength={250} rows={2} placeholder="Например, вход со двора" className="mt-1.5 w-full resize-none rounded-xl border border-[#DCEAE6] bg-[#FAFDFC] p-3 text-base text-[#152535] outline-none focus:border-[#0A9A89]" />
          </label>
        </details>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[23px] bg-gradient-to-r from-[#DDF8F2] to-[#EDF9F6] px-4 py-4">
          <div>
            <p className="text-xs font-medium text-[#547E74]">Предварительная стоимость</p>
            <p className="mt-1 text-[28px] font-extrabold tracking-tight text-[#087E72]">{!isAreaValid ? "Укажите площадь" : priceLoading || !hasCurrentQuote ? "Рассчитываем..." : `${priceQuote!.totalPrice.toLocaleString("ru-RU")} ₸`}</p>
          </div>
          <ShieldCheck className="h-7 w-7 shrink-0 text-[#0C9D8E]" />
        </div>
        {priceError && <p role="alert" className="mt-2 text-sm text-red-700">{priceError}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading || priceLoading || !hasCurrentQuote || !address.trim() || !coordinates} className="mt-4 flex h-14 w-full items-center justify-center rounded-[19px] bg-[#079B8D] text-base font-bold text-white shadow-[0_10px_24px_rgba(7,155,141,0.17)] transition hover:bg-[#078779] disabled:cursor-not-allowed disabled:opacity-50">
          Далее — подтвердить заказ
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-[#8A9D98]">Заказ создаётся только после подтверждения на следующем шаге.</p>
      </div>
    </form>
  );
}
