"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Shell, type NavItem } from "@/components/Shell";
import { useApp } from "@/lib/store";

const OPS_NAV: NavItem[] = [
  ["/ops", "Overview", "chart"],
  ["/ops/orders", "Orders", "orders"],
  ["/ops/hotels", "Hotels", "menu"],
  ["/ops/partners", "Partners", "bike"],
  ["/ops/customers", "Customers", "user"],
  ["/ops/audit", "Audit log", "hist"],
];

export default function OpsLayout({ children }: { children: ReactNode }) {
  const { ready, user } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (ready && user?.role !== "ops") router.replace("/ops/login");
  }, [ready, user, router]);
  if (!ready || user?.role !== "ops") return <div className="empty" style={{ paddingTop: 80 }}>Loading…</div>;
  return <Shell nav={OPS_NAV} title="InnTown Ops" subtitle={`Signed in as ${user.name || user.phone}`} foot="Ops admin">{children}</Shell>;
}
