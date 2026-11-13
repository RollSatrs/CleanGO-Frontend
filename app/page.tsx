"use client";
import CleaningCard from "@/components/CleaningCard";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";


export default function HomePage() {
  const router = useRouter();

  function handleOrder() {
    if (!selectedService) {
      alert("Сначала выберите тип уборки");
      return;
    }

    router.push(`/order?service=${selectedService}`);
  }
  const [selectedService, setSelectedService] = useState<string | null>(null);
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="mt-6 text-2xl font-bold text-gray-900"> 
        Чистый дом — без лишних хлопот!
      </h1>
      <p className="mt-3 max-w-md text-base leading-7 text-gray-600">
        CleanGo поможет быстро и удобно найти проверенного 
        специалиста для уборки вашего дома. Выбирайте 
        подходящую услугу, оформляйте заказ за несколько минут и занимайтесь своими делами, 
        пока мы помогаем заботиться о чистоте и уюте.
      </p>
      <button
        onClick={handleOrder}
        className="mt-6 rounded-xl bg-green-700 px-6 py-3 text-white"
      >
        Заказать уборку
      </button>


    <section className="mt-10">
      <h2 className="mb-5 text-2xl font-bold text-gray-900">
        Выберите тип уборки
      </h2>

      <div className="grid gap-4 md:grid-cols-2">

        <CleaningCard
          title="Поддерживающая уборка"
          description="Регулярная уборка для поддержания чистоты и порядка."
          price={7000}
          selected={selectedService === "regular"}
          onClick={() => setSelectedService("regular")}
        />

        <CleaningCard
          title="Генеральная уборка"
          description="Тщательная уборка всех основных помещений."
          price={15000}
          selected={selectedService === "general"}
          onClick={() => setSelectedService("general")}
        />

        <CleaningCard
          title="Уборка после ремонта"
          description="Удаление строительной пыли и загрязнений после ремонта."
          price={25000}
          selected={selectedService === "renovation"}
          onClick={() => setSelectedService("renovation")}
        />

      </div>

    </section>
    </main>

  );
}
