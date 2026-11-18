
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, Search, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";

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
  const [sheetLevel, setSheetLevel] = useState<"compact" | "medium" | "full">("compact");
  const [searchOpen, setSearchOpen] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const dragStart = useRef<{ y: number; level: "compact" | "medium" | "full" } | null>(null);
  const levels = ["compact", "medium", "full"] as const;
  function onSheetEnd(y: number) {
    if (!dragStart.current) return;
    const delta = dragStart.current.y - y;
    const index = levels.indexOf(dragStart.current.level);
    if (Math.abs(delta) > 45) setSheetLevel(levels[Math.max(0, Math.min(2, index + (delta > 0 ? 1 : -1)))]);
    dragStart.current = null;
  }

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
    <form onSubmit={handleSubmit} className="fixed inset-0 z-[1000] isolate overflow-hidden bg-[#F5F9F8] text-[#152535]" style={{ height: "100dvh" }}>
      <div className="absolute inset-0">
        <AddressPicker immersive searchVisible={searchOpen} address={address} onChange={(nextAddress, nextCoordinates) => {
          setAddress(nextAddress);
          setCoordinates(nextCoordinates);
          setError("");
          if (nextCoordinates) setSearchOpen(false);
        }} />
      </div>
      <div className="pointer-events-none absolute left-4 top-[max(12px,env(safe-area-inset-top))] z-[500]">
        <Link href="/client" aria-label="Назад к услугам" className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-white text-[#152535] shadow-[0_5px_22px_rgba(15,60,55,0.12)]"><ArrowLeft size={22}/></Link>
      </div>
      <section aria-label="Параметры заказа" className={`absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-[30px] bg-white shadow-[0_-8px_35px_rgba(15,60,55,0.12)] transition-[height] duration-300 ease-out ${sheetLevel === "compact" ? "h-[220px]" : sheetLevel === "medium" ? "h-[47dvh]" : "h-[83dvh]"}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div role="button" tabIndex={0} aria-label="Потяните для раскрытия параметров" aria-expanded={sheetLevel !== "compact"} className="shrink-0 cursor-grab touch-none px-5 pb-2 pt-3" onTouchStart={e => { dragStart.current = { y: e.touches[0].clientY, level: sheetLevel }; }} onTouchEnd={e => onSheetEnd(e.changedTouches[0].clientY)} onPointerDown={e => { if (e.pointerType === "mouse") dragStart.current = { y: e.clientY, level: sheetLevel }; }} onPointerUp={e => { if (e.pointerType === "mouse") onSheetEnd(e.clientY); }} onKeyDown={e => { if (e.key === "ArrowUp") setSheetLevel("full"); if (e.key === "ArrowDown") setSheetLevel("compact"); }}>
          <div className="mx-auto h-1.5 w-11 rounded-full bg-[#D6E5E1]" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <div className="flex items-center gap-3 py-2">
            <button type="button" onClick={() => {setSearchOpen(true);setSheetLevel("compact");}} aria-label="Выбрать или изменить адрес" className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <MapPin className="h-5 w-5 shrink-0 text-[#079F91]" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#152535]">{address || "Выберите адрес на карте"}</span>
              <span className="text-xs font-semibold text-[#079F91]">Изменить</span>
            </button>
            <button type="button" aria-label={sheetLevel === "compact" ? "Раскрыть панель" : "Свернуть панель"} onClick={() => setSheetLevel(sheetLevel === "compact" ? "medium" : "compact")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EFF8F5] text-[#087F71]">{sheetLevel === "compact" ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
          </div>
          {sheetLevel !== "compact" && <div className="pt-3">
            <div className="flex items-center justify-between gap-3 border-t border-[#EDF2F0] pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#E7F8F4] text-[#079F91]"><Sparkles size={23}/></div>
                <div><p className="text-sm font-bold">{cleaningTypeNames[cleaningType]}</p><p className="text-xs text-[#7B918B]">Параметры уборки</p></div>
              </div>
              <button type="button" onClick={() => setSheetLevel(sheetLevel === "full" ? "medium" : "full")} aria-label={sheetLevel === "full" ? "Свернуть детали" : "Показать все детали"} className="grid h-9 w-9 place-items-center rounded-full bg-[#EFF8F5] text-[#087F71]">{sheetLevel === "full" ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}</button>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div><label htmlFor="area" className="text-xs text-[#718881]">Площадь помещения</label><div className="flex items-baseline gap-1"><input id="area" type="number" min="1" max="1000" step="1" inputMode="numeric" value={area} onChange={e => setArea(e.target.value)} className="w-16 bg-transparent text-2xl font-extrabold outline-none"/><span className="font-semibold">м²</span></div></div>
              <div className="flex gap-2">
                <button type="button" aria-label="Уменьшить площадь" onClick={() => setArea(String(Math.max(1,(Number(area)||60)-5)))} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF8F5] text-xl text-[#079B8D]">−</button>
                <button type="button" aria-label="Увеличить площадь" onClick={() => setArea(String(Math.min(1000,(Number(area)||60)+5)))} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF8F5] text-xl text-[#079B8D]">+</button>
              </div>
            </div>
            {sheetLevel === "full" && <details className="mt-5 border-t border-[#EDF2F0] pt-4" open={showAddressDetails} onToggle={e => setShowAddressDetails(e.currentTarget.open)}>
              <summary className="cursor-pointer text-sm font-bold text-[#286E63]">Подъезд, этаж и комментарий</summary>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {([["Подъезд",entrance,setEntrance,"2"],["Этаж",floor,setFloor,"5"],["Квартира / офис",apartment,setApartment,"42"],["Домофон",intercom,setIntercom,"Код"]] as const).map(([label,value,update,placeholder]) => <label key={label} className="text-xs text-[#6A8079]">{label}<input value={value} onChange={e => update(e.target.value)} maxLength={60} placeholder={placeholder} className="mt-1 h-11 w-full rounded-xl bg-[#F3F8F6] px-3 text-base outline-none"/></label>)}
              </div>
              <label className="mt-3 block text-xs text-[#6A8079]">Комментарий<textarea value={addressNote} onChange={e => setAddressNote(e.target.value)} maxLength={250} rows={2} placeholder="Например, вход со двора" className="mt-1 w-full resize-none rounded-xl bg-[#F3F8F6] p-3 text-base outline-none"/></label>
            </details>}
          </div>}
        </div>
        <div className="shrink-0 bg-white px-5 pb-4 pt-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs text-[#708A82]">Предварительная стоимость</span>
            <strong className="text-xl text-[#087F71]">{!isAreaValid ? "Укажите площадь" : priceLoading || !hasCurrentQuote ? "Рассчитываем..." : `${priceQuote!.totalPrice.toLocaleString("ru-RU")} ₸`}</strong>
          </div>
          {priceError && <p role="alert" className="mb-2 text-xs text-red-700">{priceError}</p>}
          {error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}
          <button type="submit" disabled={loading || priceLoading || !hasCurrentQuote || !address.trim() || !coordinates} className="h-12 w-full rounded-2xl bg-[#079F91] text-sm font-bold text-white shadow-[0_8px_20px_rgba(7,159,145,0.13)] disabled:opacity-50">Далее — оформить заказ →</button>
        </div>
      </section>
    </form>
  );
}
