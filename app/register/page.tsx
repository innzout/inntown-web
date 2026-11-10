"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { post, type Hotel } from "@/lib/api";
import { useApp } from "@/lib/store";


export default function RegisterPage() {
  const { ready, user, hotel, setHotel, run, toast, signOut } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", address: "", area: "", fssai: "", food_type: "both", lat: 11.1394, lng: 78.5986 });
  const [located, setLocated] = useState(false);
  const [err, setErr] = useState("");
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
    if (!f.name.trim()) return setErr("Enter your hotel name.");
    if (f.fssai && !/^\d{14}$/.test(f.fssai)) return setErr("FSSAI number has 14 digits.");
    setErr("");
    const h = await run(post<Hotel>("/v1/hotel/me", { ...f, name: f.name.trim() }));
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
      <p className="muted">The first month is free. You keep 100% of your food sales.</p>
      <div className="card col" style={{ gap: 12 }}>
        <div><label className="fl" htmlFor="r_name">Hotel name</label><input className="fld" id="r_name" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></div>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="fl" htmlFor="r_phone">Hotel phone</label><input className="fld" id="r_phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
          <div><label className="fl" htmlFor="r_fssai">FSSAI number</label><input className="fld" id="r_fssai" inputMode="numeric" value={f.fssai} onChange={(e) => set("fssai", e.target.value.replace(/\D/g, "").slice(0, 14))} /></div>
        </div>
        <div><label className="fl" htmlFor="r_addr">Address</label><input className="fld" id="r_addr" value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="fl" htmlFor="r_area">Area</label><input className="fld" id="r_area" placeholder="For example, Gandhi Road" value={f.area} onChange={(e) => set("area", e.target.value)} /></div>
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
        <button className="btn full" onClick={submit}>Register hotel</button>
        <button className="btn g full" onClick={() => { signOut(); router.replace("/login"); }}>Use a different number</button>
      </div>
    </div>
  );
}
