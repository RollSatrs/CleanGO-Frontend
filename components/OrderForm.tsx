
"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MapPin, ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus } from "lucide-react";

import ServiceImage from "@/components/ServiceImage";
import AddressPicker from "@/components/AddressPicker";
import OrderTracking from "@/components/OrderTracking";
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
  const [expanded,setExpanded]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [priceLoading,setPriceLoading]=useState(false);
  const [quoteAttempt,setQuoteAttempt]=useState(0);
  const formRef=useRef<HTMLFormElement>(null);
  const sheetRef=useRef<HTMLElement>(null);
  const handleRef=useRef<HTMLButtonElement>(null);
  const primaryRef=useRef<HTMLDivElement>(null);
  const extraRef=useRef<HTMLDivElement>(null);
  const footerRef=useRef<HTMLDivElement>(null);
  const bodyRef=useRef<HTMLDivElement>(null);
  const [heights,setHeights]=useState({compact:300,expanded:510});
  const [dragHeight,setDragHeight]=useState<number|null>(null);
  const drag=useRef<{pointerId:number;y:number;height:number;time:number;lastY:number;lastTime:number;velocity:number}|null>(null);
  const ignoreClick=useRef(false);

  function setPanel(open:boolean){
    setExpanded(open);
    if(!open)bodyRef.current?.scrollTo({top:0,behavior:"instant"});
  }
  function startDrag(e:PointerEvent<HTMLButtonElement>){
    if(!e.isPrimary||(e.pointerType==="mouse"&&e.button!==0)||!sheetRef.current)return;
    ignoreClick.current=false;
    const now=performance.now();
    drag.current={pointerId:e.pointerId,y:e.clientY,height:sheetRef.current.getBoundingClientRect().height,time:now,lastY:e.clientY,lastTime:now,velocity:0};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDrag(e:PointerEvent<HTMLButtonElement>){
    const d=drag.current;
    if(!d||d.pointerId!==e.pointerId)return;
    const now=performance.now();
    const delta=d.y-e.clientY;
    if(now>d.lastTime)d.velocity=(d.lastY-e.clientY)/(now-d.lastTime);
    d.lastY=e.clientY;d.lastTime=now;
    if(Math.abs(delta)<5&&!ignoreClick.current)return;
    ignoreClick.current=true;
    const max=Math.max(heights.compact,heights.expanded);
    setDragHeight(Math.max(heights.compact,Math.min(max,d.height+delta)));
  }
  function finishDrag(e:PointerEvent<HTMLButtonElement>,cancelled=false){
    const d=drag.current;
    if(!d||d.pointerId!==e.pointerId)return;
    drag.current=null;
    const delta=d.y-e.clientY;
    const velocity=performance.now()-d.lastTime<100?d.velocity:0;
    if(!cancelled&&ignoreClick.current){
      if(Math.abs(delta)>32||Math.abs(velocity)>.35)setPanel(Math.abs(velocity)>.35?velocity>0:delta>0);
      else setPanel(expanded);
    }
    setDragHeight(null);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");

  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(
    null,
  );

  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrder | null>(null);

  useEffect(()=>{
    if(confirming||createdOrder)return;
    const sheet=sheetRef.current,form=formRef.current;
    const nodes=[handleRef.current,primaryRef.current,extraRef.current,footerRef.current];
    if(!sheet||!form||nodes.some(node=>!node))return;
    const [handle,primary,extra,footer]=nodes as HTMLElement[];
    const measure=()=>{
      const compact=Math.ceil(handle.getBoundingClientRect().height+primary.getBoundingClientRect().height+footer.getBoundingClientRect().height+2);
      const full=compact+Math.ceil(extra.getBoundingClientRect().height);
      setHeights(old=>old.compact===compact&&old.expanded===full?old:{compact,expanded:full});
      form.style.setProperty("--cg-booking-sheet-height",`${sheet.getBoundingClientRect().height}px`);
    };
    const observer=new ResizeObserver(measure);
    [sheet,...nodes].forEach(node=>{if(node)observer.observe(node);});
    measure();
    return()=>observer.disconnect();
  },[confirming,createdOrder]);

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
      setPriceLoading(false);
      setPriceError("");
      return;
    }
    setPriceError("");
    setPriceLoading(true);

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
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
  }, [cleaningType, parsedArea, isAreaValid, quoteAttempt]);

  // Создание заказа
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;
    if (!confirming) {
      if (!address.trim() || !coordinates || !isAreaValid || !hasCurrentQuote || priceLoading) {
        setError("Укажите точный адрес и площадь, дождитесь расчёта стоимости.");
        setPanel(true);
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

  // Real map and order status are sourced from the saved order, never simulated.
  if (createdOrder && coordinates) {
    return <OrderTracking initialOrder={createdOrder} latitude={coordinates.latitude} longitude={coordinates.longitude} />;
  }

  if (confirming) {
    return (
      <section className="fixed inset-0 z-[1000] cleango-map-viewport overflow-y-auto overscroll-contain bg-white text-[#15191D]">
        <div className="cleango-confirmation-header bg-[#F7F7F5] px-5 pb-5">
          <button type="button" onClick={() => {setConfirming(false);setError("");}} className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#087F71]"><ArrowLeft size={19}/> Назад к карте</button><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0A9A89]">CleanGo / Шаг 2 из 2</p>
          <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight">Подтверждение</h2>
          <p className="mt-2 text-sm text-[#6B857E]">Проверьте детали перед поиском клинера.</p>
        </div>
        <div className="px-5 pb-[max(24px,var(--cleango-safe-bottom-inset))]">
          <div className="divide-y divide-[#E9F0ED] bg-white">
            {([
              ["Услуга", cleaningTypeNames[cleaningType]],
              ["Адрес", address],
              ["Площадь", `${area} м²`],
              ["Оплата", "Тестовый заказ · без списания"],
            ] as const).map(([label,value])=>(
              <div key={label} className="flex items-start justify-between gap-4 py-4">
                <span className="shrink-0 text-sm text-[#7B908A]">{label}</span>
                <span className="text-right text-sm font-semibold text-[#15191D]">{value}</span>
              </div>
            ))}
          </div>
          {(entrance || floor || apartment || intercom || addressNote) && <p className="mt-3 text-xs leading-5 text-[#708B83]">{[entrance && `Подъезд ${entrance}`,floor && `Этаж ${floor}`,apartment && `Кв./офис ${apartment}`,intercom && `Домофон ${intercom}`,addressNote].filter(Boolean).join(" · ")}</p>}
          <div className="mt-5 rounded-[14px] bg-[#D9EFED] p-5">
            <p className="text-xs font-medium text-[#547E74]">Стоимость уборки</p>
            <p className="mt-1 text-[32px] font-extrabold tracking-tight text-[#087E72]">{hasCurrentQuote ? `${priceQuote!.totalPrice.toLocaleString("ru-RU")} ₸` : "Уточняется"}</p>
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3 pb-[max(20px,var(--cleango-safe-bottom-inset))]">
            <button type="submit" disabled={loading || priceLoading || !hasCurrentQuote || !address.trim() || !coordinates} className="min-h-14 w-full rounded-[13px] bg-[#137D79] px-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <span className="inline-flex items-center justify-center gap-2"><LoaderCircle className="h-5 w-5 animate-spin"/>Создаём заказ...</span> : "Подтвердить и найти клинера"}</button>
            <button type="button" onClick={()=>{setConfirming(false);setError("");}} className="h-12 w-full rounded-[13px] border border-[#D8EAE4] text-sm font-semibold text-[#168675]">Изменить данные</button>
          </form>
          <p className="mt-3 text-center text-xs text-[#8A9D98]">Оплата сейчас не списывается.</p>
        </div>
      </section>
    );
  }

  const adjustArea=(step:number)=>setArea(current=>String(Math.max(1,Math.min(1000,(Number(current)||60)+step))));
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="fixed inset-0 z-[1000] isolate overflow-hidden bg-[#F7F7F5] text-[#15191D] cleango-map-viewport cg-booking">
      <div className="absolute inset-0">
        <AddressPicker immersive searchVisible={searchOpen} address={address} initialCoordinates={coordinates} onChange={(nextAddress,nextCoordinates)=>{
          setAddress(nextAddress);setCoordinates(nextCoordinates);setError("");
          if(nextCoordinates)setSearchOpen(false);
        }}/>
      </div>
      <div className="cg-booking-top pointer-events-none absolute inset-x-0 z-[500] flex items-center justify-between">
        <Link href="/" aria-label="Назад к услугам" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#E6E7E4] bg-white shadow-sm"><ArrowLeft size={20}/></Link>
        <span className="rounded-full border border-[#E6E7E4] bg-white px-3 py-2 text-xs font-semibold shadow-sm">Новый заказ</span>
        <div className="h-11 w-11" aria-hidden="true"/>
      </div>
      <section ref={sheetRef} aria-label="Параметры заказа" className={`cg-booking-panel absolute z-[600] flex flex-col overflow-hidden ${dragHeight!==null?"cg-booking-dragging":""}`} style={{height:dragHeight??(expanded?heights.expanded:heights.compact)}}>
        <button ref={handleRef} type="button" aria-label={expanded?"Свернуть параметры заказа":"Раскрыть параметры заказа"} aria-expanded={expanded} aria-controls="booking-extra" className="cg-booking-handle flex w-full shrink-0 items-center justify-center" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={e=>finishDrag(e)} onPointerCancel={e=>finishDrag(e,true)} onLostPointerCapture={e=>finishDrag(e,true)} onClick={e=>{if(ignoreClick.current&&e.detail!==0){ignoreClick.current=false;return;}ignoreClick.current=false;setPanel(!expanded);}} onKeyDown={e=>{if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();setPanel(e.key==="ArrowUp");}}}><span className="h-1 w-10 rounded-full bg-[#CAD6D1]"/></button>
        <div ref={bodyRef} className="cg-booking-body relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5">
          <div ref={primaryRef} className="space-y-2.5 pb-2">
            <div className="flex items-center gap-2">
              <span className="cg-soft grid h-9 w-9 shrink-0 place-items-center rounded-xl"><MapPin size={18}/></span>
              <button type="button" onClick={()=>{setPanel(false);setSearchOpen(open=>!open);}} className="min-w-0 flex-1 text-left" aria-label="Изменить адрес уборки"><span className="block text-[10px] cg-muted">Адрес уборки</span><span className="block truncate text-sm font-semibold">{address||"Выберите точку на карте"}</span></button>
              <button type="button" onClick={()=>{setPanel(false);setSearchOpen(open=>!open);}} className="shrink-0 rounded-full bg-[#F4F5F2] px-2.5 py-2 text-[11px] font-semibold text-[#137D79]">{searchOpen?"Закрыть":"Изменить"}</button>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#E6E7E4] p-1.5">
              <ServiceImage type={cleaningType} className="h-11 w-14 shrink-0 rounded-[8px]" sizes="56px"/>
              <div className="min-w-0 flex-1"><p className="text-[10px] cg-muted">Вид уборки</p><p className="text-xs font-semibold leading-4">{cleaningTypeNames[cleaningType]}</p></div>
              <button type="button" onClick={()=>setPanel(!expanded)} aria-expanded={expanded} aria-label={expanded?"Скрыть детали":"Показать детали"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4F5F2] text-[#137D79]">{expanded?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="area" className="text-xs font-semibold">Площадь помещения</label>
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#E6E7E4] bg-[#F7F7F5] p-1">
                <button type="button" aria-label="Уменьшить площадь на 5 м²" onClick={()=>adjustArea(-5)} disabled={isAreaValid&&parsedArea===1} className="cg-soft grid h-9 w-9 place-items-center rounded-[9px] disabled:opacity-40"><Minus size={17}/></button>
                <div className="flex items-baseline justify-center gap-0.5"><input id="area" type="number" min="1" max="1000" step="1" inputMode="numeric" value={area} onChange={e=>setArea(e.target.value)} className="w-12 bg-transparent text-center text-base font-bold outline-none"/><span className="text-xs font-semibold">м²</span></div>
                <button type="button" aria-label="Увеличить площадь на 5 м²" onClick={()=>adjustArea(5)} disabled={isAreaValid&&parsedArea===1000} className="cg-soft grid h-9 w-9 place-items-center rounded-[9px] disabled:opacity-40"><Plus size={17}/></button>
              </div>
            </div>
          </div>
          <div ref={extraRef} id="booking-extra" inert={!expanded} aria-hidden={!expanded} className="space-y-3 border-t border-[#E6E7E4] pb-3 pt-3" style={expanded||dragHeight!==null?undefined:{visibility:"hidden",position:"absolute",left:14,right:14,bottom:"100%"}}>
            <div className="grid grid-cols-5 gap-1.5" aria-label="Быстрый выбор площади">{[30,40,60,80,100].map(value=><button key={value} type="button" onClick={()=>setArea(String(value))} aria-pressed={parsedArea===value} className={`min-h-9 rounded-lg border text-[11px] font-semibold ${parsedArea===value?"border-[#137D79] cg-primary":"border-[#E6E7E4] bg-white"}`}>{value} м²</button>)}</div>
            <div><p className="text-xs font-semibold">Детали адреса</p><p className="mt-1 text-[11px] cg-muted">По желанию — чтобы клинер быстрее нашёл вход.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([["Подъезд",entrance,setEntrance,"2"],["Этаж",floor,setFloor,"5"],["Квартира / офис",apartment,setApartment,"42"],["Домофон",intercom,setIntercom,"Код"]] as const).map(([label,value,update,placeholder])=><label key={label} className="text-[11px] cg-muted">{label}<input value={value} onChange={e=>update(e.target.value)} maxLength={60} placeholder={placeholder} className="cg-field mt-1 h-10 w-full px-3 text-base text-[#15191D] outline-none"/></label>)}
              </div>
              <label className="mt-2 block text-[11px] cg-muted">Комментарий<textarea value={addressNote} onChange={e=>setAddressNote(e.target.value)} maxLength={250} rows={2} placeholder="Например, вход со двора" className="cg-field mt-1 w-full resize-none p-2.5 text-base text-[#15191D] outline-none"/></label>
            </div>
          </div>
        </div>
        <div ref={footerRef} className="shrink-0 border-t border-[#E6E7E4] bg-white px-3.5 pb-3 pt-2.5">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <span className="text-xs cg-muted">Стоимость уборки</span>
            <strong className="text-right text-xl font-bold tracking-tight text-[#15191D]" aria-live="polite">{!isAreaValid?"1–1000 м²":priceError&&!hasCurrentQuote?"Недоступна":priceLoading||!hasCurrentQuote?<LoaderCircle className="h-5 w-5 animate-spin text-[#137D79]" aria-label="Рассчитываем стоимость"/>:`${priceQuote!.totalPrice.toLocaleString("ru-RU")} ₸`}</strong>
          </div>
          {priceError&&<div role="alert" className="mb-2 flex items-center justify-between gap-2 text-[11px] text-red-700"><span>{priceError}</span><button type="button" onClick={()=>setQuoteAttempt(v=>v+1)} className="font-semibold underline">Повторить</button></div>}
          {error&&<p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}
          <button type="submit" disabled={loading||priceLoading||!isAreaValid||!hasCurrentQuote||!address.trim()||!coordinates} className="cg-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50">Продолжить <ArrowRight size={17}/></button>
        </div>
      </section>
    </form>
  );
}
