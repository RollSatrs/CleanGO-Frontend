"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, LocateFixed, MapPin } from "lucide-react";
import Link from "next/link";

type MapInstance = {
  getCenter(): { lat: number; lng: number };
  flyTo(options: { center: [number, number]; zoom?: number; essential?: boolean }): void;
  resize(): void;
  on(event: string, handler: () => void): void;
  remove(): void;
  setStyle(style: string | Record<string, unknown>): void;
  getStyle(): { layers?: Array<{ id: string; type: string }> };
  setPaintProperty(id: string, name: string, value: string): void;
  queryRenderedFeatures(point?: [number, number], options?: { layers?: string[] }): Array<unknown>;
  getCanvas(): HTMLCanvasElement;
};
type LeafletMap = { getCenter(): {lat:number;lng:number}; flyTo(point:[number,number], zoom:number):void; invalidateSize():void; remove():void; on(event:string, handler:()=>void):void };
type LeafletApi = { map(node:HTMLElement, options:Record<string,unknown>):LeafletMap; tileLayer(url:string,options:Record<string,unknown>): { on(event:string,handler:()=>void):void; addTo(map:LeafletMap):void } };
type LeafletWindow = Window & { L?: LeafletApi };
async function loadLeaflet(): Promise<LeafletApi> {
  if (!document.getElementById("cg-leaflet-css")) {
    const link=document.createElement("link"); link.id="cg-leaflet-css"; link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
  }
  if ((window as LeafletWindow).L?.map) return (window as LeafletWindow).L!;
  await new Promise<void>((resolve,reject)=>{
    const script=document.createElement("script"); script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.onload=()=>resolve(); script.onerror=()=>reject(new Error("Не удалось загрузить резервную карту")); document.head.appendChild(script);
  });
  const api=(window as LeafletWindow).L;
  if (!api?.map) throw new Error("Leaflet не загрузился");
  return api;
}
type MapLibreApi = { Map: new (options: Record<string, unknown>) => MapInstance };
type MapLibreWindow = Window & { maplibregl?: MapLibreApi };
const SEMEY: [number, number] = [50.4111, 80.2275];
const MAPLIBRE_VERSION = "5.9.0";
const VECTOR_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const RASTER_STYLE = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
const PALETTES = {
  light: { background: "#F7F9F6", building: "#E5EAE6", park: "#E5F2E9", water: "#DCEFED", road: "#FFFFFF", roadBorder: "#DCE4E0" },
  dark: { background: "#182522", building: "#30413C", park: "#243E34", water: "#244248", road: "#43534E", roadBorder: "#2D3D38" },
};
function styleCleanGo(map: MapInstance, dark: boolean) {
  const c = PALETTES[dark ? "dark" : "light"];
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", c.background);
      if (layer.type === "fill" && /building/.test(id)) map.setPaintProperty(layer.id, "fill-color", c.building);
      if (layer.type === "fill" && /park|grass|wood|landcover|landuse/.test(id)) map.setPaintProperty(layer.id, "fill-color", c.park);
      if (layer.type === "fill" && /water/.test(id)) map.setPaintProperty(layer.id, "fill-color", c.water);
      if (layer.type === "line" && /road|street|highway|transportation/.test(id)) map.setPaintProperty(layer.id, "line-color", /casing|outline/.test(id) ? c.roadBorder : c.road);
    } catch { /* Style may use expressions or omit optional layers. */ }
  }
}
async function loadMapLibre(): Promise<MapLibreApi> {
  const cssId = "cleango-maplibre-css";
  let link = document.getElementById(cssId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
    document.head.appendChild(link);
  }
  if (!link.sheet) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Не удалось загрузить стили карты")), 12000);
      link!.addEventListener("load", () => { clearTimeout(timeout); resolve(); }, { once: true });
      link!.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Стили карты недоступны")); }, { once: true });
      if (link!.sheet) { clearTimeout(timeout); resolve(); }
    });
  }
  const existing = (window as MapLibreWindow).maplibregl;
  if (existing?.Map) return existing;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить MapLibre"));
    document.head.appendChild(script);
  });
  const api = (window as MapLibreWindow).maplibregl;
  if (!api?.Map) throw new Error("MapLibre не загрузился");
  return api;
}

export default function CleanGoMapsPreview() {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapInstance | null>(null);
  const leafletNode = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<LeafletMap | null>(null);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<"vector" | "raster">("vector");
  const [leafletActive, setLeafletActive] = useState(false);
  const darkRef = useRef(false);
  const [dark, setDark] = useState(false);
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
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const appTheme = document.documentElement.getAttribute("data-theme");
      setDark(appTheme === "dark" || (appTheme !== "light" && document.documentElement.classList.contains("dark")));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    media.addEventListener("change", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);

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
    darkRef.current = dark;
    if (map.current && source === "vector" && !leafletActive) {
      map.current.setStyle(VECTOR_STYLE);
    }
  }, [dark, source]);

  useEffect(() => {
    if (!node.current) return;
    let cancelled = false;
    let instance: MapInstance | null = null;
    let fallback = false;
    let verified = false;
    const fallbackToLeaflet = () => {
      if (cancelled || fallback) return;
      fallback = true;
      setSource("raster");
      setLeafletActive(true);
      setReady(false);
      setError("");
      if (instance) {
        const p=instance.getCenter();
        setCenter({lat:p.lat,lng:p.lng});
        instance.remove();
        map.current=null;
        instance=null;
      }
    };
    const timer = window.setTimeout(fallbackToLeaflet, 9000);
    void (async () => {
      try {
        const lib = await loadMapLibre();
        if (cancelled || !node.current) return;
        instance = new lib.Map({
          container: node.current,
          center: [SEMEY[1], SEMEY[0]],
          zoom: 16,
          style: VECTOR_STYLE,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        map.current = instance;
        instance.on("movestart", () => { if (!cancelled) { setMoving(true); setSaved(false); } });
        instance.on("moveend", () => {
          if (cancelled || !instance) return;
          const point = instance.getCenter();
          setCenter({ lat: point.lat, lng: point.lng });
          setAddress("Уточняем адрес...");
          setMoving(false);
        });
        instance.on("style.load", () => {
          if (cancelled || !instance) return;
          if (!fallback) styleCleanGo(instance, darkRef.current);
        });
        instance.on("idle", () => {
          if (cancelled || fallback || !instance) return;
          const layers=(instance.getStyle().layers ?? []).filter(l => l.type==="fill" || l.type==="line" || l.type==="symbol").map(l=>l.id);
          const canvas=instance.getCanvas();
          const middle:[number,number]=[canvas.width/2,canvas.height/2];
          let count=0;
          try { count=instance.queryRenderedFeatures(middle,{layers}).length; } catch { count=0; }
          if (count > 0) {
            verified=true;
            clearTimeout(timer);
            setReady(true);
            setError("");
          }
        });
        instance.on("error", () => {
          if (!cancelled && !verified) fallbackToLeaflet();
        });
        window.setTimeout(() => { if (!cancelled) instance?.resize(); }, 350);
      } catch (e) {
        if (!cancelled) { clearTimeout(timer); fallbackToLeaflet(); }
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); instance?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!leafletActive || !leafletNode.current) return;
    let cancelled=false;
    let instance:LeafletMap|null=null;
    const timeout=window.setTimeout(()=>{if(!cancelled)setError("Не удалось загрузить резервную карту");},14000);
    void (async()=>{
      try {
        const lib=await loadLeaflet();
        if(cancelled||!leafletNode.current)return;
        instance=lib.map(leafletNode.current,{center:[center.lat,center.lng],zoom:16,zoomControl:false,attributionControl:false});
        leafletMap.current=instance;
        instance.on("movestart",()=>{if(!cancelled){setMoving(true);setSaved(false);}});
        instance.on("moveend",()=>{if(!cancelled&&instance){const p=instance.getCenter();setCenter({lat:p.lat,lng:p.lng});setAddress("Уточняем адрес...");setMoving(false);}});
        const tiles=lib.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{subdomains:"abc",maxZoom:19,attribution:"© OpenStreetMap contributors"});
        tiles.on("tileload",()=>{if(!cancelled){clearTimeout(timeout);setReady(true);setError("");}});
        tiles.on("tileerror",()=>{if(!cancelled)setError("Не удалось загрузить тайлы OpenStreetMap");});
        tiles.addTo(instance);
        window.setTimeout(()=>{if(!cancelled)instance?.invalidateSize();},350);
      } catch(e){if(!cancelled){clearTimeout(timeout);setError(e instanceof Error?e.message:"Ошибка резервной карты");}}
    })();
    return()=>{cancelled=true;clearTimeout(timeout);instance?.remove();leafletMap.current=null;};
  // Initialize Leaflet only once after switching to fallback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[leafletActive]);

  function locate() {
    if (!navigator.geolocation) { setError("Геолокация недоступна"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocating(false); if (leafletMap.current) leafletMap.current.flyTo([coords.latitude, coords.longitude],17); else map.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 17, essential: true }); },
      () => { setLocating(false); setError("Разрешите доступ к местоположению в Telegram"); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <main className="relative flex h-[100dvh] min-h-[540px] flex-col overflow-hidden bg-[#F7F9F6] text-[#152535] dark:bg-[#182522] dark:text-white">
      <div ref={node} className={`absolute inset-0 h-full w-full ${leafletActive ? "invisible" : ""}`} style={{ minHeight: "100dvh" }} />
      {leafletActive && <div ref={leafletNode} className="absolute inset-0 z-[1] h-full w-full" />}
      <div className="pointer-events-none absolute inset-0 z-[400] bg-gradient-to-b from-[#f4faf7]/10 via-transparent to-[#dcece7]/10" />
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-4 pt-[max(72px,env(safe-area-inset-top),var(--cleango-telegram-top,0px))]">
        <div className="pointer-events-auto flex items-center gap-3 rounded-[18px] border border-white/80 bg-white/95 dark:border-[#344943] dark:bg-[#253936]/95 p-2 shadow-[0_12px_40px_rgba(18,55,52,.12)] backdrop-blur-xl">
          <Link href="/" aria-label="Назад" className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#f0f7f5]"><ArrowLeft size={20} /></Link>
          <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#27998e]">CleanGo</p><h1 className="truncate text-sm font-bold">Выберите адрес</h1></div>


        </div>
      </header>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
        <div className={`relative flex flex-col items-center transition-transform duration-200 ${moving ? "-translate-y-3 scale-110" : ""}`}>
          <div className="grid h-[23px] w-[23px] place-items-center rounded-full border-[3px] border-white bg-[#17a99b] shadow-[0_10px_25px_rgba(10,120,108,.35)] -rotate-45"><span className="h-[7px] w-[7px] rounded-full border-[2px] border-white bg-[#c8f8ee]" /></div>
        </div>
        <div className={`absolute left-1/2 top-full mt-2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-[#1d544d]/25 blur-[3px] transition-all ${moving ? "scale-75 opacity-40" : ""}`} />
      </div>
      <button type="button" onClick={locate} disabled={locating || !ready} aria-label="Моё местоположение" className="absolute right-4 top-[36%] z-[600] grid h-12 w-12 place-items-center rounded-2xl border border-white bg-white dark:bg-[#253936] text-[#118f83] shadow-lg disabled:opacity-50"><LocateFixed size={22}/></button>
      {!ready && !error && <div className="absolute inset-0 z-[650] grid place-items-center bg-[#eef6f3]/90 text-sm font-semibold">Загружаем CleanGo Maps...</div>}
      {error && <div role="alert" className="absolute left-4 right-4 top-28 z-[700] rounded-2xl bg-white p-4 text-sm text-red-700 shadow-xl">{error}<button className="ml-2 font-bold text-[#128d81]" onClick={() => setError("")}>Закрыть</button></div>}
      <section className="absolute inset-x-0 bottom-0 z-[600] max-h-[78dvh] overflow-y-auto rounded-t-[26px] border border-white/90 bg-white dark:bg-[#253936] px-5 pb-[max(20px,env(safe-area-inset-bottom),var(--cleango-telegram-bottom,0px))] pt-5 shadow-[0_-16px_45px_rgba(30,65,60,.14)]">
        <button type="button" onClick={() => setSheetOpen(!sheetOpen)} aria-label="Свернуть или развернуть карточку" className="mx-auto mb-4 flex h-8 w-full items-center justify-center" ><span className="h-1.5 w-12 rounded-full bg-[#dbe8e4]" /></button>
        {sheetOpen && <>
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e5f8f5] text-[#13998b]"><MapPin size={23}/></div>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#16a394]">Точка уборки</p><h2 className="mt-1 text-base font-bold">{moving ? "Выбираем место..." : "Выбранная точка"}</h2><p className="mt-1 text-xs text-[#72847f]">{address}</p></div>
        </div>
        {details && <div className="mb-4 grid grid-cols-2 gap-3">
          {([["Подъезд", entrance, setEntrance], ["Этаж", floor, setFloor], ["Квартира / офис", apartment, setApartment], ["Домофон", intercom, setIntercom]] as const).map(([label, value, setter]) => <label key={label} className="text-xs font-bold text-[#667b75]">{label}<input value={value} onChange={e => setter(e.target.value)} placeholder="Не указан" className="mt-1.5 h-11 w-full rounded-xl border border-[#e0ebe7] bg-[#f7fbf9] px-3 text-sm text-[#152535] dark:text-white outline-none focus:border-[#16a394]" /></label>)}
          <label className="col-span-2 text-xs font-bold text-[#667b75]">Комментарий для клинера<textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Например, вход со двора" rows={2} className="mt-1.5 w-full resize-none rounded-xl border border-[#e0ebe7] bg-[#f7fbf9] p-3 text-sm text-[#152535] outline-none focus:border-[#16a394]" /></label>
        </div>}
        {saved && <p role="status" className="mb-3 text-sm font-semibold text-[#138b7d]">Адрес сохранён в тестовом просмотре.</p>}
        <button type="button" disabled={!ready || moving} onClick={() => { if (!details) setDetails(true); else setSaved(true); }} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#159f91] text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(21,159,145,.25)] disabled:opacity-50">{details ? <><Check size={19}/> Сохранить адрес</> : <>Уточнить адрес <ChevronRight size={19}/></>}</button>
        <p className="mt-3 text-center text-[11px] text-[#8b9c97]">Предпросмотр · Заказ не создаётся</p>
        </>}
        {!sheetOpen && <button type="button" onClick={() => setSheetOpen(true)} className="w-full truncate pb-2 text-left text-sm font-semibold">{address}</button>}
        <p className="mt-2 text-center text-[10px] text-[#8b9c97]"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap contributors</a></p>
      </section>
    </main>
  );
}
