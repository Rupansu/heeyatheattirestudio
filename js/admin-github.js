/* /admin on the live site (GitHub Pages): the console saves straight to the website's GitHub repo
   from the browser, signed in with a GitHub key (fine-grained personal access token that can
   only read and write that one repo). No server of our own.

   Saving commits content.json + js/data.js (and photos under uploads/); GitHub Pages then
   republishes the site in about a minute.

   window.HEEYA_GITHUB = { repo: 'owner/name', branch: 'main', api?: 'https://api.github.com' }
   is set by admin/config.js. founder.js calls HeeyaGitHub.call() in place of the server API. */
const HeeyaGitHub = (() => {
  const cfg = window.HEEYA_GITHUB || {};
  const API = String(cfg.api || 'https://api.github.com').replace(/\/+$/, '');
  const REPO = cfg.repo, BRANCH = cfg.branch || 'main';
  const IMAGE_NAME = /^(?:[a-z0-9-]{1,60}|uploads\/[a-f0-9]{16}\.jpg)$/;

  class Problem extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }

  async function gh(key, method, path, body, writing) {
    let res;
    try {
      res = await fetch(`${API}/repos/${REPO}${path}`, {
        method, cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + key, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Problem('Could not reach GitHub. Check your internet connection and try again.', 0);
    }
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) { /* not JSON */ }
    if (res.ok) return data;
    const msg = String(data.message || '');
    if (res.status === 401) throw new Problem('This GitHub key doesn’t work any more. Please sign in with a new key.', 401);
    if (/rate limit/i.test(msg)) throw new Problem('GitHub is busy. Please wait a minute and try again.', 429);
    if (res.status === 403 || res.status === 404) {
      throw new Problem(writing
        ? 'This key can’t save changes to the website. It needs “Contents: Read and write” for the heeyatheattirestudio repository.'
        : 'This key can’t open the website’s files. It needs access to the heeyatheattirestudio repository.', 403);
    }
    throw new Problem(res.status === 422 ? 'conflict' : 'GitHub had a problem. Please try again.', res.status);
  }

  const fromBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(String(b64).replace(/\n/g, '')), c => c.charCodeAt(0)));

  // Read through the branch head (always current), not the contents API (can lag a minute).
  async function readContent(key) {
    const head = (await gh(key, 'GET', `/git/ref/heads/${BRANCH}`)).object.sha;
    const tree = (await gh(key, 'GET', `/git/commits/${head}`)).tree.sha;
    const entry = (await gh(key, 'GET', `/git/trees/${tree}`)).tree.find(e => e.path === 'content.json');
    if (!entry) throw new Problem('The website’s content file is missing. Please publish the site again.', 500);
    return JSON.parse(fromBase64((await gh(key, 'GET', `/git/blobs/${entry.sha}`)).content));
  }

  // One commit on top of the branch head; tries again if something else committed meanwhile.
  async function commitFiles(key, files, message) {
    const tree = [];
    for (const f of files) {
      const blob = await gh(key, 'POST', '/git/blobs', f.base64 ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }, true);
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (let attempt = 0; ; attempt++) {
      const head = (await gh(key, 'GET', `/git/ref/heads/${BRANCH}`)).object.sha;
      const baseTree = (await gh(key, 'GET', `/git/commits/${head}`)).tree.sha;
      const t = await gh(key, 'POST', '/git/trees', { base_tree: baseTree, tree }, true);
      const c = await gh(key, 'POST', '/git/commits', { message: message + '\n\n(saved from the founder’s console)', tree: t.sha, parents: [head] }, true);
      try {
        await gh(key, 'PATCH', `/git/refs/heads/${BRANCH}`, { sha: c.sha, force: false }, true);
        return;
      } catch (e) {
        if (e.status !== 422 || attempt >= 2) throw e.status === 422 ? new Problem('The website changed while saving. Please try again.', 409) : e;
      }
    }
  }

  function dataJs(c) {
    const J = v => JSON.stringify(v, null, 1);
    return `/* Generated from the founder's console. */
const STUDIO = ${J(c.studio)};
const CATEGORIES = ${J(c.categories)};
const SILKS = ${J(c.silks)};
const PRODUCTS = ${J(c.products.filter(p => !p.hidden))};
const RUNWAY = ${J(c.runway)};
const TEXT = ${J(c.text)};
`;
  }

  /* The same checks the server makes, so a slip can't break the live site. */
  const bad = msg => new Problem(msg, 400);
  const str = (v, max, what, required) => {
    const s = String(v == null ? '' : v).trim();
    if (required && !s) throw bad(`${what} can't be empty.`);
    if (s.length > max) throw bad(`${what} is too long (limit ${max} characters).`);
    return s;
  };
  const httpsUrl = (v, what) => {
    const s = str(v, 400, what, true);
    let u;
    try { u = new URL(s); } catch (e) { throw bad(`${what} must be a full link starting with https://`); }
    if (u.protocol !== 'https:') throw bad(`${what} must be a link starting with https://`);
    return u.href;
  };
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function clean(body, cur) {
    const out = {};
    const s = body.studio || {};
    const whatsapp = String(s.whatsapp || '').replace(/\D/g, '');
    if (whatsapp.length < 10 || whatsapp.length > 15) throw bad('The WhatsApp number should have 10 to 15 digits, with the country code (for example 919864030365).');
    out.studio = {
      whatsapp,
      whatsappDisplay: str(s.whatsappDisplay, 40, 'The WhatsApp number shown on the site', true),
      instagram: httpsUrl(s.instagram, 'The Instagram link'),
      instagramHandle: str(s.instagramHandle, 60, 'The Instagram name', true),
      address: str(s.address, 200, 'The address', true),
      maps: httpsUrl(s.maps, 'The Google Maps link'),
    };

    const cats = {}, silks = {};
    for (const [id, c] of Object.entries(body.categories || cur.categories)) {
      if (!/^[a-z0-9-]{1,60}$/.test(id)) throw bad(`The type "${id}" has an unusable name.`);
      cats[id] = { label: str((c || {}).label, 40, 'A type name', true), plural: str((c || {}).plural, 40, 'A type name', true) };
    }
    if (!Object.keys(cats).length) throw bad('There must be at least one product type.');
    const seenSilk = new Set();
    for (const [name, desc] of Object.entries(body.silks || cur.silks)) {
      if (!/^[A-Za-z][A-Za-z -]{0,39}$/.test(name)) throw bad(`The fabric name "${name}" can only use letters, spaces and hyphens.`);
      if (seenSilk.has(name.toLowerCase())) throw bad(`"${name}" is listed as a fabric more than once.`);
      seenSilk.add(name.toLowerCase());
      silks[name] = str(desc, 300, 'The fabric description');
    }
    if (!Object.keys(silks).length) throw bad('There must be at least one fabric.');
    out.categories = cats;
    out.silks = silks;

    if (!Array.isArray(body.products) || body.products.length > 500) throw bad('The product list is missing.');
    const seen = new Set();
    out.products = body.products.map(p => {
      const name = str(p.name, 120, 'A product name', true);
      const id = String(p.id || '');
      if (!/^[a-z0-9-]{1,80}$/.test(id) || seen.has(id)) throw bad(`"${name}" has a problem with its web address. Please delete it and add it again.`);
      seen.add(id);
      if (!hasOwn(cats, p.cat)) throw bad(`Please choose a type for "${name}".`);
      if (!hasOwn(silks, p.silk)) throw bad(`Please choose a fabric for "${name}".`);
      let price = null;
      if (p.price !== null && p.price !== '' && p.price !== undefined) {
        price = Math.round(Number(p.price));
        if (!Number.isFinite(price) || price < 0 || price > 1e7) throw bad(`The price of "${name}" should be a number, like 18500.`);
      }
      const images = Array.isArray(p.images) ? p.images.map(String) : [];
      if (!images.length) throw bad(`"${name}" needs at least one photo.`);
      if (images.length > 8 || images.some(i => !IMAGE_NAME.test(i))) throw bad(`"${name}" has a photo that can't be used. Remove it and upload it again.`);
      const q = { id, name, cat: p.cat, silk: p.silk, price, colour: str(p.colour, 120, 'The colour'), images, desc: str(p.desc, 1500, 'The description') };
      const tag = str(p.tag, 30, 'The label');
      if (tag) q.tag = tag;
      if (p.hidden) q.hidden = true;
      return q;
    });

    out.text = {};
    const t = body.text || {};
    for (const [k, dv] of Object.entries(cur.text)) {
      if (Array.isArray(dv)) {
        const list = (Array.isArray(t[k]) ? t[k] : []).map(x => str(x, 90, 'A banner line')).filter(Boolean).slice(0, 10);
        out.text[k] = list.length ? list : dv;
      } else {
        out.text[k] = str(t[k], 2000, 'A piece of text', true);
      }
    }
    out.runway = cur.runway;
    return out;
  }

  const randomHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

  /* Same requests and answers as server.js, so founder.js works unchanged. */
  async function call(key, method, path, body) {
    if (path === '/api/login' && method === 'POST') {
      const k = String(body.token || '').trim();
      if (k.length < 20 || /\s/.test(k)) throw new Problem('That doesn’t look like a GitHub key. Please paste the whole key.', 400);
      try { await gh(k, 'GET', ''); } catch (e) {
        throw new Problem(e.status === 401 ? 'GitHub doesn’t recognise this key. Check it was pasted in full, or create a new one.' : e.message, 400);
      }
      return { ok: true, token: k };
    }
    if (path === '/api/logout') return { ok: true };
    if (!key) throw new Problem('Please sign in.', 401);
    if (path === '/api/me' && method === 'GET') {
      await gh(key, 'GET', '');                       // proves the key still opens the repo
      return { email: 'your GitHub key' };
    }
    if (path === '/api/content' && method === 'GET') return readContent(key);
    if (path === '/api/content' && method === 'PUT') {
      const next = clean(body || {}, await readContent(key));
      await commitFiles(key, [
        { path: 'content.json', text: JSON.stringify(next, null, 1) + '\n' },
        { path: 'js/data.js', text: dataJs(next) },
      ], 'Update website content');
      return next;
    }
    if (path === '/api/upload' && method === 'POST') {
      const data = String((body || {}).data || '');
      if (!data.startsWith('/9j/') || data.length > 8 * 1024 * 1024) throw new Problem('That photo could not be read. Please try a JPG or PNG photo.', 400);
      const image = `uploads/${randomHex(8)}.jpg`;
      await commitFiles(key, [{ path: image, base64: data }], 'Add a product photo');
      return { image };
    }
    throw new Problem('Not available here.', 404);
  }

  return { enabled: !!REPO, call, Problem };
})();
