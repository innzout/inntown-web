"use client";

import { useCallback, useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { useApp } from "@/lib/store";
import { ConfirmModal } from "@/components/ui";

interface Row { id: string; name: string; phone: string; is_blocked: boolean; orders: number; spent: number; created_at: string }

export default function OpsCustomers() {
  const { run } = useApp();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [toBlock, setToBlock] = useState<Row | null>(null);
  const load = useCallback(() => run(get<Row[]>(`/v1/ops/customers?q=${encodeURIComponent(q)}`)).then((r) => r && setRows(r)), [run, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const block = async (c: Row) => {
    if (await run(post(`/v1/ops/users/${c.id}/block`, { blocked: !c.is_blocked, reason: "Ops" }).then(() => true), c.is_blocked ? "Customer unblocked" : "Customer blocked")) void load();
  };

  return (
    <>
      <div className="ph"><div><h1>Customers</h1><div className="muted sm">Search by phone or name. Blocked customers cannot sign in.</div></div></div>
      <div className="card" style={{ marginBottom: 14 }}>
        <input className="fld" aria-label="Search customers" placeholder="Phone or name" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} />
      </div>
      {toBlock && (
        <ConfirmModal
          title={`Block ${toBlock.name || toBlock.phone}?`}
          message="They are signed out everywhere and cannot sign in or order until you unblock them."
          confirmLabel="Block customer"
          onConfirm={() => block(toBlock)}
          onClose={() => setToBlock(null)}
        />
      )}
      <div className="card" style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead><tr><th>Customer</th><th>Joined</th><th className="num">Orders</th><th className="num">Spent</th><th>Status</th><th /></tr></thead>
            <tbody>
              {!rows ? <tr><td colSpan={6}><div className="empty">Loading…</div></td></tr> : rows.length ? rows.map((c) => (
                <tr key={c.id}>
                  <td><b style={{ fontWeight: 600 }}>{c.name || "—"}</b><div className="xs muted">{c.phone}</div></td>
                  <td className="sm">{fmtDate(c.created_at)}</td>
                  <td className="num">{c.orders}</td>
                  <td className="num">{inr(c.spent)}</td>
                  <td>{c.is_blocked ? <span className="tag t-bad">Blocked</span> : <span className="tag t-ok">Active</span>}</td>
                  <td><button className={`btn s ${c.is_blocked ? "o" : "d"}`} onClick={() => (c.is_blocked ? block(c) : setToBlock(c))}>{c.is_blocked ? "Unblock" : "Block"}</button></td>
                </tr>
              )) : <tr><td colSpan={6}><div className="empty">No customers found.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
