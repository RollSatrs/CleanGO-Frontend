"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppCard, AppPageShell } from "@/components/ui/clean-go";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const TYPES = [
  { id: "regular", label: "Поддерживающая" },
  { id: "general", label: "Генеральная" },
  { id: "renovation", label: "После ремонта" },
];

export default function CleanerSettings() {
  const { user, token } = useAuth();
  const [available, setAvailable] = useState(false);
  const [radius, setRadius] = useState(5);
  const [types, setTypes] = useState<string[]>(TYPES.map(t => t.id));
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationSaved, setLocationSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      setRadius(profile.serviceRadiusKm ?? 5);
      setTypes(profile.serviceTypes ?? []);
      setLocationSaved(Boolean(profile.hasLocation));
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [token, user?.role, user?.phoneVerifiedAt]);

  function requestLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Геолокация не поддерживается устройством");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationSaved(false);
        setNotice("Геопозиция получена. Нажмите «Сохранить настройки».");
      },
      () => setError("Не удалось получить геопозицию. Разрешите доступ в Telegram и настройках телефона."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function save() {
    if (!token || busy) return;
    if (available && !location) {
      setError("Для выхода на линию нажмите «Обновить геопозицию». Местоположение должно быть свежим.");
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
        body: JSON.stringify({ isAvailable: available, serviceRadiusKm: radius, serviceTypes: types, ...location }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.message === "string" ? data.message : "Не удалось сохранить настройки");
      }
      setLocationSaved(Boolean(location));
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
            <p className="mt-2 text-xs text-slate-500">Предложения появляются только когда вы на линии и ваша геопозиция актуальна (до 30 минут).</p>
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
            <button type="button" onClick={requestLocation}
              className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white">
              Обновить геопозицию
            </button>
            <p className="mt-2 text-xs text-slate-500">
              {location ? "Новая геопозиция получена" : locationSaved ? "Ранее сохранена геопозиция (для выхода на линию обновите её)" : "Геопозиция ещё не указана"}
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
