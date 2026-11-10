"use client";

import type { ReactNode } from "react";
import type { Order } from "@/lib/api";
import { fmtDate, fmtTime, inr } from "@/lib/format";
import { Modal, PayTag, StatusTag, VegMark } from "./ui";

const CLOSED = ["rejected", "expired", "cancelled"];

/** Order details. `as` decides the money lines: the hotel sees what it earns, ops sees everything. */
export function OrderDetail({ o, as, onClose, children }: { o: Order; as: "hotel" | "ops"; onClose: () => void; children?: ReactNode }) {
  const earnLabel = as === "ops" ? "Customer paid" : o.status === "delivered" ? "You earned" : CLOSED.includes(o.status) ? "Not earned" : "You earn";
  return (
    <Modal onClose={onClose} wide={as === "ops"}>
      <div className="row sb">
        <h2>Order #{o.no}</h2>
        <StatusTag status={o.status} />
      </div>
      <div className="sm muted" style={{ marginBottom: 12 }}>
        {fmtDate(o.placed_at)}, {fmtTime(o.placed_at)} · {o.customer_name}
        {as === "ops" ? ` (${o.customer_phone ?? ""}) · ${o.hotel_name} · ${o.address}` : `, ${o.address}`}
      </div>
      <div className="card" style={{ padding: "10px 14px" }}>
        {o.items.map((i, k) => (
          <div className="row sb" key={k} style={{ margin: "6px 0" }}>
            <span className="row gap6">
              <VegMark t={i.food_type} /> {i.qty} × {i.name}
            </span>
            <b>{inr(i.qty * i.price)}</b>
          </div>
        ))}
      </div>
      {o.note && <div className="note" style={{ marginTop: 10 }}>Note: {o.note}</div>}
      <div style={{ margin: "12px 0" }}>
        <div className="row sb sm"><span>Food total</span><span>{inr(o.subtotal)}</span></div>
        <div className="row sb sm"><span>Packaging</span><span>{inr(o.pack_fee)}</span></div>
        <div className="row sb sm muted"><span>Delivery fee (goes to the partner)</span><span>{as === "ops" ? inr(o.delivery_fee) : "Not yours"}</span></div>
        <div className="row sb" style={{ borderTop: "1px dashed var(--line-strong)", marginTop: 8, paddingTop: 8 }}>
          <b>{earnLabel}</b>
          <b style={{ fontSize: 18 }}>{inr(as === "ops" ? o.total : o.subtotal + o.pack_fee)}</b>
        </div>
      </div>
      <div className="row wrap">
        <PayTag pay={o.pay_method} />
        <span className="xs muted">Payment: {o.pay_status.replace("_", " ")}</span>
      </div>
      {o.partner_name && (
        <div className="sm" style={{ marginTop: 8 }}>
          Delivery partner: <b>{o.partner_name}</b>
          {as === "ops" && o.partner_phone ? ` (${o.partner_phone})` : ""}
        </div>
      )}
      {o.closed_reason && <div className="sm muted" style={{ marginTop: 6 }}>{o.closed_reason}</div>}
      {children}
      <button className="btn o full" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
    </Modal>
  );
}
