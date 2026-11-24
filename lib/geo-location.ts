export type Coordinates = { latitude: number; longitude: number };

type LocationManager = {
  isInited: boolean;
  isLocationAvailable: boolean;
  isAccessGranted?: boolean;
  init: (callback: () => void) => void;
  getLocation: (callback: (data: Coordinates | null) => void) => void;
  openSettings: () => void;
};

export function getTelegramLocationManager(): LocationManager | null {
  if (typeof window === "undefined") return null;
  const app = (window as Window & { Telegram?: { WebApp?: {
    isVersionAtLeast?: (version: string) => boolean;
    LocationManager?: LocationManager;
  } } }).Telegram?.WebApp;
  return app?.isVersionAtLeast?.("8.0") ? app.LocationManager ?? null : null;
}

function valid(coords: Coordinates): boolean {
  return Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
    && Math.abs(coords.latitude) <= 90 && Math.abs(coords.longitude) <= 180;
}

function telegramPosition(manager: LocationManager): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (coords: Coordinates | null, reason?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (coords && valid(coords)) resolve({ latitude: coords.latitude, longitude: coords.longitude });
      else reject(new Error(reason ?? "Telegram не предоставил координаты. Проверьте разрешения CleanGo."));
    };
    const timer = setTimeout(() => finish(null, "Telegram не ответил на запрос геолокации"), 16000);
    const request = () => {
      if (!manager.isLocationAvailable) return finish(null, "Telegram не предоставляет геолокацию на этом устройстве");
      try { manager.getLocation(coords => finish(coords)); }
      catch { finish(null, "Telegram не смог запросить геопозицию"); }
    };
    try { if (manager.isInited) request(); else manager.init(request); }
    catch { finish(null, "Не удалось инициализировать геолокацию Telegram"); }
  });
}

function browserPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Браузер не поддерживает геолокацию"));
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
    );
  });
}

export async function requestCleanGoLocation(): Promise<Coordinates> {
  const manager = getTelegramLocationManager();
  let telegramError = "";
  if (manager) {
    try { return await telegramPosition(manager); }
    catch (error) { telegramError = error instanceof Error ? error.message : "Ошибка геолокации Telegram"; }
  }
  try {
    const coords = await browserPosition();
    if (!valid(coords)) throw new Error("Получены некорректные координаты");
    return coords;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    const browserError = code === 1 ? "Браузер отклонил запрос геолокации."
      : code === 2 ? "Браузер не смог определить координаты."
      : code === 3 ? "Время ожидания геолокации истекло."
      : error instanceof Error ? error.message : "Геолокация недоступна.";
    throw new Error([telegramError, browserError, "Проверьте разрешения CleanGo в Telegram и службы геолокации macOS."].filter(Boolean).join(" "));
  }
}

/** Automatic updates never initiate a permission prompt. */
export async function requestGrantedCleanGoLocation():Promise<Coordinates>{
  const manager=getTelegramLocationManager();
  if(manager){
    if(!manager.isInited)await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("Не удалось проверить разрешение Telegram")),5000);
      try{manager.init(()=>{clearTimeout(timer);resolve();});}catch(e){clearTimeout(timer);reject(e);}
    });
    if(manager.isLocationAvailable&&manager.isAccessGranted)return telegramPosition(manager);
  }
  if(navigator.permissions&&navigator.geolocation){
    const permission=await navigator.permissions.query({name:"geolocation"});
    if(permission.state==="granted")return browserPosition();
  }
  throw new Error("Для автообновления подтвердите доступ к геопозиции вручную.");
}
