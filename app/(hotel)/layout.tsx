"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/store";

/** Hotel pages need a signed-in hotel owner with a registered hotel. */
export default function HotelLayout({ children }: { children: ReactNode }) {
  const { ready, user, hotel } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== "hotel") router.replace(user?.role === "ops" ? "/ops" : "/login");
    else if (!hotel) router.replace("/register");
  }, [ready, user, hotel, router]);
  if (!ready || !user || user.role !== "hotel" || !hotel) return <div className="empty" style={{ paddingTop: 80 }}>Loading…</div>;
  return <Shell>{children}</Shell>;
}
