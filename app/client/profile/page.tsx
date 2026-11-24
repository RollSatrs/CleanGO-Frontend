"use client";
import { AppPageShell } from "@/components/ui/clean-go";
import ProfileEditor from "@/components/ProfileEditor";
export default function ClientProfile(){
  return <AppPageShell role="client" eyebrow="Мой аккаунт" title="Профиль"><ProfileEditor role="client"/></AppPageShell>;
}
