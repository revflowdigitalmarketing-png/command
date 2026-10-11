/* Command · Home page rendering: focus, timeline, streak, folders. */
/* ================= rendering ================= */
let raf = 0;
function render() { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderNow); }
function renderNow() {
  $$('[data-go]').forEach(b => { if (b.classList.contains('nav-btn') || b.classList.contains('tab')) b.setAttribute('aria-current', b.dataset.go === S.view ? 'page' : 'false'); });
  ['home','clients','word','money','ask'].forEach(v => $('#v-' + v).hidden = S.view !== v);
  const lateAll = openItems().filter(isLate).length;
  const latePromises = openItems().filter(i => i.kind === 'promise' && isLate(i)).length;
  setCount('home', lateAll); setCount('word', latePromises);
  placeNavInd();
  $('#word-pip').hidden = !latePromises;
  if (S.view === 'home') renderHome();
  if (S.view === 'clients') renderClients();
  if (S.view === 'word') renderWord();
  if (S.view === 'money') renderMoney();
}
function placeNavInd() {
  const ind = $('#nav-ind'); if (!ind) return;
  const btn = $(`.side .nav-btn[data-go="${S.view}"]`);
  if (!btn || !btn.offsetParent) { ind.style.opacity = '0'; return; }
  ind.style.transform = `translateY(${btn.offsetTop}px)`; ind.style.height = btn.offsetHeight + 'px'; ind.style.opacity = '1';
  if (!ind.classList.contains('ready')) requestAnimationFrame(() => ind.classList.add('ready'));
}
function setCount(k, n) { const el = $(`[data-count="${k}"]`); if (el) { el.hidden = !n; el.textContent = n; } }

function taskRow(it, opts = {}) {
  const c = clientById(it.client);
  const d = dueLabel(it.due);
  const bits = [];
  if (opts.showClient !== false && c) bits.push(`<span><span class="chip"><span class="sw" style="background:${clientColor(c)}"></span>${esc(c.short || c.name)}</span></span>`);
  if (it.kind !== 'task') bits.push(`<span>${KIND_LABEL[it.kind] || ''}${it.person ? ' · ' + esc(it.person) : ''}</span>`);
  if (it.kind === 'payment' && it.status === 'done' && it.doneAt) bits.push(`<span>Received ${new Date(it.doneAt).toLocaleDateString('en-IN',{day:'numeric', month:'short', year:'numeric'})}</span>`);
  else if (d.text) bits.push(`<span class="${d.cls}"><svg><use href="#i-clock"/></svg> ${d.text}${it.time ? ', ' + fmtTime(it.time) : ''}</span>`);
  if (it.kind === 'payment' && it.amount) bits.push(`<span class="mono">${inr(it.amount)}</span>`);
  if (it.cal) bits.push(`<span title="On Google Calendar"><svg><use href="#i-cal"/></svg></span>`);
  return `<div class="task ${it.status === 'done' ? 'done' : ''}" data-id="${it.id}">
    <button class="check" data-toggle="${it.id}" aria-label="${it.status === 'done' ? 'Mark not done' : 'Mark done'}"><svg><use href="#i-check"/></svg></button>
    <span class="stripe" style="background:${c ? clientColor(c) : PRIO_COLOR[it.priority]}"></span>
    <button class="body" data-edit="${it.id}">
      <span class="ttl">${esc(it.title)}</span>
      ${bits.length ? `<span class="sub">${bits.join('')}</span>` : ''}
    </button>
    <button class="more" data-edit="${it.id}" aria-label="Edit"><svg><use href="#i-dots"/></svg></button>
  </div>`;
}
const sortItems = arr => arr.sort((a, b) => {
  const ad = validDate(a.due) ? a.due : '9999', bd = validDate(b.due) ? b.due : '9999';
  if (ad !== bd) return ad < bd ? -1 : 1;
  const pr = { high:0, med:1, low:2 };
  if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
  return (a.time || '99') < (b.time || '99') ? -1 : 1;
});

function updateProfileCrumbs() {
  const pid = S.profileId || 'rahul';
  const nm = S.settings.name || (pid === 'sri-chandana' ? 'Sri Chandana' : pid === 'adithya' ? 'Adithya' : 'Rahul');
  const em = S.settings.email || (nm.toLowerCase().replace(/\s+/g, '') + '@gmail.com');
  const sideName = $('#side-name'); if (sideName) sideName.textContent = nm;
  const sideEmail = $('#side-email'); if (sideEmail) sideEmail.textContent = em;
  const sidePfp = $('#side-pfp'); if (sidePfp) sidePfp.textContent = nm.slice(0, 1).toUpperCase();
  document.title = `${nm}'s Command`;
  document.body.dataset.profile = pid;
  $$('.crumb').forEach(c => {
    c.innerHTML = c.innerHTML.replace(/^[^/<]+(?=\s*\/)/, esc(nm));
  });
  const askHero = $('#ask-hero');
  if (askHero) {
    if (pid === 'sri-chandana') {
      askHero.innerHTML = `At your service, Sri Chandana. <span>What can I help you accomplish today?</span>`;
    } else if (pid === 'adithya') {
      askHero.innerHTML = `Ready when you are, Adithya. <span>What strategy or content are we reviewing?</span>`;
    } else {
      askHero.innerHTML = `At your service, ${esc(nm)}. <span>What do you want to know?</span>`;
    }
  }
}

function renderHome() {
  const h = new Date().getHours();
  const pid = S.profileId || 'rahul';
  const nm = S.settings.name || (pid === 'sri-chandana' ? 'Sri Chandana' : pid === 'adithya' ? 'Adithya' : 'Rahul');
  updateProfileCrumbs();
  $('#greet').textContent = new Date().toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'long'});

  // Tailored 2-line greetings per profile
  let greetingHtml = '';
  if (pid === 'sri-chandana') {
    if (h < 5) {
      greetingHtml = `Still awake, Sri Chandana? <span>Inner peace awaits. Let the mind rest.</span>`;
    } else if (h < 12) {
      greetingHtml = `Good morning, Sri Chandana. <span>There is no secret ingredient — today is yours.</span>`;
    } else if (h < 17) {
      greetingHtml = `Good afternoon, Sri Chandana. <span>Mastery in every action. What's next?</span>`;
    } else {
      greetingHtml = `Good evening, Sri Chandana. <span>A day well fought. Rest and recharge.</span>`;
    }
  } else if (pid === 'adithya') {
    if (h < 5) {
      greetingHtml = `Late night grind, Adithya? <span>Finalize the cuts and queue the drops.</span>`;
    } else if (h < 12) {
      greetingHtml = `Good morning, Adithya. <span>High retention, high impact. What's next?</span>`;
    } else if (h < 17) {
      greetingHtml = `Good afternoon, Adithya. <span>Campaigns are live. Keep momentum high.</span>`;
    } else {
      greetingHtml = `Good evening, Adithya. <span>Wrap deliverables and prep tomorrow.</span>`;
    }
  } else {
    // rahul
    if (h < 5) {
      greetingHtml = `Still up, ${esc(nm)}? <span>Get it out of your head and into Command.</span>`;
    } else if (h < 12) {
      greetingHtml = `Good morning, ${esc(nm)}. <span>Systems are up. What moves the needle today?</span>`;
    } else if (h < 17) {
      greetingHtml = `Good afternoon, ${esc(nm)}. <span>Momentum is high. What needs handling?</span>`;
    } else {
      greetingHtml = `Good evening, ${esc(nm)}. <span>Close out strong and review today's wins.</span>`;
    }
  }
  $('#hero-q').innerHTML = greetingHtml;

  // Custom banner image per profile (Kung Fu Panda for Sri Chandana)
  $$('.banner').forEach(b => {
    if (pid === 'sri-chandana') {
      b.style.backgroundImage = "url('assets/kung-fu-panda.jpg'), url('kung fu panda.jpg')";
      b.style.backgroundPosition = "center 42%";
      b.setAttribute('aria-label', "Sri Chandana's dashboard - Po meditating under the blooming peach blossom tree");
    } else {
      b.style.backgroundImage = "url('assets/banner.jpg')";
      b.style.backgroundPosition = "center 58%";
      b.setAttribute('aria-label', "Open field at golden hour with a parked car");
    }
  });

  // Custom prompt placeholder per profile
  const dumpEl = $('#dump');
  if (dumpEl) {
    if (pid === 'sri-chandana') {
      dumpEl.placeholder = "Capture your thoughts, promises, tasks, and creative ideas…";
    } else if (pid === 'adithya') {
      dumpEl.placeholder = "Log content ideas, client notes, video deliverables, payments…";
    } else {
      dumpEl.placeholder = "Type or dictate your meeting notes, promises, payments…";
    }
  }

  const open = openItems();
  const t = today();
  const dueToday = open.filter(i => i.due === t);
  const todayEvents = S.events.filter(e => e.day === t);
  const chips = [];
  if (dueToday.length) chips.push(`<span class="chip warn">${dueToday.length} due today</span>`);
  if (todayEvents.length) chips.push(`<span class="chip">${todayEvents.length} on calendar today</span>`);
  $('#status-line').innerHTML = chips.join('');

  // clients rail
  const cl = clients();
  $('#client-rail').innerHTML = businesses().length ? businesses().map(mainFolder).join('') :
    `<div class="empty">No clients yet. <button class="link" data-action="new-client" style="color:var(--ink)">Add your first client</button></div>`;

  // focus: overdue + today + high priority soon
  const focus = sortItems(open.filter(i => i.kind !== 'note' && i.kind !== 'glitch' && (isLate(i) || i.due === t || (i.priority === 'high' && (!i.due || dayDiff(i.due) <= 2)))));
  // late promises first
  focus.sort((a, b) => (isLate(b) && b.kind === 'promise') - (isLate(a) && a.kind === 'promise'));
  $('#focus').innerHTML = focus.length ? focus.slice(0, 12).map(i => taskRow(i)).join('') :
    `<div class="empty">Nothing due today.</div>`;

  const focusIds = new Set(focus.map(i => i.id));
  const up = sortItems(open.filter(i => i.kind !== 'note' && i.kind !== 'glitch' && !focusIds.has(i.id) && validDate(i.due) && dayDiff(i.due) > 0 && dayDiff(i.due) <= 7));
  $('#upcoming').innerHTML = up.length ? up.map(i => taskRow(i)).join('') : `<div class="empty">Nothing scheduled for the coming week.</div>`;

  // my word mini
  const pr = sortItems(open.filter(i => i.kind === 'promise')).slice(0, 3);
  $('#word-mini').innerHTML = pr.length ? pr.map(i => taskRow(i)).join('') : `<div class="empty">No open promises. Add one when you give someone your word.</div>`;

  // trips mini (if present)
  const tm = $('#trips-mini');
  if (tm) {
    const goals = S.settings.goals || [];
    tm.innerHTML = goals.length ? goals.map(g => {
      const pct = g.target ? Math.min(100, Math.round((g.saved || 0) / g.target * 100)) : 0;
      return `<button class="card" data-goal="${g.id}" style="padding:14px 16px;text-align:left;display:flex;flex-direction:column;gap:10px">
        <span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:15px">${esc(g.name)}</b>
        <span class="mono muted" style="font-size:12.5px">${g.target ? `${inr(g.saved)} / ${inr(g.target)}` : 'Set a target'}</span></span>
        <span class="bar"><i style="width:${pct}%"></i></span></button>`;
    }).join('') : `<div class="empty">Add Dubai and Bali in Money to track your savings.</div>`;
  }

  renderStreak();
  renderDay();
}
function mainFolder(b) {
  return `<button class="mcard" data-biz="${b.id}">
    <span class="mfold" aria-hidden="true"><span class="m-l3"></span><span class="m-l2"></span>
      <span class="m-front"><span class="m-tag">${b.kind === 'product' ? 'APP IDEA' : 'AGENCY'}</span><span class="m-name">${esc(b.name)}</span></span></span>
  </button>`;
}
function weekDays(offset) {
  const t = today(); const dow = (parseYmd(t).getDay() + 6) % 7;
  const mon = addDays(t, -dow + offset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
function clientCard(c) {
  const open = openItems().filter(i => i.client === c.id && i.kind !== 'note');
  const late = open.filter(isLate).length;
  const next = sortItems(open.filter(i => validDate(i.due)))[0];
  const papers = open.length ? `<span class="f-paper p1"></span>${open.length > 1 ? '<span class="f-paper p2"></span>' : ''}` : '';
  const sub = `${open.length} open${late ? ` · ${late} late` : next ? ' · ' + dueLabel(next.due).text : ''}`;
  return `<button class="folder-card" data-client="${c.id}">
    <span class="folder" aria-hidden="true"><span class="f-back"></span>${papers}<span class="f-front"><span class="f-badges"><span class="f-chip">★ ${starsOf(c).toFixed(1)}</span>${late ? `<span class="f-chip late">${late} late</span>` : ''}</span></span></span>
    <span class="f-name">${esc(c.short || c.name)}</span>
    <span class="f-sub">${esc(sub)}</span>
  </button>`;
}

/* ---- day strip + timeline ---- */
function clientMatchesEvent(c, e) {
  const t = (e.title || '').toLowerCase();
  const keys = [c.short, c.name, (c.name || '').split(' ')[0]].filter(k => k && k.length > 2).map(k => k.toLowerCase());
  return keys.some(k => t.includes(k));
}
function renderDay(scope) {
  // scope: undefined = home, or a client id
  const c = scope ? clientById(scope) : null;
  const ids = scope ? { strip:'#c-strip', tl:'#c-timeline', label:'#c-day-label', key:'cday' } : { strip:'#strip', tl:'#timeline', label:'#day-label', key:'day' };
  if (!$(ids.strip)) return;
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i));
  if (!days.includes(S[ids.key])) S[ids.key] = t;
  const sel = S[ids.key];
  const evAll = c ? S.events.filter(e => clientMatchesEvent(c, e)) : S.events;
  const itAll = openItems().filter(i => i.kind !== 'note' && (!c || i.client === c.id));
  $(ids.strip).innerHTML = days.map(d => {
    const dt = parseYmd(d);
    const has = evAll.some(e => e.day === d) || itAll.some(i => i.due === d);
    return `<button class="dpill" data-day="${d}" data-scope="${scope || ''}" aria-pressed="${d === sel}"><small>${dt.toLocaleDateString('en-IN',{weekday:'short'}).toUpperCase()}</small><b>${dt.getDate()}</b>${has ? '<span class="has"></span>' : ''}</button>`;
  }).join('');
  $(ids.label).textContent = (sel === t ? 'Today, ' + parseYmd(sel).toLocaleDateString('en-IN',{day:'numeric', month:'long'}) : fmtDate(sel)) + (c ? ` · ${c.short || c.name}` : '');
  const evs = evAll.filter(e => e.day === sel).map(e => ({ t: e.allDay ? '' : e.time, title: e.title, sub: e.allDay ? 'All day' : `${fmtTime(e.time)}${e.endTime ? ' – ' + fmtTime(e.endTime) : ''}`, link: e.link, loc: e.location }));
  const calIds = new Set(S.events.map(e => e.id));
  const its = itAll.filter(i => i.due === sel && !(i.cal && calIds.has(i.cal.id))).map(i => {
    const ic = clientById(i.client);
    return { t: i.time, title: i.title, sub: [KIND_LABEL[i.kind], !c && ic ? (ic.short || ic.name) : '', i.time ? fmtTime(i.time) : 'Any time'].filter(Boolean).join(' · '), id: i.id };
  });
  const all = [...evs, ...its].sort((x, y) => (x.t || '00:00') < (y.t || '00:00') ? -1 : 1);
  let html = '';
  const nowT = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  let nowDone = sel !== t;
  for (const x of all) {
    if (!nowDone && x.t && x.t > nowT) { html += nowLine(nowT); nowDone = true; }
    html += `<div class="tl-row"><div class="tl-time">${x.t ? fmtTime(x.t) : 'All day'}</div>
      <div class="ev" ${x.id ? `role="button" tabindex="0" data-edit="${x.id}" style="cursor:pointer"` : ''}>
      <h4>${esc(x.title)}</h4><p>${esc(x.sub)}${x.loc ? ' · ' + esc(x.loc) : ''}</p>${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">Open in Google Calendar</a>` : ''}</div></div>`;
  }
  if (!nowDone && all.length) html += nowLine(nowT);
  if (!all.length) html = `<div class="empty">${sel === t ? 'Nothing on today.' : 'Nothing planned for this day.'}</div>`;
  const note = calNote();
  $(ids.tl).innerHTML = html + (note ? `<div class="cal-note">${note}</div>` : '');
}

/* ---- streak ---- */
const endOfDay = d => { const x = parseYmd(d); x.setHours(23, 59, 59, 999); return x.getTime(); };
function dayStatus(d) {
  // ok: nothing due up to d was left open at the end of d, and something got done or was due that day
  const end = endOfDay(d), start = parseYmd(d).getTime();
  const tracked = S.items.filter(i => i.kind !== 'note' && validDate(i.due) && (i.created || 0) <= end);
  const leftOpen = tracked.filter(i => i.due <= d && !(i.status === 'done' && i.doneAt && i.doneAt <= end));
  const doneThatDay = S.items.filter(i => i.status === 'done' && i.doneAt >= start && i.doneAt <= end).length;
  const dueThatDay = tracked.filter(i => i.due === d);
  const dueDone = dueThatDay.filter(i => i.status === 'done' && i.doneAt && i.doneAt <= end).length;
  return { ok: leftOpen.length === 0 && (doneThatDay > 0 || dueThatDay.length > 0), active: doneThatDay > 0 || dueThatDay.length > 0, leftOpen: leftOpen.length, dueTotal: dueThatDay.length, dueDone, doneThatDay };
}
function ringSvg(frac) {
  const r = 13, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<svg class="ring" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="3"/><circle cx="15" cy="15" r="${r}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 15 15)"/></svg>`;
}
function renderStreak() {
  const t = today();
  // streak: consecutive ok days ending today (if ok) or yesterday; inactive days with nothing overdue don't break it
  let streak = 0;
  const todaySt = dayStatus(t);
  let d = todaySt.ok ? t : addDays(t, -1);
  for (let k = 0; k < 400; k++) {
    const st = dayStatus(d);
    if (st.ok) streak++;
    else if (st.active || st.leftOpen) break;
    const first = S.items.reduce((m, i) => Math.min(m, i.created || Infinity), Infinity);
    if (!isFinite(first) || parseYmd(d).getTime() < first) break;
    d = addDays(d, -1);
  }
  const now = parseYmd(t); const dow = (now.getDay() + 6) % 7; // Monday = 0
  const monday = addDays(t, -dow);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map(day => {
    const lbl = parseYmd(day).toLocaleDateString('en-IN', { weekday:'short' });
    if (day > t) return `<div class="wd"><i></i>${lbl}</div>`;
    const st = dayStatus(day);
    if (day === t && !st.ok) {
      const frac = st.dueTotal ? st.dueDone / st.dueTotal : 0;
      return `<div class="wd today">${ringSvg(frac)}${lbl}</div>`;
    }
    return st.ok ? `<div class="wd ok ${day === t ? 'today' : ''}"><i><svg><use href="#i-check"/></svg></i>${lbl}</div>` : `<div class="wd miss"><i></i>${lbl}</div>`;
  }).join('');
  const dueToday = S.items.filter(i => i.kind !== 'note' && (i.due === t || (i.status !== 'done' && validDate(i.due) && i.due < t)));
  const doneN = dueToday.filter(i => i.status === 'done').length;
  const pct = dueToday.length ? Math.round(doneN / dueToday.length * 100) : 0;
  $('#streak').innerHTML = `
    <div class="streak-top"><div><small>STREAK</small><b>${streak}<span>${streak === 1 ? 'DAY' : 'DAYS'}</span></b></div>
      <div class="faint" style="font-size:12px;text-align:right;max-width:18ch">A tick means nothing was left overdue that day</div></div>
    <div class="week">${week}</div>
    <div class="streak-bar"><small>TODAY</small>
      <div class="row"><b>${doneN}<span> / ${dueToday.length} done</span></b><span class="faint" style="font-size:12.5px">${dueToday.length ? pct + '%' : 'Nothing due'}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
}
const nowLine = t => `<div class="now"><span>${fmtTime(t)}</span><i></i></div>`;
function calNote() {
  switch (S.cal.state) {
    case 'ok': return '';
    case 'loading': return 'Loading calendar…';
    case 'off': return '';
    default: return esc(S.cal.msg || '');
  }
}
