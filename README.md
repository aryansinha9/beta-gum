# Beta Gum website

## Right now: "Coming soon" overlay is ON
The whole site is covered by a "Coming soon" screen. To launch, in `index.html`:
1. Delete the `<div class="soon" …>` block at the top of `<body>`.
2. Change `<body class="is-soon">` to `<body>`.
3. Remove the four `inert` attributes (skip link, `<header>`, `<main>`, `<footer>`).

## Information site mode (what shows once the overlay is removed)
- **Shop is switched off.** "Add to cart" and "Cart" show a "coming soon" message. To open the shop later, set `SHOP_OPEN = true` in `assets/app.js` and follow "Go live" below.
- **Policy links** (Shipping & Returns, Privacy, Terms) show a "coming soon" message. The draft pages are in the folder for later.
- **Contact and newsletter forms** send to your email through Web3Forms (key is in `assets/app.js`).
- **Clean URLs:** `/shop`, `/why`, `/about`, `/faq`, `/contact` load the homepage and jump to that section. Rewrite rules are included for Netlify (`netlify.toml`), Vercel (`vercel.json`) and Apache/cPanel (`.htaccess`).

---

Static site + one serverless function, built to host on **Netlify** (free tier is fine).

## What works
- **Cart** – add/remove/change quantity, saved in the visitor's browser.
- **Checkout** – real card payments through **Stripe Checkout** (`netlify/functions/checkout.mjs`). Prices are set on the server so they can't be tampered with. US shipping addresses only.
- **Contact + newsletter forms** – submissions land in Netlify → *Forms* (you can turn on email notifications there). Spam honeypot included.
- Shipping & Returns, Privacy, Terms, order-confirmed, thank-you and 404 pages.

## Go live (≈10 minutes)
1. Create a free account at netlify.com.
2. **Add new site → Deploy manually** and drag this whole folder in.
   (Or push the folder to GitHub and "Import from Git" — then every push redeploys.)
   > Drag-and-drop doesn't run functions on some plans; if checkout says "not set up", use the Git import or the Netlify CLI: `npx netlify-cli deploy --prod`.
3. In Stripe (dashboard.stripe.com) → Developers → API keys, copy the **secret key** (`sk_test_…` to test first, `sk_live_…` when ready).
4. Netlify → *Site configuration → Environment variables* → add `STRIPE_SECRET_KEY` = that key. Redeploy.
5. Netlify → *Forms* → enable form detection, then redeploy once so it picks up the `contact` and `newsletter` forms.
6. Optional: *Domain management* → add your domain.

Test a purchase with card `4242 4242 4242 4242`, any future date, any CVC (test key only).

## Changing prices or products
Edit the price in **both** places:
- `assets/app.js` → `PRODUCTS` (what the site shows)
- `netlify/functions/checkout.mjs` → `PRODUCTS` (what Stripe charges)
- and the `$14.99` text in `index.html`.

## Before launch
- Replace the `[bracketed]` placeholders in `shipping.html`, `privacy.html`, `terms.html` and get them reviewed.
- Add real social links in the footer of `index.html`.
- The original design file (`Beta Gum – … copy-1.html`) can be deleted; it isn't used.

## Preview locally
```bash
npx netlify-cli dev
```
(Runs the forms and checkout function too. A plain `python3 -m http.server` shows the site and cart, but not checkout/forms.)
