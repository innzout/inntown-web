"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Switch, Tabs } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { useApp } from "@/lib/store";

interface Row {
  id: string; name: string; area: string; phone: string; owner_phone: string; fssai: string; status: string; is_open: boolean; featured: boolean;
  commission_free_until: string | null; orders_30d: number; commission_30d: number; rating: number;
}
type F = "" | "pending" | "active" | "paused" | "suspended";

export default function OpsHotels() {
  const { run } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [f, setF] = useState<F>("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<{ row: Row; status: string } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => run(get<Row[]>(`/v1/ops/hotels?status=${f}&q=${encodeURIComponent(q)}`)).then((r) => r && setRows(r)), [run, f, q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const save = async (id: string, body: object, ok: string) => {
    if (await run(post(`/v1/ops/hotels/${id}/status`, body).then(() => true), ok)) { setSel(null); void load(); }
  };

  return (
    <>
      <div className="ph"><div><h1>Hotels</h1><div className="muted sm">Approve new hotels, pause or suspend them, and choose featured listings.</div></div></div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row wrap">
          <input className="fld" aria-label="Search hotels" placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
          <Tabs<F> value={f} options={[["", "All"], ["pending", "Waiting"], ["active", "Active"], ["paused", "Paused"], ["suspended", "Suspended"]]} onChange={setF} />
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead><tr><th>Hotel</th><th>Phone</th><th>FSSAI</th><th>Commission</th><th className="num">Orders 30d</th><th className="num">Commission 30d</th><th>Featured</th><th>Status</th><th /></tr></thead>
            <tbody>
              {!rows ? <tr><td colSpan={8}><div className="empty">Loading…</div></td></tr> : rows.length ? rows.map((h) => (
                <tr key={h.id}>
                  <td><b style={{ fontWeight: 600 }}>{h.name}</b><div className="xs muted">{h.area} · {h.is_open ? "open now" : "closed"} · ★ {h.rating || "–"}</div></td>
                  <td className="sm">{h.phone}<div className="xs muted">owner {h.owner_phone}</div></td>
                  <td className="sm">{h.fssai || <span className="tag t-bad">Missing</span>}</td>
                  <td className="sm">{!h.commission_free_until ? "Starts on approval" : new Date(h.commission_free_until).getTime() > Date.now() ? `Free until ${fmtDate(h.commission_free_until)}` : "Paying"}</td>
                  <td className="num">{h.orders_30d}</td>
                  <td><Switch on={h.featured} label={`Featured: ${h.name}`} onChange={() => save(h.id, { featured: !h.featured }, h.featured ? "Removed from featured" : "Featured")} /></td>
                  <td><span className={`tag ${h.status === "active" ? "t-ok" : h.status === "pending" ? "t-warn" : "t-bad"}`}>{h.status}</span></td>
                  <td>
                    {h.status === "pending" ? <button className="btn s" onClick={() => save(h.id, { status: "active" }, `${h.name} is live`)}>Approve</button>
                      : <button className="btn o s" onClick={() => { setReason(""); setSel({ row: h, status: h.status === "active" ? "paused" : "active" }); }}>Change</button>}
                  </td>
                </tr>
              )) : <tr><td colSpan={8}><div className="empty">No hotels.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <Modal onClose={() => setSel(null)}>
          <h2>{sel.row.name}</h2>
          <div className="row wrap" style={{ margin: "12px 0" }}>
            {["active", "paused", "suspended"].map((s) => <button key={s} className={`chip ${sel.status === s ? "on" : ""}`} onClick={() => setSel({ ...sel, status: s })}>{s}</button>)}
          </div>
          <label className="fl" htmlFor="h_reason">Reason (the hotel sees this)</label>
          <input className="fld" id="h_reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, FSSAI licence expired" />
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn o grow" onClick={() => setSel(null)}>Cancel</button>
            <button className="btn grow" disabled={sel.status !== "active" && !reason.trim()} onClick={() => save(sel.row.id, { status: sel.status, reason }, "Saved")}>Save</button>
          </div>
        </Modal>
      )}
    </>
  );
}
