"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { post, type Hotel } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import { useApp } from "@/lib/store";
import { Icon } from "./Icon";
import { Logo, Modal, Switch } from "./ui";

export type NavItem = [href: string, label: string, icon: string];

export const HOTEL_NAV: NavItem[] = [
  ["/orders", "Live orders", "orders"],
  ["/menu", "Menu", "menu"],
  ["/history", "Order history", "hist"],
  ["/earnings", "Earnings", "chart"],
  ["/reviews", "Reviews", "star"],
  ["/commission", "Commission", "card"],
  ["/settings", "Store settings", "gear"],
  ["/help", "Help", "help"],
];

/** Sidebar + top bar. Hotel owners get the Open switch; ops staff get a plain header. */
export function Shell({ children, nav = HOTEL_NAV, title, subtitle, foot }: { children: ReactNode; nav?: NavItem[]; title?: string; subtitle?: string; foot?: string }) {
  const { user, hotel, setHotel, orders, notices, unread, markRead, sound, setSound, beep, toast, run, signOut } = useApp();
  const path = usePathname().replace(/\/$/, "") || "/";
  const router = useRouter();
  const [open, setNav] = useState(false);
  const [pop, setPop] = useState<"bell" | "acct" | null>(null);
  const [confirm, setConfirm] = useState<"close" | "logout" | null>(null);
  const waiting = orders.filter((o) => o.status === "placed").length;
  const isHotel = user?.role === "hotel" && !!hotel;

  useEffect(() => setNav(false), [path]);
  useEffect(() => {
    if (!pop) return;
    const h = (e: MouseEvent) => !(e.target as HTMLElement).closest(".pop,.popbtn") && setPop(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pop]);

  const setOpen = async (on: boolean) => {
    const h = await run(post<Hotel>("/v1/hotel/me/open", { open: on }), on ? "Store is open. You can get orders now" : "Store is closed");
    if (h) setHotel(h);
    setConfirm(null);
  };
  const toggleSound = () => {
    setSound(!sound);
    if (!sound) setTimeout(beep, 50);
    toast(!sound ? "Order sound is on" : "Order sound is off");
  };

  return (
    <div className="app">
      <aside className={`side ${open ? "open" : ""}`}>
        <div className="logo"><Logo size={30} /><b>Inn<span>Town</span></b></div>
        <nav aria-label="Main">
          {nav.map(([href, label, icon]) => {
            const on = path === href || (href !== "/ops" && path.startsWith(href + "/"));
            return (
              <Link key={href} href={href} className={`nv ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
                <Icon name={icon} size={21} />{label}
                {href === "/orders" && waiting > 0 && <span className="bd">{waiting}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="foot">{foot ?? "Hotel web app"}<br />Thuraiyur</div>
      </aside>
      {open && <div className="scrim" onClick={() => setNav(false)} />}

      <div className="main">
        <header className="top">
          <button className="ib ham" onClick={() => setNav(!open)} aria-label="Open menu"><Icon name="burger" /></button>
          <div className="grow">
            <div className="hn">{title ?? hotel?.name}</div>
            <div className="xs muted">
              {subtitle ?? (hotel ? (hotel.accepting ? "Taking orders now" : hotel.why ?? "Closed") : "")}
            </div>
          </div>
          {isHotel && (
            <div className="row" style={{ gap: 8, fontWeight: 700 }}>
              <span className="hide-s" style={{ color: hotel.is_open ? "var(--leaf)" : "var(--danger)" }}>{hotel.is_open ? "Open" : "Closed"}</span>
              <Switch on={hotel.is_open} onChange={() => (hotel.is_open ? setConfirm("close") : setOpen(true))} label="Store open" />
            </div>
          )}
          <button className="ib" onClick={toggleSound} aria-label={`Order sound ${sound ? "on" : "off"}`} title="Order sound"><Icon name={sound ? "vol" : "mute"} /></button>
          <div style={{ position: "relative" }}>
            <button className="ib popbtn" onClick={() => setPop(pop === "bell" ? null : "bell")} aria-label="Notifications" aria-expanded={pop === "bell"}>
              <Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}
            </button>
            {pop === "bell" && (
              <div className="pop">
                <div className="row sb" style={{ padding: "8px 10px" }}>
                  <b className="bh" style={{ fontSize: 17 }}>Notifications</b>
                  <button className="btn g s" onClick={markRead}>Mark all read</button>
                </div>
                {notices.length ? notices.slice(0, 10).map((n) => (
                  <div className="ni" key={n.id}>
                    <span className="nic"><Icon name={n.icon} size={18} color="var(--leaf)" /></span>
                    <div><b style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</b><div className="xs muted">{n.body} · {fmtTime(n.at)}</div></div>
                  </div>
                )) : <div className="empty">No notifications</div>}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button className="ib popbtn" onClick={() => setPop(pop === "acct" ? null : "acct")} aria-label="Account" aria-expanded={pop === "acct"}><Icon name="user" /></button>
            {pop === "acct" && (
              <div className="pop" style={{ width: 230 }}>
                <div style={{ padding: 10 }}><b>{hotel?.name ?? user?.name ?? "InnTown Ops"}</b><div className="xs muted">+91 {user?.phone}</div></div>
                {isHotel && <Link className="btn g full" href="/settings" style={{ justifyContent: "flex-start" }} onClick={() => setPop(null)}><Icon name="gear" /> Store settings</Link>}
                <button className="btn g full" style={{ justifyContent: "flex-start", color: "var(--danger)" }} onClick={() => setConfirm("logout")}><Icon name="logout" /> Log out</button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          {isHotel && hotel.status !== "active" && (
            <div className="banner warn"><Icon name="alert" /><b>{hotel.status === "pending" ? "Waiting for InnTown approval." : `Your hotel is ${hotel.status}.`}</b> Customers cannot see you yet. Call support if this takes more than a day.</div>
          )}
          {isHotel && hotel.status === "active" && !hotel.is_open && path === "/orders" && (
            <div className="banner closed"><Icon name="alert" /><b>Your store is closed.</b> Customers cannot order from you now.<button className="btn s" onClick={() => setOpen(true)}>Open store</button></div>
          )}
          {children}
        </main>
      </div>

      {confirm === "close" && (
        <Modal onClose={() => setConfirm(null)}>
          <h2>Close your store?</h2>
          <p className="muted">Customers will not be able to order. Orders you already accepted are not affected.</p>
          <div className="row">
            <button className="btn o grow" onClick={() => setConfirm(null)}>Stay open</button>
            <button className="btn red grow" onClick={() => setOpen(false)}>Close store</button>
          </div>
        </Modal>
      )}
      {confirm === "logout" && (
        <Modal onClose={() => setConfirm(null)}>
          <h2>Log out?</h2>
          <p className="muted">You will not hear new order alerts after logging out.</p>
          <div className="row">
            <button className="btn o grow" onClick={() => setConfirm(null)}>Stay</button>
            <button className="btn red grow" onClick={() => { const ops = user?.role === "ops"; signOut(); router.replace(ops ? "/ops/login" : "/login"); toast("You have been logged out"); }}>Log out</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
