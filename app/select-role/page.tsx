
"use client";

import { useState } from "react";
import RoleSelection from "../../components/auth/RoleSelection";

type Role = "client" | "cleaner";

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);

  const handleContinue = async (role: Role) => {
    setLoading(true);

    try {
      console.log("Выбрана роль:", role);

      if (role === "client") {
        alert("Вы выбрали роль клиента");
      } else {
        alert("Вы выбрали роль клинера");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleSelection
      loading={loading}
      onContinue={handleContinue}
    />
  );
}
