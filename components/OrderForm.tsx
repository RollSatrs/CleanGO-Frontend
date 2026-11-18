
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";

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
  const [area, setArea] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [intercom, setIntercom] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
    if (!confirming) { setConfirming(true); return; }
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
      <section className="space-y-5">
        <div className="rounded-[26px] bg-gradient-to-br from-[#DDFBF5] via-[#F0FFFC] to-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0A9A89] shadow-sm"><Sparkles className="h-6 w-6" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#168675]">Шаг 2 из 2</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#152535]">Подтверждение заказа</h2>
          <p className="mt-2 text-sm leading-6 text-[#66837D]">Проверьте данные перед поиском исполнителя.</p>
        </div>
        <div className="space-y-4 rounded-[24px] border border-[#E1F0EC] bg-white p-5">
          <div><p className="text-xs text-[#829792]">Услуга</p><p className="mt-1 font-bold text-[#152535]">{cleaningTypeNames[cleaningType]}</p></div>
          <div className="border-t border-[#EDF3F1] pt-4"><p className="text-xs text-[#829792]">Адрес</p><p className="mt-1 font-medium text-[#152535]">{address || "Не указан"}</p></div>
          <div className="border-t border-[#EDF3F1] pt-4"><p className="text-xs text-[#829792]">Площадь</p><p className="mt-1 font-medium text-[#152535]">{area || "Не указана"} м²</p></div>
          <div className="rounded-[20px] bg-[#E6FAF5] p-4"><p className="text-sm text-[#527A72]">Стоимость по тарифу CleanGo</p><p className="mt-1 text-3xl font-extrabold text-[#087F71]">{hasCurrentQuote ? `${priceQuote!.totalPrice.toLocaleString("ru-RU")} ₸` : "Уточняется"}</p></div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <button type="submit" disabled={loading || priceLoading || !hasCurrentQuote || !address.trim() || !coordinates} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#079B8D] text-base font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-5 w-5" />{loading ? "Создаём заказ..." : "Подтвердить и найти клинера"}</button>
          <button type="button" onClick={() => { setConfirming(false); setError(""); }} className="h-12 w-full rounded-2xl border border-[#CFE9E2] font-semibold text-[#168675]">Изменить данные</button>
        </form>
        <p className="text-center text-xs text-[#849B94]">Оплата на этом шаге не производится.</p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AddressPicker address={address} onChange={(nextAddress, nextCoordinates) => {
        setAddress(nextAddress);
        setCoordinates(nextCoordinates);
      }} />

      <div className="space-y-3 rounded-[22px] border border-[#DCEDE7] bg-[#F7FCFA] p-4">
        <div><p className="text-sm font-bold text-[#153D36]">Как найти ваш вход?</p><p className="mt-1 text-xs text-[#6B8780]">Укажите детали, чтобы клинер приехал к нужному подъезду.</p></div>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["Подъезд", entrance, setEntrance, "Например, 2"],
            ["Этаж", floor, setFloor, "Например, 5"],
            ["Квартира / офис", apartment, setApartment, "Например, 42"],
            ["Домофон", intercom, setIntercom, "Код или номер"],
          ] as const).map(([label, value, update, placeholder]) => (
            <label key={label} className="block text-xs font-semibold text-[#476C65]">{label}
              <input value={value} onChange={(event) => update(event.target.value)} maxLength={60} placeholder={placeholder} className="mt-1.5 h-11 w-full rounded-xl border border-[#DDEBE6] bg-white px-3 text-base text-[#152535] outline-none focus:border-[#159F91]" />
            </label>
          ))}
        </div>
        <label className="block text-xs font-semibold text-[#476C65]">Комментарий для клинера
          <textarea value={addressNote} onChange={(event) => setAddressNote(event.target.value)} maxLength={250} rows={2} placeholder="Например, вход со двора" className="mt-1.5 w-full resize-none rounded-xl border border-[#DDEBE6] bg-white p-3 text-base text-[#152535] outline-none focus:border-[#159F91]" />
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Площадь помещения (м²)</Label>

        <Input
          id="area"
          type="number"
          min="1"
          max="1000"
          step="1"
          placeholder="Например, 65"
          className="h-12 rounded-2xl border-[#E0EAE7] bg-[#FBFDFC] px-4 text-base"
          value={area}
          onChange={(event) => setArea(event.target.value)}
          required
        />
      </div>

      <div className="space-y-3 rounded-[22px] border-0 bg-[#E9F8F3] p-5">
        <div>
          <p className="text-sm font-medium text-gray-600">
            Предварительная стоимость уборки
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Цена рассчитывается автоматически
          </p>
        </div>

        {!isAreaValid ? (
          <p className="text-sm text-gray-500">
            Укажите площадь от 1 до 1000 м².
          </p>
        ) : priceLoading || !hasCurrentQuote ? (
          priceError && !priceLoading ? (
            <p className="text-sm text-red-600">
              {priceError}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Рассчитываем стоимость...
            </p>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-[38px] font-bold tracking-tight text-[#087F71]">
              {priceQuote.totalPrice.toLocaleString("ru-RU")} ₸
            </p>

            <div className="border-t border-teal-200 pt-3 text-sm text-gray-600">
              <div className="flex justify-between gap-3">
                <span>Стоимость за 1 м²</span>
                <span>
                  {priceQuote.pricePerSquareMeter.toLocaleString("ru-RU")} ₸
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-3">
                <span>Площадь</span>
                <span>{priceQuote.area} м²</span>
              </div>

              <div className="mt-2 flex justify-between gap-3">
                <span>Минимальная стоимость</span>
                <span>
                  {priceQuote.minimumPrice.toLocaleString("ru-RU")} ₸
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={
          loading ||
          priceLoading ||
          !hasCurrentQuote ||
          !address.trim() ||
          !coordinates
        }
        className="h-14 w-full rounded-2xl bg-[#0A9A89] text-base font-bold text-white shadow-[0_8px_20px_rgba(10,154,137,0.18)] hover:bg-[#078776]"
      >
        {loading ? "Проверяем..." : "Далее — подтвердить заказ"}
      </Button>

      <p className="text-center text-xs leading-5 text-[#94A5A1]">Нажимая кнопку, вы отправляете заявку на уборку.</p>
    </form>
  );
}
