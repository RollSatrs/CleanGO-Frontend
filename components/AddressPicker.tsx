"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, MapPinned, X } from "lucide-react";

type Coordinates = { latitude: number; longitude: number };
type Feature = { place_name: string; center: [number, number] };
type MapHandle = { getCenter(): {lng:number;lat:number}; flyTo(center: [number,number], zoom?:number): void; invalidateSize(): void; remove(): void; on(event:string,callback:()=>void):void };
type TileLayer = { on(event:string, callback:()=>void): TileLayer; addTo(map:MapHandle):TileLayer };
type LeafletLibrary = { map(node:HTMLElement, options:Record<string,unknown>):MapHandle; tileLayer(url:string, options:Record<string,unknown>):TileLayer };
declare global { interface Window { L?: LeafletLibrary } }

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const SEMEY: [number, number] = [80.2275, 50.4111];
const LEAFLET_VERSION = "1.9.4";
const VECTOR_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAPLIBRE_VERSION = "5.9.0";
type VectorMap = {getCenter(): {lat:number;lng:number}; flyTo(options:Record<string,unknown>):void; resize():void; remove():void; on(event:string,cb:()=>void):void; getStyle():{layers?:Array<{id:string;type:string}>}; setPaintProperty(id:string,name:string,value:string):void};
type VectorApi = {Map:new(options:Record<string,unknown>)=>VectorMap};
type VectorWindow = Window & {maplibregl?:VectorApi};
async function loadVector():Promise<VectorApi>{
  if(!document.getElementById("cg-vector-css")){const l=document.createElement("link");l.id="cg-vector-css";l.rel="stylesheet";l.href=`https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;document.head.appendChild(l);}
  if((window as VectorWindow).maplibregl?.Map)return (window as VectorWindow).maplibregl!;
  await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src=`https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;s.onload=()=>resolve();s.onerror=()=>reject(new Error("Векторная карта недоступна"));document.head.appendChild(s);});
  const lib=(window as VectorWindow).maplibregl;if(!lib?.Map)throw new Error("Карта не загрузилась");return lib;
}
function themeVector(map:VectorMap){
 const colors={background:"#F7F9F6",building:"#E5EAE6",park:"#E5F2E9",water:"#DCEFED",road:"#FFFFFF",edge:"#DCE4E0"};
 for(const layer of map.getStyle().layers??[]){const id=layer.id.toLowerCase();try{
 if(layer.type==="background")map.setPaintProperty(layer.id,"background-color",colors.background);
 if(layer.type==="fill"&&/building/.test(id))map.setPaintProperty(layer.id,"fill-color",colors.building);
 if(layer.type==="fill"&&/park|grass|wood|landcover|landuse/.test(id))map.setPaintProperty(layer.id,"fill-color",colors.park);
 if(layer.type==="fill"&&/water/.test(id))map.setPaintProperty(layer.id,"fill-color",colors.water);
 if(layer.type==="line"&&/road|street|highway|transportation/.test(id))map.setPaintProperty(layer.id,"line-color",/casing|outline/.test(id)?colors.edge:colors.road);
 }catch{}}
}

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
  const [mapMoving, setMapMoving] = useState(false);
  const [pickedAddress, setPickedAddress] = useState("Переместите карту для выбора адреса");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [point, setPoint] = useState<[number, number]>(SEMEY);
  const [locationBusy, setLocationBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<MapHandle | null>(null);
  const vectorRef = useRef<VectorMap | null>(null);
  const [vectorActive,setVectorActive] = useState(false);
  const [detailsOpen,setDetailsOpen] = useState(false);
  const [sheetOpen,setSheetOpen] = useState(true);
  const [entrance,setEntrance]=useState("");
  const [floor,setFloor]=useState("");
  const [apartment,setApartment]=useState("");
  const [intercom,setIntercom]=useState("");
  const [comment,setComment]=useState("");
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
    if (!mapOpen || !mapNode || vectorActive) return;
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
        map.on("movestart", () => { if (!disposed) setMapMoving(true); });
        map.on("moveend", () => {
          if (disposed || !map) return;
          setMapMoving(false);
          const center = map.getCenter();
          setPoint([center.lng, center.lat]);
          setPickedAddress("Уточняем адрес...");
        });
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

  useEffect(()=>{
    if(!mapOpen||!mapNode)return;
    let cancelled=false;let instance:VectorMap|null=null;let verified=false;
    const timeout=window.setTimeout(()=>{if(!cancelled&&!verified)setVectorActive(false);},9000);
    void (async()=>{try{
      const lib=await loadVector();if(cancelled||!mapNode)return;
      instance=new lib.Map({container:mapNode,center:point,zoom:16,style:VECTOR_STYLE,attributionControl:false,dragRotate:false,pitchWithRotate:false,touchPitch:false});
      vectorRef.current=instance;
      instance.on("style.load",()=>{if(instance&&!cancelled)themeVector(instance);});
      instance.on("movestart",()=>{if(!cancelled)setMapMoving(true);});
      instance.on("moveend",()=>{if(cancelled||!instance)return;const c=instance.getCenter();setPoint([c.lng,c.lat]);setPickedAddress("Уточняем адрес...");setMapMoving(false);});
      instance.on("idle",()=>{if(cancelled||!instance)return;const layers=(instance.getStyle().layers??[]).filter(l=>["fill","line","symbol"].includes(l.type)).map(l=>l.id);if(layers.length){verified=true;clearTimeout(timeout);setVectorActive(true);setMapReady(true);setMapError("");}});
      instance.on("error",()=>{if(!verified&&!cancelled)setVectorActive(false);});
      window.setTimeout(()=>{if(!cancelled)instance?.resize();},350);
    }catch{if(!cancelled)setVectorActive(false);}})();
    return()=>{cancelled=true;clearTimeout(timeout);instance?.remove();vectorRef.current=null;};
  // Initialize once on opening.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mapOpen]);

  useEffect(()=>{
    if(!mapOpen)return;let cancelled=false;
    const timer=window.setTimeout(async()=>{try{
      const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ru&lat=${point[1]}&lon=${point[0]}`;
      const response=await fetch(url);if(!response.ok)throw new Error("Geocode failed");
      const result:{address?:Record<string,string>;display_name?:string}=await response.json();if(cancelled)return;
      const a=result.address??{};const road=a.road||a.pedestrian||a.residential;const city=a.city||a.town||a.village||"Семей";
      setPickedAddress(road?`${city}, ${road}${a.house_number?", "+a.house_number:""}`:(result.display_name?.split(",").slice(0,3).join(",")||"Адрес не определён"));
    }catch{if(!cancelled)setPickedAddress("Адрес не определён — уточните точку");}},700);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[mapOpen,point]);

  async function runDiagnostics() {
    setDiagnosing(true);
    const lines = ["Диагностика CG-LEAFLET-01", "Leaflet: " + (window.L ? "загружен" : "не загружен"), "Первый тайл: " + (mapReady ? "загружен" : "ожидается"), "Ключ геокодирования: " + (KEY ? "есть" : "нет")];
    setDiagnostics(lines);
    setDiagnosing(false);
  }
  function locateOnMap() {
    if (!mapReady || (!mapRef.current && !vectorRef.current) || !navigator.geolocation) return;
    setMapLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({coords}) => {
        setMapLocating(false);
        if (coords.accuracy > 500) { setMapError("Местоположение определено недостаточно точно."); return; }
        if(vectorActive)vectorRef.current?.flyTo({center:[coords.longitude,coords.latitude],zoom:16});else mapRef.current?.flyTo([coords.latitude,coords.longitude],16);
      },
      () => {setMapLocating(false);setMapError("Разрешите геолокацию в настройках Telegram.");},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  }

  async function confirmMap() {
    if (!mapReady || (!mapRef.current && !vectorRef.current)) return;
    setMapBusy(true);
    setMapError("");
    try {
      const center = vectorActive ? vectorRef.current!.getCenter() : mapRef.current!.getCenter();
      const longitude = center.lng;
      const latitude = center.lat;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ru&lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error("Reverse lookup failed");
      const data: {address?:Record<string,string>;display_name?:string} = await response.json();
      const a=data.address??{};const road=a.road||a.pedestrian||a.residential;const city=a.city||a.town||a.village||"Семей";
      choose(road?`${city}, ${road}${a.house_number?", "+a.house_number:""}`:(data.display_name?.split(",").slice(0,3).join(",")||"Выбранная точка"), { latitude, longitude });
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
        <button type="button" onClick={() => { setMapError(""); setMapOpen(true); }}
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
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#F7F9F6]">
          <header className="pointer-events-none absolute inset-x-4 top-[max(72px,env(safe-area-inset-top))] z-[600] flex items-center justify-between rounded-[20px] bg-white/95 px-4 py-3 shadow-xl backdrop-blur-lg pointer-events-auto">
            <div><p className="text-[11px] font-bold tracking-widest text-[#159f91]">CLEANGO</p><h2 className="text-base font-bold text-[#152535]">Выберите адрес</h2></div>
            <button type="button" aria-label="Закрыть" onClick={() => setMapOpen(false)} className="rounded-full bg-slate-100 p-2"><X className="h-5 w-5" /></button>
          </header>
          <div className="relative min-h-0 flex-1 bg-[#F7F9F6]">
            <div ref={setMapNode} className="absolute inset-0 h-full w-full" />
            {!mapReady && !mapError && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-100/90 text-sm font-semibold text-slate-600">Загружаем карту...</div>}
            {mapError && <div role="alert" className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-red-700">{mapError}</div>}
            {mapReady && !mapError && <button type="button" onClick={locateOnMap} disabled={mapLocating} aria-label="Моё местоположение" className="absolute bottom-5 right-4 z-10 rounded-2xl bg-white p-3 text-teal-700 shadow-lg"><LocateFixed className="h-5 w-5" /></button>}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-[4px] border-white bg-[#159f91] shadow-[0_8px_22px_rgba(10,120,108,.3)] transition-transform duration-200 ${mapMoving ? "-translate-y-2 scale-110" : ""}`}><div className="h-2 w-2 rounded-full border-2 border-white bg-teal-100" /></div>
            </div>
          </div>
          <footer className="absolute inset-x-0 bottom-0 z-[500] max-h-[75dvh] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_38px_rgba(20,70,60,.12)]"><button type="button" onClick={()=>setSheetOpen(!sheetOpen)} className="mb-4 flex h-6 w-full items-center justify-center" aria-label="Свернуть или раскрыть карточку"><span className="h-1.5 w-12 rounded-full bg-[#dbe8e4]"/></button>{sheetOpen && <div className="space-y-3">
            <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e5f8f5] text-[#159f91]"><MapPin size={23}/></div><div className="min-w-0"><p className="text-xs font-bold text-[#159f91]">Точка уборки</p><h3 className="text-base font-bold text-[#152535]">Выбранный адрес</h3><p className="text-xs text-[#72847f]">{mapMoving ? "Уточняем адрес..." : pickedAddress}</p></div></div>
            {detailsOpen && <div className="grid grid-cols-2 gap-3">{([["Подъезд",entrance,setEntrance],["Этаж",floor,setFloor],["Квартира / офис",apartment,setApartment],["Домофон",intercom,setIntercom]] as const).map(([label,value,setter])=><label key={label} className="text-xs font-semibold text-[#667b75]">{label}<input value={value} onChange={e=>setter(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#e0ebe7] bg-[#f7fbf9] px-3 text-sm text-[#152535]"/></label>)}<label className="col-span-2 text-xs font-semibold text-[#667b75]">Комментарий для клинера<textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Например, вход со двора" className="mt-1 w-full rounded-xl border border-[#e0ebe7] bg-[#f7fbf9] p-3 text-sm text-[#152535]"/></label></div>}
            <button type="button" disabled={mapBusy || mapMoving || !mapReady || Boolean(mapError)} onClick={() => {if(!detailsOpen)setDetailsOpen(true);else void confirmMap();}}
              className="h-12 w-full rounded-2xl bg-teal-600 font-semibold text-white disabled:opacity-50">
              {mapBusy ? "Сохраняем..." : mapReady ? (detailsOpen ? "Сохранить адрес" : "Уточнить адрес") : "Ожидаем загрузку карты"}
            </button>
          </div>}{!sheetOpen && <button type="button" onClick={()=>setSheetOpen(true)} className="w-full truncate text-left text-sm font-semibold text-[#152535]">{pickedAddress}</button>}<p className="mt-3 text-center text-[10px] text-[#8b9c97]"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap contributors</a></p></footer>
        </div>
      )}
    </div>
  );
}
