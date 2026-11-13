"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { OrderDetail } from "@/components/OrderDetail";
import { StatusTag, Tabs } from "@/components/ui";
import { get, type Order } from "@/lib/api";
import { fmtDate, fmtTime, inr } from "@/lib/format";
import { useApp } from "@/lib/store";

const PER = 15;
type Range = "1" | "7" | "30";
type Stat = "" | "delivered" | "rejected" | "expired" | "cancelled";

export default function HistoryPage() {
  const { run, toast } = useApp();
  const [q, setQ] = useState("");
  // Opened from a notification: show that order number.
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("q");
    if (from) setQ(from.replace(/\D/g, "").slice(0, 8));
  }, []);
  const [range, setRange] = useState<Range>("30");
  const [stat, setStat] = useState<Stat>("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Order[] | null>(null);
  const [sel, setSel] = useState<Order | null>(null);

  const query = (limit: number, offset: number) =>
    `/v1/hotel/orders?days=${range}&status=${stat}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;

  useEffect(() => {
    const t = setTimeout(async () => {
      // Ask for one extra row to know whether there is a next page.
      const r = await run(get<Order[]>(query(PER + 1, page * PER)));
      if (r) setRows(r);
    }, 250);
    return () => clearTimeout(t);
  }, [range, stat, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => setPage(0);
  const csv = async () => {
    const all = await run(get<Order[]>(query(500, 0)));
    if (!all) return;
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Order", "Date", "Customer", "Items", "Payment", "Status", "Food", "Packaging", "You earn"].join(",")].concat(
      all.map((o) => [o.no, `${fmtDate(o.placed_at)} ${fmtTime(o.placed_at)}`, o.customer_name, o.items.map((i) => `${i.qty}x ${i.name}`).join("; "),
        o.pay_method.toUpperCase(), o.status, o.subtotal, o.pack_fee, o.status === "delivered" ? o.subtotal + o.pack_fee : 0].map(cell).join(",")),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `inntown-orders-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Downloaded ${all.length} orders`);
  };

  const shown = rows?.slice(0, PER) ?? [];
  return (
    <>
      <div className="ph">
        <div><h1>Order history</h1><div className="muted sm">Finished orders. Live orders are on the Live orders page.</div></div>
        <button className="btn o" onClick={csv}><Icon name="down" size={18} /> Download CSV</button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row wrap">
          <input className="fld" aria-label="Search order number or customer" placeholder="Search order number or customer" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} style={{ maxWidth: 300 }} />
          <Tabs<Range> value={range} options={[["1", "Today"], ["7", "7 days"], ["30", "30 days"]]} onChange={(v) => { setRange(v); reset(); }} />
          <Tabs<Stat> value={stat} options={[["", "All"], ["delivered", "Delivered"], ["rejected", "Rejected"], ["expired", "Not accepted"], ["cancelled", "Cancelled"]]} onChange={(v) => { setStat(v); reset(); }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="num">You earn</th></tr>
            </thead>
            <tbody>
              {!rows ? (
                <tr><td colSpan={7}><div className="empty">Loading…</div></td></tr>
              ) : shown.length ? shown.map((o) => (
                <tr key={o.id} className="clk" onClick={() => setSel(o)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(o)}>
                  <td><b>#{o.no}</b></td>
                  <td className="sm">{fmtDate(o.placed_at)}, {fmtTime(o.placed_at)}</td>
                  <td className="sm">{o.customer_name}</td>
                  <td className="sm muted" style={{ maxWidth: 260 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                  <td className="sm">{o.pay_method.toUpperCase()}</td>
                  <td><StatusTag status={o.status} /></td>
                  <td className="num"><b>{o.status === "delivered" ? inr(o.subtotal + o.pack_fee) : "—"}</b></td>
                </tr>
              )) : (
                <tr><td colSpan={7}><div className="empty">No orders match.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="row sb foot-row">
          <span className="xs muted">Page {page + 1}</span>
          <div className="row">
            <button className="btn o s" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn o s" disabled={!rows || rows.length <= PER} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {sel && <OrderDetail o={sel} as="hotel" onClose={() => setSel(null)} />}
    </>
  );
}
