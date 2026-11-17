"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, MapPinned, X } from "lucide-react";

type Coordinates = { latitude: number; longitude: number };
type Feature = { place_name: string; center: [number, number] };
type MapHandle = { getCenter(): {lng:number;lat:number}; flyTo(center: [number,number], zoom?:number): void; invalidateSize(): void; remove(): void };
type TileLayer = { on(event:string, callback:()=>void): TileLayer; addTo(map:MapHandle):TileLayer };
type LeafletLibrary = { map(node:HTMLElement, options:Record<string,unknown>):MapHandle; tileLayer(url:string, options:Record<string,unknown>):TileLayer };
declare global { interface Window { L?: LeafletLibrary } }

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const SEMEY: [number, number] = [80.2275, 50.4111];
const LEAFLET_VERSION = "1.9.4";

export default function AddressPicker({ address, onChange }: {
  address: string;
  onChange: (address: string, coordinates: Coordinates | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapBusy, setMapBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLocating, setMapLocating] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [point, setPoint] = useState<[number, number]>(SEMEY);
  const [locationBusy, setLocationBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<MapHandle | null>(null);
  const searchVersion = useRef(0);

  useEffect(() => {
    if (!KEY || !focused || selected || address.trim().length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const version = ++searchVersion.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(address.trim())}.json?key=${encodeURIComponent(KEY)}&language=ru&country=kz&limit=6&proximity=80.2275,50.4111`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        const data: { features?: Feature[] } = await response.json();
        if (version === searchVersion.current) setResults(data.features ?? []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [address, focused, selected]);

  function choose(name: string, next: Coordinates) {
    searchVersion.current++;
    setCoordinates(next);
    setSelected(true);
    setFocused(false);
    setResults([]);
    setMessage("");
    setPoint([next.longitude, next.latitude]);
    onChange(name, next);
  }

  function locate() {
    setMessage("");
    if (!navigator.geolocation) { setMessage("Геолокация недоступна."); return; }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLocationBusy(false);
        if (coords.accuracy > 500) {
          setMessage("Местоположение определено недостаточно точно.");
          return;
        }
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        try {
          const response = await fetch(`https://api.maptiler.com/geocoding/${next.longitude},${next.latitude}.json?key=${encodeURIComponent(KEY ?? "")}&language=ru`);
          if (!response.ok) throw new Error("Reverse lookup failed");
          const data: { features?: Feature[] } = await response.json();
          choose(data.features?.[0]?.place_name ?? `Точка: ${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`, next);
        } catch {
          setMessage("Не удалось получить адрес. Выберите точку на карте.");
        }
      },
      () => { setLocationBusy(false); setMessage("Разрешите доступ к геолокации в Telegram."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    if (!mapOpen || !mapNode) return;
    let disposed = false;
    let map: MapHandle | null = null;
    setMapReady(false);
    setMapError("");
    const timeout = window.setTimeout(() => { if (!disposed) setMapError("Карта не загрузилась. Проверьте соединение."); }, 15000);
    const load = async () => {
      try {
        if (!document.getElementById("cleango-leaflet-css")) {
          const link = document.createElement("link");
          link.id = "cleango-leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@" + LEAFLET_VERSION + "/dist/leaflet.css";
          document.head.appendChild(link);
        }
        if (!window.L) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById("cleango-leaflet-script") as HTMLScriptElement | null;
            if (existing) {
              if (window.L) { resolve(); return; }
              existing.addEventListener("load", () => resolve(), {once:true});
              existing.addEventListener("error", () => reject(new Error("Leaflet CDN недоступен")), {once:true});
              return;
            }
            const script = document.createElement("script");
            script.id = "cleango-leaflet-script";
            script.src = "https://unpkg.com/leaflet@" + LEAFLET_VERSION + "/dist/leaflet.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Leaflet CDN недоступен"));
            document.head.appendChild(script);
          });
        }
        if (disposed || !window.L) return;
        const leaflet = window.L;
        map = leaflet.map(mapNode, {center:[point[1],point[0]], zoom:15, zoomControl:true, attributionControl:true});
        mapRef.current = map;
        const tiles = leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          subdomains:"abc", maxZoom:19, attribution:"© OpenStreetMap contributors"
        });
        tiles.on("tileload", () => {
          if (disposed) return;
          window.clearTimeout(timeout);
          setMapReady(true);
          setMapError("");
        });
        tiles.on("tileerror", () => {
          if (!disposed) setMapError("Не удалось загрузить изображения карты.");
        });
        tiles.addTo(map);
        window.setTimeout(() => { if (!disposed) map?.invalidateSize(); }, 250);
      } catch(error) {
        window.clearTimeout(timeout);
        if (!disposed) setMapError(error instanceof Error ? error.message : "Ошибка карты");
      }
    };
    void load();
    return () => { disposed = true; window.clearTimeout(timeout); map?.remove(); mapRef.current = null; };
    // The initial coordinates are captured when opening the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapOpen,mapNode]);

  async function runDiagnostics() {
    setDiagnosing(true);
    const lines = ["Диагностика CG-LEAFLET-01", "Leaflet: " + (window.L ? "загружен" : "не загружен"), "Первый тайл: " + (mapReady ? "загружен" : "ожидается"), "Ключ геокодирования: " + (KEY ? "есть" : "нет")];
    setDiagnostics(lines);
    setDiagnosing(false);
  }
  function locateOnMap() {
    if (!mapReady || !mapRef.current || !navigator.geolocation) return;
    setMapLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({coords}) => {
        setMapLocating(false);
        if (coords.accuracy > 500) { setMapError("Местоположение определено недостаточно точно."); return; }
        mapRef.current?.flyTo([coords.latitude,coords.longitude],16);
      },
      () => {setMapLocating(false);setMapError("Разрешите геолокацию в настройках Telegram.");},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  }

  async function confirmMap() {
    if (!KEY || !mapReady || !mapRef.current) return;
    setMapBusy(true);
    setMapError("");
    try {
      const center = mapRef.current.getCenter();
      const longitude = center.lng;
      const latitude = center.lat;
      const response = await fetch(`https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${encodeURIComponent(KEY)}&language=ru`);
      if (!response.ok) throw new Error("Reverse lookup failed");
      const data: { features?: Feature[] } = await response.json();
      choose(data.features?.[0]?.place_name ?? `Точка: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, { latitude, longitude });
      setMapOpen(false);
    } catch {
      setMapError("Не удалось получить адрес выбранной точки. Повторите попытку.");
    } finally {
      setMapBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="cleango-address" className="block text-sm font-semibold text-slate-800">Адрес уборки</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-teal-600" />
        <input id="cleango-address" value={address} autoComplete="off" required
          placeholder="Улица, дом или название места"
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            setSelected(false); setCoordinates(null); setResults([]);
            onChange(event.target.value, null);
          }}
          className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        {focused && (results.length > 0 || loading) && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl">
            {loading && <p className="px-3 py-2 text-sm text-slate-500">Ищем адрес...</p>}
            {results.map((place, index) => (
              <button key={index} type="button"
                onClick={() => choose(place.place_name, { latitude: place.center[1], longitude: place.center[0] })}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-800 hover:bg-teal-50">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span className="min-w-0 break-words">{place.place_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!KEY} onClick={() => { setMapError(""); setMapOpen(true); }}
          className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-2 py-2 text-sm font-semibold text-teal-800 disabled:opacity-50">
          <MapPinned className="h-4 w-4 shrink-0" /> На карте
        </button>
        <button type="button" disabled={locationBusy || !KEY} onClick={locate}
          className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-semibold text-slate-700 disabled:opacity-50">
          <LocateFixed className="h-4 w-4 shrink-0" /> {locationBusy ? "Определяем..." : "Моя геолокация"}
        </button>
      </div>
      {coordinates && selected && (
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-teal-700"><Check className="h-4 w-4" /> Адрес и точка выбраны</p>
      )}
      {message && <p role="status" className="text-sm text-amber-700">{message}</p>}
      {!KEY && <p className="text-sm text-red-700">Не настроен NEXT_PUBLIC_MAPTILER_KEY.</p>}
      {mapOpen && (
        <div role="dialog" aria-modal="true" aria-label="Выбор точки уборки"
          className="fixed inset-0 z-[100] flex flex-col bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-lg font-bold text-slate-900">Точка уборки</h2><p className="text-xs text-slate-500">Передвиньте карту под маркером</p></div>
            <button type="button" aria-label="Закрыть" onClick={() => setMapOpen(false)} className="rounded-full bg-slate-100 p-2"><X className="h-5 w-5" /></button>
          </header>
          <div className="relative min-h-0 flex-1 bg-slate-100">
            <div ref={setMapNode} className="absolute inset-0" />
            {!mapReady && !mapError && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-100/90 text-sm font-semibold text-slate-600">Загружаем карту...</div>}
            {mapError && <div role="alert" className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-red-700">{mapError}</div>}
            {mapReady && !mapError && <button type="button" onClick={locateOnMap} disabled={mapLocating} aria-label="Моё местоположение" className="absolute bottom-5 right-4 z-10 rounded-2xl bg-white p-3 text-teal-700 shadow-lg"><LocateFixed className="h-5 w-5" /></button>}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
              <MapPin className="h-11 w-11 fill-teal-600 text-white drop-shadow-xl" />
            </div>
          </div>
          <footer className="space-y-2 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => void runDiagnostics()} disabled={diagnosing} className="w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">{diagnosing ? "Проверяем..." : "Проверить карту"}</button>
            {diagnostics.length > 0 && <div role="status" className="max-h-40 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-xs leading-5 text-white">{diagnostics.map((line, index) => <div key={index}>{line}</div>)}</div>}
            {mapError && <p role="alert" className="text-sm text-red-700">{mapError}</p>}
            <button type="button" disabled={mapBusy || !mapReady || Boolean(mapError)} onClick={() => void confirmMap()}
              className="h-12 w-full rounded-2xl bg-teal-600 font-semibold text-white disabled:opacity-50">
              {mapBusy ? "Определяем адрес..." : mapReady ? "Подтвердить точку" : "Ожидаем загрузку карты"}
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
