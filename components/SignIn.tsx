"use client";

import { useState } from "react";
import { ApiError, auth, type Role } from "@/lib/api";
import { useApp } from "@/lib/store";
import { check, LIMITS, onlyDigits } from "@/lib/validate";
import { Icon } from "./Icon";
import { Logo, OtpInput } from "./ui";

/** Phone + 6-digit code sign-in for hotel owners and ops staff. */
export function SignIn({ role, title, points, onDone }: { role: Role; title: string; points: string[]; onDone: () => void }) {
  const { signIn } = useApp();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const phoneErr = phone.length === LIMITS.phone ? check.phone(phone) : "";

  const send = async () => {
    if (busy || check.phone(phone)) return;
    setBusy(true);
    setErr("");
    try {
      const r = await auth.send(phone, role);
      setDevCode(r.dev_code ?? "");
      setCode("");
      setStep("code");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async (c = code) => {
    if (busy || !/^\d{6}$/.test(c)) return; // no double submit; codes are 6 digits
    setBusy(true);
    setErr("");
    try {
      const r = await auth.verify(phone, role, c);
      await signIn(r.token, r.user);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="l">
        <div className="row" style={{ gap: 12 }}>
          <Logo size={46} />
          <span className="bh" style={{ fontSize: 36 }}>Inn<span style={{ color: "var(--turmeric)" }}>Town</span></span>
        </div>
        <h1 style={{ fontSize: 38, maxWidth: 460 }}>{title}</h1>
        <div className="col" style={{ gap: 12, marginTop: 8 }}>
          {points.map((t) => (
            <div className="ft" key={t}><i><Icon name="check" size={18} color="#F2B21B" stroke={2.6} /></i>{t}</div>
          ))}
        </div>
      </div>
      <div className="r">
        <div className="box">
          <h2 style={{ fontSize: 28 }}>Sign in</h2>
          <p className="muted">{step === "code" ? `Enter the 6-digit code sent to +91 ${phone}` : "Use the mobile number registered with InnTown."}</p>
          {step === "phone" ? (
            <form onSubmit={(e) => { e.preventDefault(); void send(); }}>
              <label className="fl" htmlFor="ph">Mobile number</label>
              <div className="row">
                <b>+91</b>
                <input className="fld" id="ph" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" autoFocus
                  value={phone} onChange={(e) => setPhone(onlyDigits(e.target.value, LIMITS.phone))} aria-invalid={!!phoneErr} />
              </div>
              {phoneErr && <div className="err">{phoneErr}</div>}
              {err && <div className="err" role="alert">{err}</div>}
              <button className="btn full" style={{ marginTop: 16 }} disabled={!!check.phone(phone) || busy}>{busy ? "Sending…" : "Send code"}</button>
            </form>
          ) : (
            <>
              <OtpInput length={6} value={code} bad={!!err} onChange={(v) => { setCode(v); setErr(""); }} onEnter={() => verify()} />
              {err && <div className="err" role="alert" style={{ textAlign: "center" }}>{err}</div>}
              <button className="btn full" style={{ marginTop: 18 }} disabled={code.length !== 6 || busy} onClick={() => verify()}>{busy ? "Checking…" : "Verify and sign in"}</button>
              <button className="btn g full" style={{ marginTop: 6 }} onClick={() => { setStep("phone"); setErr(""); }}>Change number</button>
              {devCode && (
                <div className="demo" style={{ marginTop: 16 }}>
                  Dev mode: no SMS is sent. The code is <b>{devCode}</b>.{" "}
                  <button className="btn g s" style={{ minHeight: 30 }} onClick={() => { setCode(devCode); void verify(devCode); }}>Use it</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
