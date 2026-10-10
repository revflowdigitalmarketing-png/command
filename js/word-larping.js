/* Command · LARPING workspace (glitches, reels), business sheet, My Word (promises). */
/* ---- my word ---- */
function stageChip(it) {
  const st = it.kind === 'glitch' ? GLITCH_STAGES : REEL_STAGES;
  const cur = st.find(x => x[0] === it.stage) || st[0];
  return `<button type="button" class="stage ${cur[0] === 'fixed' || cur[0] === 'posted' ? 'fin' : ''}" data-stage="${it.id}" title="Tap to move to the next step">${cur[1]}</button>`;
}
function glitchRow(it) {
  const fmt = t => new Date(t).toLocaleDateString('en-IN',{day:'numeric', month:'short'});
  const sev = { high:'Breaks the app', med:'Annoying', low:'Minor' }[it.priority] || 'Annoying';
  return `<div class="task ${it.stage === 'fixed' ? 'done' : ''}">
    <button class="check" data-toggle="${it.id}" aria-label="${it.stage === 'fixed' ? 'Mark not fixed' : 'Mark fixed'}"><svg><use href="#i-check"/></svg></button>
    <button class="body" data-edit="${it.id}"><span class="ttl">${esc(it.title)}</span>
      <span class="sub"><span>${sev}</span><span>Found ${fmt(it.created)}</span>${it.stage === 'fixed' && it.doneAt ? `<span>Fixed ${fmt(it.doneAt)}</span>` : ''}</span></button>
    ${stageChip(it)}
  </div>`;
}
function renderLarp(b) {
  $('#clients-crumb').innerHTML = `<button class="link" data-back="all">Businesses</button> / <b>${esc(b.name)}</b>`;
  $('#clients-title').textContent = b.name;
  setTopBtn('Plan a reel', 'new-reel');
  const gl = S.items.filter(i => i.kind === 'glitch' && i.biz === b.id);
  const order = { fixing:0, todo:1, fixed:2 };
  gl.sort((x, y) => (order[x.stage] ?? 1) - (order[y.stage] ?? 1) || ({high:0,med:1,low:2}[x.priority] - {high:0,med:1,low:2}[y.priority]) || (y.created || 0) - (x.created || 0));
  const todo = gl.filter(i => i.stage === 'todo').length, fixing = gl.filter(i => i.stage === 'fixing').length, fixed = gl.filter(i => i.stage === 'fixed').length;
  const wk = weekDays(S.rweek || 0), wk0 = weekDays(0);
  const reelsNow = S.items.filter(i => i.kind === 'reel' && i.biz === b.id && wk0.includes(i.due));
  $('#larp-head').innerHTML = `<button class="back-btn" type="button" data-back="all"><svg><use href="#i-back"/></svg>All businesses</button>
    <div class="glass detail-head">
      <div class="muted" style="font-size:13.5px;max-width:60ch">${esc(b.tagline || 'App idea in progress')}. Fix the glitches on the left, then turn each fix into a reel on the right.</div>
      <div class="kv"><div><small>To fix</small><b>${todo}</b></div><div><small>Fixing now</small><b>${fixing}</b></div><div><small>Fixed</small><b>${fixed}</b></div><div><small>Reels posted this week</small><b>${reelsNow.filter(i => i.stage === 'posted').length} / ${reelsNow.length}</b></div></div>
    </div>`;
  $('#glitch-count').textContent = gl.length ? `${todo + fixing} open` : '';
  $('#glitch-list').innerHTML = gl.length ? gl.map(glitchRow).join('') : `<div class="empty">No glitches logged. When something breaks in the app, add it here.</div>`;
  const f = d => parseYmd(d).toLocaleDateString('en-IN',{day:'numeric', month:'short'});
  $('#rweek-label').textContent = `${f(wk[0])} – ${f(wk[6])}`;
  const t = today();
  $('#reel-week').innerHTML = wk.map(d => {
    const dt = parseYmd(d);
    const reels = S.items.filter(i => i.kind === 'reel' && i.biz === b.id && i.due === d);
    return `<div class="rday ${d === t ? 'today' : ''} ${d < t ? 'past' : ''}">
      <div class="rday-l"><small>${dt.toLocaleDateString('en-IN',{weekday:'short'}).toUpperCase()}</small><b>${dt.getDate()}</b></div>
      <div class="rday-c">${reels.map(r => `<div class="reel ${r.stage === 'posted' ? 'done' : ''}"><button class="body" data-reel="${r.id}"><span class="ttl">${esc(r.title)}</span>${r.time || r.link ? `<span class="sub">${r.time ? `<span>${fmtTime(r.time)}</span>` : ''}${r.link ? '<span>Link added</span>' : ''}</span>` : ''}</button>${stageChip(r)}</div>`).join('')}
        ${reels.length ? '' : `<button type="button" class="rday-add" data-newreel="${d}"><svg><use href="#i-plus"/></svg>Plan a reel</button>`}</div>
    </div>`;
  }).join('');
}
function editReel(id, date) {
  const b = productBiz();
  const r = id ? S.items.find(x => x.id === id) : makeItem({ kind:'reel', biz: b, due: date || today(), priority:'med' });
  if (!r) return;
  const gl = S.items.filter(i => i.kind === 'glitch' && i.biz === b);
  openSheet(`<h2>${id ? 'Edit reel' : 'Plan a reel'}</h2>
    <div class="field"><label for="r-title">Reel idea</label><input class="in" id="r-title" value="${esc(r.title)}" placeholder="e.g. We fixed the login crash in 1 day"></div>
    <div class="frow">
      <div class="field"><label for="r-date">Post on</label><input class="in" type="date" id="r-date" value="${r.due}"></div>
      <div class="field"><label for="r-time">Time</label><input class="in" type="time" id="r-time" value="${r.time}"></div>
      <div class="field"><label for="r-stage">Step</label><select class="in" id="r-stage">${REEL_STAGES.map(([k, v]) => `<option value="${k}" ${k === r.stage ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    ${gl.length ? `<div class="field"><label for="r-glitch">About which glitch (optional)</label><select class="in" id="r-glitch"><option value="">None</option>${gl.map(g => `<option value="${g.id}" ${g.id === r.person ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="r-notes">Hook / caption</label><textarea class="in" id="r-notes" placeholder="First line that stops the scroll">${esc(r.notes)}</textarea></div>
    <div class="field"><label for="r-link">Instagram link (after posting)</label><input class="in" id="r-link" value="${esc(r.link)}" placeholder="https://instagram.com/reel/…"></div>
    <div class="sheet-actions">${id ? `<button class="btn danger left" id="r-del">Delete</button>` : ''}${r.cal ? '' : `<button class="btn" id="r-cal">Save + Calendar</button>`}<button class="btn" id="r-cancel">Cancel</button><button class="btn primary" id="r-save">Save</button></div>`, sh => {
    const collect = () => {
      r.title = $('#r-title').value.trim(); r.due = $('#r-date').value; r.time = $('#r-time').value; r.stage = $('#r-stage').value;
      r.person = $('#r-glitch') ? $('#r-glitch').value : ''; r.notes = $('#r-notes').value; r.link = $('#r-link').value.trim();
      r.status = r.stage === 'posted' ? 'done' : 'open'; r.doneAt = r.stage === 'posted' ? (r.doneAt || Date.now()) : null;
      return !!r.title;
    };
    sh.querySelector('#r-cancel').onclick = closeSheet;
    sh.querySelector('#r-save').onclick = async () => { if (!collect()) { toast('Write the reel idea first.'); return; } closeSheet(); await saveItem(r); toast('Reel saved.'); };
    const cb = sh.querySelector('#r-cal');
    if (cb) cb.onclick = async () => { if (!collect()) { toast('Write the reel idea first.'); return; } if (!r.due) { toast('Pick a posting date.'); return; } closeSheet(); await saveItem(r); await pushToCalendar(r); loadCalendar(true); };
    const del = sh.querySelector('#r-del');
    if (del) del.onclick = () => { if (del.dataset.sure) { closeSheet(); removeItem(r.id); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; } };
  });
}
function editBusiness() {
  openSheet(`<h2>New business</h2>
    <div class="field"><label for="b-name">Name</label><input class="in" id="b-name" placeholder="Business name"></div>
    <div class="field"><label for="b-kind">Type</label><select class="in" id="b-kind"><option value="agency">Business with clients</option><option value="product">App or idea (glitches + reels)</option></select></div>
    <div class="field"><label for="b-tag">One line about it</label><input class="in" id="b-tag" placeholder="What it does"></div>
    <div class="sheet-actions"><button class="btn" id="b-cancel">Cancel</button><button class="btn primary" id="b-save">Save</button></div>`, sh => {
    sh.querySelector('#b-cancel').onclick = closeSheet;
    sh.querySelector('#b-save').onclick = () => {
      const name = $('#b-name').value.trim(); if (!name) { toast('Name the business.'); return; }
      S.settings.businesses = [...businesses(), { id: newId(), name, kind: $('#b-kind').value, tagline: $('#b-tag').value.trim() }];
      closeSheet(); saveSettings(); toast('Business added.');
    };
  });
}
function promiseRow(it) {
  const c = clientById(it.client);
  const d = dueLabel(it.due);
  const whenTxt = validDate(it.due) ? `${parseYmd(it.due).toLocaleDateString('en-IN',{weekday:'short', day:'numeric', month:'short', year:'numeric'})}${it.time ? ', ' + fmtTime(it.time) : ''}` : 'No date set';
  const made = it.created ? new Date(it.created).toLocaleDateString('en-IN',{day:'numeric', month:'short'}) + ', ' + new Date(it.created).toLocaleTimeString('en-IN',{hour:'numeric', minute:'2-digit'}) : '';
  const kept = it.status === 'done' && it.doneAt ? new Date(it.doneAt).toLocaleDateString('en-IN',{day:'numeric', month:'short'}) + ', ' + new Date(it.doneAt).toLocaleTimeString('en-IN',{hour:'numeric', minute:'2-digit'}) : '';
  return `<div class="task ${it.status === 'done' ? 'done' : ''}" data-id="${it.id}">
    <button class="check" data-toggle="${it.id}" aria-label="${it.status === 'done' ? 'Mark not kept' : 'Mark kept'}"><svg><use href="#i-check"/></svg></button>
    <button class="body" data-edit="${it.id}">
      <span class="ttl">${esc(it.title)}</span>
      <span class="when">${it.person ? `<span>To <b>${esc(it.person)}</b></span>` : ''}${c ? `<span>${esc(c.short || c.name)}</span>` : ''}</span>
      <span class="when"><span>Due <b>${esc(whenTxt)}</b></span>${it.status !== 'done' && d.text ? `<span class="${d.cls === 'od' ? '' : 'faint'}" style="${d.cls === 'od' ? 'color:var(--ink);font-weight:600' : ''}">${esc(d.text)}</span>` : ''}</span>
      <span class="when faint">${made ? `<span>Promised ${esc(made)}</span>` : ''}${kept ? `<span>Kept ${esc(kept)}</span>` : ''}</span>
    </button>
    <button class="more" data-edit="${it.id}" aria-label="Edit"><svg><use href="#i-dots"/></svg></button>
  </div>`;
}
const PC = { month: (() => { const d = new Date(); const left = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(); if (left < 5) d.setMonth(d.getMonth() + 1, 1); return ymd(d).slice(0, 7); })(), date: '', time: '', h24: false };
function renderComposer() {
  const sel = $('#pc-client');
  if (sel && document.activeElement !== sel) { const v = sel.value; sel.innerHTML = `<option value="">No client</option>` + clients().map(c => `<option value="${c.id}">${esc(c.short || c.name)}</option>`).join(''); sel.value = v; }
  const [y, m] = PC.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  $('#sch-month').textContent = first.toLocaleDateString('en-IN', { month:'long' });
  $('#sch-year').textContent = y;
  const t = today();
  let g = ['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => `<div class="sch-dow">${d}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) g += '<span class="sch-d blank"></span>';
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`;
    g += `<button type="button" class="sch-d ${ds < t ? 'past' : ''} ${ds === t ? 'today' : ''}" data-pcdate="${ds}" aria-pressed="${ds === PC.date}">${d}</button>`;
  }
  $('#sch-grid').innerHTML = g;
  const dd = PC.date ? parseYmd(PC.date) : null;
  const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  $('#sch-day').innerHTML = dd ? `<b>${dd.toLocaleDateString('en-IN',{weekday:'short'})}</b>${ord(dd.getDate())}` : 'Pick a date';
  $$('[data-h24]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.h24 === (PC.h24 ? '1' : '0'))));
  const [sh, sm] = (S.settings.dayStart || '09:00').split(':').map(Number), [eh, em] = (S.settings.dayEnd || '21:00').split(':').map(Number);
  const slots = [];
  for (let mins = sh * 60 + sm; mins <= eh * 60 + em; mins += 30) slots.push(`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`);
  $('#sch-slots').innerHTML = `<button type="button" class="slot" data-pctime="" aria-pressed="${!PC.time}">Any time</button>` +
    slots.map(s => `<button type="button" class="slot" data-pctime="${s}" aria-pressed="${s === PC.time}">${PC.h24 ? s : fmtTime(s)}</button>`).join('');
  renderComposerInfo();
}
function renderComposerInfo() {
  const what = $('#pc-what').value.trim(), who = $('#pc-who').value.trim();
  const c = clientById($('#pc-client').value);
  $('#sch-info').innerHTML = `<span class="pfp" aria-hidden="true"></span>
    <div class="who">${esc(S.settings.name || 'Rahul')}${who ? ' → ' + esc(who) : ''}</div>
    <h3>${what ? esc(what.length > 80 ? what.slice(0, 80) + '…' : what) : 'New promise'}</h3>
    <div class="ln"><svg><use href="#i-cal"/></svg>${PC.date ? esc(parseYmd(PC.date).toLocaleDateString('en-IN',{weekday:'short', day:'numeric', month:'short'})) : 'No date yet'}</div>
    <div class="ln"><svg><use href="#i-clock"/></svg>${PC.time ? (PC.h24 ? PC.time : fmtTime(PC.time)) : 'Any time'}</div>
    ${c ? `<div class="ln"><svg><use href="#i-users"/></svg>${esc(c.short || c.name)}</div>` : ''}
    <div class="ln"><svg><use href="#i-globe"/></svg>${esc(TZ)}</div>`;
}
async function savePromise() {
  const title = $('#pc-what').value.trim();
  if (!title) { toast('Write what you promised first.'); $('#pc-what').focus(); return; }
  const it = makeItem({ kind:'promise', title, person: $('#pc-who').value.trim(), client: $('#pc-client').value, due: PC.date, time: PC.time, priority:'high' });
  $('#pc-state').textContent = 'Saving…';
  await saveItem(it);
  let cal = false;
  if ($('#pc-cal').checked && it.due) cal = await pushToCalendar(it, true);
  $('#pc-what').value = ''; $('#pc-who').value = ''; PC.date = ''; PC.time = ''; $('#pc-state').textContent = '';
  renderComposer();
  toast(`Promise saved${cal ? ' and added to Google Calendar' : it.due ? '' : '. Add a date so it can remind you'}.`);
}
function renderWord() {
  renderComposer();
  const ps = S.items.filter(i => i.kind === 'promise');
  const open = sortItems(ps.filter(i => i.status !== 'done'));
  $('#word-list').innerHTML = open.length ? open.map(promiseRow).join('') : `<div class="empty">No open promises. When you tell someone "I'll do it", add it here.</div>`;
  const done = ps.filter(i => i.status === 'done').sort((a,b) => (b.doneAt||0) - (a.doneAt||0)).slice(0, 20);
  $('#word-done').innerHTML = done.length ? done.map(promiseRow).join('') : `<div class="empty">Kept promises show up here.</div>`;
}
