"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type MapObject = {
  on(event: string, callback: (event?: { error?: { message?: string } }) => void): void;
  remove(): void;
  getStyle(): { layers?: Array<{ id: string; type: string }> };
  setPaintProperty(id: string, property: string, value: string): void;
  queryRenderedFeatures(point?: [number, number]): unknown[];
  getCanvas(): HTMLCanvasElement;
  resize(): void;
  areTilesLoaded(): boolean;
  isSourceLoaded(id: string): boolean;
  getZoom(): number;
  addSource(id: string, source: Record<string, unknown>): void;
  addLayer(layer: Record<string, unknown>): void;
  triggerRepaint(): void;
};
type MapLib = { Map: new (options: Record<string, unknown>) => MapObject };
type WindowWithMap = Window & { maplibregl?: MapLib };
const CDN = "https://unpkg.com/maplibre-gl@5.9.0/dist/";
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

function applyPalette(map: MapObject, dark: boolean) {
  const palette = dark
    ? { background: "#192522", building: "#30423C", park: "#284438", water: "#25464B", road: "#53645E", outline: "#34443F" }
    : { background: "#F7F9F6", building: "#E4EAE5", park: "#E7F2E9", water: "#DCEEEB", road: "#FFFFFF", outline: "#DDE6E1" };
  let changed = 0;
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    let property = "";
    let value = "";
    if (layer.type === "background") { property = "background-color"; value = palette.background; }
    else if (layer.type === "fill" && /building/.test(id)) { property = "fill-color"; value = palette.building; }
    else if (layer.type === "fill" && /park|grass|wood|landcover|landuse/.test(id)) { property = "fill-color"; value = palette.park; }
    else if (layer.type === "fill" && /water/.test(id)) { property = "fill-color"; value = palette.water; }
    else if (layer.type === "line" && /road|street|highway|transportation/.test(id)) { property = "line-color"; value = /casing|outline/.test(id) ? palette.outline : palette.road; }
    if (property) { try { map.setPaintProperty(layer.id, property, value); changed++; } catch { /* Layer may not support the selected paint property */ } }
  }
  return changed;
}
async function loadMapLibre() {
  // MapLibre JS can load before its stylesheet. Without CSS its canvas remains
  // at the default 300px height and the map is visually blank on mobile.
  const cssId = "cleango-maplibre-lab-css";
  let link = document.getElementById(cssId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = CDN + "maplibre-gl.css";
    document.head.appendChild(link);
  }
  if (!link.sheet) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Таймаут CSS MapLibre")), 10000);
      link!.addEventListener("load", () => { window.clearTimeout(timer); resolve(); }, { once: true });
      link!.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("CSS MapLibre недоступен")); }, { once: true });
      if (link!.sheet) { window.clearTimeout(timer); resolve(); }
    });
  }
  const existing = (window as WindowWithMap).maplibregl;
  if (existing?.Map) return existing;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CDN + "maplibre-gl.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не загрузилась библиотека MapLibre"));
    document.head.appendChild(script);
  });
  const lib = (window as WindowWithMap).maplibregl;
  if (!lib?.Map) throw new Error("MapLibre недоступен");
  return lib;
}
export default function CleanGoVectorLab() {
  const node = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [originalStyle, setOriginalStyle] = useState(true);
  const [renderInfo, setRenderInfo] = useState("Проверка WebGL ожидается");
  const [canvasInfo, setCanvasInfo] = useState("Canvas ожидается");
  const [testLayer, setTestLayer] = useState("Тестовый слой ожидается");
  const [contextStatus, setContextStatus] = useState("Контекст не проверен");
  const [phase, setPhase] = useState("Подготовка карты");
  const [featureCount, setFeatureCount] = useState(0);
  const [styledLayers, setStyledLayers] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [tileStatus, setTileStatus] = useState("Ожидаем данные");
  const [sources, setSources] = useState("");
  useEffect(() => {
    if (!node.current) return;
    let stopped = false;
    let instance: MapObject | null = null;
    const timeout = window.setTimeout(() => {
      if (!stopped) setPhase("Таймаут: векторные объекты не подтверждены");
    }, 12000);
    setPhase("Загрузка векторного стиля");
    setFeatureCount(0);
    setErrors([]);
    setTileStatus("Ожидаем данные");
    setSources("");
    setCanvasInfo("Canvas ожидается");
    setTestLayer("Тестовый слой ожидается");
    setContextStatus("Контекст активен (потеря не обнаружена)");
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    setRenderInfo(gl ? `WebGL доступен · ${gl.getParameter(gl.VERSION)}` : "WebGL недоступен");
    void (async () => {
      try {
        const lib = await loadMapLibre();
        if (stopped || !node.current) return;
        instance = new lib.Map({
          container: node.current, style: STYLE,
          center: [80.2145, 50.3923], zoom: 16,
          attributionControl: false, dragRotate: false,
          pitchWithRotate: false, touchPitch: false,
        });
        const canvas = instance.getCanvas();
        const onLost = (event: Event) => { event.preventDefault(); if (!stopped) setContextStatus("WebGL-контекст потерян"); };
        const onRestored = () => { if (!stopped) setContextStatus("WebGL-контекст восстановлен"); };
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);
        const measure = () => {
          if (stopped || !instance) return;
          const c = instance.getCanvas();
          const rect = c.getBoundingClientRect();
          const style = getComputedStyle(c);
          setCanvasInfo(`Canvas: ${c.width}×${c.height} · CSS ${Math.round(rect.width)}×${Math.round(rect.height)} · display ${style.display} · opacity ${style.opacity}`);
        };
        instance.on("style.load", () => {
          if (stopped || !instance) return;
          setStyledLayers(originalStyle ? 0 : applyPalette(instance, theme === "dark"));
          setSources(Object.keys((instance.getStyle() as {sources?:Record<string,unknown>}).sources ?? {}).join(", ") || "нет");
          setPhase("Стиль загружен, проверяем геометрию");
          try {
            instance.addSource("cleango-render-probe", { type: "geojson", data: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [80.2145, 50.3923] }, properties: {} }] } });
            instance.addLayer({ id: "cleango-render-probe-circle", type: "circle", source: "cleango-render-probe", paint: { "circle-radius": 35, "circle-color": "#ff00cc", "circle-stroke-color": "#000000", "circle-stroke-width": 5 } });
            setTestLayer("Тестовый слой добавлен: должен быть розовый круг в центре");
            instance.triggerRepaint();
          } catch (error) { setTestLayer(`Ошибка тестового слоя: ${error instanceof Error ? error.message : String(error)}`); }
          measure();
        });
        instance.on("idle", () => {
          if (stopped || !instance) return;
          let count = 0;
          try {
            count = instance.queryRenderedFeatures().length;
            setTileStatus(instance.areTilesLoaded() ? "Тайлы загружены" : "Тайлы ещё загружаются");
          } catch { /* Report zero rendered features */ }
          setFeatureCount(count);
          measure();
          if (count > 0) {
            window.clearTimeout(timeout);
            setPhase("Векторные объекты обнаружены");
          } else if (instance.areTilesLoaded()) {
            setPhase("Тайлы загружены, но видимых объектов нет");
          }
        });
        instance.on("sourcedata", () => {
          if (stopped || !instance) return;
          setTileStatus(instance.areTilesLoaded() ? "Тайлы загружены" : "Ожидаем тайлы");
        });
        instance.on("error", (event) => {
          if (stopped) return;
          const message = event?.error?.message || "Ошибка загрузки ресурса карты";
          setErrors(prev => [...prev.slice(-2), message]);
        });
        window.setTimeout(() => { if (!stopped) { instance?.resize(); measure(); } }, 400);
        window.setTimeout(() => { if (!stopped) { instance?.resize(); instance?.triggerRepaint(); measure(); } }, 1800);
      } catch (error) {
        if (!stopped) setPhase(error instanceof Error ? error.message : "Ошибка инициализации");
      }
    })();
    return () => { stopped = true; window.clearTimeout(timeout); instance?.remove(); };
  }, [theme, originalStyle, attempt]);
  const dark = theme === "dark";
  return (
    <main className={`relative h-[100dvh] min-h-[500px] overflow-hidden ${dark ? "bg-[#192522] text-white" : "bg-[#F7F9F6] text-[#152535]"}`}>
      <style>{`.cleango-vector-lab-map .maplibregl-map, .cleango-vector-lab-map .maplibregl-canvas-container { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; } .cleango-vector-lab-map canvas.maplibregl-canvas { position:absolute!important; left:0!important; top:0!important; width:100%!important; height:100%!important; }`}</style>
      <div ref={node} className="cleango-vector-lab-map absolute inset-0" />
      <header className="absolute left-4 right-4 top-5 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white/95 p-3 text-[#152535] shadow-lg">
        <div><div className="text-[10px] font-bold tracking-widest text-[#159F91]">CLEANGO MAPS 0.4 · LAB</div><h1 className="text-sm font-bold">Собственный стиль карты</h1></div>
        <button type="button" className="rounded-xl bg-[#E5F8F5] px-3 py-2 text-xs font-bold text-[#117D73]" onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? "Светлая" : "Тёмная"}</button>
      </header>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="h-5 w-5 rounded-full border-[4px] border-white bg-[#159F91] shadow-[0_5px_18px_rgba(15,120,110,.35)]" />
      </div>
      <section className="absolute bottom-4 left-4 right-4 z-10 rounded-[22px] bg-white/95 p-4 text-[#152535] shadow-xl">
        <div className="mb-1 text-xs font-bold text-[#159F91]">Диагностика векторной карты</div>
        <div className="text-sm font-semibold">{phase}</div>
        <div className="mt-1 text-xs text-[#63766F]">Видимые объекты: {featureCount} · Стилизованные слои: {styledLayers}</div>
        <p className="mt-1 break-words text-[11px] text-[#63766F]">Источник: {sources || "ожидание"} · {tileStatus}</p>
        <p className="mt-1 break-words text-[11px] text-[#63766F]">{renderInfo}</p>
        <p className="mt-1 break-words text-[11px] text-[#63766F]">{canvasInfo}</p>
        <p className="mt-1 break-words text-[11px] text-[#63766F]">{contextStatus}</p>
        <p className="mt-1 break-words text-[11px] text-[#63766F]">{testLayer}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setOriginalStyle(true)} className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold ${originalStyle ? "bg-[#159F91] text-white" : "bg-[#E5F8F5] text-[#117D73]"}`}>Исходный стиль</button>
          <button type="button" onClick={() => setOriginalStyle(false)} className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold ${!originalStyle ? "bg-[#159F91] text-white" : "bg-[#E5F8F5] text-[#117D73]"}`}>Стиль CleanGo</button>
        </div>
        {errors.length > 0 && <p className="mt-2 break-words text-xs text-red-700">{errors[errors.length - 1]}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setAttempt(n => n + 1)} className="flex-1 rounded-xl bg-[#159F91] px-3 py-3 text-sm font-bold text-white">Повторить проверку</button>
          <Link href="/dev/cleango-maps" className="flex-1 rounded-xl bg-[#E5F8F5] px-3 py-3 text-center text-sm font-bold text-[#117D73]">Рабочая карта</Link>
        </div>
        <p className="mt-2 text-center text-[10px] text-[#80918B]">Экспериментальная страница · Основная карта не изменена · © OpenStreetMap contributors</p>
      </section>
    </main>
  );
}
