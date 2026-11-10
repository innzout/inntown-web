"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { OrderDetail } from "@/components/OrderDetail";
import { Modal, OtpInput, PayTag, Stat, VegMark } from "@/components/ui";
import { ApiError, get, post, type Earnings, type Order } from "@/lib/api";
import { PREP_TIMES, REJECT_REASONS } from "@/lib/content";
import { fmtTime, inr, mmss, toMs } from "@/lib/format";
import { hotelEarn, useApp } from "@/lib/store";

const COLS: [Order["status"], string, string][] = [
  ["placed", "New", "No new orders"],
  ["preparing", "Preparing", "Nothing here"],
  ["ready", "Ready for pickup", "Nothing here"],
  ["picked", "On the way", "Nothing here"],
];
const ACCEPT_MS = 120_000;
const DEV = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEV_TOOLS === "1";

type Dialog = { k: "accept" | "reject" | "handover" | "detail"; id: string } | null;

export default function OrdersPage() {
  const { hotel, orders, now, upsertOrder, run, toast } = useApp();
  const [dlg, setDlg] = useState<Dialog>(null);
  const [prep, setPrep] = useState(hotel?.prep_min ?? 20);
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const [bad, setBad] = useState("");
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState<Earnings | null>(null);
  const o = dlg ? orders.find((x) => x.id === dlg.id) : undefined;
  const delivered = orders.length; // refresh today's numbers when the board changes

  useEffect(() => {
    get<Earnings>("/v1/hotel/earnings?days=1").then(setToday).catch(() => {});
  }, [delivered]);

  const open = (k: NonNullable<Dialog>["k"], id: string) => {
    setPrep(hotel?.prep_min ?? 20);
    setReason("");
    setCode("");
    setBad("");
    setDlg({ k, id });
  };
  const close = () => setDlg(null);
  const act = async (path: string, body: unknown, ok: string) => {
    setBusy(true);
    const r = await run(post<Order>(path, body), ok);
    setBusy(false);
    if (r) {
      upsertOrder(r);
      close();
    }
  };
  const handOver = async (ord: Order) => {
    setBusy(true);
    try {
      upsertOrder(await post<Order>(`/v1/hotel/orders/${ord.id}/handover`, { otp: code }));
      toast(`Order #${ord.no} handed to ${ord.partner_name}`);
      close();
    } catch (e) {
      setBad(e instanceof ApiError ? e.message : "Could not hand over.");
    } finally {
      setBusy(false);
    }
  };
  // Dev only: the API places a random order as the demo customer.
  const simulate = () => run(post("/v1/dev/simulate-order", { hotel_id: hotel?.id }));

  const card = (ord: Order) => {
    const left = toMs(ord.accept_by) - now;
    const urgent = ord.status === "placed" && left < 30_000;
    const prepLeft = ord.accepted_at ? (toMs(ord.accepted_at) + ord.prep_min * 60_000 - now) / 1000 : 0;
    return (
      <div className={`oc ${urgent ? "urgent" : ""}`} key={ord.id}>
        <div className="row sb">
          <button className="btn g s num" onClick={() => open("detail", ord.id)} aria-label={`Order ${ord.no} details`}>#{ord.no}</button>
          <span className="xs muted">{fmtTime(ord.placed_at)}</span>
        </div>
        <div className="xs muted">{ord.customer_name} · {ord.address}</div>
        <div className="it">
          {ord.items.map((i, k) => (
            <div key={k}>
              <VegMark t={i.food_type} />
              <span><b>{i.qty} ×</b> {i.name}</span>
            </div>
          ))}
        </div>
        {ord.note && <div className="note">Note: {ord.note}</div>}
        <div className="row sb" style={{ marginTop: 4 }}>
          <b>{inr(hotelEarn(ord))}</b>
          <PayTag pay={ord.pay_method} />
        </div>

        {ord.status === "placed" && (
          <>
            <div className="row sb xs">
              <span className="muted">Accept within</span>
              <b style={{ color: urgent ? "var(--danger)" : undefined }}>{mmss(left / 1000)}</b>
            </div>
            <div className={`bar ${urgent ? "warn" : ""}`} aria-hidden="true">
              <i style={{ width: `${Math.max(0, (left / ACCEPT_MS) * 100)}%` }} />
            </div>
            <div className="row">
              <button className="btn grow" onClick={() => open("accept", ord.id)}><Icon name="check" size={18} /> Accept</button>
              <button className="btn d" onClick={() => open("reject", ord.id)}>Reject</button>
            </div>
          </>
        )}
        {ord.status === "preparing" && (
          <>
            <div className="row sb sm" style={{ margin: "8px 0" }}>
              <span className="row gap6" style={{ color: prepLeft < 0 ? "var(--danger)" : undefined }}>
                <Icon name="clock" size={16} color="var(--leaf)" />
                {prepLeft >= 0 ? `Ready in ${mmss(prepLeft)}` : `Late by ${mmss(-prepLeft)}`}
              </span>
              {ord.partner_name ? (
                <span className="row gap6 xs"><Icon name="bike" size={16} color="var(--info)" /> {ord.partner_name} assigned</span>
              ) : (
                <span className="xs muted">Finding a partner…</span>
              )}
            </div>
            <div className="row">
              <button className="btn grow" disabled={busy} onClick={() => act(`/v1/hotel/orders/${ord.id}/ready`, {}, `Order #${ord.no} is ready for pickup`)}>Mark ready</button>
              {ord.partner_name && <button className="btn o" onClick={() => open("handover", ord.id)}>Hand over</button>}
            </div>
          </>
        )}
        {ord.status === "ready" && (
          <>
            <div className="row gap6 xs" style={{ margin: "8px 0" }}>
              <Icon name="bike" size={16} color="var(--info)" /> {ord.partner_name ? `${ord.partner_name} is coming` : "Finding a partner…"}
            </div>
            <button className="btn y full" disabled={!ord.partner_name} onClick={() => open("handover", ord.id)}>Hand over to partner</button>
          </>
        )}
        {ord.status === "picked" && (
          <div className="row sb sm" style={{ margin: "8px 0" }}>
            <span className="row gap6"><Icon name="bike" size={16} color="var(--info)" /> {ord.partner_name} · on the way</span>
            {ord.picked_at && <span className="xs muted">Picked up {fmtTime(ord.picked_at)}</span>}
          </div>
        )}
      </div>
    );
  };

  const waiting = orders.filter((x) => x.status === "placed").length;
  return (
    <>
      <div className="ph">
        <div>
          <h1>Live orders</h1>
          <div className="muted sm">Orders appear here as customers place them. Accept within 2 minutes.</div>
        </div>
        {DEV && (
          <button className="btn o" onClick={simulate} disabled={!hotel?.accepting} title="Dev only: places a test order as the demo customer">
            <Icon name="plus" size={18} /> Simulate new order
          </button>
        )}
      </div>

      <div className="stats">
        <Stat label="Delivered today" value={today?.orders ?? "–"} icon={<Icon name="orders" />} />
        <Stat label="Sales today" value={today ? inr(today.total) : "–"} icon={<Icon name="wallet" />} />
        <Stat label="New (need action)" value={waiting} icon={<Icon name="bell" />} />
        <Stat label="Your rating" value={hotel?.reviews ? `${hotel.rating} / 5` : "New"} icon={<Icon name="star" />} />
      </div>

      <div className="kan">
        {COLS.map(([k, title, empty]) => {
          const list = orders.filter((x) => x.status === k);
          return (
            <section className={`kc ${k === "placed" ? "new" : k}`} key={k} aria-label={title}>
              <h3>{title}<span className="n">{list.length}</span></h3>
              {list.length ? list.map(card) : <div className="empty">{empty}</div>}
            </section>
          );
        })}
      </div>

      {dlg?.k === "accept" && o && (
        <Modal onClose={close}>
          <h2>Accept order #{o.no}</h2>
          <p className="muted sm">How long will it take to prepare? The customer and delivery partner will see this.</p>
          <div className="row wrap" style={{ marginBottom: 18 }}>
            {PREP_TIMES.map((t) => (
              <button key={t} className={`chip ${prep === t ? "on" : ""}`} onClick={() => setPrep(t)} aria-pressed={prep === t}>{t} min</button>
            ))}
          </div>
          <div className="row">
            <button className="btn o grow" onClick={close}>Back</button>
            <button className="btn grow" disabled={busy} onClick={() => act(`/v1/hotel/orders/${o.id}/accept`, { prep_min: prep }, `Order #${o.no} accepted. Ready in ${prep} min`)}>
              Accept · {prep} min
            </button>
          </div>
        </Modal>
      )}
      {dlg?.k === "reject" && o && (
        <Modal onClose={close}>
          <h2>Reject order #{o.no}?</h2>
          <p className="muted sm">The customer gets a full refund at once. Please pick a reason.</p>
          <div className="col" style={{ gap: 8, marginBottom: 16 }}>
            {REJECT_REASONS.map((r) => (
              <button key={r} className={`chip ${reason === r ? "on" : ""}`} style={{ justifyContent: "flex-start", minHeight: 44 }} onClick={() => setReason(r)} aria-pressed={reason === r}>{r}</button>
            ))}
          </div>
          <div className="row">
            <button className="btn o grow" onClick={close}>Keep order</button>
            <button className="btn red grow" disabled={!reason || busy} onClick={() => act(`/v1/hotel/orders/${o.id}/reject`, { reason }, `Order #${o.no} rejected. Customer refunded`)}>
              Reject order
            </button>
          </div>
        </Modal>
      )}
      {dlg?.k === "handover" && o && (
        <Modal onClose={close}>
          <h2>Hand over #{o.no}</h2>
          <p className="muted sm">Ask {o.partner_name} for the 4-digit pickup code shown in their app, and type it here.</p>
          <OtpInput value={code} bad={!!bad} onChange={(v) => { setCode(v); setBad(""); }} onEnter={() => handOver(o)} />
          {bad && <div className="err" role="alert" style={{ textAlign: "center" }}>{bad}</div>}
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn o grow" onClick={close}>Cancel</button>
            <button className="btn grow" disabled={code.length !== 4 || busy} onClick={() => handOver(o)}>Confirm handover</button>
          </div>
        </Modal>
      )}
      {dlg?.k === "detail" && o && <OrderDetail o={o} as="hotel" onClose={close} />}
    </>
  );
}
