/* Command · Edit pop-ups (items, clients, goals, payments, settings). */
/* ================= sheets ================= */
function openSheet(html, onReady) {
  $('#sheet').innerHTML = html; $('#scrim').hidden = false;
  onReady && onReady($('#sheet'));
  const f = $('#sheet').querySelector('input,select,textarea'); f && setTimeout(() => f.focus(), 50);
}
function closeSheet() {
  const sc = $('#scrim'); if (sc.hidden || sc.classList.contains('closing')) return;
  sc.classList.add('closing');
  setTimeout(() => { sc.classList.remove('closing'); sc.hidden = true; $('#sheet').innerHTML = ''; }, 190);
}
const clientOptions = sel => `<option value="">No client</option>` + clients().map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

function editItem(id, preset) {
  const it = id ? S.items.find(x => x.id === id) : makeItem(preset || {});
  if (!it) return;
  const isNew = !id;
  openSheet(`<h2>${isNew ? 'New ' + (KIND_LABEL[it.kind] || 'item').toLowerCase() : 'Edit ' + (KIND_LABEL[it.kind] || 'item').toLowerCase()}</h2>
    <div class="field"><label for="f-title">What</label><input class="in" id="f-title" value="${esc(it.title)}" placeholder="${it.kind === 'promise' ? 'Send the revised brochure' : 'Write it short and clear'}"></div>
    <div class="frow">
      <div class="field"><label for="f-kind">Type</label><select class="in" id="f-kind">${Object.entries(KIND_LABEL).map(([k,v]) => `<option value="${k}" ${k===it.kind?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="f-client">Client</label><select class="in" id="f-client">${clientOptions(it.client)}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="f-due">Date</label><input class="in" type="date" id="f-due" value="${it.due}"></div>
      <div class="field"><label for="f-time">Time</label><input class="in" type="time" id="f-time" value="${it.time}"></div>
      <div class="field"><label for="f-prio">Priority</label><select class="in" id="f-prio"><option value="high" ${it.priority==='high'?'selected':''}>High</option><option value="med" ${it.priority==='med'?'selected':''}>Medium</option><option value="low" ${it.priority==='low'?'selected':''}>Low</option></select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="f-person">Promised to</label><input class="in" id="f-person" value="${esc(it.person)}" placeholder="Person's name"></div>
      <div class="field"><label for="f-amount">Amount (₹)</label><input class="in mono" type="number" inputmode="numeric" id="f-amount" value="${it.amount || ''}" placeholder="0"></div>
    </div>
    <div class="field"><label for="f-notes">Notes</label><textarea class="in" id="f-notes" placeholder="Details, links, what the client said">${esc(it.notes)}</textarea></div>
    ${it.cal ? `<div class="cal-note" style="margin:0">On Google Calendar${it.cal.link ? ` · <a href="${esc(it.cal.link)}" target="_blank" rel="noopener">Open event</a>` : ''}</div>` : ''}
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn danger left" id="f-del">Delete</button>`}
      ${it.cal ? '' : `<button class="btn" id="f-cal">Save + Calendar</button>`}
      <button class="btn" id="f-cancel">Cancel</button>
      <button class="btn primary" id="f-save">Save</button>
    </div>`, sh => {
    const collect = () => {
      it.title = $('#f-title').value.trim(); it.kind = $('#f-kind').value; it.client = $('#f-client').value;
      it.due = $('#f-due').value; it.time = $('#f-time').value; it.priority = $('#f-prio').value;
      it.person = $('#f-person').value.trim(); it.amount = Number($('#f-amount').value) || 0; it.notes = $('#f-notes').value;
      return !!it.title;
    };
    sh.querySelector('#f-save').onclick = async () => { if (!collect()) { toast('Add a title first.'); return; } closeSheet(); await saveItem(it); };
    sh.querySelector('#f-cancel').onclick = closeSheet;
    const cb = sh.querySelector('#f-cal');
    if (cb) cb.onclick = async () => { if (!collect()) { toast('Add a title first.'); return; } if (!it.due) { toast('Pick a date so Calendar knows when.'); return; } closeSheet(); await saveItem(it); await pushToCalendar(it); loadCalendar(true); };
    const del = sh.querySelector('#f-del');
    if (del) del.onclick = () => { if (del.dataset.sure) { closeSheet(); removeItem(it.id); toast('Deleted.'); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; } };
  });
}
function editClient(id) {
  const c = id ? { ...clientById(id) } : { id: newId(), name:'', short:'', stars:4, retainer:0, note:'', color:(S.settings.clients || []).length, signed: today(), biz: S.biz || clientBiz(null) };
  openSheet(`<h2>${id ? 'Edit client' : 'New client'}</h2>
    <div class="field"><label for="c-name">Name</label><input class="in" id="c-name" value="${esc(c.name)}" placeholder="Company name"></div>
    <div class="frow">
      <div class="field"><label for="c-short">Short name</label><input class="in" id="c-short" value="${esc(c.short)}" placeholder="What you call them"></div>
      <div class="field"><label for="c-stars">Priority (stars)</label><select class="in" id="c-stars">${[5,4.5,4,3.5,3,2.5,2,1.5,1].map(v => `<option value="${v}" ${starsOf(c)===v?'selected':''}>${'★'.repeat(Math.floor(v))}${v % 1 ? '½' : ''}  ${v.toFixed(1)}</option>`).join('')}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="c-ret">Monthly retainer (₹)</label><input class="in mono" type="number" inputmode="numeric" id="c-ret" value="${c.retainer || ''}" placeholder="0"></div>
      <div class="field"><label for="c-signed">Contract signed</label><input class="in" type="date" id="c-signed" value="${c.signed || c.since || ''}"></div>
    </div>
    <div class="field"><label for="c-note">One-line note</label><input class="in" id="c-note" value="${esc(c.note)}" placeholder="What they do / what you handle"></div>
    <div class="sheet-actions">${id ? `<button class="btn danger left" id="c-del">Remove client</button>` : ''}<button class="btn" id="c-cancel">Cancel</button><button class="btn primary" id="c-save">Save</button></div>`, sh => {
    sh.querySelector('#c-cancel').onclick = closeSheet;
    sh.querySelector('#c-save').onclick = () => {
      c.name = $('#c-name').value.trim(); if (!c.name) { toast('Add the client name.'); return; }
      c.short = $('#c-short').value.trim(); c.stars = Number($('#c-stars').value); c.retainer = Number($('#c-ret').value) || 0;
      c.signed = $('#c-signed').value; c.note = $('#c-note').value.trim();
      const list = S.settings.clients || []; const i = list.findIndex(x => x.id === c.id);
      if (i >= 0) list[i] = c; else list.push(c);
      S.settings.clients = list; closeSheet(); saveSettings(); toast('Client saved.');
    };
    const del = sh.querySelector('#c-del');
    if (del) del.onclick = () => { if (del.dataset.sure) { S.settings.clients = S.settings.clients.filter(x => x.id !== c.id); S.client = null; closeSheet(); saveSettings(); toast('Client removed. Their tasks stay in your list.'); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to remove'; } };
  });
}
function logPayment(clientId) {
  const c = clientById(clientId);
  const mon = new Date().toLocaleDateString('en-IN',{month:'long'});
  let status = 'received';
  openSheet(`<h2>Log payment${c ? ' · ' + esc(c.short || c.name) : ''}</h2>
    <div class="seg pay-seg" role="group" aria-label="Status"><button type="button" data-pst="received" aria-pressed="true">Received</button><button type="button" data-pst="pending" aria-pressed="false">Still pending</button></div>
    <div class="frow">
      <div class="field"><label for="p-amt">Amount (₹)</label><input class="in mono" type="number" inputmode="numeric" id="p-amt" value="${c && c.retainer ? c.retainer : ''}" placeholder="25000"></div>
      <div class="field"><label for="p-date" id="p-date-l">Date received</label><input class="in" type="date" id="p-date" value="${today()}"></div>
    </div>
    ${c ? '' : `<div class="field"><label for="p-client">Client</label><select class="in" id="p-client">${clients().map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>`}
    <div class="field"><label for="p-for">For</label><input class="in" id="p-for" value="${esc(mon)} retainer" placeholder="What this payment is for"></div>
    <div class="field"><label for="p-note">Note</label><input class="in" id="p-note" placeholder="UPI, bank transfer, invoice no."></div>
    <div class="sheet-actions"><button class="btn" id="p-cancel">Cancel</button><button class="btn primary" id="p-save">Save payment</button></div>`, sh => {
    sh.querySelectorAll('[data-pst]').forEach(b => b.onclick = () => {
      status = b.dataset.pst; sh.querySelectorAll('[data-pst]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('#p-date-l').textContent = status === 'received' ? 'Date received' : 'Due date';
    });
    sh.querySelector('#p-cancel').onclick = closeSheet;
    sh.querySelector('#p-save').onclick = async () => {
      const amt = Number($('#p-amt').value) || 0; if (!amt) { toast('Enter the amount.'); return; }
      const date = $('#p-date').value || today();
      const it = makeItem({ kind:'payment', title: $('#p-for').value.trim() || 'Payment', client: clientId || ($('#p-client') ? $('#p-client').value : ''), amount: amt, due: date, priority:'med', notes: $('#p-note').value.trim() });
      if (status === 'received') { it.status = 'done'; const d = parseYmd(date); d.setHours(12, 0, 0, 0); it.doneAt = d.getTime(); }
      closeSheet(); await saveItem(it);
      toast(status === 'received' ? `${inr(amt)} logged as received.` : `${inr(amt)} logged as pending.`);
    };
  });
}
function editGoal(id) {
  const g = id ? { ...(S.settings.goals || []).find(x => x.id === id) } : { id: newId(), name:'', target:0, saved:0, date:'', note:'' };
  openSheet(`<h2>${id ? esc(g.name) : 'New goal'}</h2>
    <div class="field"><label for="g-name">Goal</label><input class="in" id="g-name" value="${esc(g.name)}" placeholder="Dubai trip"></div>
    <div class="frow">
      <div class="field"><label for="g-saved">In the Revolut pocket now (₹)</label><input class="in mono" type="number" inputmode="numeric" id="g-saved" value="${g.saved || ''}" placeholder="0"></div>
      <div class="field"><label for="g-target">Target (₹)</label><input class="in mono" type="number" inputmode="numeric" id="g-target" value="${g.target || ''}" placeholder="0"></div>
    </div>
    <div class="frow">
      <div class="field"><label for="g-date">Trip date</label><input class="in" type="date" id="g-date" value="${g.date || ''}"></div>
      <div class="field"><label for="g-note">Note</label><input class="in" id="g-note" value="${esc(g.note)}" placeholder="1 week with the crew"></div>
    </div>
    <div class="sheet-actions">${id ? `<button class="btn danger left" id="g-del">Delete goal</button>` : ''}<button class="btn" id="g-cancel">Cancel</button><button class="btn primary" id="g-save">Save</button></div>`, sh => {
    sh.querySelector('#g-cancel').onclick = closeSheet;
    sh.querySelector('#g-save').onclick = () => {
      g.name = $('#g-name').value.trim(); if (!g.name) { toast('Name the goal.'); return; }
      g.saved = Number($('#g-saved').value) || 0; g.target = Number($('#g-target').value) || 0; g.date = $('#g-date').value; g.note = $('#g-note').value.trim(); g.updated = Date.now();
      const list = S.settings.goals || []; const i = list.findIndex(x => x.id === g.id);
      if (i >= 0) list[i] = g; else list.push(g);
      S.settings.goals = list; closeSheet(); saveSettings(); toast('Saved.');
    };
    const del = sh.querySelector('#g-del');
    if (del) del.onclick = () => { if (del.dataset.sure) { S.settings.goals = S.settings.goals.filter(x => x.id !== g.id); closeSheet(); saveSettings(); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; } };
  });
}
function editWish(id) {
  const w = id ? { ...(S.settings.wishlist || []).find(x => x.id === id) } : { id: newId(), name:'', cost:0, cat:'Shopping', goal:'', note:'', bought:false };
  const cats = ['Shopping','Tech','Trip','Home','Other'];
  openSheet(`<h2>${id ? 'Edit item' : 'Add something to buy'}</h2>
    <div class="field"><label for="w-name">What</label><input class="in" id="w-name" value="${esc(w.name)}" placeholder="iPhone 18 Pro, Burgundy"></div>
    <div class="frow">
      <div class="field"><label for="w-cost">Cost (₹)</label><input class="in mono" type="number" inputmode="numeric" id="w-cost" value="${w.cost || ''}" placeholder="0"></div>
      <div class="field"><label for="w-cat">Category</label><select class="in" id="w-cat">${cats.map(c => `<option ${c === w.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="w-goal">Part of a trip</label><select class="in" id="w-goal"><option value="">No</option>${(S.settings.goals || []).map(g => `<option value="${g.id}" ${g.id === w.goal ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="w-note">Note</label><input class="in" id="w-note" value="${esc(w.note)}" placeholder="Size, link, store"></div>
    </div>
    <div class="sheet-actions">${id ? `<button class="btn danger left" id="w-del">Delete</button>` : ''}<button class="btn" id="w-cancel">Cancel</button><button class="btn primary" id="w-save">Save</button></div>`, sh => {
    sh.querySelector('#w-cancel').onclick = closeSheet;
    sh.querySelector('#w-save').onclick = () => {
      w.name = $('#w-name').value.trim(); if (!w.name) { toast('Add what it is.'); return; }
      w.cost = Number($('#w-cost').value) || 0; w.cat = $('#w-cat').value; w.goal = $('#w-goal').value; w.note = $('#w-note').value.trim();
      const list = S.settings.wishlist || []; const i = list.findIndex(x => x.id === w.id);
      if (i >= 0) list[i] = w; else list.push(w);
      S.settings.wishlist = list; closeSheet(); saveSettings(); toast('Saved.');
    };
    const del = sh.querySelector('#w-del');
    if (del) del.onclick = () => { if (del.dataset.sure) { S.settings.wishlist = S.settings.wishlist.filter(x => x.id !== w.id); closeSheet(); saveSettings(); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; } };
  });
}
function openProfileSheet() {
  const pid = S.profileId || 'rahul';
  openSheet(`<h2>Switch Profile</h2>
    <p class="muted" style="font-size:13px;margin-bottom:16px">Select an active profile to switch workspace context, businesses, and clients.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${PROFILES.map(p => {
        const isActive = p.id === pid;
        const defs = defaultSettingsFor(p.id);
        const saved = lsGet(`cmd.settings_${p.id}`, null) || (p.id === 'rahul' ? lsGet('cmd.settings', null) : null) || {};
        const profSettings = { ...defs, ...saved };
        const bizList = profSettings.businesses || [];
        const bizNames = bizList.map(b => b.name).join(', ');
        return `<button class="card prof-card" data-switchprofile="${p.id}" style="padding:14px 16px;text-align:left;display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid ${isActive ? 'var(--ink)' : 'var(--hair)'}">
          <span class="pfp" style="width:38px;height:38px;font-size:16px;display:grid;place-items:center;background:${isActive ? 'var(--ink)' : 'var(--surface-3)'};color:${isActive ? 'var(--bg)' : 'var(--ink)'};border-radius:50%;flex:none;font-weight:700">${p.avatarLetter}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px">
              <b style="font-size:15px">${esc(profSettings.name || p.name)}</b>
              ${isActive ? '<span class="chip" style="font-size:11px;height:20px;padding:0 6px">Active</span>' : ''}
            </div>
            <div class="muted" style="font-size:12px">${esc(profSettings.email || p.email)}</div>
            <div class="faint" style="font-size:12px;margin-top:2px">Businesses: ${esc(bizNames)}</div>
          </div>
        </button>`;
      }).join('')}
    </div>
    <div class="sheet-actions" style="margin-top:20px">
      <button class="btn" id="prof-edit" type="button"><svg><use href="#i-gear"/></svg>Settings</button>
      <button class="btn primary" id="prof-done" type="button">Close</button>
    </div>`, sh => {
    sh.querySelector('#prof-done').onclick = closeSheet;
    sh.querySelector('#prof-edit').onclick = () => { closeSheet(); editSettings(); };
  });
}

function editSettings() {
  const st = S.settings;
  const pid = S.profileId || 'rahul';
  openSheet(`<h2>Settings</h2>
    <div class="field" style="margin-bottom:14px">
      <label style="display:block;margin-bottom:6px">Active Profile</label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${PROFILES.map(p => `<button type="button" class="btn small ${p.id === pid ? 'primary' : ''}" data-switchprofile="${p.id}">${esc(p.name)}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label for="s-name">Your name</label><input class="in" id="s-name" value="${esc(st.name)}"></div>
    <div class="field"><label for="s-email">Email</label><input class="in" id="s-email" value="${esc(st.email || '')}"></div>
    <div class="frow">
      <div class="field"><label for="s-ds">Work day starts</label><input class="in" type="time" id="s-ds" value="${st.dayStart}"></div>
      <div class="field"><label for="s-de">Work day ends</label><input class="in" type="time" id="s-de" value="${st.dayEnd}"></div>
    </div>
    <div class="frow">
      <div class="field"><label for="s-ps">Sharpest from</label><input class="in" type="time" id="s-ps" value="${st.peakStart}"></div>
      <div class="field"><label for="s-pe">Sharpest until</label><input class="in" type="time" id="s-pe" value="${st.peakEnd}"></div>
    </div>
    <div class="cal-note" style="margin:0">${S.mode === 'cloud' ? 'Your data syncs across your devices.' : 'Your data is saved securely in your browser.'}<br>Calendar: ${S.cal.state === 'ok' ? 'active' : 'ready'}</div>
    <div class="sheet-actions"><button class="btn danger left" id="s-reset" type="button">Reset businesses & data</button><button class="btn" id="s-cancel">Cancel</button><button class="btn primary" id="s-save">Save</button></div>`, sh => {
    sh.querySelector('#s-cancel').onclick = closeSheet;
    sh.querySelector('#s-reset').onclick = () => { closeSheet(); resetToDefaults(); };
    sh.querySelector('#s-save').onclick = () => {
      st.name = $('#s-name').value.trim() || 'Rahul';
      if ($('#s-email')) st.email = $('#s-email').value.trim();
      ['dayStart:s-ds','dayEnd:s-de','peakStart:s-ps','peakEnd:s-pe'].forEach(p => { const [k, id] = p.split(':'); const v = $('#' + id).value; if (validTime(v)) st[k] = v; });
      closeSheet(); saveSettings(); toast('Settings saved.');
    };
  });
}
