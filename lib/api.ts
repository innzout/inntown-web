// Typed client for inntown-api. Set NEXT_PUBLIC_API_URL (default http://localhost:8090).

const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090").trim().replace(/\/+$/, "");
// A bare host ("x.up.railway.app") would be fetched as a path on this site; assume https.
export const API_URL = /^https?:\/\//.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`;

export type Role = "customer" | "hotel" | "partner" | "ops";
export type FoodType = "veg" | "nonveg";
export type OrderStatus = "placed" | "preparing" | "ready" | "picked" | "delivered" | "rejected" | "expired" | "cancelled";
export type PayMethod = "upi" | "card" | "cod";

export interface User { id: string; phone: string; role: Role; name: string; lang: "ta" | "en" }
export interface Hours { dow: number; is_open: boolean; opens: string; closes: string }
export interface Hotel {
  id: string; name: string; phone: string; address: string; area: string; lat: number; lng: number; fssai: string;
  food_type: "veg" | "nonveg" | "both"; prep_min: number; pack_fee: number; upi: string; photo_url: string;
  is_open: boolean; status: "pending" | "active" | "paused" | "suspended"; featured: boolean; rating: number; reviews: number;
  hours: Hours[]; accepting: boolean; why?: string;
  commission_free_until?: string; // owner and ops only: no commission on orders placed before this
}
export interface Item { id: string; category_id: string; name: string; description: string; price: number; half_price: number; food_type: FoodType; photo_url: string; is_available: boolean; sort: number }
export interface Category { id: string; name: string; sort: number; items: Item[] }
export interface Line { item_id: string | null; name: string; food_type: FoodType; price: number; qty: number; half: boolean }
export interface Order {
  id: string; no: number; status: OrderStatus; hotel_id: string; hotel_name: string; hotel_phone?: string; hotel_area: string;
  customer_id: string; customer_name: string; customer_phone?: string; partner_id: string | null; partner_name: string; partner_phone?: string;
  items: Line[]; subtotal: number; pack_fee: number; delivery_fee: number; total: number; pay_method: PayMethod; pay_status: string;
  address: string; distance_km: number; note: string; prep_min: number; pickup_otp?: string; delivery_otp?: string;
  accept_by: string; placed_at: string; accepted_at: string | null; ready_at: string | null; picked_at: string | null; delivered_at: string | null;
  closed_reason: string; wrong_otp: number; rated: boolean; updated_at: string;
  commission_bps?: number; commission?: number; hotel_net?: number; // hotel and ops only
}
export interface Notice { id: number; icon: string; title: string; body: string; read: boolean; at: string }
export interface Review { id: string; order_no: number; customer: string; stars: number; text: string; reply: string; created_at: string }
/** The commission deal as it applies to this hotel today. */
/** Support contacts from GET /v1/app/config. Empty strings until the numbers are set on the server. */
export interface Support { phone: string; whatsapp: string; email: string }

export interface CommissionTerms { percent: number; free_days: number; free_until: string | null; free_now: boolean }
export interface Earnings {
  days: { date: string; sales: number; commission: number; net: number; orders: number }[];
  food: number; packaging: number; total: number; commission: number; net: number; orders: number;
  cod: number; online: number; refunded: number; top: { name: string; qty: number; sales: number }[]; terms: CommissionTerms;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

const TOKEN_KEY = "inntown.token";
export const tokenStore = {
  get(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t: string | null) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "offline", "Cannot reach InnTown. Check your internet connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error ?? {};
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, e.code ?? "error", e.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const get = <T,>(p: string) => api<T>("GET", p);
export const post = <T,>(p: string, b: unknown = {}) => api<T>("POST", p, b);
export const patch = <T,>(p: string, b: unknown) => api<T>("PATCH", p, b);
export const put = <T,>(p: string, b: unknown) => api<T>("PUT", p, b);
export const del = <T,>(p: string) => api<T>("DELETE", p);

/** Server-Sent Events stream. EventSource cannot set headers, so the token goes in the query. */
export function stream(path: string, handlers: Record<string, (data: unknown) => void>): () => void {
  const token = tokenStore.get();
  if (!token) return () => {};
  const es = new EventSource(`${API_URL}${path}?access_token=${encodeURIComponent(token)}`);
  for (const [type, fn] of Object.entries(handlers)) {
    es.addEventListener(type, (e) => fn(JSON.parse((e as MessageEvent).data)));
  }
  return () => es.close();
}

export const auth = {
  send: (phone: string, role: Role) => post<{ sent: boolean; dev_code?: string }>("/v1/auth/otp/send", { phone, role }),
  verify: (phone: string, role: Role, code: string) => post<{ token: string; user: User }>("/v1/auth/otp/verify", { phone, role, code }),
};
