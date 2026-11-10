# inntown-web

Next.js 15 static site (Cloudflare Pages) with two apps on the same inntown-api:

- **Hotel web app** (`/login`, `/register`, `/orders`, `/menu`, `/history`, `/earnings`, `/reviews`, `/commission`, `/settings`, `/help`)
- **InnTown Ops** (`/ops/login`, `/ops`, `/ops/orders`, `/ops/hotels`, `/ops/partners`, `/ops/customers`, `/ops/audit`)

## Run

```bash
# 1. API with demo data (see ../inntown-api/README.md)
cd ../inntown-api && go run ./cmd/api -seed
# 2. Web
cd ../inntown-web && npm install && npm run dev     # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:8090`. In dev the sign-in page shows the code (`123456`).
Hotel demo: `9876543210`. Ops demo: `9000000001`. "Simulate new order" (dev builds only) places a test order.

## Layout

```
app/(hotel)/        hotel pages behind the hotel sign-in guard
app/ops/(staff)/    ops pages behind the ops sign-in guard
components/         Shell, SignIn, OrderDetail, ui (Modal, Switch, Tabs, OtpInput, tags), Icon
lib/api.ts          typed client, token storage, SSE stream helper
lib/store.tsx       session, hotel, live orders (SSE + 20 s poll), notifications, sound, toasts
lib/content.ts      static copy (FAQ, reasons)
app/globals.css     tokens from inntown-mobile/design/tokens.json (light + dark)
```
