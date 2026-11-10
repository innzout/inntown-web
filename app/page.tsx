"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store";

export default function Home() {
  const { ready, user } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.replace(user?.role === "ops" ? "/ops" : user ? "/orders" : "/login");
  }, [ready, user, router]);
  return null;
}
