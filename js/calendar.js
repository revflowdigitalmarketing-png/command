/* Command · Google Calendar (read + create events). */
/* ================= calendar (Google Calendar via connector) ================= */
function calErr(e) {
  switch (e && e.code) {
    case 'server_not_connected': return 'Add Google Calendar in claude.ai Settings → Connectors to see it here.';
    case 'needs_reauth': return 'Reconnect Google Calendar in claude.ai Settings → Connectors.';
    case 'not_in_manifest': return 'Calendar access is off for this page. Reload and allow Google Calendar when asked.';
    case 'selection_required': return 'Choose which Google Calendar connection to use when claude.ai asks.';
    case 'blocked_by_policy': case 'approval_required': return 'Your account settings block Google Calendar here.';
    case 'tool_error': return 'Google Calendar said: ' + (e.message || 'it could not do that.');
    case 'server_unavailable': return 'Google Calendar is not answering. Tap refresh in a minute.';
    case 'not_granted': case 'capability_disabled': case 'capability_removed': return 'Google Calendar shows up here when you open Command from claude.ai.';
    default: return 'Google Calendar is unavailable right now. Tap refresh to try again.';
  }
}
function normEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const s = e.start || {}, en = e.end || {};
  const st = s.dateTime || s.date || e.startTime || e.start_time || (typeof e.start === 'string' ? e.start : '');
  if (!st) return null;
  const allDay = !!(e.allDay || (!s.dateTime && s.date) || /^\d{4}-\d{2}-\d{2}$/.test(st));
  let day, time = '', endTime = '';
  if (allDay) day = st.slice(0, 10);
  else { const d = new Date(st); if (isNaN(d)) return null; day = ymd(d); time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const et = en.dateTime || e.endTime || (typeof e.end === 'string' ? e.end : ''); if (et) { const ed = new Date(et); if (!isNaN(ed)) endTime = `${pad(ed.getHours())}:${pad(ed.getMinutes())}`; } }
  return { id: e.id || e.eventId || '', title: e.summary || e.title || '(No title)', day, time, endTime, allDay, link: e.htmlLink || e.link || '', location: e.location || '' };
}
async function loadCalendar(fresh) {
  const mcp = await useCap('mcp');
  if (mcp) {
    if (fresh) { S.cal = { state:'loading' }; render(); }
    try {
      const t = today();
      const r = await mcp.callTool('Google Calendar', 'list_events', {
        startTime: isoAt(t, '00:00'), endTime: isoAt(addDays(t, 8), '00:00'), orderBy: 'startTime', timeZone: TZ, pageSize: 100
      }, fresh ? { cache: { refresh: true, staleTime: 60000 } } : { cache: { staleTime: 60000 } });
      const p = r && (r.payload ?? null);
      const list = Array.isArray(p) ? p : (p && (p.events || p.items || p.data)) || [];
      S.events = list.map(normEvent).filter(Boolean);
      S.cal = { state:'ok' };
    } catch (e) {
      S.cal = { state: (e && e.code) || 'error', msg: calErr(e) };
      if (e && ['needs_reauth','server_not_connected','not_in_manifest','blocked_by_policy'].includes(e.code)) S.events = [];
    }
    render();
    return;
  }
  // Standalone: load stored local calendar events
  S.events = lsGet('cmd.events', []) || [];
  S.cal = { state:'ok', msg:'' };
  render();
}
async function pushToCalendar(it, quiet) {
  if (!validDate(it.due)) { toast('Give it a date first.'); return false; }
  const timed = validTime(it.time);
  const start = timed ? it.time : '10:00';
  const dur = timed ? (Number(it.duration) || 60) : 15;
  const end = plusMin(it.due, start, dur);
  const c = clientById(it.client);
  const prefix = { promise:'Promise: ', payment:'Collect payment: ', task: timed ? '' : 'Due: ', meeting:'', reel:'Post reel: ', glitch:'Fix: ' }[it.kind] || '';
  const summary = prefix + it.title + (c ? ` · ${c.short || c.name}` : '');
  const desc = [it.person ? `For: ${it.person}` : '', it.amount ? `Amount: ${inr(it.amount)}` : '', it.notes || '', 'Added from Command'].filter(Boolean).join('\n');

  const mcp = await useCap('mcp');
  if (mcp) {
    const input = {
      summary,
      startTime: isoAt(it.due, start), endTime: isoAt(end.date, end.time), timeZone: TZ,
      description: desc,
      overrideReminders: timed ? [{ method:'popup', minutes:30 }, { method:'popup', minutes:5 }] : [{ method:'popup', minutes:0 }, { method:'popup', minutes:1440 }]
    };
    try {
      const r = await mcp.callTool('Google Calendar', 'create_event', input);
      const p = (r && r.payload) || {};
      const ev = p.event || p;
      it.cal = { id: ev.id || ev.eventId || '', link: ev.htmlLink || ev.link || '' };
      await saveItem(it);
      if (!quiet) toast('Added to Google Calendar. Your iPhone will remind you.');
      return true;
    } catch (e) { toast(calErr(e)); return false; }
  }

  // Standalone: add to local calendar events and generate Google Calendar web link
  const startIso = (it.due + 'T' + start + ':00').replace(/[-:]/g, '');
  const endIso = (end.date + 'T' + end.time + ':00').replace(/[-:]/g, '');
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(desc)}`;

  const evId = 'ev-' + Date.now();
  const localEv = {
    id: evId,
    title: summary,
    day: it.due,
    time: timed ? start : '',
    endTime: timed ? end.time : '',
    allDay: !timed,
    link: gcalUrl,
    location: ''
  };
  const list = lsGet('cmd.events', []) || [];
  list.push(localEv);
  lsSet('cmd.events', list);
  S.events = list;
  it.cal = { id: evId, link: gcalUrl };
  await saveItem(it);
  if (!quiet) toast('Added to calendar.');
  render();
  return true;
}
