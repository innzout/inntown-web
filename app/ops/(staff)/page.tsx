"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Stat } from "@/components/ui";
import { get, stream } from "@/lib/api";
import { fmtTime, inr } from "@/lib/format";
import { useApp } from "@/lib/store";

interface Overview {
  orders_today: number; delivered_today: number; live_orders: number; unassigned: number; held: number; gmv_today: number;
  no_help_rate: number; avg_delivery_min: number; hotels_active: number; hotels_open_now: number; hotels_pending: number;
  partners_active: number; partners_online: number; partners_pending: number; customers: number; commission_today: number; commission_month: number;
}
interface Alert { kind: string; order_no?: number; order_id?: string; at: number }

const ALERT_TEXT: Record<string, string> = {
  no_partner: "No partner took an order for 5 minutes. Assign one by hand.",
  wrong_otp: "Wrong delivery code 3 times. The order is on hold: call the customer.",
};

export default function OpsOverview() {
  const { run, beep } = useApp();
  const [o, setO] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const load = useCallback(() => run(get<Overview>("/v1/ops/overview")).then((r) => r && setO(r)), [run]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 15_000);
    const close = stream("/v1/ops/stream", {
      alert: (d) => { setAlerts((a) => [{ ...(d as Alert), at: Date.now() }, ...a].slice(0, 20)); beep(); },
      "order.new": () => void load(),
      "order.updated": () => void load(),
      "hotel.registered": () => void load(),
    });
    return () => { clearInterval(t); close(); };
  }, [load, beep]);

  if (!o) return <div className="empty">Loading…</div>;
  const gate = Math.round(o.no_help_rate * 100);
  return (
    <>
      <div className="ph">
        <div><h1>Overview</h1><div className="muted sm">Thuraiyur today. Updates live.</div></div>
        <Link className="btn o" href="/ops/orders">Open live orders</Link>
      </div>

      {(o.unassigned > 0 || o.held > 0 || o.hotels_pending > 0 || o.partners_pending > 0) && (
        <div className="banner warn">
          <Icon name="alert" />
          <span>
            {o.unassigned > 0 && <><b>{o.unassigned}</b> order(s) without a partner. </>}
            {o.held > 0 && <><b>{o.held}</b> order(s) on hold. </>}
            {o.hotels_pending > 0 && <><b>{o.hotels_pending}</b> hotel(s) waiting for approval. </>}
            {o.partners_pending > 0 && <><b>{o.partners_pending}</b> partner(s) waiting for approval.</>}
          </span>
        </div>
      )}

      <div className="stats">
        <Stat label="Orders today" value={o.orders_today} icon={<Icon name="orders" />} />
        <Stat label="Delivered today" value={o.delivered_today} icon={<Icon name="check" />} />
        <Stat label="Live now" value={o.live_orders} icon={<Icon name="bell" />} />
        <Stat label="Order value today" value={inr(o.gmv_today)} icon={<Icon name="wallet" />} />
        <Stat label="Delivered with no ops help" value={o.delivered_today ? `${gate}%` : "–"} icon={<Icon name="star" />} />
        <Stat label="Average delivery (7 days)" value={o.avg_delivery_min ? `${Math.round(o.avg_delivery_min)} min` : "–"} icon={<Icon name="clock" />} />
        <Stat label="Hotels open / active" value={`${o.hotels_open_now} / ${o.hotels_active}`} icon={<Icon name="menu" />} />
        <Stat label="Partners online / active" value={`${o.partners_online} / ${o.partners_active}`} icon={<Icon name="bike" />} />
        <Stat label="Customers" value={o.customers} icon={<Icon name="user" />} />
        <Stat label="Commission today" value={inr(o.commission_today)} icon={<Icon name="card" />} />
        <Stat label="Commission this month" value={inr(o.commission_month)} icon={<Icon name="card" />} />
      </div>

      <div className="card">
        <div className="bh" style={{ fontSize: 18, marginBottom: 8 }}>Alerts</div>
        {alerts.length ? alerts.map((a, i) => (
          <div className="row sb" key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <span className="row gap6"><Icon name="alert" size={18} color="var(--danger)" />{a.order_no ? `#${a.order_no}: ` : ""}{ALERT_TEXT[a.kind] ?? a.kind}</span>
            <span className="xs muted">{fmtTime(a.at)}</span>
          </div>
        )) : <div className="empty">No alerts since you opened this page.</div>}
      </div>
      <div className="demo" style={{ marginTop: 14 }}>Launch gate: 95% of orders delivered with no ops help (Kickoff Pack, beta).</div>
    </>
  );
}
