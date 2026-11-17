"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, LocateFixed, MapPin } from "lucide-react";
import Link from "next/link";

type MapInstance = {
  getCenter(): { lat: number; lng: number };
  flyTo(center: [number, number], zoom: number): void;
  invalidateSize(): void;
  on(event: string, handler: () => void): void;
  remove(): void;
};
type LeafletApi = {
  map(node: HTMLElement, options: Record<string, unknown>): MapInstance;
  tileLayer(url: string, options: Record<string, unknown>): { addTo(map: MapInstance): void; on(event: string, handler: () => void): void };
};
type LeafletWindow = Window & { L?: LeafletApi };

const SEMEY: [number, number] = [50.4111, 80.2275];
const VERSION = "1.9.4";

async function loadLeaflet() {
  if (!document.getElementById("cg-map-css")) {
    const css = document.createElement("link");
    css.id = "cg-map-css";
    css.rel = "stylesheet";
    css.href = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`;
    document.head.appendChild(css);
  }
  const existingLeaflet = (window as LeafletWindow).L;
  if (existingLeaflet) return existingLeaflet;
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("cg-map-js") as HTMLScriptElement | null;
    if (existing) {
      if ((window as LeafletWindow).L) { resolve(); return; }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Не удалось загрузить библиотеку карты")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "cg-map-js";
    script.src = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить библиотеку карты"));
    document.head.appendChild(script);
  });
  const loadedLeaflet = (window as LeafletWindow).L;
  if (!loadedLeaflet) throw new Error("Библиотека карты недоступна");
  return loadedLeaflet;
}

export default function CleanGoMapsPreview() {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const [center, setCenter] = useState({ lat: SEMEY[0], lng: SEMEY[1] });
  const [details, setDetails] = useState(false);
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [intercom, setIntercom] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [address, setAddress] = useState("Определяем адрес...");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ru&lat=" + center.lat + "&lon=" + center.lng;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Geocoding unavailable");
        const result: { address?: Record<string,string>; display_name?: string } = await response.json();
        if (cancelled) return;
        const a = result.address || {};
        const street = a.road || a.pedestrian || a.residential;
        const city = a.city || a.town || a.village || "Семей";
        setAddress(street ? city + ", " + street + (a.house_number ? ", " + a.house_number : "") : (result.display_name?.split(",").slice(0,3).join(",").trim() || "Адрес не определён"));
      } catch { if (!cancelled) setAddress("Адрес не определён — уточните точку"); }
    }, 1200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!node.current) return;
    let cancelled = false;
    let instance: MapInstance | null = null;
    const timeout = window.setTimeout(() => { if (!cancelled) setError("Карта загружается слишком долго. Проверьте подключение."); }, 16000);
    void (async () => {
      try {
        const leaflet = await loadLeaflet();
        if (cancelled || !node.current) return;
        instance = leaflet.map(node.current, { center: SEMEY, zoom: 16, zoomControl: false, attributionControl: false });
        map.current = instance;
        instance.on("movestart", () => { if (!cancelled) { setMoving(true); setSaved(false); } });
        instance.on("moveend", () => {
          if (cancelled || !instance) return;
          const p = instance.getCenter();
          setCenter({ lat: p.lat, lng: p.lng });
          setMoving(false);
        });
        const layer = leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          subdomains: "abc", maxZoom: 19, attribution: "© OpenStreetMap contributors",
        });
        layer.on("tileload", () => { if (!cancelled) { clearTimeout(timeout); setReady(true); setError(""); } });
        layer.on("tileerror", () => { if (!cancelled) setError("Не удалось загрузить фрагменты карты."); });
        layer.addTo(instance);
        setTimeout(() => { if (!cancelled) instance?.invalidateSize(); }, 300);
      } catch (e) {
        if (!cancelled) { clearTimeout(timeout); setError(e instanceof Error ? e.message : "Ошибка карты"); }
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); instance?.remove(); map.current = null; };
  }, []);

  function locate() {
    if (!navigator.geolocation) { setError("Геолокация недоступна"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocating(false); map.current?.flyTo([coords.latitude, coords.longitude], 17); },
      () => { setLocating(false); setError("Разрешите доступ к местоположению в Telegram"); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <main className="relative flex h-[100dvh] min-h-[540px] flex-col overflow-hidden bg-[#eaf4f1] text-[#152535]">
      <div ref={node} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 z-[400] bg-gradient-to-b from-[#f4faf7]/30 via-transparent to-[#dcece7]/20" />
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-4 pt-[max(16px,env(safe-area-inset-top),var(--cleango-telegram-top,0px))]">
        <div className="pointer-events-auto flex items-center gap-3 rounded-[18px] border border-white/80 bg-white/95 p-2 shadow-[0_12px_40px_rgba(18,55,52,.12)] backdrop-blur-xl">
          <Link href="/" aria-label="Назад" className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#f0f7f5]"><ArrowLeft size={20} /></Link>
          <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#27998e]">CleanGo</p><h1 className="truncate text-sm font-bold">Выберите адрес</h1></div>

        </div>
      </header>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
        <div className={`relative flex flex-col items-center transition-transform duration-200 ${moving ? "-translate-y-3 scale-110" : ""}`}>
          <div className="grid h-[23px] w-[23px] place-items-center rounded-[11px] rounded-br-[4px] border-[2px] border-white bg-[#17a99b] shadow-[0_10px_25px_rgba(10,120,108,.35)] -rotate-45"><span className="h-[7px] w-[7px] rounded-full border-[2px] border-white bg-[#c8f8ee]" /></div>
        </div>
        <div className={`absolute left-1/2 top-full mt-2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-[#1d544d]/25 blur-[3px] transition-all ${moving ? "scale-75 opacity-40" : ""}`} />
      </div>
      <button type="button" onClick={locate} disabled={locating || !ready} aria-label="Моё местоположение" className="absolute right-4 top-[36%] z-[600] grid h-12 w-12 place-items-center rounded-2xl border border-white bg-white text-[#118f83] shadow-lg disabled:opacity-50"><LocateFixed size={22}/></button>
      {!ready && !error && <div className="absolute inset-0 z-[650] grid place-items-center bg-[#eef6f3]/90 text-sm font-semibold">Загружаем CleanGo Maps...</div>}
      {error && <div role="alert" className="absolute left-4 right-4 top-28 z-[700] rounded-2xl bg-white p-4 text-sm text-red-700 shadow-xl">{error}<button className="ml-2 font-bold text-[#128d81]" onClick={() => setError("")}>Закрыть</button></div>}
      <section className="absolute inset-x-0 bottom-0 z-[600] max-h-[75dvh] overflow-y-auto rounded-t-[26px] border border-white/90 bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom),var(--cleango-telegram-bottom,0px))] pt-5 shadow-[0_-16px_45px_rgba(30,65,60,.14)]">
        <button type="button" onClick={() => setSheetOpen(!sheetOpen)} aria-label="Свернуть или развернуть карточку" className="mx-auto mb-4 flex items-center justify-center gap-2"><span className="h-1 w-11 rounded-full bg-[#dbe8e4]" /><ChevronDown size={16} className={sheetOpen ? "" : "rotate-180"} /></button>
        {sheetOpen && <>
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e5f8f5] text-[#13998b]"><MapPin size={23}/></div>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#16a394]">Точка уборки</p><h2 className="mt-1 text-lg font-extrabold">{moving ? "Выбираем место..." : "Выбранная точка"}</h2><p className="mt-1 text-xs text-[#72847f]">{address}</p></div>
        </div>
        {details && <div className="mb-4 grid grid-cols-2 gap-3">
          {([["Подъезд", entrance, setEntrance], ["Этаж", floor, setFloor], ["Квартира / офис", apartment, setApartment], ["Домофон", intercom, setIntercom]] as const).map(([label, value, setter]) => <label key={label} className="text-xs font-bold text-[#667b75]">{label}<input value={value} onChange={e => setter(e.target.value)} placeholder="Не указан" className="mt-1.5 h-11 w-full rounded-xl border border-[#e0ebe7] bg-[#f7fbf9] px-3 text-sm text-[#152535] outline-none focus:border-[#16a394]" /></label>)}
          <label className="col-span-2 text-xs font-bold text-[#667b75]">Комментарий для клинера<textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Например, вход со двора" rows={2} className="mt-1.5 w-full resize-none rounded-xl border border-[#e0ebe7] bg-[#f7fbf9] p-3 text-sm text-[#152535] outline-none focus:border-[#16a394]" /></label>
        </div>}
        {saved && <p role="status" className="mb-3 text-sm font-semibold text-[#138b7d]">Точка и детали сохранены в этом предварительном просмотре.</p>}
        <button type="button" disabled={!ready || moving} onClick={() => { if (!details) setDetails(true); else setSaved(true); }} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#159f91] text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(21,159,145,.25)] disabled:opacity-50">{details ? <><Check size={19}/> Сохранить адрес</> : <>Уточнить адрес <ChevronRight size={19}/></>}</button>
        <p className="mt-3 text-center text-[11px] text-[#8b9c97]">Тестовая версия · Заказ не создаётся</p>
        </>}
        {!sheetOpen && <button type="button" onClick={() => setSheetOpen(true)} className="w-full truncate pb-2 text-left text-sm font-semibold">{address}</button>}
        <p className="mt-2 text-center text-[10px] text-[#8b9c97]">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap contributors</a></p>
      </section>
    </main>
  );
}
