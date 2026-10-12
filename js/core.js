/* Command · Helpers, app state and saving/syncing (db). */
/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, (m||1)-1, d||1); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate()+n); return ymd(d); };
const dayDiff = s => Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const validTime = s => /^\d{2}:\d{2}$/.test(s || '');
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'; } catch { return 'Asia/Kolkata'; } })();
const tzOff = d => { const m = -d.getTimezoneOffset(), a = Math.abs(m); return `${m>=0?'+':'-'}${pad(Math.floor(a/60))}:${pad(a%60)}`; };
const isoAt = (date, time) => { const [h,mi] = time.split(':').map(Number); const d = parseYmd(date); d.setHours(h, mi, 0, 0); return `${date}T${pad(h)}:${pad(mi)}:00${tzOff(d)}`; };
const plusMin = (date, time, mins) => { const [h,mi] = time.split(':').map(Number); const d = parseYmd(date); d.setHours(h, mi + mins, 0, 0); return { date: ymd(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const fmtTime = t => { if (!validTime(t)) return ''; const [h,m] = t.split(':').map(Number); const hh = ((h + 11) % 12) + 1; return `${hh}${m ? ':' + pad(m) : ''} ${h >= 12 ? 'pm' : 'am'}`; };
const fmtDate = s => parseYmd(s).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
function dueLabel(s) {
  if (!validDate(s)) return { text:'', cls:'' };
  const n = dayDiff(s);
  if (n < 0) return { text: n === -1 ? 'Yesterday' : `${-n} days late`, cls:'od' };
  if (n === 0) return { text:'Today', cls:'td' };
  if (n === 1) return { text:'Tomorrow', cls:'' };
  if (n < 7) return { text: parseYmd(s).toLocaleDateString('en-IN', { weekday:'long' }), cls:'' };
  return { text: parseYmd(s).toLocaleDateString('en-IN', { day:'numeric', month:'short' }), cls:'' };
}
const CLIENT_COLORS = ['var(--muted)'];
const KIND_LABEL = { task:'Task', meeting:'Meeting', promise:'Promise', payment:'Payment', note:'Note', glitch:'Glitch', reel:'Reel' };
const GLITCH_STAGES = [['todo','To fix'],['fixing','Fixing'],['fixed','Fixed']];
const REEL_STAGES = [['idea','Idea'],['shoot','Shoot'],['edit','Edit'],['posted','Posted']];
const PRIO_COLOR = { high:'var(--ink)', med:'var(--muted)', low:'var(--faint)' };
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
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

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
    email: 'srichandana@gmail.com',
    avatarLetter: 'S'
  },
  {
    id: 'adithya',
    name: 'Adithya',
    email: 'adithya@gmail.com',
    avatarLetter: 'A'
  }
];

function defaultSettingsFor(profileId) {
  if (profileId === 'adithya') {
    return {
      name: 'Adithya',
      email: 'adithya@gmail.com',
      businesses: [
        { id: 'biz-revflow', name: 'RevFlow', kind: 'agency', tagline: '' },
        { id: 'biz-content', name: 'Content Agency', kind: 'agency', tagline: '' }
      ],
      clients: [
        { id: 'cl-2', name: 'Nova Studio', short: 'Nova', stars: 4, retainer: 35000, yourShare: 25000, note: 'Content creation & video campaigns', color: 1, signed: '2026-09-15', biz: 'biz-content' }
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
      email: 'srichandana@gmail.com',
      businesses: [
        { id: 'biz-revflow', name: 'RevFlow', kind: 'agency', tagline: '' },
        { id: 'biz-weblit', name: 'WEBLIT', kind: 'agency', tagline: '' },
        { id: 'biz-larping', name: 'LARPING', kind: 'product', tagline: '' }
      ],
      clients: [
        { id: 'cl-2', name: 'Nova Studio', short: 'Nova', stars: 4, retainer: 35000, yourShare: 25000, note: 'Website maintenance & UI redesign', color: 1, signed: '2026-09-15', biz: 'biz-weblit' }
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
  // rahul - identical business info, clients, goals, wishlist as Sri Chandana
  return {
    name: 'Rahul',
    email: 'rahulchandrakondamu@gmail.com',
    businesses: [
      { id: 'biz-revflow', name: 'RevFlow', kind: 'agency', tagline: '' },
      { id: 'biz-weblit', name: 'WEBLIT', kind: 'agency', tagline: '' },
      { id: 'biz-larping', name: 'LARPING', kind: 'product', tagline: '' }
    ],
    clients: [
      { id: 'cl-2', name: 'Nova Studio', short: 'Nova', stars: 4, retainer: 35000, yourShare: 25000, note: 'Website maintenance & UI redesign', color: 1, signed: '2026-09-15', biz: 'biz-weblit' }
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
      { id: 'it-5', kind: 'payment', title: 'Content campaign - Milestone 1', client: 'cl-2', person: '', due: addDays(today(), -14), time: '', priority: 'med', status: 'done', doneAt: Date.now() - 1209600000, biz: 'biz-content', amount: 35000, notes: 'Received via Bank Transfer', stage: '', link: '', cal: null }
    ];
  }
  return [
    { id: 'it-5', kind: 'payment', title: 'Website UI redesign - Milestone 1', client: 'cl-2', person: '', due: addDays(today(), -14), time: '', priority: 'med', status: 'done', doneAt: Date.now() - 1209600000, biz: 'biz-weblit', amount: 35000, notes: 'Received via Bank Transfer', stage: '', link: '', cal: null },
    { id: 'it-6', kind: 'glitch', title: 'Audio desync when switching playback speed on mobile', client: '', person: '', due: '', time: '', priority: 'high', status: 'open', created: Date.now() - 30000000, biz: 'biz-larping', amount: 0, notes: '', stage: 'fixing', link: '', cal: null },
    { id: 'it-7', kind: 'glitch', title: 'Dark mode toggle flickers white on first load', client: '', person: '', due: '', time: '', priority: 'med', status: 'open', created: Date.now() - 60000000, biz: 'biz-larping', amount: 0, notes: '', stage: 'todo', link: '', cal: null },
    { id: 'it-8', kind: 'glitch', title: 'Video export fails on iOS Safari background tab', client: '', person: '', due: '', time: '', priority: 'med', status: 'done', doneAt: Date.now() - 10000000, created: Date.now() - 90000000, biz: 'biz-larping', amount: 0, notes: '', stage: 'fixed', link: '', cal: null },
    { id: 'it-9', kind: 'reel', title: 'Day in the life running 3 businesses at 22', client: '', person: '', due: '', time: '', priority: 'med', status: 'open', created: Date.now() - 20000000, biz: 'biz-larping', amount: 0, notes: 'Behind-the-scenes B-roll showing Command', stage: 'shoot', link: '', cal: null },
    { id: 'it-10', kind: 'reel', title: 'Why I stopped using frameworks and built my own command center', client: '', person: '', due: addDays(today(), -2), time: '14:00', priority: 'high', status: 'done', doneAt: Date.now() - 86400000, biz: 'biz-larping', amount: 0, notes: 'Posted to IG Reels', stage: 'posted', link: 'https://instagram.com/reel/example', cal: null },
    { id: 'it-11', kind: 'promise', title: 'Send revised wireframes and brochure', client: 'cl-2', person: 'Rahul', fromProfileId: 'sri-chandana', due: today(), time: '17:00', priority: 'high', status: 'open', created: Date.now() - 7200000, biz: 'biz-weblit', amount: 0, notes: 'Shared design draft for Nova Studio', stage: '', link: '', cal: null }
  ];
}

const DEFAULTS = () => defaultSettingsFor(S?.profileId || lsGet('cmd.active_profile', 'rahul'));
const DEFAULT_ITEMS = () => defaultItemsFor(S?.profileId || lsGet('cmd.active_profile', 'rahul'));

function getProfileSettings(pid) {
  const def = defaultSettingsFor(pid);
  const saved = lsGet(`cmd.settings_${pid}`, null) || (pid === 'rahul' ? lsGet('cmd.settings', null) : null) || {};
  const merged = { ...def, ...saved };
  if (Array.isArray(merged.clients)) {
    merged.clients = merged.clients.filter(c => c.id !== 'cl-1' && !(c.name && c.name.toLowerCase().includes('apex')));
  }
  if (pid === 'sri-chandana') {
    merged.streakStarted = lsGet('cmd.sri_streak_started', false);
  }
  if (pid === 'rahul') {
    const sriDef = defaultSettingsFor('sri-chandana');
    merged.businesses = sriDef.businesses;
    merged.clients = sriDef.clients;
    merged.goals = sriDef.goals;
    merged.wishlist = sriDef.wishlist;
  }
  return merged;
}

function getProfileItems(pid) {
  const def = defaultItemsFor(pid);
  const saved = lsGet(`cmd.items_${pid}`, null) || (pid === 'rahul' ? lsGet('cmd.items', null) : null);
  const raw = Array.isArray(saved) && saved.length ? saved : def;
  return raw.filter(i => 
    !['it-1', 'it-2', 'it-3', 'it-4'].includes(i.id) &&
    i.client !== 'cl-1' &&
    !(i.title && (i.title.toLowerCase().includes('digital marketing') || i.title.toLowerCase().includes('apex')))
  );
}

const activeProfileId = lsGet('cmd.active_profile', 'rahul');
try { document.body.dataset.profile = activeProfileId; } catch {}
const finalSettings = getProfileSettings(activeProfileId);
const finalItems = getProfileItems(activeProfileId);

lsSet(`cmd.settings_${activeProfileId}`, finalSettings);
lsSet(`cmd.items_${activeProfileId}`, finalItems);
lsSet('cmd.settings', finalSettings);
lsSet('cmd.items', finalItems);

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
  }, 3800);
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
  toast(`Reset to ${S.settings.name}'s default businesses & clients.`);
}

const S = {
  profileId: activeProfileId,
  settings: finalSettings,
  items: finalItems,
  events: [], cal: { state:'loading', msg:'' },
  view: 'home', client: null, ctab: 'open', day: today(),
  review: null, plan: lsGet('cmd.plan', null), chat: [], mode: 'loading'
};
let settingsRef = null, itemsCol = null, settingsQ = Promise.resolve();

async function initStore() {
  const [user, db] = await Promise.all([useCap('user'), useCap('db')]);
  let uid = null;
  try { uid = user ? await user.id() : null; } catch {}
  if (db && uid) {
    const base = 'data/users/' + uid;
    settingsRef = db.doc(base + '/settings');
    itemsCol = db.doc(base + '/app').collection('items');
    S.mode = 'cloud';
    settingsRef.onSnapshot(snap => {
      if (snap.exists) { S.settings = { ...DEFAULTS(), ...JSON.parse(JSON.stringify(snap.data())) }; lsSet('cmd.settings', S.settings); }
      render();
    }, e => { console.warn('settings', e); setSync('error'); });
    itemsCol.onSnapshot(snap => {
      S.items = snap.docs.map(d => JSON.parse(JSON.stringify(d.data())));
      lsSet('cmd.items', S.items); render();
    }, e => { console.warn('items', e); setSync('error'); });
  } else {
    S.mode = 'local';
  }
  setSync(S.mode); render();
}
function setSync(mode) {
  const dot = $('#sync-dot'), txt = $('#sync-text');
  if (!dot || !txt) return;
  dot.classList.toggle('on', mode === 'cloud');
  txt.textContent = mode === 'cloud' ? 'Synced: phone + Mac' : mode === 'error' ? 'Sync paused. Reload.' : 'Saved on this device only';
}
function dbErr(e) {
  const c = e && e.code;
  if (c === 'quota_exceeded') return 'Storage is full. Delete some old done items.';
  if (c === 'revoked') return 'Sync stopped. Reload the page.';
  return 'Could not sync that change. It is kept on this device.';
}
function saveSettings() {
  const pid = S.profileId || 'rahul';
  lsSet(`cmd.settings_${pid}`, S.settings);
  lsSet('cmd.settings', S.settings);
  render();
  if (!settingsRef) return;
  const body = JSON.parse(JSON.stringify(S.settings));
  settingsQ = settingsQ.then(() => settingsRef.set(body)).catch(e => toast(dbErr(e)));
}
async function saveItem(it) {
  it.updated = Date.now();
  const i = S.items.findIndex(x => x.id === it.id);
  if (i >= 0) S.items[i] = it; else S.items.push(it);
  const pid = S.profileId || 'rahul';
  lsSet(`cmd.items_${pid}`, S.items);
  lsSet('cmd.items', S.items);
  render();
  if (itemsCol) { try { await itemsCol.doc(it.id).set(JSON.parse(JSON.stringify(it))); } catch (e) { toast(dbErr(e)); } }
}
async function removeItem(id) {
  S.items = S.items.filter(x => x.id !== id);
  const pid = S.profileId || 'rahul';
  lsSet(`cmd.items_${pid}`, S.items);
  lsSet('cmd.items', S.items);
  render();
  if (itemsCol) { try { await itemsCol.doc(id).delete(); } catch (e) { toast(dbErr(e)); } }
}
function makeItem(p) {
  return {
    id: newId(), kind: p.kind || 'task', title: (p.title || '').trim(), client: p.client || '', person: p.person || '',
    due: validDate(p.due) ? p.due : '', time: validTime(p.time) ? p.time : '', duration: Number(p.duration) || 60,
    priority: ['high','med','low'].includes(p.priority) ? p.priority : 'med', amount: Number(p.amount) || 0,
    notes: p.notes || '', status: 'open', created: Date.now(), cal: null,
    biz: p.biz || '', stage: p.stage || (p.kind === 'glitch' ? 'todo' : p.kind === 'reel' ? 'idea' : ''), link: p.link || ''
  };
}
const starsOf = c => { const v = Number(c && c.stars); return v > 0 ? v : ({1:5, 2:4, 3:3}[c && c.priority] || 3); };
const clients = () => [...(S.settings.clients || [])].sort((a,b) => starsOf(b) - starsOf(a) || a.name.localeCompare(b.name));
const starSvg = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
function starRow(v, cls = '') {
  const pct = Math.max(0, Math.min(100, v / 5 * 100));
  return `<span class="stars ${cls}" role="img" aria-label="${v} out of 5 stars"><span class="s-base">${starSvg.repeat(5)}</span><span class="s-fill" style="width:${pct}%">${starSvg.repeat(5)}</span></span>`;
}
const businesses = () => S.settings.businesses || [];
const bizById = id => businesses().find(b => b.id === id);
const clientBiz = c => (c && c.biz) || (businesses().find(b => b.kind !== 'product') || {}).id || '';
const productBiz = () => (businesses().find(b => b.kind === 'product') || {}).id || '';
const bizClients = id => clients().filter(c => clientBiz(c) === id);
const bizRevenue = id => bizClients(id).reduce((x, c) => x + clientRevenue(c.id), 0);
const clientRevenue = id => S.items.filter(i => i.client === id && i.kind === 'payment' && i.status === 'done').reduce((x, i) => x + (Number(i.amount) || 0), 0);
const clientById = id => (S.settings.clients || []).find(c => c.id === id);
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
  const unread = items.filter(i => i.status !== 'done').length;
  $$('.inbox-pip').forEach(el => { el.hidden = !unread; });
}

function getAvailableChatContacts() {
  const myPid = S.profileId || 'rahul';
  return PROFILES.filter(p => p.id !== myPid);
}

function getChatMessages(p1, p2) {
  const all = lsGet('cmd.chat_messages', []) || [];
  return all.filter(m => (m.from === p1 && m.to === p2) || (m.from === p2 && m.to === p1));
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
  return msg;
}

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
    } catch {}
  }
}
applyCustomAppBranding();

if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch {}
  });
}
