"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderDetail } from "@/components/OrderDetail";
import { StatusTag, Tabs } from "@/components/ui";
import { get, post, stream, type Order } from "@/lib/api";
import { fmtDate, fmtTime, inr } from "@/lib/format";
import { useApp } from "@/lib/store";

type Scope = "live" | "unassigned" | "held" | "";
interface Partner { id: string; name: string; phone: string; is_online: boolean; busy: boolean; status: string }
interface Ev { status: string; note: string; actor: string; at: string }

export default function OpsOrders() {
  const { run } = useApp();
  const [scope, setScope] = useState<Scope>("live");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Order[] | null>(null);
  const [sel, setSel] = useState<{ order: Order; events: Ev[] } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pick, setPick] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const r = await run(get<Order[]>(`/v1/ops/orders?scope=${scope}&q=${encodeURIComponent(q)}`));
    if (r) setRows(r);
  }, [run, scope, q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    const close = stream("/v1/ops/stream", { "order.new": () => void load(), "order.updated": () => void load() });
    return () => { clearTimeout(t); close(); };
  }, [load]);

  const openOrder = async (id: string) => {
    const d = await run(get<{ order: Order; events: Ev[] }>(`/v1/ops/orders/${id}`));
    if (!d) return;
    setSel(d);
    setPick("");
    setReason("");
    get<Partner[]>("/v1/ops/partners").then((p) => setPartners(p.filter((x) => x.status === "active"))).catch(() => {});
  };
  const act = async (path: string, body: unknown, ok: string) => {
    const r = await run(post<Order>(path, body), ok);
    if (r) { await openOrder(r.id); void load(); }
  };

  const o = sel?.order;
  const live = o && ["placed", "preparing", "ready", "picked"].includes(o.status);
  return (
    <>
      <div className="ph">
        <div><h1>Orders</h1><div className="muted sm">Every order in town. Tap one to assign, cancel or release it.</div></div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row wrap">
          <input className="fld" aria-label="Search" placeholder="Order number, hotel or customer phone" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
          <Tabs<Scope> value={scope} options={[["live", "Live"], ["unassigned", "No partner"], ["held", "On hold"], ["", "All recent"]]} onChange={setScope} />
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead><tr><th>Order</th><th>Placed</th><th>Hotel</th><th>Customer</th><th>Partner</th><th>Status</th><th className="num">Total</th></tr></thead>
            <tbody>
              {!rows ? <tr><td colSpan={7}><div className="empty">Loading…</div></td></tr> : rows.length ? rows.map((r) => (
                <tr key={r.id} className="clk" tabIndex={0} onClick={() => openOrder(r.id)} onKeyDown={(e) => e.key === "Enter" && openOrder(r.id)}>
                  <td><b>#{r.no}</b>{r.wrong_otp >= 3 && <span className="tag t-bad" style={{ marginLeft: 6 }}>Held</span>}</td>
                  <td className="sm">{fmtDate(r.placed_at)}, {fmtTime(r.placed_at)}</td>
                  <td className="sm">{r.hotel_name}</td>
                  <td className="sm">{r.customer_name}<div className="xs muted">{r.customer_phone}</div></td>
                  <td className="sm">{r.partner_name || <span className="muted">—</span>}</td>
                  <td><StatusTag status={r.status} /></td>
                  <td className="num"><b>{inr(r.total)}</b><div className="xs muted">{r.pay_method.toUpperCase()}</div></td>
                </tr>
              )) : <tr><td colSpan={7}><div className="empty">Nothing here.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {o && sel && (
        <OrderDetail o={o} as="ops" onClose={() => setSel(null)}>
          <div className="card" style={{ marginTop: 12, padding: "10px 14px" }}>
            <b className="sm">Timeline</b>
            {sel.events.map((e, i) => (
              <div className="row sb xs" key={i} style={{ margin: "4px 0" }}>
                <span>{e.status}{e.note ? ` · ${e.note}` : ""} <span className="muted">by {e.actor}</span></span>
                <span className="muted">{fmtTime(e.at)}</span>
              </div>
            ))}
            <div className="xs muted" style={{ marginTop: 6 }}>Pickup code {o.pickup_otp} · delivery code {o.delivery_otp} · wrong codes {o.wrong_otp}</div>
          </div>
          {live && (
            <div className="col" style={{ gap: 10, marginTop: 12 }}>
              {o.status !== "picked" && (
                <div className="row wrap">
                  <select className="fld grow" aria-label="Partner" value={pick} onChange={(e) => setPick(e.target.value)}>
                    <option value="">Nearest free partner (automatic)</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name} {p.is_online ? "· online" : "· offline"}{p.busy ? " · busy" : ""}</option>)}
                  </select>
                  <button className="btn" onClick={() => act(`/v1/ops/orders/${o.id}/assign`, { partner_id: pick }, "Partner assigned")}>Assign</button>
                </div>
              )}
              {o.wrong_otp >= 3 && <button className="btn y" onClick={() => act(`/v1/ops/orders/${o.id}/release`, {}, "Order released")}>Release hold (customer confirmed)</button>}
              <div className="row wrap">
                <input className="fld grow" aria-label="Cancel reason" placeholder="Reason for cancelling" value={reason} onChange={(e) => setReason(e.target.value)} />
                <button className="btn red" disabled={!reason.trim()} onClick={() => act(`/v1/ops/orders/${o.id}/cancel`, { reason }, "Order cancelled and refunded")}>Cancel order</button>
              </div>
            </div>
          )}
        </OrderDetail>
      )}
    </>
  );
}
