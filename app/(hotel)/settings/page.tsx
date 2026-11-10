"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";
import { patch, put, type Hotel, type Hours } from "@/lib/api";
import { DAYS } from "@/lib/content";
import { check, LIMITS, onlyDigits, rupees } from "@/lib/validate";
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
    if (busy) return; // no double submit
    if (f.prep_min < 5) return toast("Preparation time is 5 to 90 minutes");
    const bad = check.required(f.name, "the hotel name") || check.phone(f.phone) || check.fssai(f.fssai) || check.upi(f.upi);
    if (bad) return toast(bad);
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

  // Per-field limits and filters, so a value can never be longer or stranger than the API accepts.
  const FIELD = {
    name: { max: LIMITS.name, digits: false, err: () => check.required(f.name, "the hotel name") },
    phone: { max: LIMITS.phone, digits: true, err: () => (f.phone.length === LIMITS.phone || !f.phone ? check.phone(f.phone) : "") },
    address: { max: LIMITS.address, digits: false, err: () => "" },
    area: { max: LIMITS.area, digits: false, err: () => "" },
    fssai: { max: LIMITS.fssai, digits: true, err: () => (f.fssai.length === LIMITS.fssai ? check.fssai(f.fssai) : "") },
    upi: { max: LIMITS.upi, digits: false, err: () => (f.upi.includes("@") ? check.upi(f.upi) : "") },
  } as const;
  const text = (label: string, k: keyof typeof FIELD, type = "text") => {
    const { max, digits, err } = FIELD[k];
    const msg = err();
    return (
      <div>
        <label className="fl" htmlFor={`s_${k}`}>{label}</label>
        <input className="fld" id={`s_${k}`} type={type} maxLength={max} inputMode={digits ? "numeric" : undefined} aria-invalid={!!msg}
          value={f[k]} onChange={(e) => set(k, digits ? onlyDigits(e.target.value, max) : e.target.value)} />
        {msg && <div className="err">{msg}</div>}
      </div>
    );
  };

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
              <div><label className="fl" htmlFor="s_prep">Usual preparation time (minutes)</label><input className="fld" id="s_prep" inputMode="numeric" maxLength={2} value={f.prep_min || ""} onChange={(e) => set("prep_min", rupees(e.target.value, 90))} aria-invalid={f.prep_min < 5} />{f.prep_min < 5 && <div className="err">Between 5 and 90 minutes.</div>}</div>
              <div><label className="fl" htmlFor="s_pack">Packaging charge per order (₹)</label><input className="fld" id="s_pack" inputMode="numeric" maxLength={2} value={f.pack_fee} onChange={(e) => set("pack_fee", rupees(e.target.value, LIMITS.packFeeMax))} /><div className="xs muted">₹0 to ₹{LIMITS.packFeeMax}</div></div>
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
