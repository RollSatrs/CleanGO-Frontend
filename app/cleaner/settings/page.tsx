"use client";

import { getTelegramLocationManager, requestCleanGoLocation } from "@/lib/geo-location";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

const API_URL = "/api/backend";
const TYPES = [
  { id: "regular", label: "Поддерживающая" },
  { id: "general", label: "Генеральная" },
  { id: "renovation", label: "После ремонта" },
];

export default function CleanerSettings() {
  const { user, token } = useAuth();
  const [available, setAvailable] = useState(false);
  const [hours, setHours] = useState<1 | 2 | 4>(1);
  const [availableUntil, setAvailableUntil] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [locationNeedsRefresh, setLocationNeedsRefresh] = useState(false);
  const [effectiveAvailable, setEffectiveAvailable] = useState(false);
  const [radius, setRadius] = useState(5);
  const [types, setTypes] = useState<string[]>(TYPES.map(t => t.id));
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationSaved, setLocationSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    if (!token || user?.role !== "cleaner" || !user.phoneVerifiedAt) return;
    let cancelled = false;
    fetch(`${API_URL}/orders/cleaner/profile`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error("Не удалось загрузить настройки");
      return response.json();
    }).then(profile => {
      if (cancelled) return;
      setAvailable(Boolean(profile.isAvailable));
      setAvailableUntil(profile.availableUntil ?? null);
      setLocationNeedsRefresh(Boolean(profile.locationNeedsRefresh));
      setEffectiveAvailable(Boolean(profile.effectiveAvailable));
      setRadius(profile.serviceRadiusKm ?? 5);
      setTypes(profile.serviceTypes ?? []);
      setLocationSaved(Boolean(profile.hasLocation));
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [token, user?.role, user?.phoneVerifiedAt]);

  const [locationPending, setLocationPending] = useState(false);
  const [telegramLocationSettingsAvailable, setTelegramLocationSettingsAvailable] = useState(false);

  async function requestLocation() {
    if (locationPending) return;
    setLocationPending(true);
    setError("");
    setNotice("");
    setTelegramLocationSettingsAvailable(Boolean(getTelegramLocationManager()));
    try {
      const coords = await requestCleanGoLocation();
      setLocation(coords);
      setLocationSaved(false);
      setNotice("Геопозиция получена. Нажмите «Сохранить настройки».");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось определить геопозицию");
    } finally {
      setLocationPending(false);
    }
  }

  function openTelegramLocationSettings() {
    try {
      getTelegramLocationManager()?.openSettings();
    } catch {
      setError("Не удалось открыть настройки Telegram. Проверьте разрешения Mini App вручную.");
    }
  }

  async function save() {
    if (!token || busy) return;
    if (available && !location && (!locationSaved || locationNeedsRefresh)) {
      setError("Для выхода на линию обновите геопозицию. Ранее сохранённая точка может быть устаревшей.");
      return;
    }
    if (!types.length) { setError("Выберите хотя бы один вид уборки"); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/orders/cleaner/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: available, availabilityHours: available ? hours : undefined, serviceRadiusKm: radius, serviceTypes: types, ...location }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.message === "string" ? data.message : "Не удалось сохранить настройки");
      }
      const profile = await response.json();
      setAvailableUntil(profile.availableUntil ?? null);
      setLocationNeedsRefresh(Boolean(profile.locationNeedsRefresh));
      setEffectiveAvailable(Boolean(profile.effectiveAvailable));
      setLocationSaved(Boolean(profile.hasLocation));
      setNotice(available ? "Вы на линии! Предложения будут приходить при совпадении условий." : "Настройки сохранены. Вы не на линии.");
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка сохранения"); }
    finally { setBusy(false); }
  }

  return (
    <AppPageShell role="cleaner" eyebrow="Рабочий профиль" title="Настройки клинера"
      description="Настройте виды уборки и радиус. Геопозиция передаётся только после вашего разрешения.">
      {user?.role !== "cleaner" || !user.phoneVerifiedAt ? (
        <AppCard><p className="text-sm">Для настройки профиля нужен аккаунт клинера с подтверждённым телефоном.</p></AppCard>
      ) : (
        <div className="space-y-4">
          <AppCard>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Доступен для заказов
              <input type="checkbox" checked={available} onChange={event => setAvailable(event.target.checked)}
                className="h-5 w-5 accent-teal-600" />
            </label>
            <p className="mt-2 text-xs text-slate-500">Включите смену на выбранное время. Геопозиция должна оставаться актуальной (до 30 минут).</p>
            <div className="mt-4 flex gap-2">{([1, 2, 4] as const).map(value => <button key={value} type="button" onClick={() => setHours(value)} aria-pressed={hours === value} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${hours === value ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-800"}`}>{value} ч</button>)}</div>
            {availableUntil && available && <p className="mt-3 text-sm font-semibold text-teal-800" aria-live="off">{Math.max(0, Math.ceil((new Date(availableUntil).getTime() - clock) / 60000)) > 0 ? `Осталось ${Math.max(0, Math.ceil((new Date(availableUntil).getTime() - clock) / 60000))} мин` : "Смена закончилась — включите доступность снова"}</p>}
            {available && !effectiveAvailable && <p role="status" className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Смена включена, но вы сейчас не участвуете в подборе. Проверьте срок смены и обновите геопозицию.</p>}
            {locationNeedsRefresh && <p className="mt-2 text-xs font-medium text-amber-700">Для новых предложений обновите геопозицию.</p>}
          </AppCard>
          <AppCard>
            <p className="text-sm font-semibold">Какие уборки выполняете?</p>
            <div className="mt-3 space-y-3">
              {TYPES.map(type => (
                <label key={type.id} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={types.includes(type.id)}
                    onChange={event => setTypes(previous => event.target.checked
                      ? [...previous, type.id] : previous.filter(id => id !== type.id))}
                    className="h-5 w-5 accent-teal-600" />
                  {type.label}
                </label>
              ))}
            </div>
          </AppCard>
          <AppCard>
            <label htmlFor="radius" className="text-sm font-semibold">Радиус работы: {radius} км</label>
            <input id="radius" type="range" min={1} max={30} value={radius}
              onChange={event => setRadius(Number(event.target.value))}
              className="mt-4 w-full accent-teal-600" />
            <button type="button" onClick={() => void requestLocation()} disabled={locationPending}
              className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white">
              {locationPending ? "Определяем геопозицию…" : "Обновить геопозицию"}
            </button>
            {telegramLocationSettingsAvailable && error && (
              <button type="button" onClick={openTelegramLocationSettings}
                className="mt-3 w-full rounded-xl border border-teal-300 px-4 py-3 text-sm font-semibold text-teal-800">
                Настройки геолокации CleanGo в Telegram
              </button>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {location ? "Новая геопозиция получена" : locationSaved ? "Ранее сохранена геопозиция" : "Геопозиция ещё не указана"}
            </p>
          </AppCard>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          <button type="button" disabled={busy} onClick={() => void save()}
            className="w-full rounded-xl bg-teal-600 px-4 py-4 font-bold text-white disabled:opacity-50">
            {busy ? "Сохраняем…" : "Сохранить настройки"}
          </button>
          <Link href="/cleaner/jobs" className="block py-3 text-center text-sm font-semibold text-teal-700">
            Перейти к предложениям
          </Link>
        </div>
      )}
    </AppPageShell>
  );
}
