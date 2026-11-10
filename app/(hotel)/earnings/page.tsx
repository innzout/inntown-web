"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Stat, Tabs } from "@/components/ui";
import { get, type Earnings } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { useApp } from "@/lib/store";

type Range = "7" | "14" | "30";
const W = 760;
const H = 220;

export default function EarningsPage() {
  const { run } = useApp();
  const [range, setRange] = useState<Range>("7");
  const [e, setE] = useState<Earnings | null>(null);

  useEffect(() => {
    run(get<Earnings>(`/v1/hotel/earnings?days=${range}`)).then((r) => r && setE(r));
  }, [range, run]);

  const n = e?.days.length ?? 0;
  const max = Math.max(1, ...(e?.days.map((d) => d.sales) ?? [1]));
  const bw = W / Math.max(n, 1);

  return (
    <>
      <div className="ph">
        <div><h1>Earnings</h1><div className="muted sm">Your sales, InnTown's commission on the food, and what is paid to you.</div></div>
        <Tabs<Range> value={range} options={[["7", "7 days"], ["14", "14 days"], ["30", "30 days"]]} onChange={setRange} />
      </div>

      <div className="banner info">
        <Icon name="check" size={20} stroke={2.6} />
        <span>{e?.terms.free_now && e.terms.free_until ? <><b>No commission until {fmtDate(e.terms.free_until)}.</b> </> : <><b>{e?.terms.percent ?? "–"}% commission on food only.</b> </>}Nothing on packaging; the delivery fee goes fully to the partner.</span>
      </div>

      {!e ? <div className="empty">Loading…</div> : (
        <>
          <div className="stats">
            <Stat label="Your sales" value={inr(e.total)} icon={<Icon name="wallet" />} />
            <Stat label="Paid to you" value={inr(e.net)} icon={<Icon name="check" />} />
            <Stat label="Delivered orders" value={e.orders} icon={<Icon name="orders" />} />
            <Stat label="Average order" value={inr(e.orders ? e.total / e.orders : 0)} icon={<Icon name="chart" />} />
            <Stat label="Refunded (not delivered)" value={inr(e.refunded)} icon={<Icon name="alert" />} />
          </div>

          <div className="grid2" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <div className="card">
              <div className="bh" style={{ fontSize: 18, marginBottom: 8 }}>Sales per day</div>
              <svg viewBox={`-54 0 ${W + 54} ${H + 30}`} width="100%" role="img" aria-label={`Sales per day for the last ${n} days`}>
                {[0, 0.5, 1].map((f) => (
                  <g key={f}>
                    <line x1={0} x2={W} y1={H - f * H + 5} y2={H - f * H + 5} stroke="var(--line)" strokeDasharray="3 4" />
                    <text x={-8} y={H - f * H + 9} fontSize={11} textAnchor="end" fill="var(--ink-muted)">{inr(max * f)}</text>
                  </g>
                ))}
                {e.days.map((d, i) => {
                  const h = (d.sales / max) * (H - 20);
                  const x = i * bw + bw * 0.18;
                  return (
                    <g key={d.date}>
                      <rect x={x} y={H + 5 - h} width={bw * 0.64} height={h} rx={4} fill={i === n - 1 ? "var(--turmeric)" : "var(--leaf)"}>
                        <title>{`${fmtDate(d.date)}: ${inr(d.sales)} sales · ${inr(d.commission)} commission · ${d.orders} orders`}</title>
                      </rect>
                      {(n <= 14 || i % 5 === 0) && <text x={x + bw * 0.32} y={H + 24} fontSize={11} textAnchor="middle" fill="var(--ink-muted)">{fmtDate(d.date)}</text>}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="card">
              <div className="bh" style={{ fontSize: 18, marginBottom: 8 }}>Breakdown</div>
              <div className="row sb" style={{ margin: "8px 0" }}><span>Food sales</span><b>{inr(e.food)}</b></div>
              <div className="row sb" style={{ margin: "8px 0" }}><span>Packaging charges</span><b>{inr(e.packaging)}</b></div>
              <div className="row sb" style={{ margin: "8px 0", borderTop: "1px dashed var(--line-strong)", paddingTop: 10 }}><b>Total sales</b><b>{inr(e.total)}</b></div>
              <div className="row sb" style={{ margin: "8px 0" }}><span>InnTown commission ({e.terms.percent}% of food)</span><b>− {inr(e.commission)}</b></div>
              <div className="row sb" style={{ margin: "8px 0", borderTop: "1px dashed var(--line-strong)", paddingTop: 10 }}><b>Paid to you</b><b style={{ fontSize: 18 }}>{inr(e.net)}</b></div>
              <div className="row sb xs muted"><span>Paid online (UPI / card)</span><span>{inr(e.online)}</span></div>
              <div className="row sb xs muted" style={{ marginTop: 4 }}><span>Cash on delivery</span><span>{inr(e.cod)}</span></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, padding: 0 }}>
            <div className="bh th-pad">Top dishes</div>
            <div className="tw">
              <table>
                <thead><tr><th>Dish</th><th className="num">Sold</th><th className="num">Sales</th></tr></thead>
                <tbody>
                  {e.top.length ? e.top.map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.qty}</td><td className="num"><b>{inr(t.sales)}</b></td></tr>)
                    : <tr><td colSpan={3}><div className="empty">No delivered orders yet.</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="demo" style={{ marginTop: 14 }}>How and when online payments reach your bank account will be confirmed before launch (tax handling is on hold).</div>
        </>
      )}
    </>
  );
}
