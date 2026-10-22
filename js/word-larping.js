/* Command · LARPING workspace (glitches, reels), business sheet, My Word (promises). */
/* ---- my word ---- */
function stageChip(it) {
  const st = it.kind === 'glitch' ? GLITCH_STAGES : REEL_STAGES;
  const cur = st.find(x => x[0] === it.stage) || st[0];
  return `<button type="button" class="stage ${cur[0] === 'fixed' || cur[0] === 'posted' ? 'fin' : ''}" data-stage="${it.id}" title="Tap to move to the next step">${cur[1]}</button>`;
}
function glitchRow(it) {
  const fmt = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const sev = { high: 'Breaks the app', med: 'Annoying', low: 'Minor' }[it.priority] || 'Annoying';
  return `<div class="task ${it.stage === 'fixed' ? 'done' : ''}">
    <button class="check" data-toggle="${it.id}" aria-label="${it.stage === 'fixed' ? 'Mark not fixed' : 'Mark fixed'}"><svg><use href="#i-check"/></svg></button>
    <button class="body" data-edit="${it.id}"><span class="ttl">${esc(it.title)}</span>
      <span class="sub"><span>${sev}</span><span>Found ${fmt(it.created)}</span>${it.stage === 'fixed' && it.doneAt ? `<span>Fixed ${fmt(it.doneAt)}</span>` : ''}</span></button>
    ${stageChip(it)}
  </div>`;
}
function renderLarp(b) {
  $('#clients-crumb').innerHTML = `<button class="link" data-back="all">Businesses</button> / <b>${esc(b.name)}</b>`;
  const ct = $('#clients-title'); if (ct) ct.textContent = b.name;
  setTopBtn('Plan a reel', 'new-reel');

  const larpTasks = S.items.filter(i => (i.biz === b.id || (!i.biz && i.category === 'LARPING')) && i.kind !== 'reel' && i.kind !== 'note' && i.kind !== 'payment');
  const openTasks = sortItems(larpTasks.filter(i => i.status !== 'done'));
  const doneTasks = larpTasks.filter(i => i.status === 'done').sort((x, y) => (y.doneAt || 0) - (x.doneAt || 0));
  const allTasks = [...openTasks, ...doneTasks];

  const wk = weekDays(S.rweek || 0), wk0 = weekDays(0);
  const reelsNow = S.items.filter(i => i.kind === 'reel' && i.biz === b.id && wk0.includes(i.due));
  $('#larp-head').innerHTML = `<button class="back-btn" type="button" data-back="all"><svg><use href="#i-back"/></svg>All businesses</button>
    <div class="glass detail-head">
      <div class="muted" style="font-size:13.5px;max-width:60ch">${esc(b.tagline || 'App idea in progress')}. Tasks on the left, scheduled reels on the right.</div>
      <div class="kv">
        <div><small>Open tasks</small><b>${openTasks.length}</b></div>
        <div><small>Completed</small><b>${doneTasks.length}</b></div>
        <div><small>Total tasks</small><b>${larpTasks.length}</b></div>
        <div><small>Reels posted this week</small><b>${reelsNow.filter(i => i.stage === 'posted').length} / ${reelsNow.length}</b></div>
      </div>
    </div>`;

  const countEl = $('#larp-task-count') || $('#glitch-count');
  if (countEl) countEl.textContent = larpTasks.length ? `${openTasks.length} open` : '';

  const listEl = $('#larp-task-list') || $('#glitch-list');
  if (listEl) {
    listEl.innerHTML = allTasks.length
      ? allTasks.map(i => taskRow(i, { showClient: false })).join('')
      : `<div class="empty">No tasks logged for ${esc(b.name)} yet. Add what you need to build or handle above.</div>`;
  }

  const f = d => parseYmd(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  $('#rweek-label').textContent = `${f(wk[0])} – ${f(wk[6])}`;
  const t = today();
  $('#reel-week').innerHTML = wk.map(d => {
    const dt = parseYmd(d);
    const reels = S.items.filter(i => i.kind === 'reel' && i.biz === b.id && i.due === d);
    return `<div class="rday ${d === t ? 'today' : ''} ${d < t ? 'past' : ''}">
      <div class="rday-l"><small>${dt.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</small><b>${dt.getDate()}</b></div>
      <div class="rday-c">${reels.map(r => `<div class="reel ${r.stage === 'posted' ? 'done' : ''}"><button class="body" data-reel="${r.id}"><span class="ttl">${esc(r.title)}</span>${r.time || r.link ? `<span class="sub">${r.time ? `<span>${fmtTime(r.time)}</span>` : ''}${r.link ? '<span>Link added</span>' : ''}</span>` : ''}</button>${stageChip(r)}</div>`).join('')}
        ${reels.length ? '' : `<button type="button" class="rday-add" data-newreel="${d}"><svg><use href="#i-plus"/></svg>Plan a reel</button>`}</div>
    </div>`;
  }).join('');
}
function editReel(id, date) {
  const b = productBiz();
  const r = id ? S.items.find(x => x.id === id) : makeItem({ kind: 'reel', biz: b, due: date || today(), priority: 'med' });
  if (!r) return;
  const tasks = S.items.filter(i => (i.biz === b || (!i.biz && i.category === 'LARPING')) && i.kind !== 'reel' && i.kind !== 'note' && i.kind !== 'payment');
  openSheet(`<h2>${id ? 'Edit reel' : 'Plan a reel'}</h2>
    <div class="field"><label for="r-title">Reel idea</label><input class="in" id="r-title" value="${esc(r.title)}" placeholder="e.g. We shipped the new video exporter in 1 day"></div>
    <div class="frow">
      <div class="field"><label for="r-date">Post on</label><input class="in" type="date" id="r-date" value="${r.due}"></div>
      <div class="field"><label for="r-time">Time</label><input class="in" type="time" id="r-time" value="${r.time}"></div>
      <div class="field"><label for="r-stage">Step</label><select class="in" id="r-stage">${REEL_STAGES.map(([k, v]) => `<option value="${k}" ${k === r.stage ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    ${tasks.length ? `<div class="field"><label for="r-task">About which task (optional)</label><select class="in" id="r-task"><option value="">None</option>${tasks.map(g => `<option value="${g.id}" ${g.id === r.person ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="r-notes">Hook / caption</label><textarea class="in" id="r-notes" placeholder="First line that stops the scroll">${esc(r.notes)}</textarea></div>
    <div class="field"><label for="r-link">Instagram link (after posting)</label><input class="in" id="r-link" value="${esc(r.link)}" placeholder="https://instagram.com/reel/…"></div>
    <div class="sheet-actions">${id ? `<button class="btn danger left" id="r-del">Delete</button>` : ''}${r.cal ? '' : `<button class="btn" id="r-cal">Save + Calendar</button>`}<button class="btn" id="r-cancel">Cancel</button><button class="btn primary" id="r-save">Save</button></div>`, sh => {
    const collect = () => {
      r.title = $('#r-title').value.trim(); r.due = $('#r-date').value; r.time = $('#r-time').value; r.stage = $('#r-stage').value;
      const tEl = $('#r-task') || $('#r-glitch');
      r.person = tEl ? tEl.value : ''; r.notes = $('#r-notes').value; r.link = $('#r-link').value.trim();
      r.status = r.stage === 'posted' ? 'done' : 'open'; r.doneAt = r.stage === 'posted' ? (r.doneAt || Date.now()) : null;
      return !!r.title;
    };
    sh.querySelector('#r-cancel').onclick = closeSheet;
    sh.querySelector('#r-save').onclick = async () => { if (!collect()) { toast('Write the reel idea first.'); return; } closeSheet(); await saveItem(r); toast('Reel saved.'); };
    const cb = sh.querySelector('#r-cal');
    if (cb) cb.onclick = async () => { if (!collect()) { toast('Write the reel idea first.'); return; } if (!r.due) { toast('Pick a posting date.'); return; } closeSheet(); await saveItem(r); await pushToCalendar(r); loadCalendar(true); };
    const del = sh.querySelector('#r-del');
    if (del) del.onclick = () => {
      const curPid = (S && S.profileId) || 'rahul';
      const coOwners = [];
      if (r.person) {
        const targetPid = profileIdForPerson(r.person);
        if (targetPid && targetPid !== curPid && !coOwners.includes(targetPid)) coOwners.push(targetPid);
      }
      if (r.client) {
        const clOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(r.client, curPid) : [];
        clOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
      }
      if (r.biz) {
        const bizOwners = typeof getCoOwnersForBusiness === 'function' ? getCoOwnersForBusiness(r.biz, curPid) : [];
        bizOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
      }
      if (coOwners.length > 0) {
        closeSheet();
        alertCoOwnerDeletion(r.title, coOwners, 'reel', r.id);
        return;
      }
      if (del.dataset.sure) { closeSheet(); removeItem(r.id); }
      else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; }
    };
  });
}

function promiseRow(it) {
  const c = clientById(it.client);
  const d = dueLabel(it.due);
  const hasDue = validDate(it.due);
  const dueTxt = hasDue ? `${parseYmd(it.due).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${it.time ? ', ' + fmtTime(it.time) : ''}` : '';
  const madeDate = it.created ? new Date(it.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  const isDaily = typeof isPromiseDaily === 'function' && isPromiseDaily(it);
  const isDone = isDaily ? (typeof isPromiseDoneToday === 'function' && isPromiseDoneToday(it)) : (it.status === 'done');
  const kept = isDone && it.doneAt ? new Date(it.doneAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + new Date(it.doneAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

  const targetPerson = (it.person === 'Yourself' || it.person === 'yourself') ? 'Myself' : it.person;
  const recipient = (it.fromProfileId && it.fromProfileId !== (S.profileId || 'rahul'))
    ? `<span>From <b>${esc(profileName(it.fromProfileId))}</b></span>`
    : (targetPerson ? `<span>To <b>${esc(targetPerson)}</b></span>` : '');

  const rowBits = [];
  if (!isDaily) {
    if (recipient) rowBits.push(recipient);
    if (madeDate) rowBits.push(`<span class="faint">Promised on ${esc(madeDate)}</span>`);
    if (c) rowBits.push(`<span>${esc(c.short || c.name)}</span>`);
  }

  const streakHtml = typeof promiseStreakBadge === 'function' ? promiseStreakBadge(it) : '';

  return `<div class="task ${isDone ? 'done' : ''} ${isDaily ? 'task-daily' : ''}" data-id="${it.id}" data-daily="${isDaily ? '1' : '0'}">
    <button class="check" data-toggle="${it.id}" aria-label="${isDone ? 'Mark not kept' : 'Mark kept'}"><svg><use href="#i-check"/></svg></button>
    <button class="body" data-edit="${it.id}">
      <span class="ttl ${isDaily ? 'daily-ttl' : ''}" style="${isDaily ? 'text-decoration:none !important;color:#FFFFFF !important;' : ''}">${esc(it.title)}${streakHtml}</span>
      ${rowBits.length ? `<span class="when">${rowBits.join('')}</span>` : ''}
      ${!isDaily && hasDue ? `<span class="when"><span>Due <b>${esc(dueTxt)}</b></span>${it.status !== 'done' && d.text && d.text !== 'Today' ? `<span class="${d.cls === 'od' ? 'od' : 'faint'}" style="${d.cls === 'od' ? 'color:var(--ink);font-weight:600' : ''}">${esc(d.text)}</span>` : ''}</span>` : ''}
      ${!isDaily && kept ? `<span class="when faint"><span>Kept ${esc(kept)}</span></span>` : ''}
    </button>
    <button class="more" data-edit="${it.id}" aria-label="Edit"><svg><use href="#i-dots"/></svg></button>
  </div>`;
}
const PC = { month: (() => { const d = new Date(); const left = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(); if (left < 5) d.setMonth(d.getMonth() + 1, 1); return ymd(d).slice(0, 7); })(), date: '', time: '', h24: false };
function renderComposer() {
  const sel = $('#pc-client');
  if (sel && document.activeElement !== sel) {
    const v = sel.value;
    sel.innerHTML = `<option value="">Client</option>` + clients().map(c => `<option value="${c.id}" ${c.id === v ? 'selected' : ''}>${esc(c.short || c.name)}</option>`).join('');
    sel.value = v;
  }
  const whoSel = $('#pc-who');
  if (whoSel && document.activeElement !== whoSel) {
    const curVal = (whoSel.value === 'Yourself') ? 'Myself' : whoSel.value;
    const myPid = S.profileId || 'rahul';
    const teammates = [
      { id: 'sri-chandana', val: 'Chandana' },
      { id: 'rahul', val: 'Rahul' },
      { id: 'adithya', val: 'Adithya' }
    ].filter(t => t.id !== myPid);
    teammates.push({ id: 'myself', val: 'Myself' });
    whoSel.innerHTML = `<option value="">To whom</option>` +
      teammates.map(t => `<option value="${t.val}" ${curVal === t.val ? 'selected' : ''}>${t.val}</option>`).join('');
  }
  const [y, m] = PC.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  $('#sch-month').textContent = first.toLocaleDateString('en-IN', { month: 'long' });
  $('#sch-year').textContent = y;
  const t = today();
  let g = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => `<div class="sch-dow">${d}</div>`).join('');
  for (let i = 0; i < first.getDay(); i++) g += '<span class="sch-d blank"></span>';
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`;
    g += `<button type="button" class="sch-d ${ds < t ? 'past' : ''} ${ds === t ? 'today' : ''}" data-pcdate="${ds}" aria-pressed="${ds === PC.date}">${d}</button>`;
  }
  $('#sch-grid').innerHTML = g;
  const dd = PC.date ? parseYmd(PC.date) : null;
  const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  $('#sch-day').innerHTML = dd ? `<b>${dd.toLocaleDateString('en-IN', { weekday: 'short' })}</b>${ord(dd.getDate())}` : 'Pick a date';
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
    <div class="ln"><svg><use href="#i-cal"/></svg>${PC.date ? esc(parseYmd(PC.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })) : 'No date yet'}</div>
    <div class="ln"><svg><use href="#i-clock"/></svg>${PC.time ? (PC.h24 ? PC.time : fmtTime(PC.time)) : 'Any time'}</div>
    ${c ? `<div class="ln"><svg><use href="#i-users"/></svg>${esc(c.short || c.name)}</div>` : ''}
    <div class="ln"><svg><use href="#i-globe"/></svg>${esc(TZ)}</div>`;
}
async function savePromise() {
  const title = $('#pc-what').value.trim();
  if (!title) { toast('Write what you promised first.'); $('#pc-what').focus(); return; }
  const who = $('#pc-who').value.trim();
  const isDailyCheckbox = $('#pc-daily') && $('#pc-daily').checked;
  const isDaily = isDailyCheckbox || /\b(everyday|evryday|every\s+day|daily)\b/i.test(title);
  const it = makeItem({
    kind: 'promise',
    title,
    person: who || (isDaily ? 'Myself' : ''),
    client: $('#pc-client').value,
    due: isDaily ? (PC.date || today()) : PC.date,
    time: PC.time,
    priority: 'high',
    fromProfileId: S.profileId || 'rahul',
    isDaily: isDaily,
    completedDates: [],
    streak: 0
  });
  $('#pc-state').textContent = 'Saving…';
  await saveItem(it);
  const targetPid = profileIdForPerson(who);
  if (targetPid && targetPid !== S.profileId) {
    // Queue notification for recipient (triggered when recipient receives it)
    const pending = lsGet('cmd.pending_chat_notifications', []) || [];
    pending.push({
      id: it.id,
      from: S.profileId || 'rahul',
      to: targetPid,
      text: it.title,
      isPromise: true,
      time: Date.now()
    });
    lsSet('cmd.pending_chat_notifications', pending);
    if (typeof pushAllToServer === 'function') pushAllToServer();
  }
  let cal = false;
  if ($('#pc-cal').checked && it.due) cal = await pushToCalendar(it, true);
  $('#pc-what').value = ''; $('#pc-who').value = ''; PC.date = ''; PC.time = ''; $('#pc-state').textContent = '';
  if ($('#pc-daily')) $('#pc-daily').checked = false;
  renderComposer();
  updateInboxPip();
  toast(isDaily ? `Daily promise created! Keep the streak going 🔥` : `Promise saved${cal ? ' and added to Google Calendar' : it.due ? '' : '. Add a date so it can remind you'}.`);
}

function focusTaskRow(it) {
  const c = clientById(it.client);
  return `<div class="task ${it.status === 'done' ? 'done' : ''}" data-id="${it.id}">
    <button class="check" data-toggle="${it.id}" aria-label="${it.status === 'done' ? 'Mark not done' : 'Mark done'}"><svg><use href="#i-check"/></svg></button>
    <button class="body" data-editfocustask="${it.id}">
      <span class="ttl" style="font-weight:400">${esc(it.title)}</span>
      ${c ? `<span class="when" style="font-weight:400;color:var(--muted)"><span>${esc(c.short || c.name)}</span></span>` : ''}
    </button>
    <button class="more" data-editfocustask="${it.id}" aria-label="Edit"><svg><use href="#i-dots"/></svg></button>
  </div>`;
}

function renderWordFocusList() {
  const focusList = $('#word-focus-list');
  if (!focusList) return;

  const focusItems = S.items.filter(i => (i.isFocus || i.kind === 'task') && i.kind !== 'promise' && i.kind !== 'glitch' && i.kind !== 'reel' && i.kind !== 'payment' && i.kind !== 'note');
  if (!focusItems.length) {
    focusList.innerHTML = `<div class="empty">No focus tasks yet. Tap "Manage tasks" to prioritize what to work on today.</div>`;
    return;
  }

  const allBiz = businesses();
  const groups = [];

  // 1. Group by active profile businesses
  allBiz.forEach(b => {
    const bTasks = focusItems.filter(i => taskBiz(i) === b.id);
    if (bTasks.length) {
      const open = sortItems(bTasks.filter(i => i.status !== 'done'));
      const done = bTasks.filter(i => i.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
      groups.push({
        id: b.id,
        name: b.name,
        items: [...open, ...done]
      });
    }
  });

  // 2. Unassigned or general tasks
  const otherTasks = focusItems.filter(i => {
    const bId = taskBiz(i);
    return !bId || !allBiz.some(b => b.id === bId);
  });
  if (otherTasks.length) {
    const open = sortItems(otherTasks.filter(i => i.status !== 'done'));
    const done = otherTasks.filter(i => i.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    groups.push({
      id: 'general',
      name: 'General Tasks',
      items: [...open, ...done]
    });
  }

  focusList.innerHTML = groups.map((g, idx) => {
    return `
      <div class="focus-biz-group" data-biz-group="${esc(g.id)}" style="${idx > 0 ? 'margin-top:14px;' : ''}">
        <div class="focus-biz-header" style="margin-bottom:4px">
          <span class="focus-biz-title" style="font-size:12px;font-weight:400;color:var(--muted);letter-spacing:0.04em;text-transform:uppercase">${esc(g.name)}</span>
        </div>
        <div class="list focus-biz-tasks">
          ${g.items.map(focusTaskRow).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderWord() {
  if (typeof syncDailyPromises === 'function') syncDailyPromises();
  renderComposer();
  renderWordFocusList();

  const ps = S.items.filter(i => i.kind === 'promise');
  const open = sortItems(ps.filter(i => typeof isPromiseDoneToday === 'function' ? !isPromiseDoneToday(i) : i.status !== 'done'));
  $('#word-list').innerHTML = open.length ? open.map(promiseRow).join('') : `<div class="empty">No open promises. When you tell someone "I'll do it", add it here.</div>`;
  const done = ps.filter(i => typeof isPromiseDoneToday === 'function' ? isPromiseDoneToday(i) : i.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 20);
  $('#word-done').innerHTML = done.length ? done.map(promiseRow).join('') : `<div class="empty">Kept promises show up here.</div>`;
  updateInboxPip();
}

