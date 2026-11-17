/* Founder's console. Nothing here works without signing in.
   Two ways to run:
   - local: served by server.js, same-origin cookie session
   - remote: at /admin on the live site; window.HEEYA_API (admin/config.js) is the Worker's
     address, and the session is a token sent in the Authorization header. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const API = String(window.HEEYA_API || '').replace(/\/+$/, '');
const REMOTE = !!API;
// /admin on the live site without a server: saves straight to GitHub with her GitHub key (js/admin-github.js).
const GITHUB = typeof HeeyaGitHub !== 'undefined' && HeeyaGitHub.enabled;
const SAVES_LATER = REMOTE || GITHUB;      // the live site republishes after a save
// Show the sign-in and Settings parts for this way of signing in.
document.querySelectorAll('[data-only]').forEach(el => { el.hidden = el.dataset.only !== (GITHUB ? 'github' : 'password'); });
const TOKEN_KEY = 'heeya-admin-token';
const token = {
  get() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } },
  set(v) { try { localStorage.setItem(TOKEN_KEY, v); } catch (e) { /* private window: signed in for this page only */ } memoryToken = v; },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* nothing stored */ } memoryToken = ''; },
};
let memoryToken = '';
const currentToken = () => token.get() || memoryToken;
// Just-uploaded photos are shown from memory until the live site has republished them.
const preview = {};
const imgSrc = name => preview[name] || (name.includes('/') ? name : `img/p/${name}.jpg`);
const inr = n => '₹' + Number(n).toLocaleString('en-IN');

let content = null;      // what the server has saved
let editing = null;      // the product in the form: { index (-1 = new), draft }

/* The text boxes on the "Website text" tab, in the order she sees them. */
const TEXT_FIELDS = [
  ['Banner at the very top', [
    ['announce', 'Moving banner lines (one per line)', 5],
  ]],
  ['Home page', [
    ['heroTitle', 'Big headline', 2],
    ['heroLede', 'Text under the headline', 3],
    ['introTitle', 'Introduction headline', 3],
    ['introBody', 'Introduction text', 3],
    ['foundersTitle', 'Mother & daughter headline', 2],
    ['foundersQuote', 'Mother & daughter quote', 2],
    ['foundersP1', 'Mother & daughter, first paragraph', 4],
    ['foundersP2', 'Mother & daughter, second paragraph', 3],
  ]],
  ['Our Story page', [
    ['storyTitle', 'Big headline', 2],
    ['storyIntro', 'Text under the headline', 4],
    ['founderBio1', 'About the founder, first paragraph', 5],
    ['founderBio2', 'About the founder, second paragraph', 7],
    ['mitaliShort', 'Short note under Mitali’s photo', 3],
    ['mallikaShort', 'Short note under Mallika’s photo', 3],
    ['heritageTitle', 'Heeya Heritage World headline', 3],
    ['heritageBody', 'Heeya Heritage World text', 3],
  ]],
  ['Bottom of every page', [
    ['footerAbout', 'Short line about Heeya', 3],
  ]],
];

/* ---------------- server calls ---------------- */
async function call(method, path, body, raw) {
  if (GITHUB) {
    try { return await HeeyaGitHub.call(currentToken(), method, path, body); } catch (e) {
      if (e.status === 401 && path !== '/api/login') { token.clear(); showSignin(e.message); }
      throw e;
    }
  }
  const headers = raw ? { 'Content-Type': 'image/jpeg' } : body ? { 'Content-Type': 'application/json' } : {};
  if (REMOTE && currentToken()) headers.Authorization = 'Bearer ' + currentToken();
  let res;
  try {
    res = await fetch(API + path, {
      method, headers, credentials: REMOTE ? 'omit' : 'same-origin',
      body: raw ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('Could not reach the website. Check your internet connection and try again.');
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* not JSON */ }
  if (res.status === 401 && path !== '/api/login') { token.clear(); showSignin('Please sign in again.'); throw new Error('Please sign in again.'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

async function save(next, message) {
  content = await call('PUT', '/api/content', {
    studio: next.studio, products: next.products, text: next.text,
    categories: next.categories, silks: next.silks,
  });
  // The live site republishes from GitHub, which takes about a minute.
  toast((message || 'Saved.') + (SAVES_LATER ? ' The website updates in about a minute.' : ' Your website is updated.'));
}

/* ---------------- small helpers ---------------- */
let toastTimer;
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('bad', !!bad);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), bad ? 6000 : 3200);
}
async function busy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  try { await fn(); } finally { btn.disabled = false; btn.textContent = old; }
}
const slug = name => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product';

/* ---------------- sign in / out ---------------- */
// The sign-in screen has three cards: sign in, forgot password, and new password (from the emailed link).
function showSignin(msg, view = 'signin') {
  $('#console').hidden = true;
  $('#signin').hidden = false;
  ['signin', 'forgot', 'reset'].forEach(v => { $(`#${v}-form`).hidden = v !== view; });
  $('#signin-error').textContent = msg || '';
  $('#password').value = '';
  const first = $$(`#${view}-form input`).find(i => !i.closest('[hidden]'));
  if (first) first.focus();
}
async function showConsole() {
  content = await call('GET', '/api/content');
  $('#signin').hidden = true;
  $('#console').hidden = false;
  renderProducts(); renderText(); renderContact();
}

/* ---------------- forgot password ---------------- */
$('#forgot-link').addEventListener('click', () => {
  $('#forgot-email').value = $('#email').value;
  $('#forgot-done').hidden = true; $('#forgot-error').textContent = '';
  showSignin('', 'forgot');
});
$$('[data-to-signin]').forEach(b => b.addEventListener('click', () => {
  if (location.hash.startsWith('#reset-')) history.replaceState(null, '', location.pathname);
  showSignin('');
}));
$('#forgot-form').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('#forgot-email').value.trim(), err = $('#forgot-error');
  if (!email) { err.textContent = 'Please enter your email.'; return; }
  err.textContent = '';
  busy($('#forgot-form button[type=submit]'), 'Sending…', async () => {
    try { await call('POST', '/api/forgot', { email }); $('#forgot-done').hidden = false; } catch (er) { err.textContent = er.message; }
  });
});

// Checks a new password typed twice; returns the problem, or '' when fine.
function passwordProblem(next, again) {
  if (next.length < 7) return 'The new password needs at least 7 characters.';
  if (next !== again) return 'The two passwords do not match.';
  return '';
}
$('#reset-form').addEventListener('submit', e => {
  e.preventDefault();
  const next = $('#reset-new').value, err = $('#reset-error');
  err.textContent = passwordProblem(next, $('#reset-again').value);
  if (err.textContent) return;
  busy($('#reset-form button[type=submit]'), 'Saving…', async () => {
    try {
      await call('POST', '/api/reset', { token: location.hash.slice('#reset-'.length), password: next });
      history.replaceState(null, '', location.pathname);
      $('#reset-new').value = ''; $('#reset-again').value = '';
      showSignin('');
      toast('Password changed. Please sign in with the new one.');
    } catch (er) { err.textContent = er.message; }
  });
});

$('#signin-form').addEventListener('submit', e => {
  e.preventDefault();
  if (GITHUB) {
    const key = $('#gh-key').value.trim();
    if (!key) { $('#signin-error').textContent = 'Please paste your GitHub key.'; return; }
    busy($('#signin-form button[type=submit]'), 'Signing in…', async () => {
      try {
        const r = await call('POST', '/api/login', { token: key });
        token.set(r.token);
        $('#gh-key').value = '';
        $('#key-info').textContent = 'Signed in on this device with your GitHub key.';
        await showConsole();
      } catch (err) { $('#signin-error').textContent = err.message; }
    });
    return;
  }
  const email = $('#email').value.trim(), password = $('#password').value;
  if (!email || !password) { $('#signin-error').textContent = 'Please enter your email and password.'; return; }
  busy($('#signin-form button[type=submit]'), 'Signing in…', async () => {
    try {
      const r = await call('POST', '/api/login', { email, password });
      if (r.token) token.set(r.token);
      $('#password').value = '';
      $('#signed-in-as').textContent = 'Signed in as ' + email;
      $('#pw-user').value = email;
      await showConsole();
    } catch (err) { $('#signin-error').textContent = err.message; }
  });
});
$('#signout').addEventListener('click', async () => {
  try { await call('POST', '/api/logout'); } catch (e) { /* signed out either way */ }
  token.clear();
  content = null;
  showSignin('');
});

/* ---------------- tabs ---------------- */
$('.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  $$('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  ['products', 'text', 'contact', 'settings'].forEach(t => { $('#tab-' + t).hidden = t !== b.dataset.tab; });
  window.scrollTo(0, 0);
});

/* ---------------- products: list ---------------- */
function renderProducts() {
  const list = content.products;
  $('#product-count').textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'}. They appear on the website in this order.`;
  $('#plist').innerHTML = list.map((p, i) => `
    <li>
      <img src="${esc(imgSrc(p.images[0]))}" alt="">
      <div>
        <div class="name">${esc(p.name)}${p.hidden ? '<span class="pill">Hidden</span>' : ''}</div>
        <div class="meta">${esc(content.categories[p.cat].label)} · ${p.price == null ? 'Price on request' : inr(p.price)}</div>
      </div>
      <div class="ctl">
        <button class="btn move" type="button" data-move="-1" data-i="${i}" aria-label="Move ${esc(p.name)} up"${i === 0 ? ' disabled' : ''}>↑</button>
        <button class="btn move" type="button" data-move="1" data-i="${i}" aria-label="Move ${esc(p.name)} down"${i === list.length - 1 ? ' disabled' : ''}>↓</button>
        <button class="btn" type="button" data-edit="${i}">Edit</button>
      </div>
    </li>`).join('');
  $('#product-list-view').hidden = false;
  $('#product-form').hidden = true;
}

$('#plist').addEventListener('click', async e => {
  const edit = e.target.closest('[data-edit]'), move = e.target.closest('[data-move]');
  if (edit) openProduct(Number(edit.dataset.edit));
  if (move) {
    const i = Number(move.dataset.i), j = i + Number(move.dataset.move);
    const products = [...content.products];
    [products[i], products[j]] = [products[j], products[i]];
    try { await save({ ...content, products }, 'Order saved.'); renderProducts(); } catch (err) { toast(err.message, true); }
  }
});
$('#add-product').addEventListener('click', () => openProduct(-1));

/* ---------------- products: editor ---------------- */
function openProduct(index) {
  const blank = { id: '', name: '', cat: 'mekhela', silk: 'Mulberry', price: null, colour: '', images: [], desc: '', tag: '', hidden: false };
  editing = { index, draft: JSON.parse(JSON.stringify(index < 0 ? blank : content.products[index])) };
  const p = editing.draft;
  $('#form-title').textContent = index < 0 ? 'Add a product' : 'Edit product';
  fillChoices(p.cat, p.silk);
  $('#p-name').value = p.name;
  $('#p-price').value = p.price == null ? '' : p.price;
  $('#p-tag').value = p.tag || '';
  $('#p-cat').value = p.cat;
  $('#p-silk').value = p.silk;
  $('#p-colour').value = p.colour || '';
  $('#p-desc').value = p.desc || '';
  $('#p-hidden').checked = !!p.hidden;
  $('#form-error').textContent = '';
  $('#delete-product').hidden = index < 0;
  resetDelete();
  renderPhotos();
  $('#product-list-view').hidden = true;
  $('#product-form').hidden = false;
  window.scrollTo(0, 0);
}

function fillChoices(cat, silk) {
  $('#p-cat').innerHTML = Object.entries(content.categories).map(([k, c]) => `<option value="${esc(k)}">${esc(c.label)}</option>`).join('');
  $('#p-silk').innerHTML = Object.keys(content.silks).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
  $('#p-cat').value = cat;
  $('#p-silk').value = silk;
}

/* Delete a type or fabric. Refused while products use it or when it is the last one.
   Pressing the button once asks for a second press. */
let deleteArm = null, deleteArmTimer;
$('#product-form').addEventListener('click', async e => {
  const del = e.target.closest('[data-delete-choice]');
  if (!del) return;
  const kind = del.dataset.deleteChoice, err = $('#form-error');
  const label = kind === 'cat' ? 'type' : 'fabric';
  const key = kind === 'cat' ? $('#p-cat').value : $('#p-silk').value;
  const shown = kind === 'cat' ? content.categories[key].label : key;
  const total = Object.keys(kind === 'cat' ? content.categories : content.silks).length;
  const users = content.products.filter(p => (kind === 'cat' ? p.cat : p.silk) === key);
  if (total <= 1) { err.textContent = `Keep at least one ${label}. Add another before deleting this one.`; return; }
  if (users.length) {
    const names = users.map(p => p.name).join(', ');
    err.textContent = `"${shown}" is used by ${users.length === 1 ? '1 product' : users.length + ' products'} (${names}). Move ${users.length === 1 ? 'it' : 'them'} to another ${label} first.`;
    return;
  }
  err.textContent = '';
  const idle = `Delete this ${label}`;
  if (deleteArm !== del) {
    deleteArm = del;
    del.textContent = `Press again to delete this ${label}`;
    clearTimeout(deleteArmTimer);
    deleteArmTimer = setTimeout(() => { deleteArm = null; del.textContent = idle; }, 5000);
    return;
  }
  deleteArm = null; clearTimeout(deleteArmTimer);
  const next = { ...content, categories: { ...content.categories }, silks: { ...content.silks } };
  if (kind === 'cat') delete next.categories[key]; else delete next.silks[key];
  try {
    await save(next, `${label[0].toUpperCase()}${label.slice(1)} deleted.`);
    const cat = kind === 'cat' ? Object.keys(content.categories)[0] : $('#p-cat').value;
    const silk = kind === 'silk' ? Object.keys(content.silks)[0] : $('#p-silk').value;
    fillChoices(cat, silk);
  } catch (er) { err.textContent = er.message; }
  del.textContent = idle;
});

/* "+ Add a new type / fabric" opens a small row. Adding saves straight away and selects the new choice. */
const NAME_OK = /^[A-Za-z][A-Za-z -]{0,39}$/;
function closeAddRow(kind) {
  $(`#addrow-${kind}`).hidden = true;
  $(`#new-${kind}`).value = '';
  if (kind === 'silk') $('#new-silk-desc').value = '';
}
$('#product-form').addEventListener('click', async e => {
  const open = e.target.closest('[data-add-choice]');
  const cancel = e.target.closest('[data-cancel-choice]');
  const add = e.target.closest('[data-save-choice]');
  if (open) { $(`#addrow-${open.dataset.addChoice}`).hidden = false; $(`#new-${open.dataset.addChoice}`).focus(); return; }
  if (cancel) { closeAddRow(cancel.dataset.cancelChoice); return; }
  if (!add) return;

  const kind = add.dataset.saveChoice, err = $('#form-error'), input = $(`#new-${kind}`);
  const name = input.value.trim().replace(/\s+/g, ' ');
  const label = kind === 'cat' ? 'type' : 'fabric';
  if (!name) { err.textContent = `Please type the name of the new ${label}.`; input.focus(); return; }
  if (kind === 'silk' && !NAME_OK.test(name)) { err.textContent = 'Fabric names can use letters, spaces and hyphens only, up to 40 characters.'; input.focus(); return; }
  const lower = name.toLowerCase();
  if (kind === 'cat' && Object.values(content.categories).some(c => c.label.toLowerCase() === lower)) { err.textContent = `"${name}" is already a type.`; return; }
  if (kind === 'silk' && Object.keys(content.silks).some(k => k.toLowerCase() === lower)) { err.textContent = `"${name}" is already a fabric.`; return; }

  const next = { ...content, categories: { ...content.categories }, silks: { ...content.silks } };
  let key;
  if (kind === 'cat') {
    const taken = Object.keys(content.categories);
    key = slug(name);
    for (let n = 2; taken.includes(key); n++) key = `${slug(name)}-${n}`;
    next.categories[key] = { label: name, plural: name + 's' };
  } else {
    key = name;
    next.silks[name] = $('#new-silk-desc').value.trim();
  }
  err.textContent = '';
  busy(add, 'Adding…', async () => {
    try {
      await save(next, `${label[0].toUpperCase()}${label.slice(1)} added.`);
      fillChoices(kind === 'cat' ? key : $('#p-cat').value, kind === 'silk' ? key : $('#p-silk').value);
      closeAddRow(kind);
    } catch (er) { err.textContent = er.message; }
  });
});

function renderPhotos() {
  const imgs = editing.draft.images;
  $('#photos').innerHTML = imgs.map((im, i) => `
    <div class="photo">
      <img src="${esc(imgSrc(im))}" alt="Photo ${i + 1}">
      ${i === 0 ? '<span class="first">Main</span>' : ''}
      <button type="button" data-remove="${i}">Remove</button>
    </div>`).join('') + (imgs.length < 8 ? '<button class="add-photo" type="button" id="add-photo">+ Add photo</button>' : '');
}

$('#photos').addEventListener('click', e => {
  const rm = e.target.closest('[data-remove]');
  if (rm) { editing.draft.images.splice(Number(rm.dataset.remove), 1); renderPhotos(); }
  if (e.target.closest('#add-photo')) $('#photo-input').click();
});

// Photos are shrunk in the browser before upload, so large phone photos are fine.
async function shrink(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) { throw new Error(`“${file.name}” could not be read. Please use a JPG or PNG photo.`); }
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.84));
}
// The live site's backend takes photos as base64 text (cheaper for it than raw bytes).
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('That photo could not be read. Please try another.'));
    r.readAsDataURL(blob);
  });
}
$('#photo-input').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  const btn = $('#add-photo');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
  try {
    for (const f of files) {
      if (editing.draft.images.length >= 8) break;
      const blob = await shrink(f);
      const r = SAVES_LATER ? await call('POST', '/api/upload', { data: await toBase64(blob) }) : await call('POST', '/api/upload', blob, true);
      preview[r.image] = URL.createObjectURL(blob);
      editing.draft.images.push(r.image);
    }
  } catch (err) { $('#form-error').textContent = err.message; }
  renderPhotos();
});

$('#product-form').addEventListener('submit', e => {
  e.preventDefault();
  const p = editing.draft, err = $('#form-error');
  p.name = $('#p-name').value.trim();
  const priceText = $('#p-price').value.replace(/[₹,\s]/g, '');
  p.cat = $('#p-cat').value; p.silk = $('#p-silk').value;
  p.colour = $('#p-colour').value.trim(); p.desc = $('#p-desc').value.trim();
  p.tag = $('#p-tag').value.trim(); p.hidden = $('#p-hidden').checked;
  if (!p.name) { err.textContent = 'Please give the product a name.'; $('#p-name').focus(); return; }
  if (priceText && !/^\d+$/.test(priceText)) { err.textContent = 'The price should be a number only, like 18500.'; $('#p-price').focus(); return; }
  if (!p.images.length) { err.textContent = 'Please add at least one photo.'; return; }
  p.price = priceText ? Number(priceText) : null;
  const products = [...content.products];
  if (editing.index < 0) {
    let id = slug(p.name), n = 2;
    while (products.some(x => x.id === id)) id = `${slug(p.name)}-${n++}`;
    p.id = id;
    products.unshift(p);            // new pieces go to the top
  } else products[editing.index] = p;
  err.textContent = '';
  busy($('#save-product'), 'Saving…', async () => {
    try { await save({ ...content, products }); editing = null; renderProducts(); } catch (er) { err.textContent = er.message; }
  });
});

const backToList = () => { editing = null; renderProducts(); };
$('#cancel').addEventListener('click', backToList);
$('#cancel-top').addEventListener('click', backToList);

// Delete asks twice on the same button instead of a pop-up.
let deleteTimer;
function resetDelete() {
  const b = $('#delete-product');
  b.classList.remove('sure'); b.textContent = 'Delete product';
  clearTimeout(deleteTimer);
}
$('#delete-product').addEventListener('click', async () => {
  const b = $('#delete-product');
  if (!b.classList.contains('sure')) {
    b.classList.add('sure'); b.textContent = 'Press again to delete';
    deleteTimer = setTimeout(resetDelete, 5000);
    return;
  }
  const products = content.products.filter((_, i) => i !== editing.index);
  try { await save({ ...content, products }, 'Product deleted.'); editing = null; renderProducts(); } catch (err) { $('#form-error').textContent = err.message; resetDelete(); }
});

/* ---------------- website text ---------------- */
function renderText() {
  $('#text-fields').innerHTML = TEXT_FIELDS.map(([group, fields]) => `
    <h3 class="group">${esc(group)}</h3>
    ${fields.map(([key, label, rows]) => {
      const v = content.text[key];
      return `<div class="field"><label for="t-${key}">${esc(label)}</label>
        <textarea id="t-${key}" data-key="${key}" rows="${rows}">${esc(Array.isArray(v) ? v.join('\n') : v)}</textarea></div>`;
    }).join('')}`).join('');
}
$('#text-form').addEventListener('submit', e => {
  e.preventDefault();
  const text = { ...content.text }, err = $('#text-error');
  for (const el of $$('#text-fields textarea')) {
    const k = el.dataset.key, v = el.value.trim();
    if (!v) { err.textContent = 'This box can’t be empty.'; el.focus(); return; }
    text[k] = Array.isArray(content.text[k]) ? v.split('\n').map(x => x.trim()).filter(Boolean) : v;
  }
  err.textContent = '';
  busy($('#text-form button[type=submit]'), 'Saving…', async () => {
    try { await save({ ...content, text }); renderText(); } catch (er) { err.textContent = er.message; }
  });
});

/* ---------------- contact ---------------- */
const CONTACT = ['whatsapp', 'whatsappDisplay', 'instagram', 'instagramHandle', 'address', 'maps'];
function renderContact() { CONTACT.forEach(k => { $('#c-' + k).value = content.studio[k] || ''; }); }
$('#contact-form').addEventListener('submit', e => {
  e.preventDefault();
  const studio = { ...content.studio }, err = $('#contact-error');
  CONTACT.forEach(k => { studio[k] = $('#c-' + k).value.trim(); });
  err.textContent = '';
  busy($('#contact-form button[type=submit]'), 'Saving…', async () => {
    try { await save({ ...content, studio }); renderContact(); } catch (er) { err.textContent = er.message; }
  });
});

/* ---------------- settings: change password ---------------- */
$('#password-form').addEventListener('submit', e => {
  e.preventDefault();
  const current = $('#pw-current').value, next = $('#pw-new').value, err = $('#password-error');
  err.textContent = current ? passwordProblem(next, $('#pw-again').value) : 'Please enter your current password.';
  if (err.textContent) return;
  busy($('#password-form button[type=submit]'), 'Saving…', async () => {
    try {
      await call('POST', '/api/password', { current, next });
      ['#pw-current', '#pw-new', '#pw-again'].forEach(s => { $(s).value = ''; });
      toast('Password changed.');
    } catch (er) { err.textContent = er.message; }
  });
});

/* ---------------- start ---------------- */
(async () => {
  if (location.hash.startsWith('#reset-')) { showSignin('', 'reset'); return; }
  if ((REMOTE || GITHUB) && !currentToken()) { showSignin(''); return; }
  if (GITHUB) {
    try {
      await call('GET', '/api/me');
      $('#key-info').textContent = 'Signed in on this device with your GitHub key.';
      await showConsole();
    } catch (e) {
      if (e.status !== 401) showSignin(e.message);       // 401 already shows sign-in with its message
    }
    return;
  }
  let res;
  try {
    res = await fetch(API + '/api/me', REMOTE
      ? { credentials: 'omit', headers: { Authorization: 'Bearer ' + currentToken() } }
      : { credentials: 'same-origin' });
  } catch (e) { res = null; }
  if (res && res.ok) {
    try { const me = await res.json(); $('#signed-in-as').textContent = 'Signed in as ' + me.email; $('#pw-user').value = me.email; } catch (e) { /* cosmetic */ }
    try { await showConsole(); return; } catch (e) { /* fall through to sign in */ }
  }
  if (res && res.status === 401) token.clear();
  showSignin(!res || res.status === 404 ? 'The console is not available right now. Please try again later.' : '');
})();
