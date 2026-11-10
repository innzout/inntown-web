"use client";

import { useCallback, useEffect, useState } from "react";
import { Stars, Tabs } from "@/components/ui";
import { get, post, type Review } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useApp } from "@/lib/store";

type F = "All" | "Good" | "Low";

export default function ReviewsPage() {
  const { run, toast } = useApp();
  const [list, setList] = useState<Review[] | null>(null);
  const [f, setF] = useState<F>("All");
  const [replying, setReplying] = useState("");
  const [text, setText] = useState("");

  const load = useCallback(() => run(get<Review[]>("/v1/hotel/reviews")).then((r) => r && setList(r)), [run]);
  useEffect(() => { void load(); }, [load]);

  if (!list) return <div className="empty">Loading reviews…</div>;
  const avg = list.length ? list.reduce((a, r) => a + r.stars, 0) / list.length : 0;
  const shown = list.filter((r) => f === "All" || (f === "Low" ? r.stars <= 3 : r.stars >= 4));

  const send = async (id: string) => {
    if (!text.trim()) return toast("Write a reply first");
    const ok = await run(post(`/v1/hotel/reviews/${id}/reply`, { reply: text.trim() }).then(() => true), "Reply sent");
    if (ok) { setReplying(""); void load(); }
  };

  return (
    <>
      <div className="ph">
        <div><h1>Reviews</h1><div className="muted sm">What customers say about your food.</div></div>
        <Tabs<F> value={f} options={[["All", "All"], ["Good", "4–5 stars"], ["Low", "1–3 stars"]]} onChange={setF} />
      </div>
      <div className="grid2" style={{ gridTemplateColumns: "300px 1fr" }}>
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="row">
            <div className="bh" style={{ fontSize: 48 }}>{list.length ? avg.toFixed(1) : "–"}</div>
            <div><Stars n={Math.round(avg)} size={18} /><div className="xs muted">{list.length} reviews</div></div>
          </div>
          <div style={{ marginTop: 10 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const c = list.filter((r) => r.stars === n).length;
              return (
                <div className="rbar" key={n}>
                  <span style={{ width: 12 }}>{n}</span>
                  <span className="t"><i style={{ width: `${list.length ? (c / list.length) * 100 : 0}%` }} /></span>
                  <span className="muted" style={{ width: 18, textAlign: "right" }}>{c}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col" style={{ gap: 12 }}>
          {shown.length ? shown.map((r) => (
            <div className="card" key={r.id}>
              <div className="row sb">
                <div className="row">
                  <span className="avatar">{r.customer[0]}</span>
                  <div><b>{r.customer}</b><div><Stars n={r.stars} size={13} /></div></div>
                </div>
                <span className="xs muted">{fmtDate(r.created_at)} · order #{r.order_no}</span>
              </div>
              {r.text && <p style={{ margin: "10px 0 6px" }}>{r.text}</p>}
              {r.reply ? (
                <div className="reply"><b className="xs">Your reply</b><div>{r.reply}</div></div>
              ) : replying === r.id ? (
                <>
                  <textarea className="fld" aria-label="Your reply" placeholder="Write a short, polite reply" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn s" onClick={() => send(r.id)}>Send reply</button>
                    <button className="btn g s" onClick={() => setReplying("")}>Cancel</button>
                  </div>
                </>
              ) : (
                <button className="btn o s" style={{ marginTop: 6 }} onClick={() => { setText(""); setReplying(r.id); }}>Reply</button>
              )}
            </div>
          )) : <div className="card empty">{list.length ? "No reviews in this filter." : "No reviews yet. Customers can rate an order after it is delivered."}</div>}
        </div>
      </div>
    </>
  );
}
