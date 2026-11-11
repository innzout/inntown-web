"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { api, type Support } from "@/lib/api";
import { FAQ } from "@/lib/content";
import { useApp } from "@/lib/store";

/** Digits only, with India's 91 added to a bare 10-digit mobile number. */
function withCountryCode(n: string): string {
  const digits = n.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export default function HelpPage() {
  const { toast } = useApp();
  const [open, setOpen] = useState(-1);
  // Contacts are server settings (SUPPORT_*), so a new number needs no web release.
  const [support, setSupport] = useState<Support | null>(null);
  useEffect(() => {
    api<{ support: Support }>("GET", "/v1/app/config")
      .then((c) => setSupport(c.support))
      .catch(() => setSupport({ phone: "", whatsapp: "", email: "" }));
  }, []);
  const notYet = () => toast(support?.email ? `Write to ${support.email} for now` : "Support contacts are being set up");
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
            {support?.phone ? (
              <a className="btn full" style={{ marginTop: 12 }} href={`tel:+${withCountryCode(support.phone)}`}>Call InnTown</a>
            ) : (
              <button className="btn full" style={{ marginTop: 12 }} disabled={!support} onClick={notYet}>Call InnTown</button>
            )}
          </div>
          <div className="card">
            <b>WhatsApp</b>
            <div className="sm muted">Send a message and we reply within minutes.</div>
            {support?.whatsapp ? (
              <a className="btn o full" style={{ marginTop: 12 }} href={`https://wa.me/${withCountryCode(support.whatsapp)}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            ) : (
              <button className="btn o full" style={{ marginTop: 12 }} disabled={!support} onClick={notYet}>Chat on WhatsApp</button>
            )}
          </div>
          {support?.email && (
            <div className="card">
              <b>Email</b>
              <div className="sm muted">For bills, commission and anything that needs a record.</div>
              <a className="btn o full" style={{ marginTop: 12 }} href={`mailto:${support.email}`}>{support.email}</a>
            </div>
          )}
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
