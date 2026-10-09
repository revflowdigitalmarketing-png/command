/* Command · Claude features: Sort notes, Plan my day, Ask. */
/* ================= AI ================= */
function sampleErr(e) {
  switch (e && e.code) {
    case 'cancelled': return '';
    case 'not_granted': case 'sampling_disabled': case 'not_declared': case 'capability_disabled': case 'capability_removed':
      return 'Sorting is off for this page. Reload and allow Claude when asked.';
    case 'rate_limited': return 'Usage limit reached for now. Try again later.';
    case 'session_expired': return 'Sign in to claude.ai again, then retry.';
    case 'invalid_json': return 'That did not come back right. Try again.';
    case 'prompt_too_large': return 'That is too much text at once. Split it into two dumps.';
    case 'refused': return 'That text could not be processed. Try wording it differently.';
    default: return 'Could not reach Claude just now. Try again.';
  }
}
function clientsForAI() { return clients().map(c => ({ id: c.id, name: c.name, short: c.short || '', rating: starsOf(c) + '/5 (higher = more important)', note: c.note || '' })); }
function nowStamp() { const d = new Date(); return `${today()} (${d.toLocaleDateString('en-IN',{weekday:'long'})}) ${pad(d.getHours())}:${pad(d.getMinutes())}, timezone ${TZ}`; }

async function organise() {
  const text = $('#dump').value.trim();
  if (!text) { toast('Type or dictate something first.'); $('#dump').focus(); return; }
  const sample = await useCap('sample');
  if (!sample) { quickTask(); toast('Sorting works when Command is opened from claude.ai. Saved it as one task.'); return; }
  const card = $('#dump-card'); card.classList.add('busy');
  const btn = $('#organise'); btn.disabled = true; $('#dump-state').textContent = 'Sorting…';
  const prompt = `You organise raw notes for Rahul, a 17-year-old who runs a marketing agency in India. Now: ${nowStamp()}.
His clients (use the id): ${JSON.stringify(clientsForAI())}

Split the notes below into separate items. Kinds:
- "task": work Rahul must do.
- "meeting": a meeting or call at a date (and time if given).
- "promise": Rahul gave his word to someone ("I told X I'd..."). Put who in "person".
- "payment": money a client owes Rahul or paid. "amount" in INR as a number (25k = 25000, 1.5L = 150000).
- "note": useful info with no action.
- "glitch": a bug or glitch in the LARPING app that needs fixing.
- "reel": an Instagram reel to plan or post (due = posting date).
Rules: match clients by name or nickname and set "client" to the id, else "". Resolve relative dates from today ("tomorrow", "Friday" = the coming Friday, "next week" = next Monday, "EOD" = today). Use "" if there is no date. "time" is 24h HH:MM or "". "duration" in minutes (meetings default 60). "priority": "high" if urgent, overdue-sounding, for a 5-star client, or a promise due within 2 days; "low" if minor; else "med". Titles: short, clear, start with a verb for tasks (max 70 chars). Keep details in "notes". Don't invent anything that isn't in the notes.
Also write "summary": one short, friendly line (max 20 words) about what you found.

Return JSON only, exactly this shape:
{"summary":"...","items":[{"kind":"task","title":"...","client":"","person":"","due":"","time":"","duration":60,"priority":"med","amount":0,"notes":""}]}

NOTES:
"""
${text}
"""`;
  try {
    const out = await sample.json(prompt, { modelTier: 'default', cache: false });
    const items = (out && Array.isArray(out.items) ? out.items : []).filter(x => x && x.title).map(x => {
      const it = makeItem(x);
      if (!['task','meeting','promise','payment','note','glitch','reel'].includes(x.kind)) it.kind = 'task';
      if (it.kind === 'glitch' || it.kind === 'reel') { it.biz = productBiz(); it.client = ''; it.stage = it.kind === 'glitch' ? 'todo' : 'idea'; }
      if (it.client && !clientById(it.client)) it.client = '';
      it._cal = it.kind === 'meeting' || ((it.kind === 'promise' || it.kind === 'payment' || it.priority === 'high' || it.time) && !!it.due);
      return it;
    });
    if (!items.length) { toast('I could not find anything to add in that.'); }
    else { S.review = { summary: out.summary || '', items }; renderReview(); }
  } catch (e) { toast(sampleErr(e)); }
  finally { card.classList.remove('busy'); btn.disabled = false; $('#dump-state').textContent = ''; }
}
function renderReview() {
  const box = $('#review');
  if (!S.review) { box.hidden = true; box.innerHTML = ''; return; }
  const copts = sel => `<option value="">No client</option>` + clients().map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.short || c.name)}</option>`).join('');
  box.hidden = false;
  box.innerHTML = `<div class="review-sum"><b>${S.review.items.length} item${S.review.items.length > 1 ? 's' : ''}.</b> ${esc(S.review.summary)}</div>` +
    S.review.items.map((it, i) => `<div class="rv" data-rv="${i}">
      <input type="checkbox" id="rv-on-${i}" checked aria-label="Include">
      <div class="fields">
        <input class="in title" id="rv-title-${i}" value="${esc(it.title)}" aria-label="Title">
        <div class="row">
          <select class="in" id="rv-kind-${i}" aria-label="Type">${Object.entries(KIND_LABEL).map(([k,v]) => `<option value="${k}" ${k === it.kind ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <select class="in" id="rv-client-${i}" aria-label="Client">${copts(it.client)}</select>
          <input class="in" type="date" id="rv-due-${i}" value="${it.due}" aria-label="Date">
          <input class="in" type="time" id="rv-time-${i}" value="${it.time}" aria-label="Time">
          <select class="in" id="rv-prio-${i}" aria-label="Priority"><option value="high" ${it.priority==='high'?'selected':''}>High</option><option value="med" ${it.priority==='med'?'selected':''}>Medium</option><option value="low" ${it.priority==='low'?'selected':''}>Low</option></select>
          ${it.person ? `<span class="chip">For ${esc(it.person)}</span>` : ''}
          ${it.amount ? `<span class="chip mono">${inr(it.amount)}</span>` : ''}
          <label class="tog"><input type="checkbox" id="rv-cal-${i}" ${it._cal ? 'checked' : ''}>Add to Calendar</label>
        </div>
        ${it.notes ? `<div class="faint" style="font-size:12.5px">${esc(it.notes)}</div>` : ''}
      </div></div>`).join('') +
    `<div class="dump-actions"><button class="btn primary" id="rv-add">Add selected</button><button class="btn" id="rv-cancel">Discard</button></div>`;
}
async function addReviewed() {
  const btn = $('#rv-add'); btn.disabled = true; btn.textContent = 'Adding…';
  let n = 0, cal = 0, calFail = 0;
  for (const [i, it] of S.review.items.entries()) {
    if (!$('#rv-on-' + i).checked) continue;
    it.title = $('#rv-title-' + i).value.trim() || it.title;
    it.kind = $('#rv-kind-' + i).value; it.client = $('#rv-client-' + i).value;
    it.due = $('#rv-due-' + i).value; it.time = $('#rv-time-' + i).value;
    it.priority = $('#rv-prio-' + i).value;
    const wantCal = $('#rv-cal-' + i).checked; delete it._cal;
    await saveItem(it); n++;
    if (wantCal && it.due) { (await pushToCalendar(it, true)) ? cal++ : calFail++; }
  }
  S.review = null; renderReview(); $('#dump').value = ''; autoGrow($('#dump')); lsSet('cmd.draft', '');
  toast(`Added ${n} item${n === 1 ? '' : 's'}${cal ? `, ${cal} on Google Calendar` : ''}${calFail ? `. ${calFail} could not reach Calendar` : ''}.`);
}
function quickTask() {
  const text = $('#dump').value.trim();
  if (!text) { toast('Type something first.'); return; }
  const first = text.split('\n')[0].slice(0, 90);
  saveItem(makeItem({ title: first, notes: text.length > first.length ? text : '' }));
  $('#dump').value = ''; lsSet('cmd.draft', '');
  toast('Saved to Focus.');
}

/* ---- plan my day ---- */
async function planDay() {
  const sample = await useCap('sample');
  if (!sample) { toast('This works when Command is opened from claude.ai.'); return; }
  const btn = $('#plan-btn'); btn.disabled = true; btn.lastChild.textContent = 'Planning…';
  $('#dump-card').classList.add('busy');
  const t = today(), tm = addDays(t, 1);
  const meetings = S.events.filter(e => e.day === t || e.day === tm).map(e => ({ day: e.day, time: e.time || 'all day', end: e.endTime, title: e.title }));
  const tasks = sortItems(openItems().filter(i => i.kind !== 'note' && i.kind !== 'payment' && (!i.due || dayDiff(i.due) <= 3))).slice(0, 40)
    .map(i => ({ id: i.id, title: i.title, kind: i.kind, client: clientById(i.client)?.name || '', clientStars: clientById(i.client) ? starsOf(clientById(i.client)) : '', priority: i.priority, due: i.due || 'none', time: i.time || '' }));
  const st = S.settings;
  const prompt = `You are Command, Rahul's planning assistant. He's 17 and runs a marketing agency. Now: ${nowStamp()}.
Work day: ${st.dayStart}–${st.dayEnd}. His sharpest hours: ${st.peakStart}–${st.peakEnd}. Put the hardest, highest-priority client work there.
Fixed calendar events (never move them): ${JSON.stringify(meetings)}
Open tasks and promises: ${JSON.stringify(tasks)}
Plan the rest of TODAY starting at the next quarter hour from now. If the work day is already over, plan TOMORROW instead and say so in "tip". Overdue promises come first. Add short breaks. Don't overbook: anything that doesn't fit goes in "later". Block lengths should be realistic (30–120 min).
Return JSON only: {"for":"today|tomorrow","blocks":[{"start":"HH:MM","end":"HH:MM","title":"...","type":"focus|meeting|admin|break","itemId":""}],"later":["title"],"tip":"one direct sentence, like a sharp friend"}`;
  try {
    const out = await sample.json(prompt, { modelTier: 'default', cache: false });
    S.plan = { ...out, blocks: (out.blocks || []).filter(b => validTime(b.start) && validTime(b.end)), date: out.for === 'tomorrow' ? tm : t, made: Date.now(), blocked: false };
    lsSet('cmd.plan', S.plan); renderPlan();
  } catch (e) { toast(sampleErr(e)); }
  finally { btn.disabled = false; btn.lastChild.textContent = 'Plan'; $('#dump-card').classList.remove('busy'); }
}
function renderPlan() {
  const p = S.plan, box = $('#plan');
  if (!p || !p.blocks || (p.date !== today() && p.date !== addDays(today(), 1)) || (p.date !== today() && p.for !== 'tomorrow')) { box.innerHTML = ''; $('#plan-intro').hidden = false; return; }
  $('#plan-intro').hidden = true;
  box.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    ${p.tip ? `<div class="tip">${esc(p.tip)}</div>` : ''}
    <div class="faint" style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">${p.date === today() ? 'Today' : 'Tomorrow'}</div>
    <div class="plan-blocks">${p.blocks.map(b => `<div class="pb ${esc(b.type)}"><span class="mono">${fmtTime(b.start)} – ${fmtTime(b.end)}</span><b>${esc(b.title)}</b></div>`).join('')}</div>
    ${p.later && p.later.length ? `<div class="muted" style="font-size:13px"><b style="color:var(--ink)">Later:</b> ${p.later.map(esc).join(', ')}</div>` : ''}
    <div style="display:flex;gap:10px;flex-wrap:wrap">${p.blocked ? '<span class="faint" style="font-size:12.5px">Added to your calendar</span>' : '<button class="btn small" id="plan-block">Add focus blocks to Calendar</button>'}</div>
  </div>`;
}
async function blockPlan() {
  const mcp = await useCap('mcp');
  if (!mcp) { toast('Google Calendar works when Command is opened from claude.ai.'); return; }
  const btn = $('#plan-block'); if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
  let ok = 0;
  for (const b of S.plan.blocks.filter(b => b.type === 'focus' || b.type === 'admin')) {
    try {
      await mcp.callTool('Google Calendar', 'create_event', { summary: 'Focus: ' + b.title, startTime: isoAt(S.plan.date, b.start), endTime: isoAt(S.plan.date, b.end), timeZone: TZ, availability: 'AVAILABILITY_BUSY', description: 'Planned by Command', overrideReminders: [{ method:'popup', minutes:5 }] });
      ok++;
    } catch (e) { toast(calErr(e)); break; }
  }
  if (ok) { S.plan.blocked = true; lsSet('cmd.plan', S.plan); toast(`${ok} focus block${ok > 1 ? 's' : ''} added to Google Calendar.`); loadCalendar(true); }
  renderPlan();
}

/* ---- ask ---- */
function buildContext() {
  const t = today();
  const slim = i => ({ kind: i.kind, title: i.title, client: clientById(i.client)?.name || '', person: i.person || undefined, due: i.due || undefined, time: i.time || undefined, priority: i.priority, amount: i.amount || undefined, notes: i.notes ? i.notes.slice(0, 200) : undefined });
  const recentDone = S.items.filter(i => i.status === 'done' && i.doneAt && Date.now() - i.doneAt < 14 * 864e5).map(slim);
  return `You are Command, Rahul's personal assistant inside his own app. Rahul is 17 and runs a marketing agency in India. Talk like a sharp, warm friend: brief and direct. Use ₹ with Indian grouping. Use short bullet lists ("- ") when listing things and **bold** for key items. No headings. Only use the data below; if something isn't there, say so.
Now: ${nowStamp()}
Settings: work day ${S.settings.dayStart}-${S.settings.dayEnd}, sharpest hours ${S.settings.peakStart}-${S.settings.peakEnd}
Clients (importance out of 5 stars): ${JSON.stringify(clients().map(c => ({ name: c.name, stars: starsOf(c), retainerPerMonth: c.retainer || 0, revenueReceived: clientRevenue(c.id), contractSigned: c.signed || '', note: c.note || '' })))}
Open items (overdue if due < ${t}): ${JSON.stringify(openItems().map(slim))}
Done in last 14 days: ${JSON.stringify(recentDone)}
Calendar next 7 days: ${JSON.stringify(S.events.map(e => ({ day: e.day, time: e.time || 'all day', title: e.title })))}
Savings goals (Revolut pockets): ${JSON.stringify((S.settings.goals || []).map(g => ({ name: g.name, target: g.target, saved: g.saved, date: g.date })))}`;
}
function md(s) {
  const lines = esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split('\n');
  let out = '', inList = false;
  for (const l of lines) {
    const m = l.match(/^\s*[-•*]\s+(.*)/);
    if (m) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${m[1]}</li>`; }
    else { if (inList) { out += '</ul>'; inList = false; } out += l.trim() ? `<p>${l}</p>` : ''; }
  }
  return out + (inList ? '</ul>' : '');
}
function renderChat() {
  $('#v-ask').classList.toggle('chatting', S.chat.length > 0);
  $('#chat').innerHTML = S.chat.length ? S.chat.map(m => m.role === 'user' ? `<div class="msg me">${esc(m.content)}</div>` :
    `<div class="msg ai ${m.error ? 'err' : ''}">${m.content ? md(m.content) : '<span class="faint">…</span>'}</div>`).join('') :
    '';
  const last = $('#chat').lastElementChild; if (last && S.chat.length) last.scrollIntoView({ block:'nearest' });
}
let askCtl = null;
async function ask(q) {
  q = (q || '').trim(); if (!q) return;
  const sample = await useCap('sample');
  if (!sample) { toast('This works when Command is opened from claude.ai.'); return; }
  S.chat.push({ role:'user', content:q });
  const reply = { role:'assistant', content:'', pending:true }; S.chat.push(reply); renderChat();
  const turns = [];
  const ctx = buildContext();
  S.chat.filter(m => !m.pending && !m.error).forEach((m, i) => turns.push({ role: m.role, content: i === 0 ? `${ctx}\n\nRahul asks: ${m.content}` : m.content }));
  askCtl = new AbortController();
  try {
    const r = await sample(turns, { cache:false, signal: askCtl.signal, onText: ({ text }) => { reply.content = text; renderChat(); } });
    reply.content = r.text;
  } catch (e) {
    if (e && e.code === 'cancelled') { S.chat.splice(S.chat.indexOf(reply), 1); }
    else { reply.error = true; reply.content = (e && e.text ? e.text + '\n\n' : '') + sampleErr(e); }
  }
  reply.pending = false; renderChat();
}
