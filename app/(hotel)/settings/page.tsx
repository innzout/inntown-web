"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";
import { patch, put, type Hotel, type Hours } from "@/lib/api";
import { DAYS } from "@/lib/content";
import { useApp } from "@/lib/store";

// Monday first, like a printed timetable.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function SettingsPage() {
  const { hotel, setHotel, sound, setSound, beep, run, toast } = useApp();
  // Edit a copy; nothing changes until Save.
  const [f, setF] = useState(() => ({
    name: hotel!.name, phone: hotel!.phone, address: hotel!.address, area: hotel!.area, fssai: hotel!.fssai,
    food_type: hotel!.food_type, prep_min: hotel!.prep_min, pack_fee: hotel!.pack_fee, upi: hotel!.upi,
  }));
  const [hours, setHours] = useState<Hours[]>(() => WEEK.map((d) => hotel!.hours.find((h) => h.dow === d) ?? { dow: d, is_open: true, opens: "10:30", closes: "22:30" }));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const setHour = (dow: number, p: Partial<Hours>) => setHours((hs) => hs.map((h) => (h.dow === dow ? { ...h, ...p } : h)));

  const save = async () => {
    if (!f.name.trim()) return toast("Hotel name cannot be empty");
    if (!/^\d{10}$/.test(f.phone)) return toast("Enter a 10-digit phone number");
    if (f.fssai && !/^\d{14}$/.test(f.fssai)) return toast("FSSAI number has 14 digits");
    if (hours.some((h) => h.is_open && h.opens >= h.closes)) return toast("Each open day must open before it closes");
    setBusy(true);
    const h = await run(patch<Hotel>("/v1/hotel/me", { ...f, name: f.name.trim() }));
    const hs = h && (await run(put<Hours[]>("/v1/hotel/me/hours", hours)));
    setBusy(false);
    if (h && hs) {
      setHotel({ ...h, hours: hs });
      toast("Store settings saved");
    }
  };

  const text = (label: string, k: "name" | "phone" | "address" | "area" | "fssai" | "upi", type = "text") => (
    <div>
      <label className="fl" htmlFor={`s_${k}`}>{label}</label>
      <input className="fld" id={`s_${k}`} type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <>
      <div className="ph">
        <div><h1>Store settings</h1><div className="muted sm">Your hotel details, opening hours and order settings.</div></div>
        <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
      <div className="grid2">
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <div className="bh" style={{ fontSize: 18, marginBottom: 12 }}>Hotel details</div>
            <div className="col" style={{ gap: 12 }}>
              {text("Hotel name", "name")}
              {text("Phone number", "phone", "tel")}
              {text("Address", "address")}
              {text("Area", "area")}
              {text("FSSAI licence number", "fssai")}
              <div>
                <label className="fl" htmlFor="s_type">Food type</label>
                <select className="fld" id="s_type" value={f.food_type} onChange={(e) => set("food_type", e.target.value as Hotel["food_type"])}>
                  <option value="veg">Pure veg</option><option value="nonveg">Non-veg</option><option value="both">Both</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="bh" style={{ fontSize: 18, marginBottom: 12 }}>Orders</div>
            <div className="col" style={{ gap: 12 }}>
              <div><label className="fl" htmlFor="s_prep">Usual preparation time (minutes)</label><input className="fld" id="s_prep" type="number" min={5} max={90} value={f.prep_min} onChange={(e) => set("prep_min", +e.target.value)} /></div>
              <div><label className="fl" htmlFor="s_pack">Packaging charge per order (₹)</label><input className="fld" id="s_pack" type="number" min={0} max={50} value={f.pack_fee} onChange={(e) => set("pack_fee", +e.target.value)} /></div>
              <div className="row sb">
                <div><b>Order alert sound</b><div className="xs muted">Plays on this device when a new order arrives</div></div>
                <Switch on={sound} label="Order sound" onChange={() => { setSound(!sound); if (!sound) setTimeout(beep, 50); }} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="bh" style={{ fontSize: 18, marginBottom: 12 }}>Payout details</div>
            {text("UPI ID", "upi")}
            <div className="xs muted" style={{ marginTop: 8 }}>To add or change a bank account, contact InnTown support.</div>
          </div>
        </div>
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="bh" style={{ fontSize: 18, marginBottom: 4 }}>Opening hours</div>
          <div className="xs muted" style={{ marginBottom: 10 }}>Customers can only order during these hours when your store is switched to Open.</div>
          {hours.map((h) => (
            <div className="row hours" key={h.dow}>
              <b style={{ width: 44 }}>{DAYS[h.dow]}</b>
              <Switch on={h.is_open} label={`${DAYS[h.dow]} open`} onChange={() => setHour(h.dow, { is_open: !h.is_open })} />
              {h.is_open ? (
                <>
                  <input className="fld" type="time" value={h.opens} aria-label={`${DAYS[h.dow]} opens`} onChange={(e) => setHour(h.dow, { opens: e.target.value })} />
                  <span className="muted">to</span>
                  <input className="fld" type="time" value={h.closes} aria-label={`${DAYS[h.dow]} closes`} onChange={(e) => setHour(h.dow, { closes: e.target.value })} />
                </>
              ) : <span className="muted sm">Closed all day</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
