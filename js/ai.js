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
function clientsForAI() { return clients().map(c => ({ id: c.id, name: c.name, short: c.short || '', rating: starsOf(c) + '/5 (higher = more important)' })); }
function nowStamp() { const d = new Date(); return `${today()} (${d.toLocaleDateString('en-IN',{weekday:'long'})}) ${pad(d.getHours())}:${pad(d.getMinutes())}, timezone ${TZ}`; }

function parseNotesLocally(rawText) {
  if (!rawText || !rawText.trim()) return { summary: '', items: [] };

  const lines = rawText
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z0-9\*\-•])/)
    .map(l => l.trim().replace(/^[-•*]\s+|\d+\.\s+/, ''))
    .filter(l => l.length > 0);

  const t = today();
  const allClients = clients();
  const parsedItems = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Kind detection
    let kind = 'task';
    if (/\b(meet|meeting|call|sync|zoom|google meet|catch up|coffee)\b/i.test(lower)) {
      kind = 'meeting';
    } else if (/\b(promise|promised|told|gave my word|committed|will send|will give|pledged)\b/i.test(lower)) {
      kind = 'promise';
    } else if (/\b(payment|paid|invoice|retainer|owes|wire|upi|transfer|received ₹|received rs)\b/i.test(lower)) {
      kind = 'payment';
    } else if (/\b(glitch|bug|error|crash|broken|flicker|not working|fix the|fix bug)\b/i.test(lower)) {
      kind = 'glitch';
    } else if (/\b(reel|instagram|tiktok|video post|b-roll|shoot reel|post reel)\b/i.test(lower)) {
      kind = 'reel';
    } else if (/^(note:|fyi|remember|idea:|info:)/i.test(lower)) {
      kind = 'note';
    }

    // Client & Business detection via smart matcher
    const matched = typeof matchClientAndBizFromText === 'function' ? matchClientAndBizFromText(line) : { client: null, biz: null };
    let clientId = matched.client ? matched.client.id : '';
    let bizId = matched.biz ? matched.biz.id : (matched.client ? clientBiz(matched.client) : '');
    if (kind === 'glitch' || kind === 'reel') {
      bizId = productBiz();
    }

    // Person detection
    let person = '';
    const personMatch = line.match(/\b(?:told|to|with|for|ask|from)\s+([A-Z][a-z]+)\b/);
    if (personMatch) {
      const candidate = personMatch[1];
      const ignore = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
                      'Today','Tomorrow','Tonight','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      if (!ignore.includes(candidate)) {
        person = candidate;
      }
    }

    // Date resolution
    let due = '';
    if (/\b(today|tonight|eod|end of day)\b/i.test(lower)) {
      due = t;
    } else if (/\b(tomorrow)\b/i.test(lower)) {
      due = addDays(t, 1);
    } else if (/\b(day after tomorrow)\b/i.test(lower)) {
      due = addDays(t, 2);
    } else if (/\b(yesterday)\b/i.test(lower)) {
      due = addDays(t, -1);
    } else {
      const daysOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dayName = daysOfWeek[dayIdx];
        const regex = new RegExp(`\\b(?:this|next|coming)?\\s*${dayName}\\b`, 'i');
        if (regex.test(lower)) {
          const currentDayIdx = parseYmd(t).getDay();
          let diff = (dayIdx - currentDayIdx + 7) % 7;
          if (diff === 0) diff = 7;
          due = addDays(t, diff);
          break;
        }
      }
      if (!due) {
        const isoMatch = line.match(/\b\d{4}-\d{2}-\d{2}\b/);
        if (isoMatch && validDate(isoMatch[0])) {
          due = isoMatch[0];
        } else {
          const textDateMatch = line.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i) ||
                                line.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
          if (textDateMatch) {
            const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
            const mStr = (months[textDateMatch[1].toLowerCase().slice(0,3)] !== undefined ? textDateMatch[1] : textDateMatch[2]).toLowerCase().slice(0,3);
            const dNum = parseInt(months[textDateMatch[1].toLowerCase().slice(0,3)] !== undefined ? textDateMatch[2] : textDateMatch[1], 10);
            const yr = parseYmd(t).getFullYear();
            const cand = new Date(yr, months[mStr], dNum);
            due = ymd(cand);
          }
        }
      }
    }

    // Time detection
    let time = '';
    const timeMatch = line.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || line.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      let m = parseInt(timeMatch[2] || '0', 10);
      const ampm = (timeMatch[3] || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        time = `${pad(h)}:${pad(m)}`;
      }
    } else {
      const h24Match = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (h24Match) time = `${pad(parseInt(h24Match[1],10))}:${pad(parseInt(h24Match[2],10))}`;
    }

    // Amount detection (INR)
    let amount = 0;
    const lMatch = line.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:l|lakh|lac)s?\b/i);
    const kMatch = line.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
    const rupeeMatch = line.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i);
    if (lMatch) {
      amount = Math.round(parseFloat(lMatch[1]) * 100000);
    } else if (kMatch) {
      amount = Math.round(parseFloat(kMatch[1]) * 1000);
    } else if (rupeeMatch) {
      amount = parseInt(rupeeMatch[1].replace(/,/g, ''), 10) || 0;
    }

    // Priority detection
    let priority = 'med';
    if (/\b(urgent|asap|crucial|immediately|priority high|emergency)\b/i.test(lower)) {
      priority = 'high';
    } else if (/\b(low priority|whenever|someday|no rush)\b/i.test(lower)) {
      priority = 'low';
    } else if (kind === 'promise' && due && dayDiff(due) <= 2) {
      priority = 'high';
    } else if (matchedClient && starsOf(matchedClient) === 5) {
      priority = 'high';
    }

    // Clean title
    let title = line
      .replace(/^(task|meeting|promise|payment|note|glitch|reel):\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (title.length > 70) title = title.slice(0, 67) + '…';
    if (!title) title = line.slice(0, 70);

    const it = makeItem({
      kind,
      title,
      client: clientId,
      biz: bizId,
      isFocus: kind === 'task',
      person,
      due: due || (kind === 'task' ? t : ''),
      time,
      priority,
      amount,
      notes: line !== title ? line : ''
    });

    if (it.kind === 'glitch' || it.kind === 'reel') {
      it.biz = productBiz();
      it.client = '';
      it.stage = it.kind === 'glitch' ? 'todo' : 'idea';
    }
    it._cal = it.kind === 'meeting' || ((it.kind === 'promise' || it.kind === 'payment' || it.priority === 'high' || it.time) && !!it.due);
    parsedItems.push(it);
  }

  const counts = {};
  for (const it of parsedItems) counts[it.kind] = (counts[it.kind] || 0) + 1;
  const summaryParts = Object.entries(counts).map(([k, n]) => `${n} ${KIND_LABEL[k] || k}${n > 1 ? 's' : ''}`);
  const summary = `Found ${parsedItems.length} item${parsedItems.length > 1 ? 's' : ''} (${summaryParts.join(', ')}).`;

  return { summary, items: parsedItems };
}

async function organise() {
  const text = $('#dump').value.trim();
  if (!text) { toast('Type or dictate something first.'); $('#dump').focus(); return; }
  const card = $('#dump-card'); card.classList.add('busy');
  const btn = $('#organise'); btn.disabled = true; $('#dump-state').textContent = 'Sorting…';

  const sample = await useCap('sample');
  if (sample) {
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
      if (items.length) {
        S.review = { summary: out.summary || '', items };
        renderReview();
        return;
      }
    } catch (e) {
      console.warn('AI sample error, falling back to local organizer:', e);
    } finally {
      card.classList.remove('busy'); btn.disabled = false; $('#dump-state').textContent = '';
    }
  }

  // Standalone smart local parser (works all the time without claude.ai)
  try {
    const out = parseNotesLocally(text);
    if (!out.items.length) {
      quickTask();
    } else if (out.items.length === 1 && out.items[0].kind === 'task') {
      // Single task: directly save to focus under its business
      const it = out.items[0];
      it.isFocus = true;
      if (!it.due) it.due = today();
      await saveItem(it);
      $('#dump').value = ''; if (typeof autoGrow === 'function') autoGrow($('#dump')); lsSet('cmd.draft', '');
      const b = bizById(taskBiz(it));
      toast(`Saved to Focus${b ? ' under ' + b.name : ''}.`);
    } else {
      S.review = out;
      renderReview();
    }
  } catch (err) {
    console.error(err);
    quickTask();
  } finally {
    card.classList.remove('busy'); btn.disabled = false; $('#dump-state').textContent = '';
  }
}
function renderReview() {
  const box = $('#review');
  if (!S.review) { box.hidden = true; box.innerHTML = ''; return; }
  const copts = sel => `<option value="">Client</option>` + clients().map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.short || c.name)}</option>`).join('');
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
    if (it.client) {
      const c = clientById(it.client);
      if (c && c.biz) it.biz = c.biz;
    }
    if (it.kind === 'task') {
      it.isFocus = true;
      if (!it.due) it.due = today();
    }
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
  const first = text.split('\n')[0].slice(0, 100);

  const matched = typeof matchClientAndBizFromText === 'function' ? matchClientAndBizFromText(text) : { client: null, biz: null };
  const clientObj = matched.client;
  const bizObj = matched.biz;

  const it = makeItem({
    kind: 'task',
    isFocus: true,
    due: today(),
    title: first,
    client: clientObj ? clientObj.id : '',
    biz: bizObj ? bizObj.id : (clientObj ? clientBiz(clientObj) : ''),
    notes: text.length > first.length ? text : ''
  });

  saveItem(it);
  $('#dump').value = ''; lsSet('cmd.draft', '');
  const b = bizById(taskBiz(it));
  toast(`Saved to Focus${b ? ' under ' + b.name : ''}.`);
}

/* ---- plan my day ---- */
async function planDay() {
  const btn = $('#plan-btn'); if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Planning…'; }
  const sample = await useCap('sample');
  if (!sample) { if (btn) { btn.disabled = false; btn.lastChild.textContent = 'Plan'; } return; }
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
  finally { if (btn) { btn.disabled = false; btn.lastChild.textContent = 'Plan'; } $('#dump-card').classList.remove('busy'); }
}
function renderPlan() {
  const p = S.plan, box = $('#plan');
  if (!box) return;
  if (!p || !p.blocks || (p.date !== today() && p.date !== addDays(today(), 1)) || (p.date !== today() && p.for !== 'tomorrow')) { box.innerHTML = ''; if ($('#plan-intro')) $('#plan-intro').hidden = false; return; }
  if ($('#plan-intro')) $('#plan-intro').hidden = true;
  box.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    ${p.tip ? `<div class="tip">${esc(p.tip)}</div>` : ''}
    <div class="faint" style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">${p.date === today() ? 'Today' : 'Tomorrow'}</div>
    <div class="plan-blocks">${p.blocks.map(b => `<div class="pb ${esc(b.type)}"><span class="mono">${fmtTime(b.start)} – ${fmtTime(b.end)}</span><b>${esc(b.title)}</b></div>`).join('')}</div>
    ${p.later && p.later.length ? `<div class="muted" style="font-size:13px"><b style="color:var(--ink)">Later:</b> ${p.later.map(esc).join(', ')}</div>` : ''}
    <div style="display:flex;gap:10px;flex-wrap:wrap">${p.blocked ? '<span class="faint" style="font-size:12.5px">Added to your calendar</span>' : '<button class="btn small" id="plan-block">Add focus blocks to Calendar</button>'}</div>
  </div>`;
}

function askLocally(q) {
  const query = (q || '').trim().toLowerCase();
  const t = today();
  const open = openItems();
  const clList = clients();
  const bizList = businesses();
  const dueToday = open.filter(i => i.due === t);
  const late = open.filter(isLate);
  const allPromises = open.filter(i => i.kind === 'promise');
  const totalRev = S.items.filter(i => i.kind === 'payment' && i.status === 'done').reduce((s, i) => s + (paymentShare(i) || 0), 0);
  const pendingRev = open.filter(i => i.kind === 'payment').reduce((s, i) => s + (paymentShare(i) || 0), 0);
  const retClients = clList.filter(c => Number(c.retainer) > 0 && !c.oneTime);
  const oneTimeClients = clList.filter(c => Number(c.oneTime) > 0);
  const totalRetainers = retClients.reduce((s, c) => s + (clientShare(c) || 0), 0);
  const totalOneTime = oneTimeClients.reduce((s, c) => s + (clientShare(c) || 0), 0);

  if (query.includes('today') || query.includes('doing') || query.includes('schedule') || query.includes('what to do') || query.includes('what\'s on')) {
    if (!dueToday.length && !late.length) {
      return `You have **nothing due today** and nothing overdue. Great time to get ahead on upcoming client work!`;
    }
    let res = `Here's what is on your plate today:\n`;
    if (late.length) res += `- **${late.length} overdue item${late.length > 1 ? 's' : ''}** needing attention\n`;
    dueToday.forEach(i => {
      const c = clientById(i.client);
      res += `- **${esc(i.title)}** (${KIND_LABEL[i.kind]}${c ? ' · ' + (c.short || c.name) : ''}${i.time ? ' · ' + fmtTime(i.time) : ''})\n`;
    });
    return res;
  }

  if (query.includes('overdue') || query.includes('late') || query.includes('behind')) {
    if (!late.length) return `**Nothing overdue!** All clear on deadlines.`;
    let res = `You have **${late.length} overdue item${late.length > 1 ? 's' : ''}**:\n`;
    late.forEach(i => {
      const c = clientById(i.client);
      res += `- **${esc(i.title)}** (due ${fmtDate(i.due)}${c ? ' · ' + (c.short || c.name) : ''})\n`;
    });
    return res;
  }

  if (query.includes('promise') || query.includes('word') || query.includes('vow') || query.includes('committed')) {
    if (!allPromises.length) return `No open promises right now. Add one when you give someone your word.`;
    let res = `You have **${allPromises.length} open promise${allPromises.length > 1 ? 's' : ''}**:\n`;
    allPromises.forEach(p => {
      res += `- **${esc(p.title)}** (for ${esc(p.person || 'client')}${p.due ? ', due ' + fmtDate(p.due) : ''})\n`;
    });
    return res;
  }

  if (query.includes('revenue') || query.includes('money') || query.includes('earn') || query.includes('payment') || query.includes('retainer') || query.includes('income')) {
    let res = `Here's your financial overview (your individual share):\n`;
    res += `- **Total received revenue (your share):** ${inr(totalRev)}\n`;
    res += `- **Monthly retainers (your share):** ${inr(totalRetainers)} / month across ${retClients.length} recurring client${retClients.length === 1 ? '' : 's'}\n`;
    if (oneTimeClients.length > 0) {
      res += `- **One-time projects (your share):** ${inr(totalOneTime)} across ${oneTimeClients.length} project${oneTimeClients.length === 1 ? '' : 's'}\n`;
    }
    if (pendingRev > 0) res += `- **Pending payments (your share):** ${inr(pendingRev)}\n`;
    return res;
  }

  if (query.includes('client') || query.includes('clients') || query.includes('who are my client')) {
    if (!clList.length) return `You don't have any clients added yet. Tap **New client** in Businesses to add one!`;
    let res = `You have **${clList.length} client${clList.length > 1 ? 's' : ''}**:\n`;
    clList.forEach(c => {
      const rev = clientRevenue(c.id);
      const pricingStr = c.oneTime ? `One-Time: ${inr(c.oneTime)}` : `Retainer: ${c.retainer ? inr(c.retainer) + ' / mo' : '—'}`;
      res += `- **${esc(c.name)}** (${starsOf(c)}★) — ${pricingStr}, Earned: ${inr(rev)}\n`;
    });
    return res;
  }

  if (query.includes('best client') || query.includes('top client') || query.includes('highest')) {
    if (!clList.length) return `No clients found.`;
    const topByRev = [...clList].sort((a,b) => clientRevenue(b.id) - clientRevenue(a.id))[0];
    const topByStars = [...clList].sort((a,b) => starsOf(b) - starsOf(a))[0];
    return `Your top client by rating is **${esc(topByStars.name)}** (${starsOf(topByStars)}★). Most revenue earned is from **${esc(topByRev.name)}** (${inr(clientRevenue(topByRev.id))}).`;
  }

  if (query.includes('business') || query.includes('agency') || query.includes('companies')) {
    let res = `You are running **${bizList.length} businesses**:\n`;
    bizList.forEach(b => {
      const cl = bizClients(b.id);
      res += `- **${esc(b.name)}** (${b.kind === 'product' ? 'Product / App' : 'Agency'}${cl.length ? ' · ' + cl.length + ' clients' : ''})\n`;
    });
    return res;
  }

  if (query.includes('streak') || query.includes('progress')) {
    return `Your systems are running. Check the streak bar on the home screen to see your daily consistency!`;
  }

  const summaryDue = dueToday.length ? `${dueToday.length} due today` : 'nothing due today';
  const summaryLate = late.length ? `${late.length} overdue` : 'nothing overdue';
  return `I'm Command, your personal command center assistant.\n\nCurrently you have **${open.length} open task${open.length !== 1 ? 's' : ''}** (${summaryDue}, ${summaryLate}), **${clList.length} active client${clList.length !== 1 ? 's' : ''}**, and **${inr(totalRetainers)} / mo** in monthly retainers${totalOneTime ? ` plus **${inr(totalOneTime)}** in one-time projects` : ''}.\n\nAsk me about your **tasks for today**, **overdue items**, **clients**, or **revenue** anytime!`;
}

let askCtl = null;
async function ask(q) {
  q = (q || '').trim(); if (!q) return;
  S.chat.push({ role:'user', content:q });
  const reply = { role:'assistant', content:'', pending:true }; S.chat.push(reply); renderChat();

  const sample = await useCap('sample');
  if (sample) {
    const turns = [];
    const ctx = buildContext();
    S.chat.filter(m => !m.pending && !m.error).forEach((m, i) => turns.push({ role: m.role, content: i === 0 ? `${ctx}\n\nRahul asks: ${m.content}` : m.content }));
    askCtl = new AbortController();
    try {
      const r = await sample(turns, { cache:false, signal: askCtl.signal, onText: ({ text }) => { reply.content = text; renderChat(); } });
      reply.content = r.text;
      reply.pending = false;
      renderChat();
      return;
    } catch (e) {
      if (e && e.code === 'cancelled') { S.chat.splice(S.chat.indexOf(reply), 1); renderChat(); return; }
      console.warn('AI sample ask error, falling back to local assistant:', e);
    }
  }

  // Standalone assistant (works all the time without claude.ai)
  reply.content = askLocally(q);
  reply.pending = false;
  renderChat();
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
  const askSec = $('#v-ask');
  if (askSec) askSec.classList.toggle('chatting', S.chat && S.chat.length > 0);
  const chatEl = $('#chat');
  if (chatEl) {
    chatEl.innerHTML = S.chat && S.chat.length ? S.chat.map(m => m.role === 'user' ? `<div class="msg me">${esc(m.content)}</div>` :
      `<div class="msg ai ${m.error ? 'err' : ''}">${m.content ? md(m.content) : '<span class="faint">…</span>'}</div>`).join('') :
      '';
    const last = chatEl.lastElementChild;
    if (last && S.chat.length) last.scrollIntoView({ block:'nearest' });
  }
  renderInboxChat();
  renderNotificationsPane();
  updateAskLayoutPanes();
}

function renderInboxChat() {
  const pane = $('#inbox-chat-pane');
  if (!pane) return;
  updateAskLayoutPanes();

  const myPid = S.profileId || 'rahul';
  const available = getAvailableChatContacts();
  if (!available.length) {
    pane.innerHTML = '';
    return;
  }

  // If no contact is selected (or invalid), show the preview list of the 2 peers
  const isPreviewMode = !S.inboxContactId || S.inboxContactId === myPid || !available.some(p => p.id === S.inboxContactId);

  if (isPreviewMode) {
    S.inboxContactId = null;
    pane.innerHTML = `
      <div class="inbox-chat-card inbox-preview-card" style="background:#111112!important;height:100%!important;border:none!important;">
        <!-- HEADER: Inbox label + Close pane button -->
        <div class="inbox-card-head" style="background:#111112!important;border:none!important;">
          <div class="inbox-head-bar inbox-preview-head-bar" style="background:#111112!important;border:none!important;">
            <div class="inbox-head-left">
              <span class="inbox-unread-label" style="color:#ffffff!important;"><svg style="width:16px;height:16px;flex:none;color:#ffffff"><use href="#i-inbox"/></svg>Inbox</span>
            </div>
            <button type="button" class="inbox-back-btn" data-action="close-inbox-pane" aria-label="Close inbox" title="Hide inbox">
              <svg><use href="#i-back"/></svg>
            </button>
          </div>
        </div>

        <!-- 2-PERSON PREVIEW LIST: No profile picture, no message snippet, just name + time + badge -->
        <div class="inbox-preview-list-wrapper" style="background:#111112!important;padding:16px!important;">
          <div class="inbox-preview-list" role="list">
            ${available.map(p => {
              const count = typeof getContactMessageCount === 'function' ? getContactMessageCount(myPid, p.id) : 0;
              const timeStr = typeof getContactLastTime === 'function' ? getContactLastTime(myPid, p.id) : '';
              return `
                <button type="button" class="inbox-preview-row" data-opencontact="${p.id}" role="listitem" aria-label="Open chat with ${esc(p.name)}" style="background:#19191A!important;border:none!important;box-shadow:none!important;outline:none!important;display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;padding:16px 18px!important;border-radius:12px!important;cursor:pointer!important;text-align:left!important;">
                  <div class="inbox-preview-main" style="display:flex!important;align-items:center!important;gap:12px!important;flex:1!important;min-width:0!important;">
                    <span class="inbox-preview-name" style="color:#ffffff!important;font-size:14.5px!important;font-weight:500!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;">${esc(p.name)}</span>
                  </div>
                  <div class="inbox-preview-aside" style="display:flex!important;align-items:center!important;gap:12px!important;flex-shrink:0!important;">
                    <span class="inbox-preview-time" style="color:#626266!important;font-size:12px!important;font-weight:400!important;white-space:nowrap!important;">${esc(timeStr)}</span>
                    <span class="inbox-green-circle ${count > 0 ? '' : 'zero-unread'}" style="${count > 0 ? 'display:grid!important;place-items:center!important;width:20px!important;height:20px!important;min-width:20px!important;border-radius:50%!important;background:#ffffff!important;color:#111112!important;font-size:11px!important;font-weight:700!important;line-height:1!important;box-shadow:none!important;' : 'display:none!important;'}">${count > 0 ? count : ''}</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    return;
  }

  const contact = PROFILES.find(p => p.id === S.inboxContactId) || available[0];
  if (contact && typeof markChatRead === 'function') {
    markChatRead(myPid, contact.id);
  }

  // Retrieve chat messages & shared tasks
  const rawMsgs = getChatMessages(myPid, contact.id).map(m => ({ ...m, isChatMsg: true }));
  const rawTasks = getSharedTasksBetween(myPid, contact.id).map(t => ({ ...t, isChatMsg: false, time: t.created || t.doneAt || 0 }));
  const combined = [...rawMsgs, ...rawTasks].sort((a, b) => (a.time || 0) - (b.time || 0));

  const formatMsgTime = ts => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  };

  pane.innerHTML = `
    <div class="inbox-chat-card glass">
      <!-- HEADER: Back button to 2-person list + Partner Name + Close pane -->
      <div class="inbox-card-head">
        <div class="inbox-head-bar inbox-convo-head-bar">
          <button type="button" class="inbox-back-btn" data-action="back-to-inbox-list" aria-label="Back to inbox" title="Back to inbox">
            <svg><use href="#i-back"/></svg>
          </button>
          <div class="inbox-chat-header-title">
            <b class="partner-name">${esc(contact.name)}</b>
          </div>
          <button type="button" class="inbox-back-btn" data-action="close-inbox-pane" aria-label="Close inbox" title="Hide inbox">
            <svg style="transform:scaleX(-1)"><use href="#i-back"/></svg>
          </button>
        </div>
      </div>

      <!-- MESSAGES FEED (Scrollable, openable with 0 messages) -->
      <div class="inbox-chat-feed" id="inbox-chat-feed">
        ${!combined.length ? `
          <div class="inbox-empty-chat">
            <div class="empty-icon">${contact.avatarLetter}</div>
            <h3>Chat with ${esc(contact.name)}</h3>
            <p>Send messages, promises, or updates directly to ${esc(contact.name)}.</p>
            <div class="empty-quick-pills">
              <button type="button" class="quick-msg-pill" data-quickmsg="Hey ${esc(contact.name)}!">"Hey ${esc(contact.name)}!"</button>
              <button type="button" class="quick-msg-pill" data-quickmsg="Checking in on our updates.">"Checking in"</button>
            </div>
          </div>
        ` : combined.map(item => {
          if (item.isChatMsg) {
            const isMe = item.from === myPid;
            return `
              <div class="chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}">
                ${!isMe ? `<span class="bubble-pfp">${contact.avatarLetter}</span>` : ''}
                <div class="chat-bubble">
                  <div class="bubble-text">${esc(item.text)}</div>
                  <div class="bubble-time">${esc(formatMsgTime(item.time))}</div>
                </div>
              </div>
            `;
          } else {
            // It's a shared promise/task
            const isMe = item.fromProfileId === myPid;
            const isDone = item.status === 'done';
            const client = clientById(item.client);
            return `
              <div class="chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}">
                ${!isMe ? `<span class="bubble-pfp">${contact.avatarLetter}</span>` : ''}
                <div class="chat-task-bubble ${isDone ? 'done' : ''}">
                  <div class="task-bubble-header">
                    <span class="task-badge">${isMe ? 'You promised ' + esc(contact.name) : esc(contact.name) + ' promised you'}</span>
                    <span class="task-state-badge ${isDone ? 'kept' : 'open'}">${isDone ? 'Kept' : 'Open'}</span>
                  </div>
                  <div class="task-bubble-body">
                    <button class="check" data-inboxtoggle="${item.id}" aria-label="${isDone ? 'Mark open' : 'Mark done'}">
                      <svg><use href="#i-check"/></svg>
                    </button>
                    <div class="task-bubble-details">
                      <div class="task-title ${isDone ? 'done-line' : ''}">${esc(item.title)}</div>
                      ${client ? `<div class="faint" style="font-size:11.5px;margin-top:2px">${esc(client.short || client.name)}</div>` : ''}
                      ${item.notes ? `<div class="faint" style="font-size:12px;margin-top:4px">${esc(item.notes)}</div>` : ''}
                    </div>
                  </div>
                  <div class="bubble-time" style="margin-top:4px">${esc(formatMsgTime(item.time))}</div>
                </div>
              </div>
            `;
          }
        }).join('')}
      </div>

      <!-- INPUT BAR -->
      <form class="inbox-chat-input-bar" id="inbox-chat-form" autocomplete="off">
        <input type="text" id="inbox-chat-text" placeholder="Message ${esc(contact.name)}…" autocomplete="off" aria-label="Chat message">
        <button type="submit" class="send-btn" aria-label="Send message">
          <svg><use href="#i-send"/></svg>
        </button>
      </form>
    </div>
  `;

  // Auto-scroll feed to bottom
  const feed = $('#inbox-chat-feed');
  if (feed) {
    feed.scrollTop = feed.scrollHeight;
  }
}

function updateAskLayoutPanes() {
  const isInboxHidden = lsGet('cmd.inbox_hidden', false);
  const isNotifHidden = lsGet('cmd.notif_hidden', true);
  const layout = $('#ask-layout');
  if (layout) {
    layout.classList.toggle('inbox-hidden', isInboxHidden);
    layout.classList.toggle('notif-hidden', isNotifHidden);
  }
  const inboxBtn = $('#inbox-reopen-btn');
  if (inboxBtn) inboxBtn.classList.toggle('active', !isInboxHidden);

  const notifBtn = $('#notif-open-btn');
  if (notifBtn) notifBtn.classList.toggle('active', !isNotifHidden);

  updateAskTopbarBadges();
}

function updateAskTopbarBadges() {
  const myPid = (S && S.profileId) || 'rahul';

  // Inbox badge: count unread messages across all available contacts
  const available = typeof getAvailableChatContacts === 'function' ? getAvailableChatContacts() : [];
  let inboxUnread = 0;
  available.forEach(p => {
    const c = typeof getContactMessageCount === 'function' ? getContactMessageCount(myPid, p.id) : 0;
    inboxUnread += c;
  });
  const inboxBadge = $('#ask-inbox-badge');
  if (inboxBadge) {
    if (inboxUnread > 0) {
      inboxBadge.textContent = inboxUnread > 99 ? '99+' : inboxUnread;
      inboxBadge.style.display = 'inline-grid';
    } else {
      inboxBadge.style.display = 'none';
    }
  }

  // Notification badge: pending deletion requests for me
  const allReqs = lsGet('cmd.pending_deletion_requests', []) || [];
  const myDelReqs = allReqs.filter(r => r.status === 'pending' && Array.isArray(r.toPids) && r.toPids.includes(myPid) && !(Array.isArray(r.approvedPids) && r.approvedPids.includes(myPid)));

  // Pending chat notifications
  const pendingChat = lsGet('cmd.pending_chat_notifications', []) || [];
  const myPendingChat = pendingChat.filter(m => m.to === myPid);

  const notifCount = myDelReqs.length + (myPendingChat.length > 0 ? 1 : 0);
  const notifBadge = $('#ask-notif-badge');
  if (notifBadge) {
    if (notifCount > 0) {
      notifBadge.textContent = notifCount > 99 ? '99+' : notifCount;
      notifBadge.style.display = 'inline-grid';
    } else {
      notifBadge.style.display = 'none';
    }
  }
}

function renderNotificationsPane() {
  const pane = $('#ask-notif-pane');
  if (!pane) return;

  const myPid = (S && S.profileId) || 'rahul';
  const allReqs = lsGet('cmd.pending_deletion_requests', []) || [];
  // Requests where I am a target
  const myDelReqs = allReqs.filter(r => r.status === 'pending' && Array.isArray(r.toPids) && r.toPids.includes(myPid));

  // Recent history (last 5 entries)
  const history = (S && S.history) || lsGet('cmd.history', []) || [];
  const recentHistory = history.slice(0, 5);

  // Due / upcoming items for myPid
  const myItems = (S && S.items) || [];
  const dueItems = myItems.filter(it => it && it.status !== 'done' && it.due).sort((a, b) => (a.due || '').localeCompare(b.due || '')).slice(0, 3);

  // Unread messages from peers
  const available = typeof getAvailableChatContacts === 'function' ? getAvailableChatContacts() : [];
  const peerUpdates = available.map(p => {
    const count = typeof getContactMessageCount === 'function' ? getContactMessageCount(myPid, p.id) : 0;
    const timeStr = typeof getContactLastTime === 'function' ? getContactLastTime(myPid, p.id) : '';
    const lastMsg = (typeof getChatMessages === 'function' ? getChatMessages(myPid, p.id) : []).slice(-1)[0];
    return { contact: p, count, timeStr, lastMsg };
  }).filter(x => x.count > 0 || x.lastMsg);

  const totalNotifs = myDelReqs.length + peerUpdates.filter(x => x.count > 0).length;

  pane.innerHTML = `
    <div class="inbox-chat-card inbox-preview-card" style="background:#111112!important;height:100%!important;border:none!important;">
      <!-- HEADER -->
      <div class="inbox-card-head" style="background:#111112!important;border:none!important;">
        <div class="inbox-head-bar inbox-preview-head-bar" style="background:#111112!important;border:none!important;">
          <div class="inbox-head-left">
            <span class="inbox-unread-label" style="color:#ffffff!important;">
              <svg style="width:16px;height:16px;flex:none;color:#ff9f0a"><use href="#i-bell"/></svg>
              Notifications
            </span>
            ${totalNotifs > 0 ? `<span class="badge" style="background:#ff453a;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px">${totalNotifs}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button type="button" class="inbox-back-btn" data-action="close-notif-pane" aria-label="Close notifications" title="Hide notifications">
              <svg><use href="#i-back"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- NOTIFICATIONS FEED -->
      <div class="inbox-preview-list-wrapper" style="background:#111112!important;padding:16px!important;overflow-y:auto;flex:1;">
        ${myDelReqs.length > 0 ? `
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#ff9f0a;margin:0 0 10px 4px">Action Required (${myDelReqs.length})</div>
          ${myDelReqs.map(req => {
            const hasApproved = Array.isArray(req.approvedPids) && req.approvedPids.includes(myPid);
            const approvedCount = (req.approvedPids || []).length;
            const totalNeeded = (req.toPids || []).length;
            const approvedNames = (req.approvedPids || []).map(p => profileName(p)).join(', ');
            return `
              <div class="notif-item-card urgent" style="border-color:${hasApproved ? 'rgba(48,209,88,0.3)' : 'rgba(255,159,10,0.35)'}">
                <div class="notif-card-header">
                  <span class="notif-badge-tag ${hasApproved ? 'green' : 'amber'}">
                    ${hasApproved ? '✓ Your Approval Recorded' : '⚠️ Approval Needed'}
                  </span>
                  <span class="notif-card-time">${req.createdAt ? new Date(req.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}</span>
                </div>
                <div class="notif-card-title">${esc(req.fromName)} requested to delete ${esc(req.targetType)}</div>
                <div class="notif-card-msg" style="font-size:14px;color:#ffffff;font-weight:600">"${esc(req.targetName)}"</div>
                ${totalNeeded > 1 ? `
                  <div style="font-size:12px;color:${approvedCount > 0 ? '#ff9f0a' : '#8e8e93'};margin-top:2px">
                    ${approvedCount > 0 ? `Approved by ${esc(approvedNames)} (${approvedCount}/${totalNeeded} team approvals)` : `Requires approval from all ${totalNeeded} co-owners`}
                  </div>
                ` : ''}
                ${!hasApproved ? `
                  <div class="notif-card-actions">
                    <button type="button" class="btn small danger" data-action="approve-del-req" data-req-id="${req.id}" style="padding:6px 16px;font-size:13px;font-weight:600">Yes, Delete</button>
                    <button type="button" class="btn small" data-action="decline-del-req" data-req-id="${req.id}" style="padding:6px 14px;font-size:13px">No, Keep</button>
                  </div>
                ` : `
                  <div style="font-size:12px;color:#30d158;font-weight:500;margin-top:4px">
                    Waiting for other team members to approve before deletion completes.
                  </div>
                `}
              </div>
            `;
          }).join('')}
          <div style="height:12px"></div>
        ` : ''}

        <!-- TEAM MESSAGES -->
        ${peerUpdates.length > 0 ? `
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8e8e93;margin:0 0 10px 4px">Team Messages</div>
          ${peerUpdates.map(u => `
            <div class="notif-item-card" data-action="open-chat-from-notif" data-opencontact="${u.contact.id}" style="cursor:pointer">
              <div class="notif-card-header">
                <span class="notif-badge-tag blue">${esc(u.contact.name)}</span>
                <span class="notif-card-time">${esc(u.timeStr)}</span>
              </div>
              <div class="notif-card-msg" style="color:#ffffff;font-size:13.5px">
                ${u.lastMsg ? (u.lastMsg.text ? esc(u.lastMsg.text) : (u.lastMsg.title ? `Promise: "${esc(u.lastMsg.title)}"` : 'Shared an update')) : 'No messages yet'}
              </div>
              <div class="notif-card-actions" style="justify-content:space-between">
                <span style="font-size:11.5px;color:#0a84ff;font-weight:500">Tap to open chat in Inbox →</span>
                ${u.count > 0 ? `<span class="badge" style="background:#ffffff;color:#111112;font-size:11px;font-weight:700;padding:1px 6px;border-radius:99px">${u.count} new</span>` : ''}
              </div>
            </div>
          `).join('')}
          <div style="height:12px"></div>
        ` : ''}

        <!-- UPCOMING & DUE -->
        ${dueItems.length > 0 ? `
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8e8e93;margin:0 0 10px 4px">Upcoming & Due</div>
          ${dueItems.map(it => `
            <div class="notif-item-card">
              <div class="notif-card-header">
                <span class="notif-badge-tag green">${it.kind === 'payment' ? 'Payment' : 'Task'}</span>
                <span class="notif-card-time">Due: ${esc(it.due || '')}</span>
              </div>
              <div class="notif-card-title">${esc(it.title)}</div>
              ${it.amount ? `<div class="notif-card-msg">Amount: ₹${Number(it.amount).toLocaleString('en-IN')}${it.yourShare ? ` · Your share: ₹${Number(it.yourShare).toLocaleString('en-IN')}` : ''}</div>` : ''}
            </div>
          `).join('')}
          <div style="height:12px"></div>
        ` : ''}

        <!-- RECENT ACTIVITY -->
        ${recentHistory.length > 0 ? `
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8e8e93;margin:0 0 10px 4px">Recent Activity</div>
          ${recentHistory.map(h => `
            <div class="notif-item-card" style="padding:10px 14px">
              <div class="notif-card-header">
                <span style="font-size:12px;color:#a1a1a6;font-weight:500">${esc(h.action || 'Updated')} ${esc(h.category || '')}</span>
                <span class="notif-card-time">${h.timestamp ? new Date(h.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}</span>
              </div>
              <div style="font-size:13px;color:#ffffff;font-weight:500;margin-top:2px">${esc(h.title || '')}</div>
            </div>
          `).join('')}
        ` : ''}

        ${myDelReqs.length === 0 && peerUpdates.length === 0 && dueItems.length === 0 && recentHistory.length === 0 ? `
          <div style="text-align:center;padding:56px 16px;color:#8e8e93">
            <div style="width:48px;height:48px;border-radius:50%;background:#1c1c1e;display:grid;place-items:center;margin:0 auto 12px;color:#a1a1a6">
              <svg style="width:22px;height:22px"><use href="#i-bell"/></svg>
            </div>
            <div style="font-weight:600;font-size:15px;color:#fff;margin-bottom:4px">No notifications</div>
            <div style="font-size:13px;color:#636366">You are all caught up across all businesses.</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
