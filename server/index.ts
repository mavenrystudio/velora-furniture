import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { products } from './products.js';

const app = express();
const port = Number(process.env.PORT ?? 4242);
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5175';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

app.use(cors({ origin: clientUrl }));
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !supabase || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook is not configured.');
  const signature = req.header('stripe-signature');
  if (!signature) return res.status(400).send('Missing Stripe signature.');
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return res.status(400).send('Invalid Stripe signature.'); }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { error } = await supabase.from('orders').upsert({
      user_id: session.client_reference_id ?? session.metadata?.user_id ?? null,
      stripe_session_id: session.id, email: session.customer_details?.email ?? session.customer_email,
      amount_total: session.amount_total ?? 0, currency: session.currency ?? 'usd', status: 'paid',
    }, { onConflict: 'stripe_session_id' });
    if (error) { console.error('Order persistence error:', error); return res.status(500).send('Could not persist order.'); }
  }
  res.json({ received: true });
});
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, integrations: { supabase: Boolean(supabase), stripe: Boolean(stripe) } }));

async function getAuthenticatedUser(token: string | undefined) {
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await authClient.auth.getUser(token);
  return error ? null : data.user;
}

app.get('/api/account/orders', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Order history is not available until Supabase is connected.' });
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await getAuthenticatedUser(token);
  if (!user) return res.status(401).json({ error: 'Sign in again to view your orders.' });
  const { data, error } = await supabase.from('orders')
    .select('id, stripe_session_id, amount_total, currency, status, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  if (error) return res.status(502).json({ error: 'We could not load your order history right now.' });
  res.json({ orders: data ?? [] });
});

app.get('/api/products', async (_req, res) => {
  if (!supabase) return res.json({ products, source: 'local-catalog' });
  const { data, error } = await supabase.from('products').select('*').eq('active', true).order('created_at');
  if (error) return res.status(502).json({ error: 'The product catalog is temporarily unavailable.' });
  if (!data?.length) return res.json({ products, source: 'local-catalog' });
  res.json({ products: data.map(toProduct), source: 'supabase' });
});

app.get('/api/products/:slug', async (req, res) => {
  const local = products.find((product) => product.slug === req.params.slug);
  if (!supabase) return local ? res.json(local) : res.status(404).json({ error: 'Product not found.' });
  const { data, error } = await supabase.from('products').select('*').eq('slug', req.params.slug).eq('active', true).maybeSingle();
  if (error) return res.status(502).json({ error: 'The product is temporarily unavailable.' });
  return data ? res.json(toProduct(data)) : res.status(404).json({ error: 'Product not found.' });
});

function toProduct(row: Record<string, unknown>) {
  return { ...row, imageAlt: row.image_alt, featured: row.featured };
}

const checkoutSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  email: z.string().email().optional(),
});

app.post('/api/checkout/session', async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check your cart and try again.' });
  if (!stripe) return res.status(503).json({ error: 'Checkout is not configured yet. Add a Stripe test key to the server environment to enable payments.' });

  const bearerToken = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const signedInUser = bearerToken ? await getAuthenticatedUser(bearerToken) : null;
  if (bearerToken && !signedInUser) return res.status(401).json({ error: 'Your sign-in has expired. Please sign in again before checkout.' });

  const requested = parsed.data.items;
  let catalog: Array<{ id: string; name: string; price: number; image: string; active?: boolean }> = products;
  if (supabase) {
    const { data, error } = await supabase.from('products').select('id, name, price, image, active').in('id', requested.map((line) => line.id));
    if (error) return res.status(502).json({ error: 'We could not verify your cart. Please try again.' });
    if (data?.length) catalog = data;
  }
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const line of requested) {
    const product = catalog.find((item: { id: string; active?: boolean }) => item.id === line.id && item.active !== false);
    if (!product) return res.status(400).json({ error: 'One of the items in your cart is no longer available.' });
    lineItems.push({ quantity: line.quantity, price_data: { currency: 'usd', unit_amount: Math.round(Number(product.price) * 100), product_data: { name: product.name, images: product.image ? [product.image] : [] } } });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', line_items: lineItems, customer_email: parsed.data.email,
      ...(signedInUser ? { client_reference_id: signedInUser.id, metadata: { source: 'velora-storefront', user_id: signedInUser.id } } : { metadata: { source: 'velora-storefront' } }),
      success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/?checkout=cancelled`, billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'HU'] },
      metadata: { source: 'velora-storefront' },
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(502).json({ error: 'We could not start checkout. Please try again shortly.' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Authentication is not configured.' });
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  const user = await getAuthenticatedUser(token);
  if (!user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  res.json({ user: { id: user.id, email: user.email } });
});

app.post('/api/newsletter', async (req, res) => {
  const parsed = z.object({ email: z.string().email().max(254) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!supabase) return res.status(503).json({ error: 'Newsletter sign-up is not connected yet. Add Supabase credentials to enable it.' });
  const { error } = await supabase.from('newsletter_subscribers').upsert({ email: parsed.data.email.toLowerCase() }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) return res.status(502).json({ error: 'We could not save your sign-up. Please try again.' });
  res.status(201).json({ ok: true });
});

app.listen(port, () => console.log(`VELORA API listening on http://localhost:${port}`));
