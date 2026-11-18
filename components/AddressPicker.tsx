"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, MapPinned, ChevronUp, ChevronDown } from "lucide-react";

type Coordinates = { latitude: number; longitude: number };
type Feature = { place_name: string; center: [number, number] };
type MapHandle = { getCenter(): {lng:number;lat:number}; flyTo(options: {center:[number,number];zoom?:number;essential?:boolean}): void; resize(): void; remove(): void; on(event:string,callback:()=>void):void; getStyle(): {layers?:Array<{id:string;type:string}>}; setPaintProperty(id:string,property:string,value:string):void; queryRenderedFeatures():unknown[] };
type MapLibreLibrary = { Map: new(options:Record<string,unknown>)=>MapHandle };
declare global { interface Window { maplibregl?: MapLibreLibrary } }

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const SEMEY: [number, number] = [80.2275, 50.4111];
const MAPLIBRE_CDN = "https://unpkg.com/maplibre-gl@5.9.0/dist/";
const VECTOR_STYLE = "https://tiles.openfreemap.org/styles/liberty";
async function loadMapLibre(): Promise<MapLibreLibrary> {
  let css = document.getElementById("cleango-maplibre-css") as HTMLLinkElement | null;
  if (!css) {
    css = document.createElement("link");
    css.id = "cleango-maplibre-css"; css.rel = "stylesheet";
    css.href = MAPLIBRE_CDN + "maplibre-gl.css";
    document.head.appendChild(css);
  }
  if (!css.sheet) await new Promise<void>((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new Error("Не загрузились стили карты")),12000);
    css!.addEventListener("load",()=>{clearTimeout(timer);resolve();},{once:true});
    css!.addEventListener("error",()=>{clearTimeout(timer);reject(new Error("Стили карты недоступны"));},{once:true});
    if(css!.sheet){clearTimeout(timer);resolve();}
  });
  if(window.maplibregl?.Map) return window.maplibregl;
  await new Promise<void>((resolve,reject)=>{
    const existing=document.getElementById("cleango-maplibre-script") as HTMLScriptElement|null;
    if(existing){
      existing.addEventListener("load",()=>resolve(),{once:true});
      existing.addEventListener("error",()=>reject(new Error("MapLibre недоступен")),{once:true});
      return;
    }
    const script=document.createElement("script");script.id="cleango-maplibre-script";
    script.src=MAPLIBRE_CDN+"maplibre-gl.js";
    script.onload=()=>resolve();script.onerror=()=>reject(new Error("MapLibre недоступен"));
    document.head.appendChild(script);
  });
  if(!window.maplibregl?.Map)throw new Error("MapLibre не загрузился");
  return window.maplibregl;
}
function applyCleanGoLightStyle(map:MapHandle){
  const palette={background:"#F7F9F6",building:"#E5EAE6",park:"#E5F2E9",water:"#DCEFED",road:"#FFFFFF",roadBorder:"#DCE4E0"};
  for(const layer of map.getStyle().layers??[]){
    const id=layer.id.toLowerCase();
    try{
      if(layer.type==="background")map.setPaintProperty(layer.id,"background-color",palette.background);
      if(layer.type==="fill"&&/building/.test(id))map.setPaintProperty(layer.id,"fill-color",palette.building);
      if(layer.type==="fill"&&/park|grass|wood|landcover|landuse/.test(id))map.setPaintProperty(layer.id,"fill-color",palette.park);
      if(layer.type==="fill"&&/water/.test(id))map.setPaintProperty(layer.id,"fill-color",palette.water);
      if(layer.type==="line"&&/road|street|highway|transportation/.test(id))map.setPaintProperty(layer.id,"line-color",/casing|outline/.test(id)?palette.roadBorder:palette.road);
    }catch{/* Optional vector layer */}
  }
}
export default function AddressPicker({ address, onChange, immersive = false }: {
  address: string;
  immersive?: boolean;
  onChange: (address: string, coordinates: Coordinates | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapOpen, setMapOpen] = useState(immersive);
  const [mapError, setMapError] = useState("");
  const [mapBusy, setMapBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLocating, setMapLocating] = useState(false);
  const [mapMoving, setMapMoving] = useState(false);
  const [pickedAddress, setPickedAddress] = useState("Переместите карту для выбора адреса");
  const [point, setPoint] = useState<[number, number]>(SEMEY);
  const [locationBusy, setLocationBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<MapHandle | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
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
    if (!navigator.geolocation) { setMessage("Устройство не поддерживает геолокацию. Выберите адрес на карте."); return; }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setLocationBusy(false);
        if (coords.accuracy > 500) {
          setMessage("GPS определил приблизительное местоположение. Уточните точку на карте.");
        }
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        try {
          const response = await fetch(`https://api.maptiler.com/geocoding/${next.longitude},${next.latitude}.json?key=${encodeURIComponent(KEY ?? "")}&language=ru`);
          if (!response.ok) throw new Error("Reverse lookup failed");
          const data: { features?: Feature[] } = await response.json();
          choose(data.features?.[0]?.place_name ?? `Точка: ${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`, next);
        } catch {
          choose(`Точка: ${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`, next);
          setMessage("Точка определена. Уточните адрес на карте, если нужно.");
        }
      },
      (error) => { setLocationBusy(false); setMessage(error.code === 1 ? "Доступ к геолокации запрещён. Разрешите его для Telegram в настройках телефона или выберите точку на карте." : error.code === 3 ? "GPS не ответил вовремя. Попробуйте ещё раз или выберите адрес на карте." : "Не удалось определить местоположение. Выберите точку на карте."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    if (!mapOpen || !mapNode) return;
    let disposed=false;
    let map:MapHandle|null=null;
    setMapReady(false);setMapError("");
    const timeout=window.setTimeout(()=>{if(!disposed)setMapError("Карта не загрузилась. Проверьте соединение.");},15000);
    void(async()=>{
      try{
        const lib=await loadMapLibre();
        if(disposed)return;
        map=new lib.Map({container:mapNode,center:point,zoom:16,style:VECTOR_STYLE,
          attributionControl:false,dragRotate:false,pitchWithRotate:false,touchPitch:false});
        mapRef.current=map;
        map.on("movestart",()=>{if(!disposed)setMapMoving(true);});
        map.on("moveend",()=>{
          if(disposed||!map)return;
          setMapMoving(false);
          const center=map.getCenter();
          setPoint([center.lng,center.lat]);
          setPickedAddress("Уточняем адрес...");
        });
        map.on("style.load",()=>{if(!disposed&&map)applyCleanGoLightStyle(map);});
        map.on("idle",()=>{
          if(disposed||!map)return;
          if(map.queryRenderedFeatures().length>0){
            window.clearTimeout(timeout);setMapReady(true);setMapError("");
          }
        });
        map.on("error",()=>{if(!disposed)setMapError("Ошибка загрузки векторной карты. Проверьте интернет.");});
        window.setTimeout(()=>{if(!disposed)map?.resize();},350);
      }catch(error){
        window.clearTimeout(timeout);
        if(!disposed)setMapError(error instanceof Error?error.message:"Ошибка карты");
      }
    })();
    return()=>{disposed=true;window.clearTimeout(timeout);map?.remove();mapRef.current=null;};
    // Keep a single map instance while its container is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mapOpen,mapNode]);

  useEffect(()=>{
    if(mapOpen){const timer=window.setTimeout(()=>mapRef.current?.resize(),260);return()=>window.clearTimeout(timer);}
  },[mapOpen,mapExpanded]);

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

  function locateOnMap() {
    if (!mapReady || !mapRef.current || !navigator.geolocation) return;
    setMapLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({coords}) => {
        setMapLocating(false);
        if (coords.accuracy > 500) { setMapError("Местоположение определено недостаточно точно."); return; }
        mapRef.current?.flyTo({center:[coords.longitude,coords.latitude],zoom:16,essential:true});
      },
      () => {setMapLocating(false);setMapError("Разрешите геолокацию в настройках Telegram.");},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  }

  async function confirmMap() {
    if (!mapReady || !mapRef.current) return;
    setMapBusy(true);
    setMapError("");
    try {
      const center = mapRef.current!.getCenter();
      const longitude = center.lng;
      const latitude = center.lat;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ru&lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error("Reverse lookup failed");
      const data: {address?:Record<string,string>;display_name?:string} = await response.json();
      const a=data.address??{};const road=a.road||a.pedestrian||a.residential;const city=a.city||a.town||a.village||"Семей";
      choose(road?`${city}, ${road}${a.house_number?", "+a.house_number:""}`:(data.display_name?.split(",").slice(0,3).join(",")||"Выбранная точка"), { latitude, longitude });
      setMapOpen(false);
    } catch {
      const center = mapRef.current?.getCenter();
      if (center) {
        choose(`Точка: ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`, { latitude: center.lat, longitude: center.lng });
        setMapOpen(false);
        setMessage("Координаты сохранены. Уточните улицу и номер дома перед оформлением.");
      } else setMapError("Не удалось сохранить точку. Попробуйте ещё раз.");
    } finally {
      setMapBusy(false);
    }
  }

  return (
    <div className={immersive ? "relative w-full" : "space-y-3"}>
      <label htmlFor="cleango-address" className={immersive ? "sr-only" : "block text-sm font-semibold text-slate-800"}>Адрес уборки</label>
      <div className={immersive ? "absolute left-4 right-4 top-5 z-[410] rounded-[22px] bg-white shadow-[0_10px_35px_rgba(20,60,54,0.12)]" : "relative"}>
        <MapPin className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-teal-600" />
        <input id="cleango-address" value={address} autoComplete="off" required
          placeholder="Улица, дом или название места"
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            setSelected(false); setCoordinates(null); setResults([]);
            onChange(event.target.value, null);
          }}
          className={immersive ? "h-14 w-full min-w-0 rounded-[22px] border-0 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none" : "h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"}
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
      <div className={immersive ? "hidden" : "grid grid-cols-2 gap-2"}>
        <button type="button" onClick={() => { setMapError(""); setMapOpen(true); }}
          className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-2 py-2 text-sm font-semibold text-teal-800 disabled:opacity-50">
          <MapPinned className="h-4 w-4 shrink-0" /> На карте
        </button>
        <button type="button" disabled={locationBusy} onClick={locate}
          className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-semibold text-slate-700 disabled:opacity-50">
          <LocateFixed className="h-4 w-4 shrink-0" /> {locationBusy ? "Определяем..." : "Моя геолокация"}
        </button>
      </div>
      {!immersive && coordinates && selected && (
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-teal-700"><Check className="h-4 w-4" /> Адрес и точка выбраны</p>
      )}
      {message && <p role="status" className="text-sm text-amber-700">{message}</p>}
      {!KEY && <p className="text-sm text-red-700">Не настроен NEXT_PUBLIC_MAPTILER_KEY.</p>}
      {mapOpen && (
        <section aria-label="Выбор точки уборки на карте" className={immersive ? "relative overflow-hidden bg-[#F1F6F4]" : "overflow-hidden rounded-[24px] border border-[#DCEDE7] bg-white shadow-sm"}>
          <div className={immersive ? "hidden" : "flex items-center justify-between gap-2 px-4 py-3"}>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.12em] text-[#159F91]">CLEANGO · КАРТА</p>
              <p className="text-sm font-bold text-[#152535]">Переместите карту под маркер</p>
            </div>
            <button type="button" onClick={() => setMapExpanded(v => !v)}
              className="flex shrink-0 items-center gap-1 rounded-xl bg-[#E8F8F4] px-3 py-2 text-xs font-semibold text-[#087F71]">
              {mapExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {mapExpanded ? "Свернуть" : "Развернуть"}
            </button>
          </div>
          <div className={immersive ? "relative h-[58dvh] min-h-[390px] w-full bg-[#F1F6F4]" : `relative w-full bg-[#F1F6F4] transition-[height] duration-200 ${mapExpanded ? "h-[55dvh]" : "h-[260px]"}`}>
            <div ref={setMapNode} className="absolute inset-0 h-full w-full" />
            {!mapReady && !mapError && <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[#F1F6F4]/90 text-sm text-slate-600">Загружаем карту...</div>}
            {mapError && !mapReady && <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-[#F1F6F4] p-5 text-center text-sm text-amber-700">{mapError}</div>}
            {mapReady && <button type="button" onClick={locateOnMap} disabled={mapLocating}
              aria-label="Моё местоположение на карте"
              className="absolute bottom-4 right-3 z-[400] rounded-xl bg-white p-3 text-teal-700 shadow-md disabled:opacity-50"><LocateFixed size={20}/></button>}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-full">
              <div className={`grid h-8 w-8 place-items-center rounded-full border-4 border-white bg-[#159F91] shadow-lg ${mapMoving ? "-translate-y-1" : ""}`}>
                <span className="h-2 w-2 rounded-full bg-white"/>
              </div>
            </div>
          </div>
          <div className={immersive ? "absolute bottom-5 left-4 right-4 z-[410] rounded-[22px] bg-white/95 p-3 shadow-xl backdrop-blur-lg" : "space-y-3 p-4"}>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E5F8F5] text-[#159F91]"><MapPin size={20}/></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#159F91]">Точка уборки</p>
                <p className="break-words text-sm text-[#152535]">{mapMoving ? "Уточняем адрес..." : pickedAddress}</p>
              </div>
            </div>
            <button type="button" onClick={() => void confirmMap()}
              disabled={!mapReady || mapBusy || mapMoving}
              className="h-12 w-full rounded-2xl bg-[#079B8D] font-bold text-white disabled:opacity-50">
              {mapBusy ? "Сохраняем точку..." : "Использовать этот адрес"}
            </button>
            {!immersive && <p className="text-center text-[11px] text-[#829A94]">После выбора адреса укажите площадь и нажмите «Далее».</p>}
          </div>
        </section>
      )}
    </div>
  );
}
