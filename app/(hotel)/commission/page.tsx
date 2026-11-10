"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Stat } from "@/components/ui";
import { get, type Earnings } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { useApp } from "@/lib/store";

const EXAMPLE_FOOD = 200;
const EXAMPLE_PACK = 10;

/** How InnTown charges the hotel: a commission on food only, with a free launch period. */
export default function CommissionPage() {
  const { run } = useApp();
  const [e, setE] = useState<Earnings | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    run(get<Earnings>("/v1/hotel/earnings?days=30")).then((r) => (r ? setE(r) : setFailed(true)));
  };
  useEffect(load, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <div className="empty">Could not load your commission details. <button className="btn o s" onClick={load}>Try again</button></div>;
  if (!e) return <div className="empty">Loading…</div>;

  const { terms } = e;
  const exampleCut = Math.round((EXAMPLE_FOOD * terms.percent) / 100);

  return (
    <>
      <div className="ph">
        <div><h1>Commission</h1><div className="muted sm">No monthly fee. InnTown earns a small share of your food sales, only when an order is delivered.</div></div>
      </div>

      {terms.free_now && terms.free_until ? (
        <div className="banner info"><Icon name="check" size={20} stroke={2.6} /><span><b>No commission until {fmtDate(terms.free_until)}.</b> Your first {terms.free_days} days after approval are free.</span></div>
      ) : !terms.free_until ? (
        <div className="banner info"><Icon name="clock" size={20} /><span>Your {terms.free_days} commission-free days start when InnTown approves your hotel.</span></div>
      ) : null}

      <div className="stats">
        <Stat label="Commission rate" value={`${terms.percent}%`} icon={<Icon name="card" />} />
        <Stat label="Sales, last 30 days" value={inr(e.total)} icon={<Icon name="wallet" />} />
        <Stat label="Commission, last 30 days" value={inr(e.commission)} icon={<Icon name="chart" />} />
        <Stat label="Paid to you, last 30 days" value={inr(e.net)} icon={<Icon name="check" />} />
      </div>

      <div className="grid2">
        <div className="card">
          <div className="bh" style={{ fontSize: 18, marginBottom: 8 }}>How it works</div>
          <ul className="col gap6 sm" style={{ paddingLeft: 18, margin: 0 }}>
            <li>{terms.percent}% of the <b>food value</b> of each delivered order.</li>
            <li>Nothing on packaging charges or the delivery fee (that goes fully to the partner).</li>
            <li>Rejected, expired or cancelled orders cost you nothing.</li>
            <li>Every order keeps the rate it was placed at.</li>
            <li>InnTown pays your sales less commission to your UPI ID every week.</li>
          </ul>
        </div>
        <div className="card">
          <div className="bh" style={{ fontSize: 18, marginBottom: 8 }}>Example order</div>
          <div className="row sb" style={{ margin: "8px 0" }}><span>Food</span><b>{inr(EXAMPLE_FOOD)}</b></div>
          <div className="row sb" style={{ margin: "8px 0" }}><span>Packaging</span><b>{inr(EXAMPLE_PACK)}</b></div>
          <div className="row sb" style={{ margin: "8px 0" }}><span>Commission ({terms.percent}% of food)</span><b>− {inr(exampleCut)}</b></div>
          <div className="row sb" style={{ margin: "8px 0", borderTop: "1px dashed var(--line-strong)", paddingTop: 10 }}><b>You get</b><b style={{ fontSize: 18 }}>{inr(EXAMPLE_FOOD + EXAMPLE_PACK - exampleCut)}</b></div>
        </div>
      </div>
    </>
  );
}
