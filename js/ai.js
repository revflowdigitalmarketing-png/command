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

    // Client detection
    let clientId = '';
    let matchedClient = null;
    for (const c of allClients) {
      const cName = c.name.toLowerCase();
      const cShort = (c.short || '').toLowerCase();
      if ((cShort && lower.includes(cShort)) || lower.includes(cName)) {
        clientId = c.id;
        matchedClient = c;
        break;
      }
    }

    // Business detection
    let bizId = '';
    if (kind === 'glitch' || kind === 'reel') {
      bizId = productBiz();
    } else if (matchedClient) {
      bizId = clientBiz(matchedClient);
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
      person,
      due,
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
  const totalRev = S.items.filter(i => i.kind === 'payment' && i.status === 'done').reduce((s, i) => s + (i.amount || 0), 0);
  const pendingRev = open.filter(i => i.kind === 'payment').reduce((s, i) => s + (i.amount || 0), 0);
  const totalRetainers = clList.reduce((s, c) => s + (Number(c.retainer) || 0), 0);

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
    let res = `Here's your financial overview:\n`;
    res += `- **Total received revenue:** ${inr(totalRev)}\n`;
    res += `- **Monthly retainers:** ${inr(totalRetainers)} / month across ${clList.length} client${clList.length === 1 ? '' : 's'}\n`;
    if (pendingRev > 0) res += `- **Pending payments:** ${inr(pendingRev)}\n`;
    return res;
  }

  if (query.includes('client') || query.includes('clients') || query.includes('who are my client')) {
    if (!clList.length) return `You don't have any clients added yet. Tap **New client** in Businesses to add one!`;
    let res = `You have **${clList.length} client${clList.length > 1 ? 's' : ''}**:\n`;
    clList.forEach(c => {
      const rev = clientRevenue(c.id);
      res += `- **${esc(c.name)}** (${starsOf(c)}★) — Retainer: ${c.retainer ? inr(c.retainer) : '—'}, Earned: ${inr(rev)}\n`;
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
  return `I'm Command, your personal command center assistant.\n\nCurrently you have **${open.length} open task${open.length !== 1 ? 's' : ''}** (${summaryDue}, ${summaryLate}), **${clList.length} active client${clList.length !== 1 ? 's' : ''}**, and **${inr(totalRetainers)}** in monthly retainers.\n\nAsk me about your **tasks for today**, **overdue items**, **clients**, or **revenue** anytime!`;
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
}

function renderInboxChat() {
  const pane = $('#inbox-chat-pane');
  if (!pane) return;
  const isHidden = lsGet('cmd.inbox_hidden', false);
  const layout = $('#ask-layout');
  if (layout) layout.classList.toggle('inbox-hidden', isHidden);
  const reopen = $('#inbox-reopen-btn');
  if (reopen) reopen.style.display = isHidden ? 'inline-flex' : 'none';

  const myPid = S.profileId || 'rahul';
  const available = getAvailableChatContacts();
  if (!available.length) {
    pane.innerHTML = '';
    return;
  }

  // Ensure active contact is not oneself and is valid
  if (!S.inboxContactId || S.inboxContactId === myPid || !available.some(p => p.id === S.inboxContactId)) {
    S.inboxContactId = available[0].id;
  }
  const contact = PROFILES.find(p => p.id === S.inboxContactId) || available[0];

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
      <!-- HEADER: Back button + Tabs & Contact Bar -->
      <div class="inbox-card-head">
        <div class="inbox-head-bar">
          <button type="button" class="inbox-back-btn" data-action="close-inbox-pane" aria-label="Close inbox" title="Hide inbox">
            <svg><use href="#i-back"/></svg>
          </button>
          <div class="inbox-contact-tabs" role="tablist">
            ${available.map(p => `
              <button type="button" class="inbox-contact-tab ${p.id === contact.id ? 'active' : ''}" data-chattab="${p.id}" role="tab" aria-selected="${p.id === contact.id}">
                <span class="tab-pfp">${p.avatarLetter}</span>
                <span class="tab-name">${esc(p.name)}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="inbox-active-partner">
          <div class="partner-left">
            <span class="partner-avatar">${contact.avatarLetter}</span>
            <b class="partner-name">${esc(contact.name)}</b>
          </div>
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

