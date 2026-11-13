"use client";

import { useCallback, useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { fmtDate, fmtTime, inr } from "@/lib/format";
import { useApp } from "@/lib/store";
import { ConfirmModal } from "@/components/ui";

interface Row {
  id: string; name: string; phone: string; vehicle_no: string; status: string; docs_ok: boolean; is_online: boolean; last_seen: string | null;
  trips_30d: number; balance: number; busy: boolean;
}

export default function OpsPartners() {
  const { run } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [toSuspend, setToSuspend] = useState<Row | null>(null);
  const load = useCallback(() => run(get<Row[]>("/v1/ops/partners")).then((r) => r && setRows(r)), [run]);
  useEffect(() => { void load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);

  const set = async (id: string, body: object, ok: string) => {
    if (await run(post(`/v1/ops/partners/${id}/status`, body).then(() => true), ok)) void load();
  };
  return (
    <>
      {toSuspend && (
        <ConfirmModal
          title={`Suspend ${toSuspend.name || "this partner"}?`}
          message="They go offline at once and cannot take deliveries until you approve them again."
          confirmLabel="Suspend partner"
          onConfirm={() => set(toSuspend.id, { status: "suspended", reason: "Suspended by InnTown Ops" }, "Partner suspended")}
          onClose={() => setToSuspend(null)}
        />
      )}
      <div className="ph"><div><h1>Partners</h1><div className="muted sm">Approve partners after checking licence, RC, insurance and pollution certificate.</div></div></div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead><tr><th>Partner</th><th>Vehicle</th><th>Now</th><th className="num">Trips 30d</th><th className="num">Balance</th><th>Documents</th><th>Status</th><th /></tr></thead>
            <tbody>
              {!rows ? <tr><td colSpan={9}><div className="empty">Loading…</div></td></tr> : rows.length ? rows.map((p) => (
                <tr key={p.id}>
                  <td><b style={{ fontWeight: 600 }}>{p.name || "—"}</b><div className="xs muted">{p.phone}</div></td>
                  <td className="sm">{p.vehicle_no}</td>
                  <td className="sm">{p.busy ? <span className="tag t-info">On a delivery</span> : p.is_online ? <span className="tag t-ok">Online</span> : <span className="muted">Offline</span>}
                    {p.last_seen && <div className="xs muted">seen {fmtTime(p.last_seen)}</div>}</td>
                  <td className="num">{p.trips_30d}</td>
                  <td className="num" title="Positive: InnTown owes the partner. Negative: partner holds COD cash.">{inr(p.balance)}</td>
                  <td>{p.docs_ok ? <span className="tag t-ok">Checked</span> : <button className="btn o s" onClick={() => set(p.id, { docs_ok: true }, "Documents marked as checked")}>Mark checked</button>}</td>
                  <td><span className={`tag ${p.status === "active" ? "t-ok" : p.status === "pending" ? "t-warn" : "t-bad"}`}>{p.status}</span></td>
                  <td>
                    {p.status === "active"
                      ? <button className="btn d s" onClick={() => setToSuspend(p)}>Suspend</button>
                      : <button className="btn s" onClick={() => set(p.id, { status: "active", docs_ok: true }, "Partner approved")}>Approve</button>}
                  </td>
                </tr>
              )) : <tr><td colSpan={9}><div className="empty">No partners yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
