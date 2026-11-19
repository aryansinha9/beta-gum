// Creates a Stripe Checkout Session for the cart and returns its URL.
// Needs the STRIPE_SECRET_KEY environment variable (set it in Netlify → Site settings → Environment variables).
// Prices live HERE, not in the browser, so nobody can change what they pay. Keep in sync with assets/app.js.

const PRODUCTS = {
  'citrus-blast': { name: 'Beta Gum – Citrus Blast', price: 1499 },
  'blue-surge':   { name: 'Beta Gum – Blue Surge',   price: 1499 },
};
const CURRENCY = 'usd';
const MAX_QTY = 10;
const SHIP_TO = ['US'];

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(500, { error: 'Checkout is not set up yet' });

  let items;
  try { ({ items } = await req.json()); } catch { return json(400, { error: 'Bad request' }); }
  if (!Array.isArray(items) || !items.length) return json(400, { error: 'Your cart is empty' });

  const origin = process.env.URL || new URL(req.url).origin;
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${origin}/#shop`);
  SHIP_TO.forEach((c, i) => form.set(`shipping_address_collection[allowed_countries][${i}]`, c));
  form.set('phone_number_collection[enabled]', 'false');

  let n = 0;
  for (const { id, qty } of items) {
    const p = PRODUCTS[id];
    const q = Math.floor(Number(qty));
    if (!p || !(q >= 1 && q <= MAX_QTY)) return json(400, { error: 'Invalid item in cart' });
    form.set(`line_items[${n}][quantity]`, String(q));
    form.set(`line_items[${n}][price_data][currency]`, CURRENCY);
    form.set(`line_items[${n}][price_data][unit_amount]`, String(p.price));
    form.set(`line_items[${n}][price_data][product_data][name]`, p.name);
    n++;
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Stripe error', data.error);
    return json(502, { error: 'Could not start checkout, please try again' });
  }
  return json(200, { url: data.url });
};
