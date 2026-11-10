"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { post, type Hotel } from "@/lib/api";
import { useApp } from "@/lib/store";
import { check, LIMITS, onlyDigits } from "@/lib/validate";


export default function RegisterPage() {
  const { ready, user, hotel, setHotel, run, toast, signOut } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", address: "", area: "", fssai: "", food_type: "both", lat: 11.1394, lng: 78.5986 });
  const [located, setLocated] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const errs = {
    name: check.required(f.name, "your hotel name"),
    phone: check.phone(f.phone),
    fssai: check.fssai(f.fssai),
    address: check.required(f.address, "the address"),
  };
  const show = (k: keyof typeof errs) => (tried && errs[k] ? <div className="err">{errs[k]}</div> : null);
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== "hotel") router.replace("/login");
    else if (hotel) router.replace("/orders");
    else setF((x) => ({ ...x, phone: x.phone || user.phone }));
  }, [ready, user, hotel, router]);

  const locate = () => {
    if (!navigator.geolocation) return toast("This browser cannot share location. The pin stays at the bus stand.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude })); setLocated(true); toast("Location set to where you are now"); },
      () => toast("Location permission was refused. You can set it later in Store settings."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async () => {
    if (busy) return; // no double submit
    setTried(true);
    if (Object.values(errs).some(Boolean)) return setErr("Please fix the fields marked in red.");
    setErr("");
    setBusy(true);
    const h = await run(post<Hotel>("/v1/hotel/me", { ...f, name: f.name.trim(), address: f.address.trim(), area: f.area.trim() }));
    setBusy(false);
    if (h) {
      setHotel(h);
      toast(h.status === "active" ? "Welcome to InnTown! Switch to Open to take orders." : "Registered. InnTown will review and switch you on.");
      router.replace("/orders");
    }
  };

  if (!ready || !user) return null;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px 60px" }}>
      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        <Logo size={34} pin="var(--leaf)" door="#fff" />
        <h1 style={{ fontSize: 28 }}>Register your hotel</h1>
      </div>
      <p className="muted">No monthly fee. A small commission on the food value of delivered orders, and none for your first 30 days.</p>
      <div className="card col" style={{ gap: 12 }}>
        <div><label className="fl" htmlFor="r_name">Hotel name</label><input className="fld" id="r_name" maxLength={LIMITS.name} autoComplete="organization" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus aria-invalid={tried && !!errs.name} />{show("name")}</div>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="fl" htmlFor="r_phone">Hotel phone</label><input className="fld" id="r_phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={f.phone} onChange={(e) => set("phone", onlyDigits(e.target.value, LIMITS.phone))} aria-invalid={tried && !!errs.phone} />{show("phone")}</div>
          <div><label className="fl" htmlFor="r_fssai">FSSAI number</label><input className="fld" id="r_fssai" inputMode="numeric" value={f.fssai} onChange={(e) => set("fssai", onlyDigits(e.target.value, LIMITS.fssai))} aria-invalid={tried && !!errs.fssai} />{show("fssai")}</div>
        </div>
        <div><label className="fl" htmlFor="r_addr">Address</label><input className="fld" id="r_addr" maxLength={LIMITS.address} autoComplete="street-address" value={f.address} onChange={(e) => set("address", e.target.value)} aria-invalid={tried && !!errs.address} />{show("address")}</div>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="fl" htmlFor="r_area">Area</label><input className="fld" id="r_area" maxLength={LIMITS.area} placeholder="For example, Gandhi Road" value={f.area} onChange={(e) => set("area", e.target.value)} /></div>
          <div>
            <label className="fl" htmlFor="r_type">Food type</label>
            <select className="fld" id="r_type" value={f.food_type} onChange={(e) => set("food_type", e.target.value)}>
              <option value="veg">Pure veg</option><option value="nonveg">Non-veg</option><option value="both">Both</option>
            </select>
          </div>
        </div>
        <div className="row sb wrap">
          <span className="sm muted">Map pin: {f.lat.toFixed(4)}, {f.lng.toFixed(4)} {located ? "(your location)" : "(Thuraiyur bus stand)"}</span>
          <button className="btn o s" onClick={locate}>Use my location</button>
        </div>
        <div className="banner info sm">No monthly fee. After your first 30 days, InnTown takes a small commission on the food value of delivered orders only.</div>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn full" onClick={submit} disabled={busy}>{busy ? "Registering…" : "Register hotel"}</button>
        <button className="btn g full" onClick={() => { signOut(); router.replace("/login"); }}>Use a different number</button>
      </div>
    </div>
  );
}
