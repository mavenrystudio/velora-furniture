# VELORA — Premium E-Commerce Experience

A complete React storefront backed by an Express API. The project runs locally with its bundled catalog and persistent shopping bag. Supabase adds hosted products, passwordless email sign-in, newsletter subscriptions, and paid-order records; Stripe Checkout handles secure test-mode payment.

## Start locally

1. Install Node.js 20.19 or newer (or Node.js 22.12 or newer for Vite 8).
2. Copy `.env.example` to `.env`.
3. Run `npm install`, then `npm run dev`.
4. Open `http://localhost:5173` (the API listens on `http://localhost:4242`).

With no credentials, browsing, filtering, product pages, and the saved cart work against the bundled catalog. Checkout explains that Stripe setup is needed; newsletter and sign-in explain that Supabase setup is needed.

## Connect Supabase

Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. The script creates and seeds the product catalog, order and newsletter tables, and read policies.

Set these values in `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The service role key is only used by the server. Never expose it in a `VITE_` variable or commit `.env`. Enable email OTP in Supabase Auth to use the account dialog.

## Connect Stripe test checkout

Set `STRIPE_SECRET_KEY=sk_test_...` in `.env`. For local order records, configure the Stripe CLI to forward `checkout.session.completed` events to `http://localhost:4242/api/stripe/webhook` and set the printed signing secret as `STRIPE_WEBHOOK_SECRET`. The webhook stores paid checkout sessions in Supabase. Checkout collects shipping details and currently supports US, Canada, UK, Australia, Germany, France, Netherlands, and Hungary.

Set `CLIENT_URL` to the deployed storefront origin when deploying. The API should be deployed as a Node service and the Vite app as a static frontend; configure the frontend host to proxy `/api` to the API or set up an equivalent reverse proxy. Use HTTPS and test keys only for portfolio demos.

## API

- `GET /api/health` — service and integration status
- `GET /api/products` and `GET /api/products/:slug` — active product catalog
- `POST /api/checkout/session` — validated cart to Stripe Checkout
- `POST /api/stripe/webhook` — signed Stripe event verification and order persistence
- `POST /api/newsletter` — validated Supabase subscriber upsert
- `GET /api/auth/session` — verify a Supabase access token

## Build

`npm run build` compiles the frontend and server. `npm run preview` serves the production frontend bundle for local review.
