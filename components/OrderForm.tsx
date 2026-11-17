
"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressPicker from "@/components/AddressPicker";

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const cleaningTypeNames: Record<CleaningType, string> = {
  regular: "Поддерживающая уборка",
  general: "Генеральная уборка",
  renovation: "Уборка после ремонта",
};

export default function OrderForm({ cleaningType }: OrderFormProps) {
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [intercom, setIntercom] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(false);
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
          "ngrok-skip-browser-warning": "true",
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

  // Экран успешного оформления заказа
  if (createdOrder) {
    return (
      <div className="space-y-5 rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-green-800">
            Заказ успешно создан!
          </h3>

          <p className="text-sm text-green-900">
            Ваша заявка зарегистрирована в CleanGo.
          </p>
        </div>

        <div className="space-y-3 rounded-lg bg-white p-4 text-sm text-gray-700">
          <div>
            <p className="text-gray-500">Номер заказа</p>
            <p className="break-all font-medium">
              {createdOrder.id}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Тип уборки</p>
            <p className="font-medium">
              {cleaningTypeNames[createdOrder.cleaningType]}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Адрес</p>
            <p className="font-medium">
              {createdOrder.address}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Площадь</p>
            <p className="font-medium">
              {createdOrder.area} м²
            </p>
          </div>

          <div>
            <p className="text-gray-500">Статус</p>
            <p className="font-medium">
              {createdOrder.status === "pending"
                ? "Ожидает исполнителя"
                : createdOrder.status}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Создан</p>
            <p className="font-medium">
              {new Date(createdOrder.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-teal-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Стоимость заказа
          </p>

          <p className="mt-2 text-3xl font-bold text-teal-700">
            {createdOrder.price !== null
              ? `${createdOrder.price.toLocaleString("ru-RU")} ₸`
              : "Не рассчитана"}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Стоимость рассчитана сервером CleanGo и сохранена
            вместе с заказом.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setCreatedOrder(null);
            setAddress("");
            setArea("");
            setEntrance(""); setFloor(""); setApartment(""); setIntercom(""); setAddressNote("");
            setCoordinates(null);
            setPriceQuote(null);
            setPriceError("");
            setError("");
          }}
        >
          Создать ещё один заказ
        </Button>
      </div>
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
        {loading ? "Создаём заказ..." : "Найти клинера"}
      </Button>

      <p className="text-center text-xs leading-5 text-[#94A5A1]">Нажимая кнопку, вы отправляете заявку на уборку.</p>
    </form>
  );
}
