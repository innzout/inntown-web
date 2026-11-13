"use client";

import { useEffect, useRef, type ReactNode, useState } from "react";
import { StarIcon } from "./Icon";
import type { FoodType, PayMethod } from "@/lib/api";

/** App icon from inntown-mobile/design/logos: map pin with a doorway and turmeric step. */
export function Logo({ size = 30, pin = "#FBF7EF", door = "#1D6B45" }: { size?: number; pin?: string; door?: string }) {
  return (
    <svg width={size} height={size * 1.16} viewBox="0 0 48 56" aria-hidden="true">
      <path d="M24 2C13 2 5 10 5 20c0 13 19 34 19 34s19-21 19-34C43 10 35 2 24 2z" fill={pin} />
      <path d="M17 33V21a7 7 0 0 1 14 0v12z" fill={door} />
      <rect x="13" y="34" width="22" height="3.2" rx="1.6" fill="#F2B21B" />
    </svg>
  );
}

export function VegMark({ t }: { t?: FoodType | "v" | "n" }) {
  const veg = t === "veg" || t === "v";
  return (
    <span className="vm" style={{ color: veg ? "var(--leaf)" : "var(--danger)" }} role="img" aria-label={veg ? "Veg" : "Non-veg"}>
      <i />
    </span>
  );
}

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span role="img" aria-label={`${n} out of 5 stars`} className="row" style={{ gap: 1, display: "inline-flex" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} on={i <= n} size={size} />
      ))}
    </span>
  );
}

export function PayTag({ pay }: { pay: PayMethod }) {
  const cod = pay === "cod";
  return (
    <span className={`tag ${cod ? "t-warn" : "t-info"}`}>{cod ? "Cash on delivery" : pay === "upi" ? "Paid · UPI" : "Paid · Card"}</span>
  );
}

export const STATUS_WORDS: Record<string, string> = {
  placed: "New", preparing: "Preparing", ready: "Ready for pickup", picked: "On the way",
  delivered: "Delivered", rejected: "Rejected", expired: "Not accepted", cancelled: "Cancelled",
};

export function StatusTag({ status }: { status: string }) {
  const cls = status === "delivered" ? "t-ok" : ["rejected", "cancelled", "expired"].includes(status) ? "t-bad" : "t-info";
  return <span className={`tag ${cls}`}>{STATUS_WORDS[status] ?? status}</span>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" className={`sw ${on ? "on" : ""}`} onClick={onChange} role="switch" aria-checked={on} aria-label={label}>
      <i />
    </button>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="card stat row">
      <span className="ic">{icon}</span>
      <div>
        <div className="v">{value}</div>
        <div className="l">{label}</div>
      </div>
    </div>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  // Callers pass a new onClose on every render; keep the latest in a ref so the effects below
  // run once. (Re-running them on each keystroke moved the cursor back to the first field.)
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("input,textarea,select,button.btn:not(.o)")?.focus();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="mbg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`mdl ${wide ? "lg" : ""}`} role="dialog" aria-modal="true" ref={box}>
        {children}
      </div>
    </div>
  );
}

/** Ask before a destructive or hard-to-undo action. The confirm button shows progress and cannot be pressed twice. */
export function ConfirmModal({ title, message, confirmLabel, cancelLabel = "Keep", onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => Promise<unknown> | void; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={() => !busy && onClose()}>
      <h2>{title}</h2>
      <p className="muted">{message}</p>
      <div className="row">
        <button className="btn o grow" disabled={busy} onClick={onClose}>{cancelLabel}</button>
        <button className="btn red grow" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); onClose(); } }}>
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Single-digit boxes for a numeric code (4 for pickup/delivery, 6 for sign-in). */
export function OtpInput({ value, onChange, bad, onEnter, length = 4 }: { value: string; onChange: (v: string) => void; bad?: boolean; onEnter?: () => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => refs.current[0]?.focus(), []);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const set = (i: number, c: string) => {
    const next = digits.slice();
    next[i] = c;
    onChange(next.join(""));
  };
  return (
    <div className={`otp ${bad ? "bad" : ""}`} onPaste={(e) => {
      const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus(); }
    }}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`} value={d}
          onChange={(e) => { const c = e.target.value.replace(/\D/g, "").slice(-1); set(i, c); if (c) refs.current[i + 1]?.focus(); }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d) refs.current[i - 1]?.focus();
            if (e.key === "Enter" && value.length === length) onEnter?.();
          }} />
      ))}
    </div>
  );
}
