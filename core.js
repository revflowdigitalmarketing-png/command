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

/* ================= state + storage ================= */
const DEFAULTS = () => ({ name:'Rahul', clients:[], goals:[], peakStart:'10:00', peakEnd:'13:00', dayStart:'09:00', dayEnd:'21:00' });
const S = {
  settings: { ...DEFAULTS(), ...(lsGet('cmd.settings', {}) || {}) },
  items: lsGet('cmd.items', []) || [],
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
  lsSet('cmd.settings', S.settings); render();
  if (!settingsRef) return;
  const body = JSON.parse(JSON.stringify(S.settings));
  settingsQ = settingsQ.then(() => settingsRef.set(body)).catch(e => toast(dbErr(e)));
}
async function saveItem(it) {
  it.updated = Date.now();
  const i = S.items.findIndex(x => x.id === it.id);
  if (i >= 0) S.items[i] = it; else S.items.push(it);
  lsSet('cmd.items', S.items); render();
  if (itemsCol) { try { await itemsCol.doc(it.id).set(JSON.parse(JSON.stringify(it))); } catch (e) { toast(dbErr(e)); } }
}
async function removeItem(id) {
  S.items = S.items.filter(x => x.id !== id);
  lsSet('cmd.items', S.items); render();
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
