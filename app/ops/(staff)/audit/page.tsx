"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";
import { useApp } from "@/lib/store";

interface Row { id: number; actor: string; action: string; entity: string; entity_id: string; data: unknown; at: string }

export default function OpsAudit() {
  const { run } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { run(get<Row[]>("/v1/ops/audit?limit=300")).then((r) => r && setRows(r)); }, [run]);

  return (
    <>
      <div className="ph"><div><h1>Audit log</h1><div className="muted sm">Every approval, status change, assignment, cancellation and plan payment.</div></div></div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th><th>Details</th></tr></thead>
            <tbody>
              {!rows ? <tr><td colSpan={5}><div className="empty">Loading…</div></td></tr> : rows.length ? rows.map((a) => (
                <tr key={a.id}>
                  <td className="sm">{fmtDate(a.at)}, {fmtTime(a.at)}</td>
                  <td className="sm">{a.actor}</td>
                  <td><code className="sm">{a.action}</code></td>
                  <td className="sm">{a.entity} <span className="xs muted">{a.entity_id.slice(0, 8)}</span></td>
                  <td className="xs muted" style={{ maxWidth: 360, wordBreak: "break-word" }}>{a.data && Object.keys(a.data as object).length ? JSON.stringify(a.data) : ""}</td>
                </tr>
              )) : <tr><td colSpan={5}><div className="empty">Nothing yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
