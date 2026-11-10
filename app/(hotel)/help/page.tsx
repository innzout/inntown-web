"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { FAQ } from "@/lib/content";
import { useApp } from "@/lib/store";

export default function HelpPage() {
  const { toast } = useApp();
  const [open, setOpen] = useState(-1);
  return (
    <>
      <div className="ph">
        <div>
          <h1>Help</h1>
          <div className="muted sm">Answers and ways to reach InnTown support.</div>
        </div>
      </div>
      <div className="grid2" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="col" style={{ gap: 12 }}>
          <div className="card">
            <div className="row">
              <span className="nic" style={{ width: 42, height: 42, borderRadius: 12 }}><Icon name="phone" color="var(--leaf)" /></span>
              <div>
                <b>Call support</b>
                <div className="sm muted">10 am to 10 pm</div>
              </div>
            </div>
            {/* TODO: real support number and WhatsApp link once registered. */}
            <button className="btn full" style={{ marginTop: 12 }} onClick={() => toast("Support number will be added before launch")}>Call InnTown</button>
          </div>
          <div className="card">
            <b>WhatsApp</b>
            <div className="sm muted">Send a message and we reply within minutes.</div>
            <button className="btn o full" style={{ marginTop: 12 }} onClick={() => toast("WhatsApp number will be added before launch")}>Chat on WhatsApp</button>
          </div>
        </div>
        <div className="card">
          <div className="bh" style={{ fontSize: 19, marginBottom: 4 }}>Common questions</div>
          {FAQ.map(([q, a], i) => (
            <div className="faq" key={q}>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{q}</span>
                <Icon name={open === i ? "chevD" : "chevR"} size={18} color="var(--ink-muted)" />
              </button>
              {open === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
