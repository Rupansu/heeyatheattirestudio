/* Heeya — shared header, footer, bag and page behaviour */

const ICON = {
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h18M3 12h18M3 17h12"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const priceText = p => (p.price == null ? 'Price on request' : inr(p.price));
const img = name => (name.includes('/') ? name : `img/p/${name}.jpg`);   // founder uploads are full paths
const byId = id => PRODUCTS.find(p => p.id === id);
const waLink = text => `https://wa.me/${STUDIO.whatsapp}?text=${encodeURIComponent(text)}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Editable text: words between *stars* become gold italics.
const rich = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
function applyText() {
  $$('[data-text]').forEach(el => { const v = TEXT[el.dataset.text]; if (typeof v === 'string') el.innerHTML = rich(v); });
}

/* ---------------- bag (localStorage, fails soft) ---------------- */
const BAG_KEY = 'heeya-bag-v1';
let bag = [];
try { bag = JSON.parse(localStorage.getItem(BAG_KEY)) || []; } catch (e) { bag = []; }
bag = bag.filter(l => byId(l.id) && l.qty > 0);

function saveBag() {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) { /* private mode */ }
  renderBag();
}
function addToBag(id, qty = 1) {
  const line = bag.find(l => l.id === id);
  if (line) line.qty += qty; else bag.push({ id, qty });
  saveBag();
  const p = byId(id);
  toast(`<span>${esc(p.name)} added to your bag</span><button type="button" data-open-bag>View bag</button>`);
}
function setQty(id, qty) {
  const line = bag.find(l => l.id === id);
  if (!line) return;
  line.qty = qty;
  if (line.qty <= 0) bag = bag.filter(l => l.id !== id);
  saveBag();
}
const bagCount = () => bag.reduce((n, l) => n + l.qty, 0);
const bagTotal = () => bag.reduce((n, l) => n + (byId(l.id).price || 0) * l.qty, 0);

/* ---------------- header / footer ---------------- */
function header(page) {
  const links = [
    ['index.html', 'Home', 'home'],
    ['shop.html#mekhela', 'Mekhela Sador', 'mekhela'],
    ['shop.html#stole', 'Stoles', 'stole'],
    ['story.html', 'Our Story', 'story'],
    ['story.html#runway', 'Runway', 'runway'],
  ];
  const a = ([h, t, k]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ''}>${t}</a>`;
  const navL = links.slice(0, 3).map(a).join(''), navR = links.slice(3).map(a).join('');
  const run = TEXT.announce.map(t => `<span>${esc(t)}</span>`).join('');
  return `
  <div class="announce" aria-label="Announcements"><div class="track">${run}${run}</div></div>
  <header class="site-head">
    <div class="wrap bar">
      <div><nav class="nav" aria-label="Main">${navL}</nav>
        <button class="icon-btn menu-btn" type="button" aria-label="Open menu" data-menu>${ICON.menu}</button></div>
      <a class="brand" href="index.html" aria-label="Heeya — The Attire Studio, home">
        <img src="img/brand/mark-gold.png" alt="" width="60" height="58">
        <span class="word"><b>HEEYA</b><small>The Attire Studio</small></span>
      </a>
      <div class="head-actions">
        <nav class="nav" aria-label="More" style="margin-right:18px">${navR}</nav>
        <a class="icon-btn" href="${STUDIO.instagram}" target="_blank" rel="noopener" aria-label="Heeya on Instagram">${ICON.ig}</a>
        <button class="icon-btn" type="button" aria-label="Open bag" data-open-bag>${ICON.bag}<span class="bag-count" hidden>0</span></button>
      </div>
    </div>
  </header>
  <div class="mnav" aria-hidden="true">
    <div class="scrim" data-menu-close></div>
    <div class="panel" role="dialog" aria-label="Menu">
      <button class="icon-btn close" type="button" aria-label="Close menu" data-menu-close>${ICON.close}</button>
      <img src="img/brand/logo-gold.png" alt="Heeya — The Attire Studio" style="width:96px">
      <nav>${links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}<a href="shop.html">Shop all</a></nav>
      <div class="meta">
        <a href="${waLink('Hi Heeya! I have a question.')}" target="_blank" rel="noopener">WhatsApp · ${esc(STUDIO.whatsappDisplay)}</a>
        <a href="${esc(STUDIO.instagram)}" target="_blank" rel="noopener">Instagram · ${esc(STUDIO.instagramHandle)}</a>
        <span>${esc(STUDIO.address)}</span>
      </div>
    </div>
  </div>`;
}

function footer() {
  return `
  <div class="gamosa dark" aria-hidden="true"></div>
  <footer class="site-foot">
    <div class="wrap">
      <div class="top">
        <div>
          <img class="logo" src="img/brand/logo-gold.png" alt="Heeya — The Attire Studio" width="120">
          <p class="about" data-text="footerAbout"></p>
          <div class="socials">
            <a href="${STUDIO.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>
            <a href="${waLink('Hi Heeya!')}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="shop.html#mekhela">Mekhela Sador</a></li>
            <li><a href="shop.html#muga">Pure Muga</a></li>
            <li><a href="shop.html#mulberry">Mulberry Silk</a></li>
            <li><a href="shop.html#stole">Handloom Stoles</a></li>
            <li><a href="shop.html">Shop all</a></li>
          </ul>
        </div>
        <div>
          <h4>The House</h4>
          <ul>
            <li><a href="story.html">Our Story</a></li>
            <li><a href="story.html#founders">Founders</a></li>
            <li><a href="story.html#heritage">Heeya Heritage World</a></li>
            <li><a href="story.html#runway">Runway</a></li>
          </ul>
        </div>
        <div>
          <h4>Visit &amp; Order</h4>
          <ul>
            <li><a href="${esc(STUDIO.maps)}" target="_blank" rel="noopener">${esc(STUDIO.address)}</a></li>
            <li><a href="${waLink('Hi Heeya! I would like to place an order.')}" target="_blank" rel="noopener">WhatsApp · ${esc(STUDIO.whatsappDisplay)}</a></li>
            <li><a href="${esc(STUDIO.instagram)}" target="_blank" rel="noopener">${esc(STUDIO.instagramHandle)}</a></li>
          </ul>
        </div>
      </div>
      <div class="bottom">
        <span>© ${new Date().getFullYear()} Heeya — The Attire Studio · Guwahati, Assam</span>
        <span><span class="as">হিয়া · Woven with heart</span> · <a href="admin/">Founder login</a></span>
      </div>
    </div>
  </footer>
  <a class="wa-float" href="${waLink('Hi Heeya! I have a question.')}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${ICON.wa}</a>
  <div class="drawer" aria-hidden="true">
    <div class="scrim" data-close-bag></div>
    <aside class="sheet" role="dialog" aria-label="Your bag">
      <header><h2>Your bag</h2><button class="icon-btn" type="button" aria-label="Close bag" data-close-bag>${ICON.close}</button></header>
      <div class="items"></div>
      <footer></footer>
    </aside>
  </div>
  <div class="toast" role="status" aria-live="polite"></div>`;
}

/* ---------------- product card ---------------- */
function card(p) {
  const alt = p.images[1] ? `<img class="alt" src="${img(p.images[1])}" alt="" loading="lazy">` : '';
  const tag = p.tag ? `<span class="tag${p.silk === 'Muga' ? ' muga' : ''}">${esc(p.tag)}</span>` : '';
  return `
  <article class="card rv">
    <div class="media">
      ${tag}
      <img src="${img(p.images[0])}" alt="${esc(p.name)}" loading="lazy" width="896" height="1195">
      ${alt}
      <button class="quick" type="button" data-add="${p.id}">Add to bag</button>
    </div>
    <div class="info">
      <span class="silk-l">${esc(p.silk)}</span>
      <h3><a href="product.html#${p.id}">${esc(p.name)}</a></h3>
      <span class="price">${priceText(p)}</span>
    </div>
  </article>`;
}

/* ---------------- bag drawer render ---------------- */
function renderBag() {
  const count = bagCount();
  $$('.bag-count').forEach(el => { el.textContent = count; el.hidden = !count; });
  const items = $('.drawer .items'), foot = $('.drawer footer');
  if (!items) return;
  if (!bag.length) {
    items.innerHTML = `<div class="empty-bag"><img src="img/brand/mark-gold.png" alt=""><p>Your bag is empty.<br>Every piece here is woven by hand. Take your time.</p><a class="btn" href="shop.html">Explore the collection</a></div>`;
    foot.innerHTML = '';
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  items.innerHTML = bag.map(l => {
    const p = byId(l.id);
    return `<div class="line">
      <img src="${img(p.images[0])}" alt="">
      <div><h4><a href="product.html#${p.id}">${esc(p.name)}</a></h4><div class="sub">${esc(p.colour)}</div>
        <div class="qty" aria-label="Quantity"><button type="button" data-dec="${p.id}" aria-label="Decrease">−</button><output>${l.qty}</output><button type="button" data-inc="${p.id}" aria-label="Increase">+</button></div></div>
      <div class="end"><span>${p.price == null ? 'On request' : inr(p.price * l.qty)}</span><button class="rm" type="button" data-rm="${p.id}">Remove</button></div>
    </div>`;
  }).join('');
  if (!foot.querySelector('form')) {
    foot.innerHTML = `
      <div class="sum"><span>Subtotal</span><b></b></div>
      <p class="note">We confirm availability, shipping and payment with you personally on WhatsApp. Nothing is charged here.</p>
      <form novalidate>
        <input id="order-name" name="name" placeholder="Your name" autocomplete="name" required>
        <input id="order-phone" name="phone" placeholder="Phone number" autocomplete="tel" inputmode="tel" required>
        <textarea id="order-address" name="address" placeholder="Delivery address, city and PIN" autocomplete="street-address" required></textarea>
        <p class="err" aria-live="polite"></p>
        <a class="btn wa block" id="send-order" href="#" target="_blank" rel="noopener">${ICON.wa} Place order on WhatsApp</a>
      </form>`;
  }
  $('.sum b', foot).textContent = inr(bagTotal());
  syncOrderLink();
}

/* The order goes out through a real link (not window.open), so it works wherever the site is hosted. */
const orderData = f => Object.fromEntries(new FormData(f));
function syncOrderLink() {
  const f = $('.drawer form');
  if (f) $('#send-order').href = waLink(orderMessage(orderData(f)));
}
function orderProblem(f) {
  const d = orderData(f);
  const missing = ['name', 'phone', 'address'].find(k => !String(d[k] || '').trim());
  if (missing) return { msg: 'Please add your name, phone number and delivery address.', field: missing };
  if (String(d.phone).replace(/\D/g, '').length < 10) return { msg: 'Please check your phone number.', field: 'phone' };
  return null;
}

function orderMessage(f) {
  const lines = bag.map((l, i) => {
    const p = byId(l.id);
    return `${i + 1}. ${p.name} × ${l.qty} — ${p.price == null ? 'price on request' : inr(p.price * l.qty)}`;
  });
  return [
    'Namaskar Heeya! I would like to order:',
    '',
    ...lines,
    '',
    `Subtotal: ${inr(bagTotal())}`,
    '',
    `Name: ${f.name}`,
    `Phone: ${f.phone}`,
    `Address: ${f.address}`,
  ].join('\n');
}

/* ---------------- ui helpers ---------------- */
let toastTimer;
function toast(html) {
  const t = $('.toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
}
function openLayer(el, on) {
  el.classList.toggle('open', on);
  el.setAttribute('aria-hidden', String(!on));
  document.body.style.overflow = on ? 'hidden' : '';
  if (on) { const f = $('button, a, input', el.querySelector('.sheet, .panel')); f && f.focus({ preventScroll: true }); }
}
const openBag = on => openLayer($('.drawer'), on);
const openMenu = on => { $('.toast').classList.remove('show'); openLayer($('.mnav'), on); };

function reveal() {
  const els = $$('.rv:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}

/* ---------------- page: home ---------------- */
function initHome() {
  const g = $('#new-in');
  if (g) g.innerHTML = PRODUCTS.filter(p => p.cat === 'mekhela' && p.silk !== 'Muga').slice(0, 8).map(card).join('');
  const s = $('#stoles');
  if (s) s.innerHTML = PRODUCTS.filter(p => p.cat === 'stole').map(card).join('');

  // hero slideshow
  const slides = $$('.hero .slide'), dots = $('.hero .dots');
  if (slides.length > 1) {
    let i = 0, timer;
    dots.innerHTML = slides.map((_, k) => `<button type="button" aria-label="Show slide ${k + 1}"${k ? '' : ' class="on"'}></button>`).join('');
    const go = k => {
      slides[i].classList.remove('on'); dots.children[i].classList.remove('on');
      i = (k + slides.length) % slides.length;
      slides[i].classList.add('on'); dots.children[i].classList.add('on');
    };
    const play = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); };
    dots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { go([...dots.children].indexOf(b)); play(); } });
    play();
  }
  initRail();
}

function initRail() {
  const rail = $('.rail');
  if (!rail) return;
  if (!rail.children.length) {
    rail.innerHTML = RUNWAY.map(r => `<figure><img src="img/show/${r.src}.jpg" alt="${esc(r.caption)}" loading="lazy"><figcaption>${esc(r.caption)}</figcaption></figure>`).join('');
  }
  $$('[data-rail]').forEach(b => b.addEventListener('click', () => {
    rail.scrollBy({ left: (b.dataset.rail === 'next' ? 1 : -1) * rail.clientWidth * .7, behavior: 'smooth' });
  }));
}

/* ---------------- page: shop ---------------- */
function initShop() {
  const grid = $('#shop-grid'), count = $('#count'), sort = $('#sort'), title = $('#shop-title'), lede = $('#shop-lede'), chips = $('.chips');
  // Filters follow the types and fabrics saved in the console.
  const FILTERS = { all: { t: 'The Collection', l: 'Everything in the studio, woven by hand in Assam.', chip: 'All', fn: () => true } };
  Object.entries(CATEGORIES).forEach(([id, c]) => {
    FILTERS[id] = { t: c.plural, l: `Every ${c.label.toLowerCase()} in the studio.`, chip: c.label, fn: p => p.cat === id };
  });
  Object.entries(SILKS).forEach(([name, desc]) => {
    FILTERS[name.toLowerCase()] = { t: name, l: desc || `Pieces woven in ${name}.`, chip: name, fn: p => p.silk === name };
  });
  const keyOf = () => location.hash.slice(1).toLowerCase();
  const state = { f: FILTERS[keyOf()] ? keyOf() : 'all', sort: 'featured' };
  chips.innerHTML = Object.entries(FILTERS).map(([k, F]) => `<button class="chip" type="button" data-f="${esc(k)}">${esc(F.chip)}</button>`).join('');

  const draw = () => {
    const F = FILTERS[state.f];
    let list = PRODUCTS.filter(F.fn);
    if (state.sort === 'low') list = [...list].sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    if (state.sort === 'high') list = [...list].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    grid.innerHTML = list.length ? list.map(card).join('') : '<p class="empty">Nothing here yet. New weaves are on the loom.</p>';
    count.textContent = `${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`;
    title.textContent = F.t; lede.textContent = F.l;
    document.title = `${F.t} — Heeya The Attire Studio`;
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.f === state.f)));
    $$('.site-head .nav a').forEach(a => {
      if (a.getAttribute('href').startsWith('shop.html')) a.toggleAttribute('aria-current', a.getAttribute('href') === 'shop.html#' + state.f);
    });
    reveal();
  };
  chips.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    state.f = c.dataset.f;
    try { history.replaceState(null, '', state.f === 'all' ? location.pathname : '#' + state.f); } catch (err) { /* sandboxed */ }
    draw();
  });
  window.addEventListener('hashchange', () => {
    state.f = FILTERS[keyOf()] ? keyOf() : 'all';
    draw();
    window.scrollTo({ top: 0 });
  });
  sort.addEventListener('change', () => { state.sort = sort.value; draw(); });
  draw();
}

/* ---------------- page: product ---------------- */
function initProduct() {
  const root = $('#pdp');
  let p, qty = 1;
  root.addEventListener('click', e => {
    const qb = e.target.closest('[data-q]');
    if (qb) { qty = Math.max(1, Math.min(9, qty + Number(qb.dataset.q))); $('#q').textContent = qty; }
    const tb = e.target.closest('[data-img]');
    if (tb) {
      $('.gallery .main img').src = img(tb.dataset.img);
      $$('.gallery .thumbs button').forEach(b => b.setAttribute('aria-current', String(b === tb)));
    }
    if (e.target.closest('#add')) { addToBag(p.id, qty); qty = 1; $('#q').textContent = 1; }
  });
  const draw = () => {
    p = byId(location.hash.slice(1)) || PRODUCTS[0];
    qty = 1;
    drawProduct(root, p);
  };
  window.addEventListener('hashchange', () => { draw(); window.scrollTo({ top: 0 }); });
  draw();
}

function drawProduct(root, p) {
  document.title = `${p.name} — Heeya The Attire Studio`;
  const cat = CATEGORIES[p.cat];
  const silkNote = SILKS[p.silk];
  const thumbs = p.images.length > 1
    ? `<div class="thumbs">${p.images.map((im, k) => `<button type="button" data-img="${im}" aria-label="View image ${k + 1}"${k ? '' : ' aria-current="true"'}><img src="${img(im)}" alt=""></button>`).join('')}</div>` : '';
  root.innerHTML = `
    <div class="gallery${p.images.length > 1 ? '' : ' single'}">
      ${thumbs}
      <div class="main"><img src="${img(p.images[0])}" alt="${esc(p.name)}" width="896" height="1195"></div>
    </div>
    <div class="buy">
      <div class="crumbs"><a href="index.html">Home</a> / <a href="shop.html#${p.cat}">${cat.plural}</a></div>
      <span class="eyebrow">${esc(p.tag || cat.label)}</span>
      <h1>${esc(p.name)}</h1>
      <div class="price">${priceText(p)}<small>incl. of all taxes</small></div>
      <p class="desc">${esc(p.desc)}</p>
      <dl class="specs">
        <dt>Fabric</dt><dd>${esc(p.silk)}</dd>
        <dt>Colour</dt><dd>${esc(p.colour)}</dd>
        <dt>${p.cat === 'mekhela' ? 'Set' : 'Type'}</dt><dd>${p.cat === 'mekhela' ? 'Mekhela and sador (two pieces)' : 'Stole, free size'}</dd>
        <dt>Woven in</dt><dd>Assam, India</dd>
      </dl>
      <div class="row">
        <div class="qty" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Decrease">−</button><output id="q">1</output><button type="button" data-q="1" aria-label="Increase">+</button></div>
        <button class="btn" type="button" id="add">Add to bag</button>
      </div>
      <a class="btn wa block" target="_blank" rel="noopener" href="${waLink(`Namaskar Heeya! I'm interested in the ${p.name} (${priceText(p)}). Is it available?\n${location.href}`)}">${ICON.wa} Ask about this piece on WhatsApp</a>
      <div class="assure">
        <div><b>Handwoven</b>By artisans in Assam</div>
        <div><b>Personal service</b>Every order confirmed on WhatsApp</div>
        <div><b>Ships across India</b>Or visit us in Guwahati</div>
      </div>
      <div>
        <details class="acc" open><summary>About the ${p.silk === 'Handloom' ? 'weave' : 'fabric'}</summary><div class="body">${esc(silkNote || 'Woven by hand in Assam.')}</div></details>
        <details class="acc"><summary>Care</summary><div class="body"><ul>
          ${p.silk === 'Cotton' ? '<li>Gentle hand wash in cold water, or dry clean</li><li>Dry in shade, iron on medium</li>' : '<li>Dry clean only</li><li>Store folded in muslin, away from direct sunlight</li><li>Refold every few months so the creases don’t set</li>'}
        </ul></div></details>
        <details class="acc"><summary>Ordering &amp; delivery</summary><div class="body">Add pieces to your bag and send your order on WhatsApp. We confirm availability, delivery and payment with you directly. Because every piece is woven by hand, small variations in colour and motif are part of its character.</div></details>
      </div>
    </div>`;

  const main = $('.gallery .main');
  main.addEventListener('click', e => {
    main.classList.toggle('zoom');
    const r = main.getBoundingClientRect();
    main.querySelector('img').style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
  main.addEventListener('mousemove', e => {
    if (!main.classList.contains('zoom')) return;
    const r = main.getBoundingClientRect();
    main.querySelector('img').style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
  main.addEventListener('mouseleave', () => main.classList.remove('zoom'));

  const related = PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat).slice(0, 4);
  $('#related').innerHTML = related.map(card).join('');
}

/* ---------------- boot ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  const navKey = page === 'shop' ? location.hash.slice(1) : page;
  document.body.insertAdjacentHTML('afterbegin', header(navKey));
  document.body.insertAdjacentHTML('beforeend', footer());

  if (page === 'home') initHome();
  if (page === 'shop') initShop();
  if (page === 'product') initProduct();
  if (page === 'story') initRail();
  applyText();
  renderBag();
  reveal();

  document.addEventListener('click', e => {
    const t = e.target;
    const add = t.closest('[data-add]');
    if (add) { e.preventDefault(); addToBag(add.dataset.add); return; }
    const send = t.closest('#send-order');
    if (send) {
      const f = send.closest('form'), bad = orderProblem(f);
      $('.err', f).textContent = bad ? bad.msg : '';
      if (bad) { e.preventDefault(); f.elements[bad.field].focus(); return; }
      syncOrderLink();
      return;
    }
    if (t.closest('[data-open-bag]')) { $('.toast').classList.remove('show'); openBag(true); return; }
    if (t.closest('[data-close-bag]')) { openBag(false); return; }
    if (t.closest('[data-menu]')) { openMenu(true); return; }
    if (t.closest('[data-menu-close]') || t.closest('.mnav nav a')) { openMenu(false); return; }
    const inc = t.closest('[data-inc]'), dec = t.closest('[data-dec]'), rm = t.closest('[data-rm]');
    if (inc) { const l = bag.find(x => x.id === inc.dataset.inc); setQty(l.id, l.qty + 1); }
    if (dec) { const l = bag.find(x => x.id === dec.dataset.dec); setQty(l.id, l.qty - 1); }
    if (rm) setQty(rm.dataset.rm, 0);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { openBag(false); openMenu(false); }
  });
  document.addEventListener('input', e => { if (e.target.closest('.drawer form')) syncOrderLink(); });
  document.addEventListener('submit', e => {
    if (!e.target.closest('.drawer form')) return;
    e.preventDefault();
    $('#send-order').click();
  });
});
