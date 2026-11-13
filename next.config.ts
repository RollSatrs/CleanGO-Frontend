
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем подключение через ngrok
  allowedDevOrigins: [
    "38cf-92-47-82-192.ngrok-free.app",
  ],

  // Существующие экспериментальные настройки
  experimental: {
    agentFeedback: true,
  },

  cacheComponents: true,

  partialPrefetching: true,

  // Настройки Turbopack и Tailwind CSS
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
