"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, get, post, setUnauthorizedHandler, stream, tokenStore, type Hotel, type Notice, type Order, type User } from "./api";

const ACTIVE = new Set(["placed", "preparing", "ready", "picked"]);
const SOUND_KEY = "inntown.sound";

export interface Ctx {
  /** false until the saved session has been checked */
  ready: boolean;
  user: User | null;
  /** hotel owners only; null means "signed in but hotel not registered yet" */
  hotel: Hotel | null;
  setHotel: (h: Hotel | null) => void;
  orders: Order[];
  upsertOrder: (o: Order) => void;
  reloadOrders: () => Promise<void>;
  notices: Notice[];
  unread: number;
  markRead: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  now: number;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => void;
  toast: (msg: string) => void;
  beep: () => void;
  /** Runs an API call; on failure shows the server's message and returns undefined. */
  run: <T>(p: Promise<T>, okMsg?: string) => Promise<T | undefined>;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}

export const hotelEarn = (o: Order) => o.subtotal + o.pack_fee;

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [sound, setSoundState] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [msg, setMsg] = useState({ text: "", on: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);

  const toast = useCallback((text: string) => {
    setMsg({ text, on: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMsg((m) => ({ ...m, on: false })), 2800);
  }, []);

  const beep = useCallback(() => {
    if (!soundRef.current) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = (audio.current ??= new Ctor());
      [0, 0.22, 0.44].forEach((t, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = i === 2 ? 988 : 784;
        o.connect(g);
        g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.2);
        o.start(ac.currentTime + t);
        o.stop(ac.currentTime + t + 0.22);
      });
    } catch {
      /* sound not available */
    }
  }, []);

  const setSound = useCallback((on: boolean) => {
    soundRef.current = on;
    setSoundState(on);
    try { localStorage.setItem(SOUND_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  const run = useCallback(async <T,>(p: Promise<T>, okMsg?: string) => {
    try {
      const v = await p;
      if (okMsg) toast(okMsg);
      return v;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      return undefined;
    }
  }, [toast]);

  const upsertOrder = useCallback((o: Order) => {
    setOrders((list) => {
      const rest = list.filter((x) => x.id !== o.id);
      return ACTIVE.has(o.status) ? [...rest, o].sort((a, b) => a.placed_at.localeCompare(b.placed_at)) : rest;
    });
  }, []);

  const reloadOrders = useCallback(async () => {
    try { setOrders(await get<Order[]>("/v1/hotel/orders?scope=live")); } catch { /* shown elsewhere */ }
  }, []);

  const loadNotices = useCallback(async () => {
    try {
      const n = await get<{ items: Notice[]; unread: number }>("/v1/notifications");
      setNotices(n.items);
      setUnread(n.unread);
    } catch { /* ignore */ }
  }, []);

  const loadSession = useCallback(async (u: User) => {
    setUser(u);
    if (u.role === "hotel") {
      try {
        setHotel(await get<Hotel>("/v1/hotel/me"));
      } catch (e) {
        if (!(e instanceof ApiError && e.code === "hotel_missing")) throw e;
        setHotel(null);
      }
    }
    void loadNotices();
  }, [loadNotices]);

  const signOut = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setHotel(null);
    setOrders([]);
    setNotices([]);
    setUnread(0);
  }, []);

  const signIn = useCallback(async (token: string, u: User) => {
    tokenStore.set(token);
    await loadSession(u);
  }, [loadSession]);

  // Restore the saved session once.
  useEffect(() => {
    try { soundRef.current = localStorage.getItem(SOUND_KEY) !== "0"; setSoundState(soundRef.current); } catch { /* ignore */ }
    setUnauthorizedHandler(signOut);
    (async () => {
      if (tokenStore.get()) {
        try { await loadSession(await get<User>("/v1/me")); } catch { signOut(); }
      }
      setReady(true);
    })();
  }, [loadSession, signOut]);

  // Live orders for hotel owners: initial load, SSE stream, and a slow poll as a safety net.
  useEffect(() => {
    if (user?.role !== "hotel" || !hotel) return;
    void reloadOrders();
    const close = stream("/v1/hotel/stream", {
      "order.new": (d) => {
        const o = d as Order;
        upsertOrder(o);
        beep();
        toast(`New order #${o.no}`);
      },
      "order.updated": (d) => upsertOrder(d as Order),
      notice: (d) => {
        setNotices((l) => [d as Notice, ...l].slice(0, 30));
        setUnread((n) => n + 1);
      },
    });
    const poll = setInterval(reloadOrders, 20_000);
    return () => { close(); clearInterval(poll); };
  }, [user, hotel?.id, reloadOrders, upsertOrder, beep, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock for timers, plus a repeat ring while an order waits.
  useEffect(() => {
    let last = 0;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setOrders((list) => {
        const waiting = list.filter((o) => o.status === "placed").length;
        if (waiting && t - last > 15_000) { last = t; beep(); }
        document.title = (waiting ? `(${waiting}) New order · ` : "") + "InnTown Hotel";
        return list;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [beep]);

  const markRead = useCallback(() => {
    setUnread(0);
    setNotices((l) => l.map((n) => ({ ...n, read: true })));
    void post("/v1/notifications/read").catch(() => {});
  }, []);

  return (
    <AppCtx.Provider value={{ ready, user, hotel, setHotel, orders, upsertOrder, reloadOrders, notices, unread, markRead, sound, setSound, now, signIn, signOut, toast, beep, run }}>
      {children}
      <div className={`toast ${msg.on ? "on" : ""}`} role="status" aria-live="polite">{msg.text}</div>
    </AppCtx.Provider>
  );
}
