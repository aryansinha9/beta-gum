(function () {
  'use strict';

  // Display catalog. Real prices are enforced server-side in netlify/functions/checkout.mjs —
  // keep both in sync when you change a price.
  var PRODUCTS = {
    'citrus-blast': { name: 'Citrus Blast', price: 1499, color: '#D1FA1F' },
    'blue-surge':   { name: 'Blue Surge',   price: 1499, color: '#38BAF5' }
  };
  var MAX_QTY = 10;
  // Shop is not live yet. Flip to true when Stripe checkout is set up (see README).
  var SHOP_OPEN = false;
  var WEB3FORMS_KEY = '6dc68bc9-ffc7-49a4-a887-67c8bb00ef1e';
  var KEY = 'betagum-cart-v1';

  var $ = function (s) { return document.querySelector(s); };
  var money = function (cents) { return '$' + (cents / 100).toFixed(2); };

  /* ---------- Random highlight colours (from the original design) ---------- */
  var cols = ['#D1FA1F', '#38BAF5', '#FF3D94', '#A66FF9'], h = $('.hl'), h2 = $('.hl2');
  if (h) h.style.setProperty('--hl', cols[Math.floor(Math.random() * cols.length)]);
  if (h2) {
    var rest = cols.filter(function (x) { return !h || x !== h.style.getPropertyValue('--hl'); });
    h2.style.setProperty('--hl2', rest[Math.floor(Math.random() * rest.length)]);
  }
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  var toast = $('#toast'), tm;
  function say(m) {
    if (!toast) return;
    toast.textContent = m; toast.classList.add('on');
    clearTimeout(tm); tm = setTimeout(function () { toast.classList.remove('on'); }, 2400);
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('#menuBtn'), links = $('#links');
  if (menuBtn && links) {
    menuBtn.onclick = function () {
      var open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    };
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- Cart state (persists in the browser) ---------- */
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (id) {
    if (!PRODUCTS[id] || !(cart[id] > 0)) delete cart[id];
    else cart[id] = Math.min(MAX_QTY, Math.floor(cart[id]));
  });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function count() { return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0); }
  function subtotal() { return Object.keys(cart).reduce(function (s, id) { return s + cart[id] * PRODUCTS[id].price; }, 0); }

  function setQty(id, q) {
    q = Math.max(0, Math.min(MAX_QTY, q));
    if (q === 0) delete cart[id]; else cart[id] = q;
    save(); render();
  }

  var drawer = $('#drawer'), scrim = $('#scrim'), itemsEl = $('#items'), cartBtn = $('#cartBtn'),
      countEl = $('#count'), subEl = $('#subtotal'), checkoutBtn = $('#checkoutBtn');

  function render() {
    if (countEl) countEl.textContent = count();
    if (!itemsEl) return;
    var ids = Object.keys(cart);
    if (!ids.length) {
      itemsEl.innerHTML = '<li class="empty">Your cart is empty.<br>Go pick a flavour.</li>';
    } else {
      itemsEl.innerHTML = ids.map(function (id) {
        var p = PRODUCTS[id];
        return '<li class="item">' +
          '<div class="sw" style="background:' + p.color + '">β</div>' +
          '<div><strong>' + p.name + '</strong><span class="each">' + money(p.price) + ' each</span>' +
            '<div style="display:flex;align-items:center">' +
              '<div class="qty"><button data-dec="' + id + '" aria-label="Decrease ' + p.name + '">−</button>' +
              '<span>' + cart[id] + '</span>' +
              '<button data-inc="' + id + '" aria-label="Increase ' + p.name + '">+</button></div>' +
              '<button class="rm" data-rm="' + id + '">Remove</button>' +
            '</div></div>' +
          '<div class="line">' + money(cart[id] * p.price) + '</div></li>';
      }).join('');
    }
    if (subEl) subEl.textContent = money(subtotal());
    if (checkoutBtn) checkoutBtn.disabled = !ids.length;
  }

  if (itemsEl) itemsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.inc) { if (cart[b.dataset.inc] >= MAX_QTY) say('Max ' + MAX_QTY + ' per flavour'); setQty(b.dataset.inc, (cart[b.dataset.inc] || 0) + 1); }
    if (b.dataset.dec) setQty(b.dataset.dec, (cart[b.dataset.dec] || 0) - 1);
    if (b.dataset.rm) setQty(b.dataset.rm, 0);
  });

  var lastFocus;
  function openCart() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('on'); scrim.classList.add('on');
    drawer.setAttribute('aria-hidden', 'false'); cartBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#closeCart').focus(); }, 50);
  }
  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove('on'); scrim.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true'); cartBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  if (cartBtn) cartBtn.onclick = function () { if (SHOP_OPEN) openCart(); else say('Online shop coming soon!'); };
  if (scrim) scrim.onclick = closeCart;
  var cc = $('#closeCart'); if (cc) cc.onclick = closeCart;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && drawer.classList.contains('on')) closeCart(); });

  document.querySelectorAll('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.add; if (!PRODUCTS[id]) return;
      if (!SHOP_OPEN) { say(PRODUCTS[id].name + ' drops soon. Stay tuned!'); return; }
      if ((cart[id] || 0) >= MAX_QTY) { say('Max ' + MAX_QTY + ' per flavour'); return; }
      setQty(id, (cart[id] || 0) + 1);
      say(PRODUCTS[id].name + ' added to cart');
    });
  });

  /* ---------- Checkout (Stripe Checkout via serverless function) ---------- */
  if (checkoutBtn) checkoutBtn.onclick = function () {
    var items = Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; });
    if (!items.length) return;
    checkoutBtn.disabled = true; checkoutBtn.textContent = 'Loading…';
    fetch('/.netlify/functions/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || !d.url) throw new Error(d.error || 'Checkout unavailable'); return d; });
    }).then(function (d) {
      window.location.href = d.url;
    }).catch(function (err) {
      say(err.message || 'Checkout unavailable, try again');
      checkoutBtn.disabled = false; checkoutBtn.textContent = 'Checkout';
    });
  };

  // Clear the cart after a successful order (success.html sets this flag)
  if (document.body.dataset.clearCart === 'true') { cart = {}; save(); }
  // Restore the button if the user comes back from Stripe with the browser back button
  window.addEventListener('pageshow', function () { if (checkoutBtn) { checkoutBtn.textContent = 'Checkout'; } render(); });

  /* ---------- Forms (Web3Forms: submissions are emailed to you) ---------- */
  function wireForm(form, okMsg) {
    if (!form) return;
    var msg = form.querySelector('.fmsg'), btn = form.querySelector('[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending…';
      msg.className = 'fmsg'; msg.textContent = '';
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data.botcheck) { form.reset(); return; } // spam bot filled the hidden box
      data.access_key = WEB3FORMS_KEY;
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || !d.success) throw new Error(d.message || r.status); });
      }).then(function () {
        form.reset(); msg.className = 'fmsg ok'; msg.textContent = okMsg; say(okMsg);
      }).catch(function () {
        msg.className = 'fmsg err'; msg.textContent = 'Something went wrong. Please try again or email us directly.';
      }).finally(function () { btn.disabled = false; btn.textContent = label; });
    });
  }
  wireForm($('#contactForm'), 'Thanks! We’ll get back to you soon.');
  wireForm($('#newsForm'), 'You’re on the list.');

  /* ---------- Banner moves with page scroll ---------- */
  var mq = $('.mq');
  if (mq && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var seg = '<div class="mq-seg"><b>β</b><span>CHEW IT</span><b>β</b><span>FEEL IT</span><b>β</b><span>LIFT IT</span></div>';
    var track = document.createElement('div'), segW = 1, ticking = false;
    track.className = 'mq-track';
    mq.innerHTML = ''; mq.appendChild(track);
    var move = function () {
      ticking = false;
      var x = -((window.scrollY * 0.6) % segW);
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    };
    var fill = function () {
      track.innerHTML = seg;
      segW = track.firstChild.getBoundingClientRect().width || 1;
      track.innerHTML = new Array(Math.ceil(mq.offsetWidth / segW) + 2).join(seg);
      move();
    };
    fill();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fill);
    window.addEventListener('resize', fill);
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
  }

  /* ---------- Coming-soon links (policies etc.) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-soon]'); if (!a) return;
    e.preventDefault();
    say(a.dataset.soon + ' coming soon!');
  });

  /* ---------- Clean URLs: /shop, /why, /about, /faq, /contact ---------- */
  var ROUTES = ['shop', 'why', 'about', 'faq', 'contact'];
  function go(name, smooth) {
    var el = name === 'top' ? null : document.getElementById(name), root = document.documentElement;
    if (!smooth) { root.style.scrollBehavior = 'auto'; setTimeout(function () { root.style.scrollBehavior = ''; }, 50); }
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    else window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-route]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    var name = a.dataset.route, path = name === 'top' ? '/' : '/' + name;
    if (location.pathname !== path) history.pushState({ route: name }, '', path);
    go(name, true);
  });
  function fromPath() {
    var name = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
    return ROUTES.indexOf(name) > -1 ? name : 'top';
  }
  window.addEventListener('popstate', function () { go(fromPath(), true); });
  if (fromPath() !== 'top') {
    var land = function () { go(fromPath(), false); };
    if (document.readyState === 'complete') land(); else window.addEventListener('load', land);
  }

  render();
})();
