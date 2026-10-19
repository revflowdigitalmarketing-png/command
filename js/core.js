/* Command · Helpers, app state and saving/syncing (db). */
/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dayDiff = s => Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const validTime = s => /^\d{2}:\d{2}$/.test(s || '');
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'; } catch { return 'Asia/Kolkata'; } })();
const tzOff = d => { const m = -d.getTimezoneOffset(), a = Math.abs(m); return `${m >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`; };
const isoAt = (date, time) => { const [h, mi] = time.split(':').map(Number); const d = parseYmd(date); d.setHours(h, mi, 0, 0); return `${date}T${pad(h)}:${pad(mi)}:00${tzOff(d)}`; };
const plusMin = (date, time, mins) => { const [h, mi] = time.split(':').map(Number); const d = parseYmd(date); d.setHours(h, mi + mins, 0, 0); return { date: ymd(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const fmtTime = t => { if (!validTime(t)) return ''; const [h, m] = t.split(':').map(Number); const hh = ((h + 11) % 12) + 1; return `${hh}${m ? ':' + pad(m) : ''} ${h >= 12 ? 'pm' : 'am'}`; };
const fmtDate = s => parseYmd(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
function formatGoalPct(saved, target) {
  if (!target) return '';
  if (Number(saved) <= 0) return '0%';
  const rawPct = (Number(saved) / Number(target)) * 100;
  if (rawPct >= 1) return Math.min(100, Math.round(rawPct)) + '%';
  if (rawPct >= 0.1) return rawPct.toFixed(1) + '%';
  return '<1%';
}
function dueLabel(s) {
  if (!validDate(s)) return { text: '', cls: '' };
  const n = dayDiff(s);
  if (n < 0) return { text: '', cls: 'od' };
  if (n === 0) return { text: 'Today', cls: 'td' };
  if (n === 1) return { text: 'Tomorrow', cls: '' };
  if (n < 7) return { text: parseYmd(s).toLocaleDateString('en-IN', { weekday: 'long' }), cls: '' };
  return { text: parseYmd(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), cls: '' };
}
const CLIENT_COLORS = ['var(--muted)'];
const KIND_LABEL = { task: 'Task', meeting: 'Meeting', promise: 'Promise', payment: 'Payment', note: 'Note', glitch: 'Glitch', reel: 'Reel' };
const GLITCH_STAGES = [['todo', 'To fix'], ['fixing', 'Fixing'], ['fixed', 'Fixed']];
const REEL_STAGES = [['idea', 'Idea'], ['shoot', 'Shoot'], ['edit', 'Edit'], ['posted', 'Posted']];
const PRIO_COLOR = { high: 'var(--ink)', med: 'var(--muted)', low: 'var(--faint)' };
const FOCUS_CATEGORIES = ['Video Editing', 'Website', 'SEO', 'Automations', 'Other'];

function toast(msg) {
  if (!msg) return;
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3400);
}
function useCap(name) {
  try { return window.claude && typeof window.claude.use === 'function' ? Promise.resolve(window.claude.use(name)).catch(() => null) : Promise.resolve(null); }
  catch { return Promise.resolve(null); }
}
function lsGet(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }

/* ================= profiles + state + storage ================= */
const PROFILES = [
  {
    id: 'rahul',
    name: 'Rahul',
    email: 'rahulchandrakondamu@gmail.com',
    avatarLetter: 'R'
  },
  {
    id: 'sri-chandana',
    name: 'Sri Chandana',
    email: 'srichandana1026@gmail.com',
    avatarLetter: 'S'
  },
  {
    id: 'adithya',
    name: 'Adithya',
    email: 'gurrapuadithya10@gmail.com',
    avatarLetter: 'A'
  }
];

function defaultSettingsFor(profileId) {
  if (profileId === 'adithya') {
    return {
      name: 'Adithya',
      email: 'gurrapuadithya10@gmail.com',
      businesses: [
        { id: 'biz-revflow', name: 'RevFlow', kind: 'agency', tagline: 'Digital marketing agency', members: ['rahul', 'sri-chandana', 'adithya'] },
        { id: 'biz-weblit', name: 'WEBLIT', kind: 'agency', tagline: 'Web design & development', members: ['rahul', 'sri-chandana', 'adithya'] }
      ],
      clients: [
        { id: 'cl-nivri', name: 'Nivrishikhara', short: 'Nivri', stars: 5, retainer: 50000, yourShare: 35000, shares: { rahul: 35000, 'sri-chandana': 4000, adithya: 11000 }, color: 0, signed: '2026-10-01', biz: 'biz-revflow' },
        { id: 'va1i4bytbe4k', name: 'Lalitha Clinic', short: 'Lalitha', stars: 4, retainer: 30000, yourShare: 15000, shares: { rahul: 15000, 'sri-chandana': 10000, adithya: 5000 }, color: 2, signed: '2026-10-01', biz: 'biz-revflow' }
      ],
      goals: [
        { id: 'goal-dubai', name: 'Dubai trip', target: 250000, saved: 175000, date: addDays(today(), 42), note: '1 week with the crew' },
        { id: 'goal-bali', name: 'Bali trip', target: 200000, saved: 85000, date: addDays(today(), 95), note: 'Villa & surf' }
      ],
      wishlist: [
        { id: 'wish-1', name: 'Linen shirts & shades', cost: 12000, cat: 'Trip', goal: 'goal-dubai', note: 'Dubai prep', bought: false },
        { id: 'wish-2', name: 'Noise-cancelling headphones', cost: 24000, cat: 'Tech', goal: '', note: 'Travel & deep work', bought: false }
      ],
      peakStart: '10:00', peakEnd: '13:00', dayStart: '09:00', dayEnd: '21:00'
    };
  }
  if (profileId === 'sri-chandana') {
    return {
      name: 'Sri Chandana',
      email: 'srichandana1026@gmail.com',
      businesses: [
        { id: 'biz-revflow', name: 'RevFlow', kind: 'agency', tagline: 'Digital marketing agency', members: ['rahul', 'sri-chandana', 'adithya'] },
        { id: 'biz-weblit', name: 'WEBLIT', kind: 'agency', tagline: 'Web design & development', members: ['rahul', 'sri-chandana', 'adithya'] },
        { id: 'biz-larping', name: 'LARPING', kind: 'product', tagline: 'App & product development', members: ['rahul', 'sri-chandana'] }
      ],
      clients: [
        { id: 'cl-nivri', name: 'Nivrishikhara', short: 'Nivri', stars: 5, retainer: 50000, yourShare: 4000, shares: { rahul: 35000, 'sri-chandana': 4000, adithya: 11000 }, color: 0, signed: '2026-10-01', biz: 'biz-revflow' },
        { id: 'va1i4bytbe4k', name: 'Lalitha Clinic', short: 'Lalitha', stars: 4, retainer: 30000, yourShare: 15000, shares: { rahul: 15000, 'sri-chandana': 10000, adithya: 5000 }, color: 2, signed: '2026-10-01', biz: 'biz-revflow' }
      ],
      goals: [
        { id: 'goal-dubai', name: 'Dubai trip', target: 250000, saved: 175000, date: addDays(today(), 42), note: '1 week with the crew' },
        { id: 'goal-bali', name: 'Bali trip', target: 200000, saved: 85000, date: addDays(today(), 95), note: 'Villa & surf' }
      ],
      wishlist: [
        { id: 'wish-1', name: 'Linen shirts & shades', cost: 12000, cat: 'Trip', goal: 'goal-dubai', note: 'Dubai prep', bought: false },
        { id: 'wish-2', name: 'Noise-cancelling headphones', cost: 24000, cat: 'Tech', goal: '', note: 'Travel & deep work', bought: false }
      ],
      peakStart: '10:00', peakEnd: '13:00', dayStart: '09:00', dayEnd: '21:00'
    };
  }
  // rahul - identical business info, clients, goals, wishlist
  return {
    name: 'Rahul',
    email: 'rahulchandrakondamu@gmail.com',
    businesses: [
      { id: 'biz-revflow', name: 'RevFlow', kind: 'agency', tagline: 'Digital marketing agency', members: ['rahul', 'sri-chandana', 'adithya'] },
      { id: 'biz-weblit', name: 'WEBLIT', kind: 'agency', tagline: 'Web design & development', members: ['rahul', 'sri-chandana', 'adithya'] },
      { id: 'biz-larping', name: 'LARPING', kind: 'product', tagline: 'App & product development', members: ['rahul', 'sri-chandana'] }
    ],
    clients: [
      { id: 'cl-nivri', name: 'Nivrishikhara', short: 'Nivri', stars: 5, retainer: 50000, yourShare: 35000, shares: { rahul: 35000, 'sri-chandana': 4000, adithya: 11000 }, color: 0, signed: '2026-10-01', biz: 'biz-revflow' },
      { id: 'va1i4bytbe4k', name: 'Lalitha Clinic', short: 'Lalitha', stars: 4, retainer: 30000, yourShare: 15000, shares: { rahul: 15000, 'sri-chandana': 10000, adithya: 5000 }, color: 2, signed: '2026-10-01', biz: 'biz-revflow' }
    ],
    goals: [
      { id: 'goal-dubai', name: 'Dubai trip', target: 250000, saved: 175000, date: addDays(today(), 42), note: '1 week with the crew' },
      { id: 'goal-bali', name: 'Bali trip', target: 200000, saved: 85000, date: addDays(today(), 95), note: 'Villa & surf' }
    ],
    wishlist: [
      { id: 'wish-1', name: 'Linen shirts & shades', cost: 12000, cat: 'Trip', goal: 'goal-dubai', note: 'Dubai prep', bought: false },
      { id: 'wish-2', name: 'Noise-cancelling headphones', cost: 24000, cat: 'Tech', goal: '', note: 'Travel & deep work', bought: false }
    ],
    peakStart: '10:00', peakEnd: '13:00', dayStart: '09:00', dayEnd: '21:00'
  };
}

function defaultItemsFor(profileId) {
  if (profileId === 'adithya') {
    return [
      { id: 'it-pay-ad-1', kind: 'payment', title: 'October Retainer · Nirvishikhara', client: 'zl4opg3r3gxe', amount: 22000, yourShare: 11000, status: 'open', due: '2026-10-05', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-ad-2', kind: 'payment', title: 'October Retainer · Sree Nandi Tiles', client: '5gfdraar45fv', amount: 22000, yourShare: 11000, status: 'open', due: '2026-10-10', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-ad-3', kind: 'payment', title: 'One-Time Project Payment · Lalitha Clinics', client: 'va1i4bytbe4k', amount: 120000, yourShare: 18000, status: 'open', due: '2026-10-25', biz: 'biz-revflow', notes: 'One-time project payment', cal: null }
    ];
  }
  if (profileId === 'rahul') {
    return [
      { id: 'it-pay-1', kind: 'payment', title: 'October Retainer · Nirvishikhara', client: 'zl4opg3r3gxe', amount: 22000, yourShare: 11000, status: 'open', due: '2026-10-05', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-2', kind: 'payment', title: 'October Retainer · Sree Nandi Tiles', client: '5gfdraar45fv', amount: 22000, yourShare: 11000, status: 'open', due: '2026-10-10', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-3', kind: 'payment', title: 'One-Time Project Payment · Lalitha Clinics', client: 'va1i4bytbe4k', amount: 120000, yourShare: 18000, status: 'open', due: '2026-10-25', biz: 'biz-revflow', notes: 'One-time project payment', cal: null },
      { id: 'it-6', kind: 'task', title: 'Fix audio desync when switching playback speed on mobile', client: '', person: '', due: '', time: '', priority: 'high', status: 'open', created: Date.now() - 30000000, biz: 'biz-larping', amount: 0, notes: '', cal: null },
      { id: 'it-7', kind: 'task', title: 'Fix dark mode toggle flickering white on first load', client: '', person: '', due: '', time: '', priority: 'med', status: 'open', created: Date.now() - 60000000, biz: 'biz-larping', amount: 0, notes: '', cal: null },
      { id: 'it-8', kind: 'task', title: 'Fix video export failure on iOS Safari background tab', client: '', person: '', due: '', time: '', priority: 'med', status: 'done', doneAt: Date.now() - 10000000, created: Date.now() - 90000000, biz: 'biz-larping', amount: 0, notes: '', cal: null },
      { id: 'it-9', kind: 'reel', title: 'Day in the life running 3 businesses at 22', client: '', person: '', due: '', time: '', priority: 'med', status: 'open', created: Date.now() - 20000000, biz: 'biz-larping', amount: 0, notes: 'Behind-the-scenes B-roll showing Command', stage: 'shoot', link: '', cal: null },
      { id: 'it-10', kind: 'reel', title: 'Why I stopped using frameworks and built my own command center', client: '', person: '', due: addDays(today(), -2), time: '14:00', priority: 'high', status: 'done', doneAt: Date.now() - 86400000, biz: 'biz-larping', amount: 0, notes: 'Posted to IG Reels', stage: 'posted', link: 'https://instagram.com/reel/example', cal: null }
    ];
  }
  if (profileId === 'sri-chandana') {
    return [
      { id: 'it-pay-sc-1', kind: 'payment', title: 'October Retainer · Nirvishikhara', client: 'zl4opg3r3gxe', amount: 22000, yourShare: 4000, status: 'open', due: '2026-10-05', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-sc-2', kind: 'payment', title: 'October Retainer · Sree Nandi Tiles', client: '5gfdraar45fv', amount: 22000, yourShare: 4000, status: 'open', due: '2026-10-10', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-sc-3', kind: 'payment', title: 'October Retainer · Spring Consultancy', client: 'wneqziyr5huy', amount: 6000, yourShare: 1300, status: 'open', due: '2026-10-12', biz: 'biz-revflow', notes: 'Monthly retainer', cal: null },
      { id: 'it-pay-sc-4', kind: 'payment', title: 'One-Time Project Payment · Lalitha Clinics', client: 'va1i4bytbe4k', amount: 120000, yourShare: 18000, status: 'open', due: '2026-10-25', biz: 'biz-revflow', notes: 'One-time project payment', cal: null },
      { id: 'it-sc-f1', kind: 'task', isFocus: true, title: 'Record 3 video scripts and ad hooks for RevFlow', client: '', biz: 'biz-revflow', category: 'Video Editing', due: today(), priority: 'high', status: 'open', created: Date.now() - 3600000 },
      { id: 'it-sc-f3', kind: 'task', isFocus: true, title: 'Design mobile notification sheet & interaction flows', client: '', biz: 'biz-larping', category: 'Automations', due: today(), priority: 'med', status: 'open', created: Date.now() - 10800000 }
    ];
  }
  return [];
}

const DEFAULTS = () => defaultSettingsFor((typeof window !== 'undefined' && window.S && window.S.profileId) || lsGet('cmd.active_profile', 'rahul'));
const DEFAULT_ITEMS = () => defaultItemsFor((typeof window !== 'undefined' && window.S && window.S.profileId) || lsGet('cmd.active_profile', 'rahul'));

function getMasterBusinesses() {
  let b = lsGet('cmd.businesses', null);
  if (!Array.isArray(b) || b.length === 0) {
    const aggregated = [
      ...((typeof window !== 'undefined' && window.S && window.S.settings && window.S.settings.businesses) || []),
      ...((lsGet('cmd.settings_rahul', {}) || {}).businesses || []),
      ...((lsGet('cmd.settings_sri-chandana', {}) || {}).businesses || []),
      ...((lsGet('cmd.settings_adithya', {}) || {}).businesses || []),
      ...(defaultSettingsFor('rahul').businesses || [])
    ];
    const map = new Map();
    aggregated.forEach(biz => {
      if (biz && biz.id && !map.has(biz.id)) map.set(biz.id, { ...biz });
    });
    b = Array.from(map.values());
  }
  b.forEach(biz => {
    if (!biz.members || !Array.isArray(biz.members) || !biz.members.length) {
      biz.members = (biz.id === 'biz-larping' || (biz.name && biz.name.toLowerCase() === 'larping'))
        ? ['rahul', 'sri-chandana']
        : ['rahul', 'sri-chandana', 'adithya'];
    }
  });
  const orderRank = { 'biz-revflow': 1, 'biz-weblit': 2, 'biz-larping': 3 };
  b.sort((x, y) => (orderRank[x.id] || 99) - (orderRank[y.id] || 99));
  lsSet('cmd.businesses', b);
  return b;
}

function getMasterClients() {
  let cList = lsGet('cmd.clients', null);
  if (!Array.isArray(cList) || cList.length === 0) {
    const aggregated = [
      ...((typeof window !== 'undefined' && window.S && window.S.settings && window.S.settings.clients) || []),
      ...((lsGet('cmd.settings_rahul', {}) || {}).clients || []),
      ...((lsGet('cmd.settings_sri-chandana', {}) || {}).clients || []),
      ...((lsGet('cmd.settings_adithya', {}) || {}).clients || []),
      ...(defaultSettingsFor('rahul').clients || [])
    ];
    const map = new Map();
    aggregated.forEach(c => {
      if (c && c.id && !map.has(c.id)) map.set(c.id, { ...c });
    });
    cList = Array.from(map.values());
  }
  cList = cList.filter(c => c && c.id && c.id !== 'cl-1' && c.id !== 'cl-2');
  lsSet('cmd.clients', cList);
  return cList;
}

function saveMasterClient(c) {
  c.updated = Date.now();
  delete c.note;
  const all = getMasterClients();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) all[idx] = c;
  else all.push(c);
  lsSet('cmd.clients', all);

  PROFILES.forEach(p => {
    const pSet = lsGet(`cmd.settings_${p.id}`, null) || defaultSettingsFor(p.id);
    pSet.businesses = businesses(p.id);
    pSet.clients = clients(p.id);
    lsSet(`cmd.settings_${p.id}`, pSet);
  });

  if (typeof window !== 'undefined' && window.S && window.S.settings) {
    window.S.settings.businesses = businesses(window.S.profileId);
    window.S.settings.clients = clients(window.S.profileId);
    lsSet('cmd.settings', window.S.settings);
  }

  pushAllToServer();
}

function deleteMasterClient(id) {
  const all = getMasterClients().filter(x => x.id !== id);
  lsSet('cmd.clients', all);

  const delCl = lsGet('cmd.deleted_clients', []);
  if (!delCl.includes(id)) delCl.push(id);
  lsSet('cmd.deleted_clients', delCl);

  PROFILES.forEach(p => {
    const pSet = lsGet(`cmd.settings_${p.id}`, null) || defaultSettingsFor(p.id);
    pSet.businesses = businesses(p.id);
    pSet.clients = clients(p.id);
    lsSet(`cmd.settings_${p.id}`, pSet);
  });

  if (typeof window !== 'undefined' && window.S && window.S.settings) {
    window.S.settings.businesses = businesses(window.S.profileId);
    window.S.settings.clients = clients(window.S.profileId);
    lsSet('cmd.settings', window.S.settings);
  }

  pushAllToServer();
}

function saveMasterBusiness(b) {
  b.updated = Date.now();
  const all = getMasterBusinesses();
  const idx = all.findIndex(x => x.id === b.id);
  if (idx >= 0) all[idx] = b;
  else all.push(b);
  lsSet('cmd.businesses', all);

  PROFILES.forEach(p => {
    const pSet = lsGet(`cmd.settings_${p.id}`, null) || defaultSettingsFor(p.id);
    pSet.businesses = businesses(p.id);
    pSet.clients = clients(p.id);
    lsSet(`cmd.settings_${p.id}`, pSet);
  });

  if (typeof window !== 'undefined' && window.S && window.S.settings) {
    window.S.settings.businesses = businesses(window.S.profileId);
    window.S.settings.clients = clients(window.S.profileId);
    lsSet('cmd.settings', window.S.settings);
  }

  pushAllToServer();
}

function deleteMasterBusiness(id) {
  const all = getMasterBusinesses().filter(x => x.id !== id);
  lsSet('cmd.businesses', all);

  const delBiz = lsGet('cmd.deleted_biz', []);
  if (!delBiz.includes(id)) delBiz.push(id);
  lsSet('cmd.deleted_biz', delBiz);

  PROFILES.forEach(p => {
    const pSet = lsGet(`cmd.settings_${p.id}`, null) || defaultSettingsFor(p.id);
    pSet.businesses = businesses(p.id);
    pSet.clients = clients(p.id);
    lsSet(`cmd.settings_${p.id}`, pSet);
  });

  if (typeof window !== 'undefined' && window.S && window.S.settings) {
    window.S.settings.businesses = businesses(window.S.profileId);
    window.S.settings.clients = clients(window.S.profileId);
    lsSet('cmd.settings', window.S.settings);
  }

  pushAllToServer();
}

function businesses(pid = (typeof window !== 'undefined' && window.S && window.S.profileId) || 'rahul') {
  const all = getMasterBusinesses();
  const orderRank = { 'biz-revflow': 1, 'biz-weblit': 2, 'biz-larping': 3 };
  return all
    .filter(b => {
      const m = b.members || (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
      return m.includes(pid);
    })
    .sort((a, b) => (orderRank[a.id] || 99) - (orderRank[b.id] || 99));
}

function starsOf(c) {
  const v = Number(c && c.stars);
  return v > 0 ? v : ({ 1: 5, 2: 4, 3: 3 }[c && c.priority] || 3);
}

function clients(pid = (typeof window !== 'undefined' && window.S && window.S.profileId) || 'rahul') {
  const myBizIds = new Set(businesses(pid).map(b => b.id));
  const all = getMasterClients();
  return all
    .filter(c => {
      if (c && c.biz) return myBizIds.has(c.biz);
      return true;
    })
    .map(c => {
      if (c && c.shares && c.shares[pid] !== undefined && c.shares[pid] !== null && c.shares[pid] !== '') {
        return { ...c, yourShare: Number(c.shares[pid]) || 0 };
      }
      return c;
    })
    .sort((a, b) => starsOf(b) - starsOf(a) || (a.name || '').localeCompare(b.name || ''));
}

function getTeamMembersForClient(clientObjOrBizId) {
  let bizId = typeof clientObjOrBizId === 'string' ? clientObjOrBizId : (clientObjOrBizId && clientObjOrBizId.biz);
  if (!bizId && clientObjOrBizId && typeof clientBiz === 'function') {
    bizId = clientBiz(clientObjOrBizId);
  }
  const b = bizId && typeof bizById === 'function' ? bizById(bizId) : null;
  let pids = [];
  if (b && Array.isArray(b.members) && b.members.length > 0) {
    pids = [...b.members];
  } else {
    pids = PROFILES.map(p => p.id);
  }
  const curPid = (typeof window !== 'undefined' && window.S && window.S.profileId) || 'rahul';
  if (!pids.includes(curPid)) {
    pids.unshift(curPid);
  }
  return pids.map(pid => PROFILES.find(p => p.id === pid) || { id: pid, name: profileName(pid) });
}

function allMasterBusinesses() { return getMasterBusinesses(); }
function allMasterClients() { return getMasterClients(); }
function bizById(id) { return getMasterBusinesses().find(b => b.id === id); }
function clientBiz(c) { return (c && c.biz) || (businesses().find(b => b.kind !== 'product') || {}).id || ''; }
function clientById(id) { return getMasterClients().find(c => c.id === id); }

function getProfileSettings(pid) {
  const def = defaultSettingsFor(pid);
  const saved = lsGet(`cmd.settings_${pid}`, null) || (pid === 'rahul' ? lsGet('cmd.settings', null) : null) || {};
  const merged = { ...def, ...saved };

  // Always derive businesses and clients dynamically from the canonical master lists
  merged.businesses = businesses(pid);
  merged.clients = clients(pid);

  if (pid === 'sri-chandana') {
    merged.email = 'srichandana1026@gmail.com';
  }
  if (pid === 'adithya') {
    merged.email = 'gurrapuadithya10@gmail.com';
  }
  return merged;
}

function getProfileItems(pid) {
  const def = defaultItemsFor(pid);
  const saved = lsGet(`cmd.items_${pid}`, null) || (pid === 'rahul' ? lsGet('cmd.items', null) : null);
  const raw = Array.isArray(saved) ? saved : def;
  let filtered = raw.filter(i =>
    i && i.id &&
    !['it-1', 'it-2', 'it-3', 'it-4', 'it-5', 'it-f2', 'it-11'].includes(i.id) &&
    i.client !== 'cl-1' &&
    i.client !== 'cl-2' &&
    !(i.title && (i.title.toLowerCase().includes('digital marketing') || i.title.toLowerCase().includes('apex') || i.title.toLowerCase().includes('nova'))) &&
    !(i.notes && (i.notes.toLowerCase().includes('apex') || i.notes.toLowerCase().includes('nova')))
  );
  filtered = filtered.map(i => {
    if (i && i.kind === 'glitch') {
      return { ...i, kind: 'task' };
    }
    return i;
  });

  def.forEach(d => {
    if (d.kind === 'payment' && !filtered.some(f => f.id === d.id)) {
      filtered.push(d);
    }
  });

  // One-time migration: ensure all retainers start under To be received / Waiting to be Paid
  if (!lsGet('cmd.retainers_to_pending_migrated_v3', false)) {
    ['rahul', 'sri-chandana', 'adithya'].forEach(p => {
      const pItems = lsGet(`cmd.items_${p}`, null) || (p === 'rahul' ? lsGet('cmd.items', null) : null);
      if (Array.isArray(pItems)) {
        pItems.forEach(it => {
          if (it && it.kind === 'payment' && (it.id.startsWith('it-pay-1') || it.id.startsWith('it-pay-2') || it.id.startsWith('it-pay-sc-1') || it.id.startsWith('it-pay-sc-2') || it.id.startsWith('it-pay-sc-3') || it.id.startsWith('it-pay-ad-1') || it.id.startsWith('it-pay-ad-2'))) {
            it.status = 'open';
            it.doneAt = null;
          }
        });
        lsSet(`cmd.items_${p}`, pItems);
        if (p === 'rahul') lsSet('cmd.items', pItems);
      }
    });
    lsSet('cmd.retainers_to_pending_migrated_v3', true);
  }

  // Ensure any active retainers in existing loaded items default to open if untouched
  filtered.forEach(it => {
    if (it && it.kind === 'payment' && !it.status) {
      it.status = 'open';
    }
  });

  return filtered;
}

// ================= Google Auth & Multi-device Sync =================
function getAuthUser() {
  return lsGet('cmd.auth_user', null);
}

function setAuthUser(user) {
  if (user) {
    lsSet('cmd.auth_user', user);
  } else {
    try { localStorage.removeItem('cmd.auth_user'); } catch { }
  }
}

function showAuthGate() {
  const gate = document.getElementById('auth-gate');
  if (gate) {
    gate.hidden = false;
    gate.style.display = 'flex';
  }
  document.body.classList.add('auth-locked');
}

function hideAuthGate() {
  const gate = document.getElementById('auth-gate');
  if (gate) {
    gate.hidden = true;
    gate.style.display = 'none';
  }
  document.body.classList.remove('auth-locked');
}

function loginWithGoogleAccount(profileIdOrEmail) {
  let matchedProfile = null;
  const input = String(profileIdOrEmail || '').trim().toLowerCase();

  matchedProfile = PROFILES.find(p => p.id === input || p.email.toLowerCase() === input);
  if (!matchedProfile) {
    matchedProfile = PROFILES.find(p => p.name.toLowerCase() === input);
  }

  if (!matchedProfile) {
    return { ok: false, message: 'Access is limited to authorized members: Rahul, Sri Chandana, and Adithya.' };
  }

  const user = {
    email: matchedProfile.email,
    name: matchedProfile.name,
    avatarLetter: matchedProfile.avatarLetter,
    profileId: matchedProfile.id,
    signedInAt: Date.now()
  };

  setAuthUser(user);
  switchProfile(matchedProfile.id);
  hideAuthGate();
  toast(`Signed in as ${user.name} (${user.email})`);
  return { ok: true, user };
}

function signOutGoogle() {
  setAuthUser(null);
  showAuthGate();
  toast('Signed out of Google account.');
}

function detectInitialProfile() {
  const auth = getAuthUser();
  if (auth && auth.profileId && PROFILES.some(x => x.id === auth.profileId)) {
    return auth.profileId;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('profile');
    if (p && PROFILES.some(x => x.id === p)) {
      lsSet('cmd.active_profile', p);
      return p;
    }
  } catch { }
  return lsGet('cmd.active_profile', 'rahul');
}

let isInitialBoot = true;
const activeProfileId = detectInitialProfile();
try { document.body.dataset.profile = activeProfileId; } catch { }
const finalSettings = getProfileSettings(activeProfileId);
const finalItems = getProfileItems(activeProfileId);

function applyBannerForProfile(pid = (S && S.profileId) || 'rahul') {
  const customBanner = lsGet(`cmd.banner_${pid}`, null);
  const banners = $$('.banner');
  if (!banners.length) return;
  banners.forEach(b => {
    if (customBanner) {
      b.style.setProperty('background-image', `url('${customBanner}')`, 'important');
      b.style.setProperty('background-position', 'center center', 'important');
      b.style.setProperty('background-size', 'cover', 'important');
      b.setAttribute('aria-label', `${profileName(pid)}'s dashboard banner`);
    } else if (pid === 'sri-chandana') {
      b.style.setProperty('background-image', "url('assets/kung-fu-panda.jpg'), url('kung fu panda.jpg')", 'important');
      b.style.setProperty('background-position', 'center 42%', 'important');
      b.style.setProperty('background-size', 'cover', 'important');
      b.setAttribute('aria-label', "Sri Chandana's dashboard - Po meditating under the blooming peach blossom tree");
    } else {
      b.style.setProperty('background-image', "url('assets/banner.jpg')", 'important');
      b.style.setProperty('background-position', 'center 58%', 'important');
      b.style.setProperty('background-size', 'cover', 'important');
      b.setAttribute('aria-label', "Open field at golden hour with a parked car");
    }
  });
}

function readImageFile(file, maxWidth = 900, maxHeight = 600) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return reject(new Error('Not an image file'));
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function triggerWorldPortal(p, ox, oy) {
  const cx = Math.round(ox || window.innerWidth / 2);
  const cy = Math.round(oy || window.innerHeight / 2);
  document.documentElement.style.setProperty('--world-x', `${cx}px`);
  document.documentElement.style.setProperty('--world-y', `${cy}px`);
  document.body.dataset.profile = p.id;

  let portal = document.getElementById('world-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'world-portal';
    portal.className = 'world-portal';
    portal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(portal);
  }

  const displayName = (S.settings && S.settings.name) ? S.settings.name : p.name;
  portal.hidden = false;
  portal.classList.remove('active');
  void portal.offsetWidth;
  portal.classList.add('active');
  portal.innerHTML = `<div class="portal-text">Entering ${esc(displayName)}'s world..</div>`;

  clearTimeout(triggerWorldPortal._tid);
  triggerWorldPortal._tid = setTimeout(() => {
    portal.classList.remove('active');
    portal.hidden = true;
    portal.innerHTML = '';
  }, 750);
}

function switchProfile(pid, origin = null) {
  const p = PROFILES.find(x => x.id === pid);
  if (!p) return;

  const ox = origin && origin.x !== undefined ? origin.x : window.innerWidth / 2;
  const oy = origin && origin.y !== undefined ? origin.y : window.innerHeight / 2;

  // Save current profile data first
  const prevId = S.profileId || 'rahul';
  lsSet(`cmd.settings_${prevId}`, S.settings);
  lsSet(`cmd.items_${prevId}`, S.items);

  // Set new active profile
  S.profileId = pid;
  document.body.dataset.profile = pid;
  lsSet('cmd.active_profile', pid);
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('profile', pid);
    window.history.replaceState(null, '', url.toString());
  } catch { }

  S.settings = getProfileSettings(pid);
  S.items = getProfileItems(pid);
  lsSet('cmd.settings', S.settings);
  lsSet('cmd.items', S.items);

  S.biz = null;
  S.client = null;
  S.view = 'home';
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (typeof markEntering === 'function') markEntering('home');
  applyBannerForProfile(pid);

  triggerWorldPortal(p, ox, oy);
  renderNow();

  pushAllToServer();

  // Notify recipient of pending messages/texts and deletion requests when switching to their profile
  setTimeout(() => {
    if (typeof checkPendingChatNotifications === 'function') {
      checkPendingChatNotifications(pid);
    }
    if (typeof checkPendingDeletionRequests === 'function') {
      checkPendingDeletionRequests(pid);
    }
  }, 400);
}

function resetToDefaults() {
  const pid = S.profileId || 'rahul';
  S.settings = defaultSettingsFor(pid);
  S.items = defaultItemsFor(pid);
  lsSet(`cmd.settings_${pid}`, S.settings);
  lsSet(`cmd.items_${pid}`, S.items);
  lsSet('cmd.settings', S.settings);
  lsSet('cmd.items', S.items);
  renderNow();
  pushAllToServer();
  toast(`Reset to ${S.settings.name}'s default businesses & clients.`);
}

const S = window.S = {
  profileId: activeProfileId,
  settings: finalSettings,
  items: finalItems,
  events: [], cal: { state: 'loading', msg: '' },
  view: 'home', client: null, ctab: 'open', day: today(),
  review: null, plan: lsGet('cmd.plan', null), chat: [], mode: 'loading',
  history: lsGet('cmd.history', [])
};

let lastServerTimestamp = 0;
let isSyncing = false;
let pushDebounce = null;

/* ================= Change History ================= */
function getHistory() {
  return lsGet('cmd.history', []) || [];
}

function recordHistory({ action, category, title, details, profileId }) {
  if (!title && !details) return;
  const curPid = profileId || (S && S.profileId) || 'rahul';
  const entry = {
    id: 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    profileId: curPid,
    profileName: profileName(curPid),
    action: action || 'edit', // 'add', 'edit', 'delete', 'complete', 'reopen', 'stage'
    category: category || 'task', // 'task', 'business', 'client', 'promise', 'glitch', 'reel', 'payment', 'goal', 'wishlist', 'crusher'
    title: String(title || '').trim(),
    details: String(details || '').trim()
  };

  const list = getHistory();
  // Debounce rapid duplicate logs for same action & title within 1.5s
  if (list.length > 0) {
    const last = list[0];
    if (last.action === entry.action && last.title === entry.title && (entry.timestamp - last.timestamp) < 1500) {
      return;
    }
  }

  list.unshift(entry);
  if (list.length > 300) list.length = 300;
  lsSet('cmd.history', list);
  if (S) S.history = list;
}

function clearHistory() {
  lsSet('cmd.history', []);
  if (S) S.history = [];
  pushAllToServer();
}

function applyServerData(data) {
  if (!data || typeof data !== 'object') return false;
  let changed = false;

  // 1. History
  if (Array.isArray(data.history)) {
    const curHist = JSON.stringify(lsGet('cmd.history', []));
    const incHist = JSON.stringify(data.history);
    if (curHist !== incHist) {
      lsSet('cmd.history', data.history);
      if (S) S.history = data.history;
      changed = true;
    }
  }

  // 1b. Master Businesses & Clients
  if (Array.isArray(data.businesses)) {
    const curBiz = JSON.stringify(lsGet('cmd.businesses', []));
    const incBiz = JSON.stringify(data.businesses);
    if (curBiz !== incBiz) {
      lsSet('cmd.businesses', data.businesses);
      changed = true;
    }
  }
  if (Array.isArray(data.clients)) {
    const curCl = JSON.stringify(lsGet('cmd.clients', []));
    const incCl = JSON.stringify(data.clients);
    if (curCl !== incCl) {
      lsSet('cmd.clients', data.clients);
      changed = true;
    }
  }

  // 2. Profiles Settings, Items, Crushers, Banners
  PROFILES.forEach(p => {
    const pid = p.id;
    if (data[`settings_${pid}`]) {
      const cur = JSON.stringify(lsGet(`cmd.settings_${pid}`, null));
      const incoming = JSON.stringify(data[`settings_${pid}`]);
      if (cur !== incoming) {
        lsSet(`cmd.settings_${pid}`, data[`settings_${pid}`]);
        if (S && S.profileId === pid) {
          S.settings = data[`settings_${pid}`];
          changed = true;
        }
      }
    }
    if (Array.isArray(data[`items_${pid}`])) {
      const cur = JSON.stringify(lsGet(`cmd.items_${pid}`, null));
      const incoming = JSON.stringify(data[`items_${pid}`]);
      if (cur !== incoming) {
        lsSet(`cmd.items_${pid}`, data[`items_${pid}`]);
        if (S && S.profileId === pid) {
          S.items = data[`items_${pid}`];
          changed = true;
        }
      }
    }
    if (data[`crushers_${pid}`]) {
      const cur = JSON.stringify(lsGet(`cmd.crushers_${pid}`, null));
      const incoming = JSON.stringify(data[`crushers_${pid}`]);
      if (cur !== incoming) {
        lsSet(`cmd.crushers_${pid}`, data[`crushers_${pid}`]);
        if (S && S.profileId === pid) {
          changed = true;
        }
      }
    }
    if (data[`banner_${pid}`]) {
      lsSet(`cmd.banner_${pid}`, data[`banner_${pid}`]);
    }
  });

  if (changed && S && S.settings) {
    S.settings.businesses = businesses(S.profileId);
    S.settings.clients = clients(S.profileId);
  }

  if (data.app_name) {
    lsSet('cmd.app_name', data.app_name);
    document.title = data.app_name;
  }
  if (data.custom_icon) {
    lsSet('cmd.custom_icon', data.custom_icon);
  }

  // 3. Chat
  if (Array.isArray(data.chat_messages)) {
    const cur = JSON.stringify(lsGet('cmd.chat_messages', []));
    const incoming = JSON.stringify(data.chat_messages);
    if (cur !== incoming) {
      lsSet('cmd.chat_messages', data.chat_messages);
      if (typeof renderInboxChat === 'function') renderInboxChat();
    }
  }

  if (Array.isArray(data.pending_chat_notifications)) {
    const curP = JSON.stringify(lsGet('cmd.pending_chat_notifications', []));
    const incP = JSON.stringify(data.pending_chat_notifications);
    if (curP !== incP) {
      lsSet('cmd.pending_chat_notifications', data.pending_chat_notifications);
      if (typeof checkPendingChatNotifications === 'function') {
        checkPendingChatNotifications();
      }
    }
  }

  if (Array.isArray(data.pending_deletion_requests)) {
    const curDel = JSON.stringify(lsGet('cmd.pending_deletion_requests', []));
    const incDel = JSON.stringify(data.pending_deletion_requests);
    if (curDel !== incDel) {
      lsSet('cmd.pending_deletion_requests', data.pending_deletion_requests);
      if (typeof checkPendingDeletionRequests === 'function') {
        checkPendingDeletionRequests();
      }
    }
  }

  if (data.lastUpdated) {
    lastServerTimestamp = data.lastUpdated;
  }
  return changed;
}

async function pullFromServer() {
  if (isSyncing) return;
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.lastUpdated || data.lastUpdated <= lastServerTimestamp) return;
    const changed = applyServerData(data);
    setSync('cloud');
    if (changed && typeof render === 'function') {
      render();
    }
  } catch (e) {
    // quiet fallback
  }
}

function pushAllToServer() {
  if (isInitialBoot) return Promise.resolve();
  if (pushDebounce) clearTimeout(pushDebounce);
  return new Promise(resolve => {
    pushDebounce = setTimeout(async () => {
      isSyncing = true;
      try {
        const payload = {
          lastUpdated: Date.now(),
          businesses: getMasterBusinesses(),
          clients: getMasterClients(),
          chat_messages: lsGet('cmd.chat_messages', []),
          pending_chat_notifications: lsGet('cmd.pending_chat_notifications', []),
          pending_deletion_requests: lsGet('cmd.pending_deletion_requests', []),
          history: lsGet('cmd.history', []),
          deletedItemIds: lsGet('cmd.deleted_items', []),
          deletedBizIds: lsGet('cmd.deleted_biz', []),
          deletedClientIds: lsGet('cmd.deleted_clients', []),
          app_name: lsGet('cmd.app_name', 'My Dashboard'),
          custom_icon: lsGet('cmd.custom_icon', null)
        };
        PROFILES.forEach(p => {
          const pid = p.id;
          const pSet = lsGet(`cmd.settings_${pid}`, null) || defaultSettingsFor(pid);
          pSet.businesses = businesses(pid);
          pSet.clients = clients(pid);
          payload[`settings_${pid}`] = pSet;
          payload[`items_${pid}`] = lsGet(`cmd.items_${pid}`, null) || defaultItemsFor(pid);
          payload[`crushers_${pid}`] = lsGet(`cmd.crushers_${pid}`, null) || (typeof defaultCrushersFor === 'function' ? defaultCrushersFor(pid) : null);
          payload[`banner_${pid}`] = lsGet(`cmd.banner_${pid}`, null);
        });
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const json = await res.json();
          lastServerTimestamp = json.lastUpdated || payload.lastUpdated;
          lsSet('cmd.deleted_items', []);
          lsSet('cmd.deleted_biz', []);
          lsSet('cmd.deleted_clients', []);
          setSync('cloud');
        }
      } catch (e) {
        setSync('local');
      } finally {
        isSyncing = false;
        resolve();
      }
    }, 150);
  });
}

async function initStore() {
  let auth = getAuthUser();
  if (!auth) {
    const initialPid = S.profileId || detectInitialProfile();
    const matched = PROFILES.find(p => p.id === initialPid) || PROFILES[0];
    auth = {
      email: matched.email,
      name: matched.name,
      avatarLetter: matched.avatarLetter,
      profileId: matched.id,
      signedInAt: Date.now()
    };
    setAuthUser(auth);
  }
  hideAuthGate();

  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && (data.lastUpdated || Object.keys(data).length > 1)) {
        applyServerData(data);
        isInitialBoot = false;
        S.mode = 'cloud';
      } else {
        isInitialBoot = false;
        await pushAllToServer();
        S.mode = 'cloud';
      }
    } else {
      isInitialBoot = false;
      S.mode = 'local';
    }
  } catch {
    isInitialBoot = false;
    S.mode = 'local';
  }

  if (S.profileId !== auth.profileId) {
    switchProfile(auth.profileId);
  }

  setSync(S.mode);
  render();

  if (window._syncInterval) clearInterval(window._syncInterval);
  window._syncInterval = setInterval(() => {
    pullFromServer();
  }, 2500);

  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) pullFromServer();
  });
  window.addEventListener('focus', () => {
    pullFromServer();
  });
}

function setSync(mode) {
  const dot = $('#sync-dot'), txt = $('#sync-text');
  if (!dot || !txt) return;
  dot.classList.toggle('on', mode === 'cloud');
  txt.textContent = mode === 'cloud' ? 'Synced (All Profiles)' : mode === 'error' ? 'Sync paused. Reload.' : 'Saved on this device only';
}

function dbErr(e) {
  const c = e && e.code;
  if (c === 'quota_exceeded') return 'Storage is full. Delete some old done items.';
  if (c === 'revoked') return 'Sync stopped. Reload the page.';
  return 'Could not sync that change. It is kept on this device.';
}

function saveSettings() {
  const pid = (S && S.profileId) || 'rahul';
  lsSet(`cmd.settings_${pid}`, S.settings);
  lsSet('cmd.settings', S.settings);

  // Synchronize businesses & clients into master lists
  if (Array.isArray(S.settings.businesses)) {
    const curMasterBiz = getMasterBusinesses();
    const map = new Map(curMasterBiz.map(b => [b.id, b]));
    S.settings.businesses.forEach(b => {
      if (b && b.id) {
        b.updated = b.updated || Date.now();
        map.set(b.id, { ...(map.get(b.id) || {}), ...b });
      }
    });
    lsSet('cmd.businesses', Array.from(map.values()));
  }

  if (Array.isArray(S.settings.clients)) {
    const curMasterCl = getMasterClients();
    const map = new Map(curMasterCl.map(c => [c.id, c]));
    S.settings.clients.forEach(c => {
      if (c && c.id) {
        c.updated = c.updated || Date.now();
        map.set(c.id, { ...(map.get(c.id) || {}), ...c });
      }
    });
    lsSet('cmd.clients', Array.from(map.values()));
  }

  PROFILES.forEach(p => {
    const pSet = lsGet(`cmd.settings_${p.id}`, null) || defaultSettingsFor(p.id);
    pSet.businesses = businesses(p.id);
    pSet.clients = clients(p.id);
    lsSet(`cmd.settings_${p.id}`, pSet);
  });

  if (S && S.settings) {
    S.settings.businesses = businesses(S.profileId);
    S.settings.clients = clients(S.profileId);
    lsSet('cmd.settings', S.settings);
  }

  render();
  pushAllToServer();
}

async function saveItem(it) {
  it.updated = Date.now();
  if (!it.fromProfileId) it.fromProfileId = S.profileId || 'rahul';
  const i = S.items.findIndex(x => x.id === it.id);
  const isNew = i < 0;
  const oldItem = i >= 0 ? { ...S.items[i] } : null;
  if (i >= 0) S.items[i] = it; else S.items.push(it);
  const pid = S.profileId || 'rahul';
  lsSet(`cmd.items_${pid}`, S.items);
  lsSet('cmd.items', S.items);

  // If item is assigned to another teammate, ensure their profile items list has it too
  if (it.person) {
    const targetPid = profileIdForPerson(it.person);
    if (targetPid && targetPid !== pid) {
      const otherItems = lsGet(`cmd.items_${targetPid}`, null) || defaultItemsFor(targetPid);
      const oi = otherItems.findIndex(x => x.id === it.id);
      if (oi >= 0) otherItems[oi] = it; else otherItems.push(it);
      lsSet(`cmd.items_${targetPid}`, otherItems);
    }
  }

  // Record history
  const c = it.client ? clientById(it.client) : null;
  const clientName = c ? (c.short || c.name) : '';
  let details = '';
  if (it.kind === 'promise') {
    details = it.person ? `Promised to ${it.person}` : 'Personal promise';
  } else if (it.kind === 'payment') {
    details = `Amount: ${inr(it.amount || 0)}${clientName ? ' · ' + clientName : ''}`;
  } else if (it.kind === 'glitch') {
    details = `Stage: ${it.stage || 'todo'} · Priority: ${it.priority}`;
  } else if (it.kind === 'reel') {
    details = `Stage: ${it.stage || 'idea'}${it.due ? ' · Due ' + it.due : ''}`;
  } else {
    details = `${it.priority ? it.priority.toUpperCase() + ' priority' : ''}${clientName ? ' · ' + clientName : ''}`;
  }

  let action = isNew ? 'add' : 'edit';
  if (it._histAction) {
    action = it._histAction;
    delete it._histAction;
  } else if (oldItem) {
    if (oldItem.status !== it.status) {
      action = it.status === 'done' ? 'complete' : 'reopen';
      if (it.status === 'done') details = 'Marked complete' + (clientName ? ' · ' + clientName : '');
      else details = 'Reopened task' + (clientName ? ' · ' + clientName : '');
    } else if (oldItem.stage !== it.stage) {
      action = (it.stage === 'fixed' || it.stage === 'posted') ? 'complete' : 'stage';
      details = `Stage: ${oldItem.stage || 'start'} → ${it.stage}` + (clientName ? ' · ' + clientName : '');
    }
  }

  recordHistory({
    action,
    category: it.kind || 'task',
    title: it.title,
    details: details.trim()
  });

  render();
  pushAllToServer();
}

async function removeItem(id) {
  const item = S.items.find(x => x.id === id);
  if (!item) return;

  const curPid = (S && S.profileId) || 'rahul';
  const coOwners = [];
  if (item.person) {
    const targetPid = profileIdForPerson(item.person);
    if (targetPid && targetPid !== curPid && !coOwners.includes(targetPid)) coOwners.push(targetPid);
  }
  if (item.client) {
    const clientOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(item.client, curPid) : [];
    clientOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
  }
  if (item.biz) {
    const bizOwners = typeof getCoOwnersForBusiness === 'function' ? getCoOwnersForBusiness(item.biz, curPid) : [];
    bizOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
  }

  if (coOwners.length > 0) {
    if (typeof alertCoOwnerDeletion === 'function') {
      alertCoOwnerDeletion(item.title, coOwners, item.kind || 'task', item.id);
    }
    return;
  }

  recordHistory({
    action: 'delete',
    category: item.kind || 'task',
    title: item.title,
    details: item.client ? ((clientById(item.client) || {}).name || '') : ''
  });

  S.items = S.items.filter(x => x.id !== id);
  const pid = S.profileId || 'rahul';
  lsSet(`cmd.items_${pid}`, S.items);
  lsSet('cmd.items', S.items);

  const delItems = lsGet('cmd.deleted_items', []);
  if (!delItems.includes(id)) delItems.push(id);
  lsSet('cmd.deleted_items', delItems);

  render();
  pushAllToServer();
}
function makeItem(p) {
  const c = p.client ? clientById(p.client) : null;
  const resolvedBiz = p.biz || (c ? clientBiz(c) : '');
  return {
    id: newId(), kind: p.kind || 'task', title: (p.title || '').trim(), client: p.client || '', person: p.person || '',
    due: validDate(p.due) ? p.due : '', time: validTime(p.time) ? p.time : '', duration: Number(p.duration) || 60,
    priority: ['high', 'med', 'low'].includes(p.priority) ? p.priority : 'med', amount: Number(p.amount) || 0,
    notes: p.notes || '', status: 'open', created: Date.now(), cal: null,
    isFocus: p.isFocus !== undefined ? !!p.isFocus : (p.kind === 'task'),
    biz: resolvedBiz, stage: p.stage || (p.kind === 'glitch' ? 'todo' : p.kind === 'reel' ? 'idea' : ''), link: p.link || ''
  };
}
const starSvg = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
function starRow(v, cls = '') {
  const pct = Math.max(0, Math.min(100, v / 5 * 100));
  return `<span class="stars ${cls}" role="img" aria-label="${v} out of 5 stars"><span class="s-base">${starSvg.repeat(5)}</span><span class="s-fill" style="width:${pct}%">${starSvg.repeat(5)}</span></span>`;
}

function getCoOwnersForBusiness(bizId, excludePid = (S && S.profileId) || 'rahul') {
  const b = allMasterBusinesses().find(x => x.id === bizId);
  if (!b) return [];
  const members = b.members || (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
  return members.filter(m => m !== excludePid);
}

function getCoOwnersForClient(clientObjOrId, excludePid = (S && S.profileId) || 'rahul') {
  const c = typeof clientObjOrId === 'string' ? (clientById(clientObjOrId) || allMasterClients().find(x => x.id === clientObjOrId)) : clientObjOrId;
  if (!c) return [];
  if (c.biz) {
    return getCoOwnersForBusiness(c.biz, excludePid);
  }
  return PROFILES.map(p => p.id).filter(m => m !== excludePid);
}

function formatCoOwnersNames(pids) {
  const names = pids.map(p => profileName(p));
  if (names.length === 0) return 'the other user';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

function requestCoOwnerDeletion(opts) {
  let targetId, targetName, targetType, coOwners;
  if (typeof opts === 'object' && opts !== null && !Array.isArray(opts) && opts.targetName) {
    targetId = opts.targetId;
    targetName = opts.targetName;
    targetType = opts.targetType || 'task';
    coOwners = opts.coOwners || [];
  } else {
    targetName = arguments[0];
    coOwners = arguments[1] || [];
    targetType = arguments[2] || 'task';
    targetId = arguments[3] || null;
  }

  const curPid = (S && S.profileId) || 'rahul';
  const curName = profileName(curPid);
  const otherNames = formatCoOwnersNames(coOwners);

  // If targetId was not provided, attempt to locate it
  if (!targetId) {
    if (targetType === 'business') {
      const b = (typeof allMasterBusinesses === 'function' ? allMasterBusinesses() : []).find(x => x.name.toLowerCase() === targetName.toLowerCase());
      if (b) targetId = b.id;
    } else if (targetType === 'client') {
      const c = (typeof allMasterClients === 'function' ? allMasterClients() : []).find(x => x.name.toLowerCase() === targetName.toLowerCase());
      if (c) targetId = c.id;
    } else {
      const it = (S && Array.isArray(S.items) ? S.items : []).find(x => x.title.toLowerCase() === targetName.toLowerCase());
      if (it) targetId = it.id;
    }
  }

  const req = {
    id: 'del-req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    fromPid: curPid,
    fromName: curName,
    toPids: coOwners,
    targetType,
    targetId,
    targetName,
    status: 'pending',
    createdAt: Date.now()
  };

  const pending = lsGet('cmd.pending_deletion_requests', []) || [];
  const existingIdx = pending.findIndex(r => r.targetId && r.targetId === targetId && r.status === 'pending');
  if (existingIdx >= 0) {
    pending[existingIdx] = req;
  } else {
    pending.push(req);
  }
  lsSet('cmd.pending_deletion_requests', pending);

  // Sync to server immediately without sending any message into the inbox chat
  pushAllToServer();

  openSheet(`
    <div style="text-align:center;padding:16px 8px">
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(255, 159, 10, 0.16);color:#ff9f0a;display:grid;place-items:center;margin:0 auto 16px">
        <svg style="width:26px;height:26px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h2 style="margin-bottom:10px;font-size:18px">Deletion Request Sent</h2>
      <p style="font-size:14px;line-height:1.6;color:var(--ink);margin:0 auto 20px;max-width:440px">
        A notification with <b>Yes</b> and <b>No</b> options has been sent to <b>${esc(otherNames)}</b> to approve deleting the ${esc(targetType)} <b>"${esc(targetName)}"</b>.
      </p>
      <div class="sheet-actions" style="justify-content:center">
        <button class="btn primary" id="coowner-alert-ok" style="min-width:130px;padding:9px 20px">Understood</button>
      </div>
    </div>
  `, sh => {
    const ok = sh.querySelector('#coowner-alert-ok');
    if (ok) ok.onclick = closeSheet;
  });
}

function alertCoOwnerDeletion(targetName, coOwnerPids, type = 'business/client', targetId = null) {
  requestCoOwnerDeletion({
    targetId,
    targetName,
    targetType: type,
    coOwners: coOwnerPids
  });
}

function checkPendingDeletionRequests(targetPid) {
  const curPid = targetPid || (S && S.profileId) || 'rahul';
  const allReqs = lsGet('cmd.pending_deletion_requests', []) || [];
  const forMe = allReqs.filter(r => r.status === 'pending' && Array.isArray(r.toPids) && r.toPids.includes(curPid));
  if (!forMe.length) return;

  const req = forMe[0];
  showDeletionRequestNotification(req);
}

function showDeletionRequestNotification(req) {
  if (!req) return;

  const fromProfile = PROFILES.find(p => p.id === req.fromPid);
  const fromName = req.fromName || (fromProfile ? fromProfile.name : profileName(req.fromPid));
  const typeLabel = req.targetType || 'item';

  if (typeof triggerDynamicNotification === 'function') {
    triggerDynamicNotification({
      title: `Delete Request from ${fromName}`,
      message: `Delete ${typeLabel} "${req.targetName}"?`,
      avatar: '⚠️',
      badge: 'Confirm',
      duration: null,
      actions: [
        {
          label: 'Yes',
          cls: 'yes',
          onClick: () => {
            confirmCoOwnerDeletion(req.id, true);
          }
        },
        {
          label: 'No',
          cls: 'no',
          onClick: () => {
            confirmCoOwnerDeletion(req.id, false);
          }
        }
      ],
      onPress: () => {
        promptDeletionApprovalSheet(req);
      }
    });
  }
}

function promptDeletionApprovalSheet(req) {
  if (!req) return;
  const fromName = req.fromName || profileName(req.fromPid);
  const typeLabel = req.targetType || 'item';

  openSheet(`
    <div style="text-align:center;padding:16px 8px">
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(255, 69, 58, 0.16);color:#ff453a;display:grid;place-items:center;margin:0 auto 16px">
        <svg style="width:26px;height:26px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </div>
      <h2 style="margin-bottom:8px;font-size:19px">Confirm Deletion Request</h2>
      <p style="font-size:14px;color:var(--muted);margin:0 auto 16px;max-width:440px">
        <b>${esc(fromName)}</b> requested to delete the ${esc(typeLabel)}:<br>
        <span style="font-size:16px;font-weight:700;color:var(--ink);display:block;margin-top:6px">"${esc(req.targetName)}"</span>
      </p>
      <p style="font-size:13px;color:var(--faint);margin:0 auto 24px;max-width:380px">
        If you select <b>Yes</b>, this ${esc(typeLabel)} will be permanently removed for all team members.
      </p>
      <div class="sheet-actions" style="justify-content:center;gap:12px">
        <button class="btn danger" id="req-del-yes" style="min-width:120px;padding:9px 20px">Yes, Delete</button>
        <button class="btn" id="req-del-no" style="min-width:120px;padding:9px 20px">No, Keep</button>
      </div>
    </div>
  `, sh => {
    sh.querySelector('#req-del-yes').onclick = () => {
      closeSheet();
      confirmCoOwnerDeletion(req.id, true);
    };
    sh.querySelector('#req-del-no').onclick = () => {
      closeSheet();
      confirmCoOwnerDeletion(req.id, false);
    };
  });
}

function confirmCoOwnerDeletion(reqId, approved) {
  const allReqs = lsGet('cmd.pending_deletion_requests', []) || [];
  const req = allReqs.find(r => r.id === reqId);
  if (!req) return;

  const remainingReqs = allReqs.filter(r => r.id !== reqId);
  lsSet('cmd.pending_deletion_requests', remainingReqs);

  if (typeof dismissDynamicNotification === 'function') {
    dismissDynamicNotification();
  }

  if (approved) {
    if (req.targetType === 'business') {
      executeDeleteBusiness(req.targetId, req.targetName);
    } else if (req.targetType === 'client') {
      executeDeleteClient(req.targetId, req.targetName);
    } else {
      executeDeleteTask(req.targetId, req.targetName, req.targetType);
    }
    toast(`"${req.targetName}" was deleted.`);
    if (typeof playNotificationChime === 'function') playNotificationChime();
  } else {
    toast(`Deletion request declined. "${req.targetName}" was kept.`);
  }

  pushAllToServer();

  setTimeout(() => {
    checkPendingDeletionRequests();
  }, 500);
}

function executeDeleteTask(id, title, kind) {
  let item = id ? S.items.find(x => x.id === id) : null;
  if (!item && id) {
    for (const p of PROFILES) {
      const pItems = lsGet(`cmd.items_${p.id}`, []);
      const found = Array.isArray(pItems) ? pItems.find(x => x.id === id) : null;
      if (found) { item = found; break; }
    }
  }
  if (!item && title) {
    item = S.items.find(x => x.title && x.title.toLowerCase() === title.toLowerCase());
    if (!item) {
      for (const p of PROFILES) {
        const pItems = lsGet(`cmd.items_${p.id}`, []);
        const found = Array.isArray(pItems) ? pItems.find(x => x.title && x.title.toLowerCase() === title.toLowerCase()) : null;
        if (found) { item = found; break; }
      }
    }
  }

  const resolvedId = id || (item ? item.id : null);
  const resolvedTitle = title || (item ? item.title : 'Task');
  const resolvedKind = kind || (item ? item.kind : 'task');

  if (typeof recordHistory === 'function') {
    recordHistory({
      action: 'delete',
      category: resolvedKind,
      title: resolvedTitle,
      details: item && item.client ? ((clientById(item.client) || {}).name || '') : ''
    });
  }

  if (resolvedId) {
    S.items = S.items.filter(x => x.id !== resolvedId);
    PROFILES.forEach(p => {
      const pItems = lsGet(`cmd.items_${p.id}`, []);
      if (Array.isArray(pItems)) {
        lsSet(`cmd.items_${p.id}`, pItems.filter(x => x.id !== resolvedId));
      }
    });
    lsSet('cmd.items', S.items);

    const delItems = lsGet('cmd.deleted_items', []);
    if (!delItems.includes(resolvedId)) delItems.push(resolvedId);
    lsSet('cmd.deleted_items', delItems);
  } else if (title) {
    S.items = S.items.filter(x => !(x.title && x.title.toLowerCase() === title.toLowerCase()));
    PROFILES.forEach(p => {
      const pItems = lsGet(`cmd.items_${p.id}`, []);
      if (Array.isArray(pItems)) {
        lsSet(`cmd.items_${p.id}`, pItems.filter(x => !(x.title && x.title.toLowerCase() === title.toLowerCase())));
      }
    });
    lsSet('cmd.items', S.items);
  }

  render();
  pushAllToServer();
}

function executeDeleteBusiness(id, name) {
  let b = id ? ((typeof bizById === 'function' ? bizById(id) : null) || (typeof allMasterBusinesses === 'function' ? allMasterBusinesses().find(x => x.id === id) : null)) : null;
  if (!b && name) {
    b = typeof allMasterBusinesses === 'function' ? allMasterBusinesses().find(x => x.name && x.name.toLowerCase() === name.toLowerCase()) : null;
  }
  const resolvedId = id || (b ? b.id : null);
  const resolvedName = name || (b ? b.name : 'Business');

  if (typeof recordHistory === 'function') {
    recordHistory({
      action: 'delete',
      category: 'business',
      title: resolvedName
    });
  }

  if (resolvedId) {
    if (typeof deleteMasterBusiness === 'function') {
      deleteMasterBusiness(resolvedId);
    } else {
      const delBiz = lsGet('cmd.deleted_biz', []);
      if (!delBiz.includes(resolvedId)) delBiz.push(resolvedId);
      lsSet('cmd.deleted_biz', delBiz);
      S.settings.businesses = (S.settings.businesses || []).filter(x => x.id !== resolvedId);
      saveSettings();
    }
    if (S.biz === resolvedId) { S.biz = null; S.client = null; }
  } else if (name) {
    S.settings.businesses = (S.settings.businesses || []).filter(x => !(x.name && x.name.toLowerCase() === name.toLowerCase()));
    saveSettings();
  }

  render();
  pushAllToServer();
}

function executeDeleteClient(id, name) {
  let c = id ? ((typeof clientById === 'function' ? clientById(id) : null) || (typeof allMasterClients === 'function' ? allMasterClients().find(x => x.id === id) : null)) : null;
  if (!c && name) {
    c = typeof allMasterClients === 'function' ? allMasterClients().find(x => x.name && x.name.toLowerCase() === name.toLowerCase()) : null;
  }
  const resolvedId = id || (c ? c.id : null);
  const resolvedName = name || (c ? c.name : 'Client');

  if (typeof recordHistory === 'function') {
    recordHistory({
      action: 'delete',
      category: 'client',
      title: resolvedName
    });
  }

  if (resolvedId) {
    if (typeof deleteMasterClient === 'function') {
      deleteMasterClient(resolvedId);
    } else {
      const delCl = lsGet('cmd.deleted_clients', []);
      if (!delCl.includes(resolvedId)) delCl.push(resolvedId);
      lsSet('cmd.deleted_clients', delCl);
    }
    if (S.client === resolvedId) S.client = null;
  } else if (name) {
    const list = typeof allMasterClients === 'function' ? allMasterClients().filter(x => !(x.name && x.name.toLowerCase() === name.toLowerCase())) : [];
    lsSet('cmd.clients', list);
    if (S.settings && Array.isArray(S.settings.clients)) {
      S.settings.clients = S.settings.clients.filter(x => !(x.name && x.name.toLowerCase() === name.toLowerCase()));
      saveSettings();
    }
  }

  render();
  pushAllToServer();
}
const taskBiz = it => {
  if (!it) return '';
  if (it.biz) return it.biz;
  if (it.client) {
    const c = clientById(it.client);
    if (c && c.biz) return c.biz;
  }
  return '';
};

function matchClientAndBizFromText(text) {
  if (!text) return { client: null, biz: null };
  const rawLower = String(text).toLowerCase();
  const cleanLower = rawLower.replace(/[_\-–—:;,]/g, ' ').replace(/\s+/g, ' ');
  const noSpace = cleanLower.replace(/\s+/g, '');

  const allClients = clients();
  const allBiz = businesses();

  // 1. Try matching clients
  for (const c of allClients) {
    const cName = c.name.toLowerCase();
    const cShort = (c.short || '').toLowerCase();
    const cNameNoSpace = cName.replace(/\s+/g, '');
    const cShortNoSpace = cShort.replace(/\s+/g, '');

    if (
      cleanLower.includes(cName) ||
      (cShort && cShort.length >= 3 && cleanLower.includes(cShort)) ||
      (cNameNoSpace && cNameNoSpace.length >= 3 && noSpace.includes(cNameNoSpace)) ||
      (cShortNoSpace && cShortNoSpace.length >= 3 && noSpace.includes(cShortNoSpace))
    ) {
      const bId = clientBiz(c);
      const b = bizById(bId);
      return { client: c, biz: b || { id: bId } };
    }
  }

  // 2. Try matching businesses directly (e.g. RevFlow, WEBLIT, LARPING)
  for (const b of allBiz) {
    const bName = b.name.toLowerCase();
    const bNameNoSpace = bName.replace(/\s+/g, '');
    if (cleanLower.includes(bName) || (bNameNoSpace && noSpace.includes(bNameNoSpace))) {
      return { client: null, biz: b };
    }
  }

  return { client: null, biz: null };
}
const productBiz = () => (businesses().find(b => b.kind === 'product') || {}).id || '';
const bizClients = id => clients().filter(c => clientBiz(c) === id);
const bizRevenue = id => {
  const cl = bizClients(id);
  const fromPaid = (S && S.items ? S.items : [])
    .filter(i => cl.some(c => c.id === i.client) && i.kind === 'payment' && i.status === 'done')
    .reduce((x, i) => x + (Number(i.amount) || 0), 0);
  if (fromPaid > 0) return fromPaid;

  const monthlyRetainers = cl.reduce((x, c) => x + (Number(c.retainer) || 0), 0);
  if (monthlyRetainers > 0) return monthlyRetainers;

  return cl.reduce((x, c) => x + Number(c.retainer || c.oneTime || 0), 0);
};
const clientShare = (c, pid = (typeof window !== 'undefined' && window.S && window.S.profileId) || 'rahul') => {
  if (!c) return 0;
  if (c.shares && c.shares[pid] !== undefined && c.shares[pid] !== null && c.shares[pid] !== '') {
    const s = Number(c.shares[pid]);
    if (!isNaN(s)) return s;
  }
  const curPid = (typeof window !== 'undefined' && window.S && window.S.profileId) || 'rahul';
  if (pid === curPid) {
    if (c.yourShare !== undefined && c.yourShare !== null && c.yourShare !== '') {
      const s = Number(c.yourShare);
      if (!isNaN(s)) return s;
    }
  }
  const pSet = lsGet(`cmd.settings_${pid}`, null) || defaultSettingsFor(pid);
  if (pSet && Array.isArray(pSet.clients)) {
    const pc = pSet.clients.find(x => x.id === c.id);
    if (pc && pc.yourShare !== undefined && pc.yourShare !== null && pc.yourShare !== '') {
      return Number(pc.yourShare);
    }
  }
  if (c.yourShare !== undefined && c.yourShare !== null && c.yourShare !== '') {
    const s = Number(c.yourShare);
    if (!isNaN(s)) return s;
  }
  return Number(c.retainer || c.oneTime || 0);
};
const paymentShare = it => {
  if (!it) return 0;
  if (it.yourShare !== undefined && it.yourShare !== null && it.yourShare !== '' && Number(it.yourShare) > 0) {
    return Number(it.yourShare);
  }
  const c = clientById(it.client);
  if (c && c.yourShare !== undefined && c.yourShare !== null && c.yourShare !== '' && Number(c.yourShare) > 0) {
    return Number(c.yourShare);
  }
  return Number(it.amount || 0);
};
const clientRevenue = (id, forPerson = false) => {
  const c = typeof clientById === 'function' ? clientById(id) : null;
  const items = (S && S.items ? S.items : []).filter(i => i.client === id && i.kind === 'payment' && i.status === 'done');
  if (items.length > 0) {
    return items.reduce((x, i) => x + (forPerson ? paymentShare(i) : (Number(i.amount) || paymentShare(i))), 0);
  }
  if (!c) return 0;
  if (forPerson) {
    const share = clientShare(c);
    if (share > 0) return share;
  }
  return Number(c.retainer || c.oneTime || 0);
};
const clientColor = c => c ? CLIENT_COLORS[(c.color ?? 0) % CLIENT_COLORS.length] : 'var(--faint)';
const openItems = () => S.items.filter(i => i.status !== 'done');
const isLate = i => i.status !== 'done' && validDate(i.due) && dayDiff(i.due) < 0;

function profileIdForPerson(person) {
  if (!person) return null;
  const p = String(person).toLowerCase().trim();
  if (p.includes('adithya')) return 'adithya';
  if (p.includes('rahul')) return 'rahul';
  if (p.includes('chandana')) return 'sri-chandana';
  return null;
}

function getInboxItemsForProfile(pid) {
  const all = [];
  const profs = ['rahul', 'sri-chandana', 'adithya'];
  profs.forEach(pId => {
    const items = pId === S.profileId ? S.items : (lsGet(`cmd.items_${pId}`, null) || defaultItemsFor(pId) || []);
    items.forEach(it => {
      if (it.person && profileIdForPerson(it.person) === pid) {
        if (!all.some(x => x.id === it.id)) {
          all.push({ ...it, fromProfileId: it.fromProfileId || pId });
        }
      }
    });
  });
  return all;
}

function toggleInboxItem(id) {
  const currentIt = S.items.find(x => x.id === id);
  if (currentIt) {
    currentIt.status = currentIt.status === 'done' ? 'open' : 'done';
    currentIt.doneAt = currentIt.status === 'done' ? Date.now() : null;
    saveItem(currentIt);
  }
  const profs = ['rahul', 'sri-chandana', 'adithya'];
  profs.forEach(pId => {
    if (pId !== S.profileId) {
      const items = lsGet(`cmd.items_${pId}`, null);
      if (items) {
        const found = items.find(x => x.id === id);
        if (found) {
          found.status = found.status === 'done' ? 'open' : 'done';
          found.doneAt = found.status === 'done' ? Date.now() : null;
          lsSet(`cmd.items_${pId}`, items);
        }
      }
    }
  });
  render();
}

function updateInboxPip() {
  const myPid = S.profileId || 'rahul';
  const items = getInboxItemsForProfile(myPid);
  const unreadTasks = items.filter(i => i.status !== 'done').length;
  let unreadChat = 0;
  const available = getAvailableChatContacts();
  available.forEach(p => {
    unreadChat += getContactMessageCount(myPid, p.id);
  });
  const total = unreadTasks + unreadChat;
  $$('.inbox-pip').forEach(el => { el.hidden = !total; });
  if (typeof setCount === 'function') setCount('inbox', total);
}

function getAvailableChatContacts() {
  const myPid = S.profileId || 'rahul';
  return PROFILES.filter(p => p.id !== myPid);
}

function getChatMessages(p1, p2) {
  const all = lsGet('cmd.chat_messages', []) || [];
  return all.filter(m => ((m.from === p1 && m.to === p2) || (m.from === p2 && m.to === p1)) && !(m.text && m.text.includes('Deletion confirmation request')));
}

function getContactMessageCount(myPid, otherPid) {
  const lastRead = Number(lsGet(`cmd.chat_read_${myPid}_${otherPid}`, 0)) || 0;
  const msgs = getChatMessages(myPid, otherPid).filter(m => m.from === otherPid && (m.time || 0) > lastRead);
  const tasks = typeof getSharedTasksBetween === 'function'
    ? getSharedTasksBetween(myPid, otherPid).filter(t => t.fromProfileId === otherPid && t.status !== 'done' && (t.created || 0) > lastRead)
    : [];
  return msgs.length + tasks.length;
}

function markChatRead(myPid, otherPid) {
  if (!myPid || !otherPid) return;
  lsSet(`cmd.chat_read_${myPid}_${otherPid}`, Date.now());
  const pending = lsGet('cmd.pending_chat_notifications', []) || [];
  const remaining = pending.filter(m => !(m.to === myPid && m.from === otherPid));
  lsSet('cmd.pending_chat_notifications', remaining);
  updateInboxPip();
}

function getContactLastTime(myPid, otherPid) {
  const msgs = getChatMessages(myPid, otherPid);
  const tasks = typeof getSharedTasksBetween === 'function'
    ? getSharedTasksBetween(myPid, otherPid)
    : [];
  const times = [
    ...msgs.map(m => m.time || 0),
    ...tasks.map(t => t.created || t.doneAt || 0)
  ].filter(Boolean);
  if (!times.length) return '';
  const lastTs = Math.max(...times);
  const d = new Date(lastTs);
  const isToday = new Date().toDateString() === d.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function sendChatMessage(toPid, text) {
  const myPid = S.profileId || 'rahul';
  if (!text || !toPid) return null;
  const all = lsGet('cmd.chat_messages', []) || [];
  const msg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    from: myPid,
    to: toPid,
    text: text.trim(),
    time: Date.now()
  };
  all.push(msg);
  lsSet('cmd.chat_messages', all);

  // Queue notification for recipient (triggered when recipient receives it)
  const pending = lsGet('cmd.pending_chat_notifications', []) || [];
  pending.push({
    id: msg.id,
    from: myPid,
    to: toPid,
    text: text.trim(),
    time: msg.time
  });
  lsSet('cmd.pending_chat_notifications', pending);
  pushAllToServer();

  return msg;
}

function checkPendingChatNotifications(targetPid) {
  const pid = targetPid || S.profileId || 'rahul';
  const pending = lsGet('cmd.pending_chat_notifications', []) || [];
  const forMe = pending.filter(m => m.to === pid);
  if (!forMe.length) return;

  // Clear notified items from pending
  const remaining = pending.filter(m => m.to !== pid);
  lsSet('cmd.pending_chat_notifications', remaining);
  pushAllToServer();

  const latest = forMe[forMe.length - 1];
  const fromProfile = PROFILES.find(p => p.id === latest.from);
  const senderName = fromProfile ? fromProfile.name : profileName(latest.from);

  const title = latest.isPromise
    ? `New promise from ${senderName}`
    : `New message from ${senderName}`;
  const badge = forMe.length > 1 ? `${forMe.length} New` : 'New';
  const message = forMe.length > 1
    ? `${forMe.length} new updates · Latest: "${latest.text}"`
    : latest.text;

  if (typeof triggerDynamicNotification === 'function') {
    triggerDynamicNotification({
      title,
      message,
      avatar: fromProfile ? fromProfile.avatarLetter : '✉',
      badge,
      duration: 6000,
      onPress: () => {
        if (latest.isPromise) {
          if (typeof setView === 'function') setView('word');
        } else {
          S.inboxContactId = latest.from;
          lsSet('cmd.inbox_hidden', false);
          const layout = $('#ask-layout');
          if (layout) layout.classList.remove('inbox-hidden');
          const reopen = $('#inbox-reopen-btn');
          if (reopen) reopen.style.display = 'none';
          if (typeof renderInboxChat === 'function') renderInboxChat();
          const feed = $('#inbox-chat-feed');
          if (feed) feed.scrollTop = feed.scrollHeight;
        }
      }
    });
  }
}

// Check on initial startup
setTimeout(() => {
  if (typeof checkPendingChatNotifications === 'function') {
    checkPendingChatNotifications(activeProfileId);
  }
  if (typeof checkPendingDeletionRequests === 'function') {
    checkPendingDeletionRequests(activeProfileId);
  }
}, 600);

function getSharedTasksBetween(myPid, otherPid) {
  const all = [];
  const profs = ['rahul', 'sri-chandana', 'adithya'];
  profs.forEach(pId => {
    const items = pId === S.profileId ? S.items : (lsGet(`cmd.items_${pId}`, null) || defaultItemsFor(pId) || []);
    items.forEach(it => {
      const targetPid = profileIdForPerson(it.person);
      const fromPid = it.fromProfileId || pId;
      if (
        (fromPid === myPid && targetPid === otherPid) ||
        (fromPid === otherPid && targetPid === myPid)
      ) {
        if (!all.some(x => x.id === it.id)) all.push({ ...it, fromProfileId: fromPid });
      }
    });
  });
  return all;
}

function profileName(pid) {
  if (pid === 'sri-chandana') return 'Sri Chandana';
  if (pid === 'adithya') return 'Adithya';
  if (pid === 'rahul') return 'Rahul';
  const found = PROFILES.find(p => p.id === pid);
  return found ? found.name : (pid || 'Teammate');
}

function applyCustomAppBranding(newName, newIcon) {
  if (newName) lsSet('cmd.app_name', newName);
  if (newIcon) lsSet('cmd.custom_icon', newIcon);
  const appName = lsGet('cmd.app_name', 'My Dashboard');
  document.title = appName;
  const customIcon = lsGet('cmd.custom_icon', null);
  if (customIcon) {
    let iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink) iconLink.href = customIcon;
    let appleLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleLink) appleLink.href = customIcon;
    try {
      const dynamicManifest = {
        name: appName,
        short_name: appName,
        description: "Personal dashboard for businesses, clients, promises, money and trips.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#0c0d11",
        theme_color: "#0c0d11",
        icons: [
          { src: customIcon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: customIcon, sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      };
      const blob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/manifest+json' });
      let mLink = document.querySelector('link[rel="manifest"]');
      if (mLink) mLink.href = URL.createObjectURL(blob);
    } catch { }
  }
}
applyCustomAppBranding();

if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('./sw.js').catch(() => { });
    } catch { }
  });
}
