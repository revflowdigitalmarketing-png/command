/* Command · Edit pop-ups (items, clients, goals, payments, settings). */
/* ================= sheets ================= */
let closeSheetTimer = null;
function openSheet(html, onReady) {
  if (closeSheetTimer) {
    clearTimeout(closeSheetTimer);
    closeSheetTimer = null;
  }
  const sc = $('#scrim');
  sc.classList.remove('closing');
  sc.hidden = false;
  $('#sheet').innerHTML = html;
  onReady && onReady($('#sheet'));
  const f = $('#sheet').querySelector('input,select,textarea');
  f && setTimeout(() => f.focus(), 50);
}
function closeSheet() {
  const sc = $('#scrim');
  if (sc.hidden || sc.classList.contains('closing')) return;
  if (closeSheetTimer) clearTimeout(closeSheetTimer);
  sc.classList.add('closing');
  closeSheetTimer = setTimeout(() => {
    sc.classList.remove('closing');
    sc.hidden = true;
    $('#sheet').innerHTML = '';
    closeSheetTimer = null;
    if (typeof applyBannerForProfile === 'function') applyBannerForProfile(S.profileId || 'rahul');
  }, 190);
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
      <div class="field"><label for="f-person">${it.kind === 'payment' ? 'Payer / Rep' : 'Promised to'}</label><input class="in" id="f-person" value="${esc(it.person)}" placeholder="Person's name"></div>
      <div class="field"><label for="f-amount">${it.kind === 'payment' ? 'Amount Received (₹)' : 'Amount (₹)'}</label><input class="in mono" type="number" inputmode="numeric" id="f-amount" value="${it.amount || ''}" placeholder="0"></div>
    </div>
    ${it.kind === 'payment' ? `
    <div class="frow">
      <div class="field"><label for="f-tot">Total Retainer (₹)</label><input class="in mono" type="number" inputmode="numeric" id="f-tot" value="${it.totalRetainer || ''}" placeholder="50000"></div>
      <div class="field"><label for="f-share">Your Share (₹)</label><input class="in mono" type="number" inputmode="numeric" id="f-share" value="${it.yourShare !== undefined && it.yourShare !== null ? it.yourShare : ''}" placeholder="35000"></div>
    </div>` : ''}
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
      if ($('#f-tot')) it.totalRetainer = Number($('#f-tot').value) || 0;
      if ($('#f-share')) it.yourShare = Number($('#f-share').value) || 0;
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

function editFocusTask(id) {
  const it = id ? S.items.find(x => x.id === id) : makeItem({ kind:'task', isFocus: true, due: today(), priority:'med', category:'Video Editing' });
  if (!it) return;
  const isNew = !id;
  const curCat = it.category || 'Video Editing';
  openSheet(`<h2>${isNew ? 'New Focus Task' : 'Edit Focus Task'}</h2>
    <div class="field"><label for="ft-title">One line about the task</label><input class="in" id="ft-title" value="${esc(it.title)}" placeholder="e.g. Cut 3 short-form videos for RevFlow"></div>
    <div class="frow">
      <div class="field"><label for="ft-client">Client</label><select class="in" id="ft-client">${clientOptions(it.client)}</select></div>
      <div class="field"><label for="ft-cat">Type</label><select class="in" id="ft-cat">${FOCUS_CATEGORIES.map(c => `<option value="${c}" ${c === curCat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label for="ft-prio">Priority</label><select class="in" id="ft-prio"><option value="high" ${it.priority==='high'?'selected':''}>High</option><option value="med" ${it.priority==='med'?'selected':''}>Medium</option><option value="low" ${it.priority==='low'?'selected':''}>Low</option></select></div>
    <div class="field"><label for="ft-notes">Notes (optional)</label><textarea class="in" id="ft-notes" placeholder="Details or links">${esc(it.notes || '')}</textarea></div>
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn danger left" id="ft-del" type="button">Delete</button>`}
      <button class="btn" id="ft-cancel" type="button">Cancel</button>
      <button class="btn primary" id="ft-save" type="button">Save task</button>
    </div>`, sh => {
    const collect = () => {
      it.title = $('#ft-title').value.trim();
      it.client = $('#ft-client').value;
      it.category = $('#ft-cat').value;
      it.due = it.due || today();
      it.priority = $('#ft-prio').value;
      it.notes = $('#ft-notes').value;
      it.isFocus = true;
      it.kind = 'task';
      delete it.person;
      delete it.amount;
      return !!it.title;
    };
    sh.querySelector('#ft-save').onclick = async () => {
      if (!collect()) { toast('Write one line about the task first.'); return; }
      closeSheet();
      await saveItem(it);
      toast('Focus task saved.');
    };
    sh.querySelector('#ft-cancel').onclick = closeSheet;
    const del = sh.querySelector('#ft-del');
    if (del) del.onclick = () => {
      if (del.dataset.sure) { closeSheet(); removeItem(it.id); toast('Deleted.'); }
      else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; }
    };
  });
}

function editBusiness(id) {
  const b = id ? { ...(bizById(id) || {}) } : { id: newId(), name: '', kind: 'agency', tagline: '', cover: '' };
  const isNew = !id;
  openSheet(`<h2>${isNew ? 'New business' : 'Edit business'}</h2>
    <div class="field"><label for="b-name">Name</label><input class="in" id="b-name" value="${esc(b.name || '')}" placeholder="Business name"></div>
    <div class="frow">
      <div class="field"><label for="b-kind">Type</label><select class="in" id="b-kind"><option value="agency" ${b.kind==='agency'?'selected':''}>Agency (clients + retainers)</option><option value="product" ${b.kind==='product'?'selected':''}>App / Product idea</option></select></div>
      <div class="field"><label for="b-tag">Tagline / note</label><input class="in" id="b-tag" value="${esc(b.tagline || '')}" placeholder="What it does"></div>
    </div>
    <div class="field">
      <label>Cover image</label>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        <label class="btn small" style="cursor:pointer">
          <svg><use href="#i-image"/></svg>Upload cover photo
          <input type="file" accept="image/*" id="b-cover-file" style="display:none">
        </label>
        <input class="in" id="b-cover-url" style="flex:1" placeholder="Or paste image URL" value="${esc(b.cover || '')}">
      </div>
      <div id="b-cover-preview" class="cover-preview" style="${b.cover ? `background-image:url('${esc(b.cover)}')` : 'display:none'}">
        <button type="button" class="btn small danger" id="b-cover-rm">Remove cover</button>
      </div>
    </div>
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn danger left" id="b-del">Delete business</button>`}
      <button class="btn" id="b-cancel">Cancel</button>
      <button class="btn primary" id="b-save">Save business</button>
    </div>`, sh => {
    let currentCover = b.cover || '';
    const fileIn = sh.querySelector('#b-cover-file');
    const urlIn = sh.querySelector('#b-cover-url');
    const prev = sh.querySelector('#b-cover-preview');
    const rmBtn = sh.querySelector('#b-cover-rm');

    fileIn.onchange = async () => {
      const file = fileIn.files && fileIn.files[0];
      if (file) {
        try {
          currentCover = await readImageFile(file);
          urlIn.value = currentCover.slice(0, 30) + '...';
          prev.style.backgroundImage = `url('${currentCover}')`;
          prev.style.display = 'flex';
        } catch (e) {
          toast('Could not load image');
        }
      }
    };
    urlIn.oninput = () => {
      currentCover = urlIn.value.trim();
      if (currentCover) {
        prev.style.backgroundImage = `url('${currentCover}')`;
        prev.style.display = 'flex';
      } else {
        prev.style.display = 'none';
      }
    };
    rmBtn.onclick = () => {
      currentCover = '';
      urlIn.value = '';
      fileIn.value = '';
      prev.style.display = 'none';
    };

    sh.querySelector('#b-cancel').onclick = closeSheet;
    sh.querySelector('#b-save').onclick = () => {
      const name = $('#b-name').value.trim();
      if (!name) { toast('Name the business.'); return; }
      b.name = name;
      b.kind = $('#b-kind').value;
      b.tagline = $('#b-tag').value.trim();
      b.cover = currentCover;
      const list = S.settings.businesses || [];
      const idx = list.findIndex(x => x.id === b.id);
      if (idx >= 0) list[idx] = b;
      else list.push(b);
      S.settings.businesses = list;
      closeSheet();
      saveSettings();
      render();
      toast(isNew ? 'Business added.' : 'Business saved.');
    };
    const del = sh.querySelector('#b-del');
    if (del) del.onclick = () => {
      if (del.dataset.sure) {
        S.settings.businesses = (S.settings.businesses || []).filter(x => x.id !== b.id);
        if (S.biz === b.id) { S.biz = null; S.client = null; }
        closeSheet();
        saveSettings();
        render();
        toast('Business deleted.');
      } else {
        del.dataset.sure = '1';
        del.textContent = 'Tap again to delete';
      }
    };
  });
}

function openManageBusinesses() {
  const bList = businesses();
  openSheet(`<h2>Manage Businesses</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete businesses & cover photos</p>
      <button class="btn primary small" id="mb-add"><svg><use href="#i-plus"/></svg>Add business</button>
    </div>
    <div class="manage-list">
      ${bList.length ? bList.map(b => {
        const clCount = bizClients(b.id).length;
        const thumbStyle = b.cover ? `background-image:url('${esc(b.cover)}')` : '';
        return `<div class="manage-item">
          <div class="manage-thumb" style="${thumbStyle}">${b.cover ? '' : esc(b.name.charAt(0))}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <b style="font-size:14.5px">${esc(b.name)}</b>
              <span class="chip" style="font-size:10.5px;padding:0 6px">${b.kind === 'product' ? 'Product' : 'Agency'}</span>
            </div>
            <div class="faint" style="font-size:12px;margin-top:2px">${b.tagline ? esc(b.tagline) + ' · ' : ''}${b.kind === 'product' ? 'Apps & ideas' : `${clCount} client${clCount === 1 ? '' : 's'}`}</div>
          </div>
          <button class="btn small" data-editbiz="${b.id}"><svg><use href="#i-pen"/></svg>Edit</button>
          <button class="btn small danger" data-delbiz="${b.id}">Delete</button>
        </div>`;
      }).join('') : '<div class="empty">No businesses yet. Tap "Add business" above.</div>'}
    </div>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn primary" id="mb-close">Done</button>
    </div>`, sh => {
    sh.querySelector('#mb-close').onclick = closeSheet;
    sh.querySelector('#mb-add').onclick = () => { editBusiness(null); };
    sh.querySelectorAll('[data-editbiz]').forEach(btn => {
      btn.onclick = () => { editBusiness(btn.dataset.editbiz); };
    });
    sh.querySelectorAll('[data-delbiz]').forEach(btn => {
      btn.onclick = () => {
        const bid = btn.dataset.delbiz;
        if (btn.dataset.sure) {
          S.settings.businesses = (S.settings.businesses || []).filter(x => x.id !== bid);
          if (S.biz === bid) { S.biz = null; S.client = null; }
          saveSettings();
          render();
          toast('Business deleted.');
          openManageBusinesses();
        } else {
          btn.dataset.sure = '1';
          btn.textContent = 'Sure?';
        }
      };
    });
  });
}

function openManageClients(bizId = null) {
  const b = bizId && bizById(bizId);
  const clList = bizId ? bizClients(bizId) : clients();
  openSheet(`<h2>Manage Clients ${b ? '· ' + esc(b.name) : ''}</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete clients, retainers & covers</p>
      <button class="btn primary small" id="mc-add"><svg><use href="#i-plus"/></svg>Add client</button>
    </div>
    <div class="manage-list">
      ${clList.length ? clList.map(c => {
        const thumbStyle = c.cover ? `background-image:url('${esc(c.cover)}')` : '';
        const cbiz = bizById(clientBiz(c));
        return `<div class="manage-item">
          <div class="manage-thumb" style="${thumbStyle}">${c.cover ? '' : esc(c.short ? c.short.charAt(0) : c.name.charAt(0))}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <b style="font-size:14.5px">${esc(c.name)}</b>
              <span class="chip" style="font-size:10.5px;padding:0 6px">★ ${starsOf(c).toFixed(1)}</span>
            </div>
            <div class="muted" style="font-size:12px;margin-top:2px">
              ${cbiz ? esc(cbiz.name) + ' · ' : ''}Total: ${c.retainer ? inr(c.retainer) : '—'}${c.yourShare ? ` · Share: ${inr(c.yourShare)}` : ''}
            </div>
          </div>
          <button class="btn small" data-editclient="${c.id}"><svg><use href="#i-pen"/></svg>Edit</button>
          <button class="btn small danger" data-delclient="${c.id}">Delete</button>
        </div>`;
      }).join('') : '<div class="empty">No clients here yet. Tap "Add client" above.</div>'}
    </div>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn primary" id="mc-close">Done</button>
    </div>`, sh => {
    sh.querySelector('#mc-close').onclick = closeSheet;
    sh.querySelector('#mc-add').onclick = () => { editClient(null, bizId); };
    sh.querySelectorAll('[data-editclient]').forEach(btn => {
      btn.onclick = () => { editClient(btn.dataset.editclient); };
    });
    sh.querySelectorAll('[data-delclient]').forEach(btn => {
      btn.onclick = () => {
        const cid = btn.dataset.delclient;
        if (btn.dataset.sure) {
          S.settings.clients = (S.settings.clients || []).filter(x => x.id !== cid);
          if (S.client === cid) S.client = null;
          saveSettings();
          render();
          toast('Client deleted.');
          openManageClients(bizId);
        } else {
          btn.dataset.sure = '1';
          btn.textContent = 'Sure?';
        }
      };
    });
  });
}

function editClient(id, presetBiz = null) {
  const c = id ? { ...clientById(id) } : {
    id: newId(),
    name: '',
    short: '',
    stars: 4,
    retainer: 0,
    yourShare: 0,
    note: '',
    color: (S.settings.clients || []).length,
    signed: today(),
    biz: presetBiz || S.biz || clientBiz(null),
    cover: ''
  };
  const isNew = !id;
  const bizOptions = businesses().map(b => `<option value="${b.id}" ${b.id === c.biz ? 'selected' : ''}>${esc(b.name)}</option>`).join('');

  openSheet(`<h2>${isNew ? 'New client' : 'Edit client'}</h2>
    <div class="field"><label for="c-name">Company name</label><input class="in" id="c-name" value="${esc(c.name)}" placeholder="Company name"></div>
    <div class="frow">
      <div class="field"><label for="c-short">Short name</label><input class="in" id="c-short" value="${esc(c.short)}" placeholder="What you call them"></div>
      <div class="field"><label for="c-biz">Business</label><select class="in" id="c-biz">${bizOptions || '<option value="">No businesses</option>'}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="c-ret">Total Retainer (₹)</label><input class="in mono" type="number" inputmode="numeric" id="c-ret" value="${c.retainer || ''}" placeholder="50000"></div>
      <div class="field"><label for="c-share">Your Share (₹)</label><input class="in mono" type="number" inputmode="numeric" id="c-share" value="${c.yourShare !== undefined && c.yourShare !== null ? c.yourShare : ''}" placeholder="35000"></div>
    </div>
    <div class="frow">
      <div class="field"><label for="c-stars">Priority (stars)</label><select class="in" id="c-stars">${[5,4.5,4,3.5,3,2.5,2,1.5,1].map(v => `<option value="${v}" ${starsOf(c)===v?'selected':''}>${'★'.repeat(Math.floor(v))}${v % 1 ? '½' : ''}  ${v.toFixed(1)}</option>`).join('')}</select></div>
      <div class="field"><label for="c-signed">Contract signed</label><input class="in" type="date" id="c-signed" value="${c.signed || c.since || ''}"></div>
    </div>
    <div class="field"><label for="c-note">One-line note</label><input class="in" id="c-note" value="${esc(c.note)}" placeholder="What they do / what you handle"></div>
    <div class="field">
      <label>Cover image</label>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        <label class="btn small" style="cursor:pointer">
          <svg><use href="#i-image"/></svg>Upload cover photo
          <input type="file" accept="image/*" id="c-cover-file" style="display:none">
        </label>
        <input class="in" id="c-cover-url" style="flex:1" placeholder="Or paste image URL" value="${esc(c.cover || '')}">
      </div>
      <div id="c-cover-preview" class="cover-preview" style="${c.cover ? `background-image:url('${esc(c.cover)}')` : 'display:none'}">
        <button type="button" class="btn small danger" id="c-cover-rm">Remove cover</button>
      </div>
    </div>
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn danger left" id="c-del">Remove client</button>`}
      <button class="btn" id="c-cancel">Cancel</button>
      <button class="btn primary" id="c-save">Save client</button>
    </div>`, sh => {
    let currentCover = c.cover || '';
    const fileIn = sh.querySelector('#c-cover-file');
    const urlIn = sh.querySelector('#c-cover-url');
    const prev = sh.querySelector('#c-cover-preview');
    const rmBtn = sh.querySelector('#c-cover-rm');

    fileIn.onchange = async () => {
      const file = fileIn.files && fileIn.files[0];
      if (file) {
        try {
          currentCover = await readImageFile(file);
          urlIn.value = currentCover.slice(0, 30) + '...';
          prev.style.backgroundImage = `url('${currentCover}')`;
          prev.style.display = 'flex';
        } catch (e) {
          toast('Could not load image');
        }
      }
    };
    urlIn.oninput = () => {
      currentCover = urlIn.value.trim();
      if (currentCover) {
        prev.style.backgroundImage = `url('${currentCover}')`;
        prev.style.display = 'flex';
      } else {
        prev.style.display = 'none';
      }
    };
    rmBtn.onclick = () => {
      currentCover = '';
      urlIn.value = '';
      fileIn.value = '';
      prev.style.display = 'none';
    };

    sh.querySelector('#c-cancel').onclick = closeSheet;
    sh.querySelector('#c-save').onclick = () => {
      c.name = $('#c-name').value.trim();
      if (!c.name) { toast('Add the client name.'); return; }
      c.short = $('#c-short').value.trim();
      c.biz = $('#c-biz') ? $('#c-biz').value : c.biz;
      c.stars = Number($('#c-stars').value);
      c.retainer = Number($('#c-ret').value) || 0;
      c.yourShare = Number($('#c-share').value) || 0;
      c.signed = $('#c-signed').value;
      c.note = $('#c-note').value.trim();
      c.cover = currentCover;
      const list = S.settings.clients || [];
      const i = list.findIndex(x => x.id === c.id);
      if (i >= 0) list[i] = c;
      else list.push(c);
      S.settings.clients = list;
      closeSheet();
      saveSettings();
      render();
      toast('Client saved.');
    };
    const del = sh.querySelector('#c-del');
    if (del) del.onclick = () => {
      if (del.dataset.sure) {
        S.settings.clients = (S.settings.clients || []).filter(x => x.id !== c.id);
        if (S.client === c.id) S.client = null;
        closeSheet();
        saveSettings();
        render();
        toast('Client removed.');
      } else {
        del.dataset.sure = '1';
        del.textContent = 'Tap again to remove';
      }
    };
  });
}

function logPayment(clientId) {
  const c = clientById(clientId);
  const mon = new Date().toLocaleDateString('en-IN',{month:'long'});
  let status = 'received';
  openSheet(`<h2>Log payment${c ? ' · ' + esc(c.short || c.name) : ''}</h2>
    <div class="seg pay-seg" role="group" aria-label="Status"><button type="button" data-pst="received" aria-pressed="true">Received</button><button type="button" data-pst="pending" aria-pressed="false">Still pending</button></div>
    ${c ? '' : `<div class="field"><label for="p-client">Client</label><select class="in" id="p-client">${clients().map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>`}
    <div class="frow">
      <div class="field"><label for="p-tot">Total Retainer (₹)</label><input class="in mono" type="number" inputmode="numeric" id="p-tot" value="${c && c.retainer ? c.retainer : ''}" placeholder="50000"></div>
      <div class="field"><label for="p-share">Your Share (₹)</label><input class="in mono" type="number" inputmode="numeric" id="p-share" value="${c && c.yourShare !== undefined ? c.yourShare : (c && c.retainer ? c.retainer : '')}" placeholder="35000"></div>
    </div>
    <div class="frow">
      <div class="field"><label for="p-amt">Amount Received (₹)</label><input class="in mono" type="number" inputmode="numeric" id="p-amt" value="${c ? (c.yourShare || c.retainer || '') : ''}" placeholder="35000"></div>
      <div class="field"><label for="p-date" id="p-date-l">Date received</label><input class="in" type="date" id="p-date" value="${today()}"></div>
    </div>
    <div class="field"><label for="p-for">For</label><input class="in" id="p-for" value="${esc(mon)} retainer" placeholder="What this payment is for"></div>
    <div class="field"><label for="p-note">Note</label><input class="in" id="p-note" placeholder="UPI, bank transfer, invoice no."></div>
    <div class="sheet-actions"><button class="btn" id="p-cancel">Cancel</button><button class="btn primary" id="p-save">Save payment</button></div>`, sh => {
    
    const clSelect = sh.querySelector('#p-client');
    if (clSelect) {
      clSelect.onchange = () => {
        const curC = clientById(clSelect.value);
        if (curC) {
          if (curC.retainer) $('#p-tot').value = curC.retainer;
          if (curC.yourShare !== undefined) $('#p-share').value = curC.yourShare;
          if (curC.yourShare || curC.retainer) $('#p-amt').value = curC.yourShare || curC.retainer;
        }
      };
    }

    sh.querySelectorAll('[data-pst]').forEach(b => b.onclick = () => {
      status = b.dataset.pst; sh.querySelectorAll('[data-pst]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('#p-date-l').textContent = status === 'received' ? 'Date received' : 'Date';
    });
    sh.querySelector('#p-cancel').onclick = closeSheet;
    sh.querySelector('#p-save').onclick = async () => {
      const amt = Number($('#p-amt').value) || 0; if (!amt) { toast('Enter the amount.'); return; }
      const date = $('#p-date').value || today();
      const targetClientId = clientId || ($('#p-client') ? $('#p-client').value : '');
      const totRet = Number($('#p-tot').value) || 0;
      const yShare = Number($('#p-share').value) || 0;
      const it = makeItem({
        kind: 'payment',
        title: $('#p-for').value.trim() || 'Payment',
        client: targetClientId,
        amount: amt,
        totalRetainer: totRet,
        yourShare: yShare,
        due: date,
        priority: 'med',
        notes: $('#p-note').value.trim()
      });
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

function openManageFocus() {
  const focusItems = S.items.filter(i => (i.isFocus || i.kind === 'task') && i.kind !== 'promise' && i.kind !== 'glitch' && i.kind !== 'reel' && i.kind !== 'payment' && i.kind !== 'note');
  openSheet(`<h2>Manage Focus Tasks</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete focus items</p>
      <button class="btn primary small" id="mf-add"><svg><use href="#i-plus"/></svg>Add focus task</button>
    </div>
    <div class="manage-list">
      ${focusItems.length ? focusItems.map(it => {
        const c = clientById(it.client);
        const cat = it.category || 'Other';
        const isDone = it.status === 'done';
        return `<div class="manage-item ${isDone ? 'done' : ''}">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <b style="font-size:14.5px;${isDone ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(it.title)}</b>
              <span class="chip" style="font-size:10.5px;padding:0 6px">${esc(cat)}</span>
            </div>
            <div class="faint" style="font-size:12px;margin-top:2px">
              ${c ? esc(c.short || c.name) + ' · ' : ''}Status: ${isDone ? 'Done' : 'Open'}
            </div>
          </div>
          <button class="btn small" data-editfocustask="${it.id}"><svg><use href="#i-pen"/></svg>Edit</button>
          <button class="btn small danger" data-delfocus="${it.id}">Delete</button>
        </div>`;
      }).join('') : '<div class="empty">No focus tasks yet. Tap "Add focus task" above.</div>'}
    </div>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn primary" id="mf-close">Done</button>
    </div>`, sh => {
    sh.querySelector('#mf-close').onclick = closeSheet;
    sh.querySelector('#mf-add').onclick = () => { editFocusTask(null); };
    sh.querySelectorAll('[data-editfocustask]').forEach(btn => {
      btn.onclick = () => { editFocusTask(btn.dataset.editfocustask); };
    });
    sh.querySelectorAll('[data-delfocus]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.delfocus;
        if (btn.dataset.sure) {
          removeItem(id);
          toast('Task deleted.');
          openManageFocus();
        } else {
          btn.dataset.sure = '1';
          btn.textContent = 'Sure?';
        }
      };
    });
  });
}

function openManageGoals() {
  const gList = S.settings.goals || [];
  openSheet(`<h2>Manage Trip Goals</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete trip savings goals</p>
      <button class="btn primary small" id="mg-add"><svg><use href="#i-plus"/></svg>Add goal</button>
    </div>
    <div class="manage-list">
      ${gList.length ? gList.map(g => {
        return `<div class="manage-item">
          <div style="flex:1;min-width:0">
            <b style="font-size:14.5px">${esc(g.name)}</b>
            <div class="muted" style="font-size:12px;margin-top:2px">
              Target: ${inr(g.target)} · Saved: ${inr(g.saved || 0)} (${Math.round((g.saved||0)/g.target*100)}%)
            </div>
          </div>
          <button class="btn small" data-editgoal="${g.id}"><svg><use href="#i-pen"/></svg>Edit</button>
          <button class="btn small danger" data-delgoal="${g.id}">Delete</button>
        </div>`;
      }).join('') : '<div class="empty">No goals yet. Tap "Add goal" above.</div>'}
    </div>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn primary" id="mg-close">Done</button>
    </div>`, sh => {
    sh.querySelector('#mg-close').onclick = closeSheet;
    sh.querySelector('#mg-add').onclick = () => { editGoal(null); };
    sh.querySelectorAll('[data-editgoal]').forEach(btn => {
      btn.onclick = () => { editGoal(btn.dataset.editgoal); };
    });
    sh.querySelectorAll('[data-delgoal]').forEach(btn => {
      btn.onclick = () => {
        const gid = btn.dataset.delgoal;
        if (btn.dataset.sure) {
          S.settings.goals = (S.settings.goals || []).filter(x => x.id !== gid);
          saveSettings();
          toast('Goal deleted.');
          openManageGoals();
        } else {
          btn.dataset.sure = '1';
          btn.textContent = 'Sure?';
        }
      };
    });
  });
}

function openManageWishlist() {
  const wList = S.settings.wishlist || [];
  openSheet(`<h2>Manage Things to Buy</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete items on your wishlist</p>
      <button class="btn primary small" id="mw-add"><svg><use href="#i-plus"/></svg>Add item</button>
    </div>
    <div class="manage-list">
      ${wList.length ? wList.map(w => {
        return `<div class="manage-item ${w.bought ? 'done' : ''}">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <b style="font-size:14.5px;${w.bought ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(w.name)}</b>
              <span class="chip" style="font-size:10.5px;padding:0 6px">${esc(w.cat || 'General')}</span>
            </div>
            <div class="muted" style="font-size:12px;margin-top:2px">
              Cost: ${inr(w.cost)} · ${w.bought ? 'Bought' : 'Not bought'}
            </div>
          </div>
          <button class="btn small" data-editwish="${w.id}"><svg><use href="#i-pen"/></svg>Edit</button>
          <button class="btn small danger" data-delwish="${w.id}">Delete</button>
        </div>`;
      }).join('') : '<div class="empty">No items yet. Tap "Add item" above.</div>'}
    </div>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn primary" id="mw-close">Done</button>
    </div>`, sh => {
    sh.querySelector('#mw-close').onclick = closeSheet;
    sh.querySelector('#mw-add').onclick = () => { editWish(null); };
    sh.querySelectorAll('[data-editwish]').forEach(btn => {
      btn.onclick = () => { editWish(btn.dataset.editwish); };
    });
    sh.querySelectorAll('[data-delwish]').forEach(btn => {
      btn.onclick = () => {
        const wid = btn.dataset.delwish;
        if (btn.dataset.sure) {
          S.settings.wishlist = (S.settings.wishlist || []).filter(x => x.id !== wid);
          saveSettings();
          toast('Item deleted.');
          openManageWishlist();
        } else {
          btn.dataset.sure = '1';
          btn.textContent = 'Sure?';
        }
      };
    });
  });
}

function openManagePayments() {
  const pList = S.items.filter(i => i.kind === 'payment');
  openSheet(`<h2>Manage Payments</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Log, edit, or delete received and pending payments</p>
      <button class="btn primary small" id="mp-add"><svg><use href="#i-plus"/></svg>Log payment</button>
    </div>
    <div class="manage-list">
      ${pList.length ? pList.map(p => {
        const c = clientById(p.client);
        const isReceived = p.status === 'done';
        return `<div class="manage-item">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <b style="font-size:14.5px">${esc(p.title || 'Payment')}</b>
              <span class="chip ${isReceived ? 'fin' : ''}" style="font-size:10.5px;padding:0 6px">${isReceived ? 'Received' : 'Pending'}</span>
            </div>
            <div class="muted" style="font-size:12px;margin-top:2px">
              ${c ? esc(c.short || c.name) + ' · ' : ''}Amount: <b class="mono">${inr(p.amount || 0)}</b>
            </div>
          </div>
          <button class="btn small" data-edit="${p.id}"><svg><use href="#i-pen"/></svg>Edit</button>
          <button class="btn small danger" data-delpay="${p.id}">Delete</button>
        </div>`;
      }).join('') : '<div class="empty">No payments logged yet. Tap "Log payment" above.</div>'}
    </div>
    <div class="sheet-actions" style="margin-top:16px">
      <button class="btn primary" id="mp-close">Done</button>
    </div>`, sh => {
    sh.querySelector('#mp-close').onclick = closeSheet;
    sh.querySelector('#mp-add').onclick = () => { logPayment(''); };
    sh.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => { editItem(btn.dataset.edit); };
    });
    sh.querySelectorAll('[data-delpay]').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.delpay;
        if (btn.dataset.sure) {
          removeItem(pid);
          toast('Payment deleted.');
          openManagePayments();
        } else {
          btn.dataset.sure = '1';
          btn.textContent = 'Sure?';
        }
      };
    });
  });
}

function openBannerCustomizer() {
  const pid = S.profileId || 'rahul';
  const curBanner = lsGet(`cmd.banner_${pid}`, null) || (pid === 'sri-chandana' ? 'kung fu panda.jpg' : 'assets/banner.jpg');
  
  openSheet(`<h2>Customize Cover Banner</h2>
    <p class="muted" style="font-size:13px;margin-bottom:14px">Change the hero banner image at the top of your dashboard.</p>
    
    <div style="width:100%;aspect-ratio:16/7;border-radius:12px;background-image:url('${esc(curBanner)}');background-size:cover;background-position:center;border:1px solid var(--hair);box-shadow:0 8px 24px rgba(0,0,0,0.3);margin-bottom:16px;position:relative;overflow:hidden" id="banner-custom-preview">
      <span style="position:absolute;bottom:8px;right:8px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.65);font-size:11px;color:rgba(255,255,255,0.85);backdrop-filter:blur(6px)">Live preview</span>
    </div>

    <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px">
      <label class="btn small primary" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
        <svg><use href="#i-pen"/></svg>Upload custom picture
        <input type="file" id="banner-file-input" accept="image/*" style="display:none">
      </label>
      <input class="in" id="banner-url-input" placeholder="Or paste image URL" style="flex:1" value="${curBanner.startsWith('data:') ? '' : esc(curBanner)}">
    </div>

    <div class="field" style="margin-bottom:18px">
      <label style="display:block;margin-bottom:8px">Or Pick a Preset Picture</label>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <button type="button" class="btn small" data-setbanner="assets/banner.jpg" style="padding:6px 4px;font-size:11.5px">Golden Hour</button>
        <button type="button" class="btn small" data-setbanner="kung fu panda.jpg" style="padding:6px 4px;font-size:11.5px">Peach Tree</button>
        <button type="button" class="btn small" data-setbanner="assets/bali.jpg" style="padding:6px 4px;font-size:11.5px">Bali Beach</button>
        <button type="button" class="btn small" data-setbanner="assets/dubai.jpg" style="padding:6px 4px;font-size:11.5px">Dubai</button>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--surface-2);border-radius:12px;border:1px solid var(--hair);margin-bottom:16px">
      <div>
        <b style="font-size:13px;display:block">Web App Icon & Name</b>
        <span class="muted" style="font-size:11.5px">Customize icon before downloading</span>
      </div>
      <button type="button" class="btn small primary" id="banner-open-appicon"><svg><use href="#i-pen"/></svg>Customize</button>
    </div>

    <div class="sheet-actions">
      <button class="btn danger left" id="banner-reset" type="button">Reset default</button>
      <button class="btn" id="banner-cancel" type="button">Cancel</button>
      <button class="btn primary" id="banner-save" type="button">Apply Picture</button>
    </div>`, sh => {
    let pendingBanner = curBanner;

    const updatePreviewAndSite = url => {
      pendingBanner = url;
      const prevEl = sh.querySelector('#banner-custom-preview');
      if (prevEl) prevEl.style.backgroundImage = `url('${url}')`;
      $$('.banner').forEach(b => {
        b.style.setProperty('background-image', `url('${url}')`, 'important');
        b.style.setProperty('background-position', 'center center', 'important');
        b.style.setProperty('background-size', 'cover', 'important');
      });
    };

    sh.querySelector('#banner-cancel').onclick = () => {
      applyBannerForProfile(pid);
      closeSheet();
    };

    sh.querySelector('#banner-file-input').onchange = async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await readImageFile(file, 1600, 900);
        updatePreviewAndSite(dataUrl);
        toast('Picture loaded in preview! Tap "Apply Picture" to save.');
      } catch (err) {
        toast('Could not load image: ' + err.message);
      }
    };

    sh.querySelector('#banner-url-input').oninput = e => {
      const val = e.target.value.trim();
      if (val) {
        updatePreviewAndSite(val);
      }
    };

    sh.querySelectorAll('[data-setbanner]').forEach(btn => {
      btn.onclick = () => {
        updatePreviewAndSite(btn.dataset.setbanner);
      };
    });

    sh.querySelector('#banner-open-appicon').onclick = () => {
      applyBannerForProfile(pid);
      closeSheet();
      openIconCustomizer();
    };

    sh.querySelector('#banner-reset').onclick = () => {
      lsSet(`cmd.banner_${pid}`, null);
      applyBannerForProfile(pid);
      closeSheet();
      renderHome();
      toast('Banner reset to default.');
    };

    sh.querySelector('#banner-save').onclick = () => {
      lsSet(`cmd.banner_${pid}`, pendingBanner);
      applyBannerForProfile(pid);
      closeSheet();
      toast('Banner picture updated!');
    };
  });
}

function openIconCustomizer() {
  const curName = lsGet('cmd.app_name', 'My Dashboard');
  const curIcon = lsGet('cmd.custom_icon', 'icon-192.png');
  openSheet(`<h2>Customize App Picture & Name</h2>
    <p class="muted" style="font-size:13px;margin-bottom:16px">Personalize the dashboard picture and app title before installing/downloading the web app.</p>
    
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:var(--surface-2);border-radius:14px;border:1px solid var(--hair)">
      <img id="custom-icon-preview" src="${esc(curIcon)}" alt="App Icon Preview" style="width:68px;height:68px;border-radius:16px;box-shadow:0 6px 20px rgba(0,0,0,0.3);object-fit:cover;background:#0c0d11;flex-shrink:0">
      <div style="flex:1;min-width:0">
        <b style="font-size:15px;display:block" id="custom-name-preview">${esc(curName)}</b>
        <span class="muted" style="font-size:12px">Web App Icon (192×192 / 512×512)</span>
        <div style="margin-top:8px">
          <label class="btn small primary" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
            <svg><use href="#i-pen"/></svg>Upload custom picture
            <input type="file" id="icon-file-input" accept="image/*" style="display:none">
          </label>
        </div>
      </div>
    </div>

    <div class="field">
      <label for="custom-app-name">App Name</label>
      <input class="in" id="custom-app-name" value="${esc(curName)}" placeholder="My Dashboard">
    </div>

    <div class="field" style="margin-top:14px">
      <label style="display:block;margin-bottom:8px">Or Pick a Preset Picture</label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        <button type="button" class="btn small" data-setpreseticon="default" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:4px;background:var(--ink);display:inline-block"></span>Dashboard</button>
        <button type="button" class="btn small" data-setpreseticon="galaxy" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:4px;background:var(--muted);display:inline-block"></span>Galaxy</button>
        <button type="button" class="btn small" data-setpreseticon="panda" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:4px;background:var(--surface-3);border:1px solid var(--hair);display:inline-block"></span>Panda</button>
      </div>
    </div>

    <div class="sheet-actions" style="margin-top:20px">
      <button class="btn" id="custom-cancel" type="button">Cancel</button>
      <button class="btn primary" id="custom-save" type="button">Save & Apply Picture</button>
    </div>`, sh => {
    let pendingIcon = curIcon;

    sh.querySelector('#custom-cancel').onclick = closeSheet;

    sh.querySelector('#custom-app-name').oninput = e => {
      sh.querySelector('#custom-name-preview').textContent = e.target.value.trim() || 'My Dashboard';
    };

    sh.querySelector('#icon-file-input').onchange = async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await readImageFile(file, 512, 512);
        pendingIcon = dataUrl;
        sh.querySelector('#custom-icon-preview').src = dataUrl;
        toast('Picture loaded. Tap "Save & Apply Picture" to confirm.');
      } catch (err) {
        toast('Could not load image: ' + err.message);
      }
    };

    sh.querySelectorAll('[data-setpreseticon]').forEach(btn => {
      btn.onclick = () => {
        const p = btn.dataset.setpreseticon;
        if (p === 'galaxy') pendingIcon = 'galaxy.png';
        else if (p === 'panda') pendingIcon = 'kung fu panda.jpg';
        else pendingIcon = 'icon-192.png';
        sh.querySelector('#custom-icon-preview').src = pendingIcon;
      };
    });

    sh.querySelector('#custom-save').onclick = () => {
      const newName = sh.querySelector('#custom-app-name').value.trim() || 'My Dashboard';
      applyCustomAppBranding(newName, pendingIcon);
      closeSheet();
      toast('Custom picture applied! You can now download the web app.');
    };
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
    
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface-2);border-radius:12px;border:1px solid var(--hair);margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${esc(lsGet('cmd.custom_icon', 'icon-192.png'))}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;background:#0c0d11">
        <div>
          <b style="font-size:13.5px;display:block">${esc(lsGet('cmd.app_name', 'My Dashboard'))}</b>
          <span class="faint" style="font-size:11.5px">Customize icon & app name</span>
        </div>
      </div>
      <button type="button" class="btn small primary" id="s-customize-icon"><svg><use href="#i-pen"/></svg>Customize</button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface-2);border-radius:12px;border:1px solid var(--hair);margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-3);display:grid;place-items:center;color:var(--ink)"><svg style="width:18px;height:18px"><use href="#i-bell"/></svg></div>
        <div>
          <b style="font-size:13.5px;display:block">Deadline & Post Reminders</b>
          <span class="faint" style="font-size:11.5px">Dynamic alerts & reminder lead times</span>
        </div>
      </div>
      <button type="button" class="btn small primary" id="s-open-reminders"><svg><use href="#i-gear"/></svg>Configure</button>
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
    sh.querySelector('#s-customize-icon').onclick = () => { closeSheet(); openIconCustomizer(); };
    sh.querySelector('#s-open-reminders').onclick = () => { closeSheet(); openNotificationSettingsSheet(); };
    sh.querySelector('#s-save').onclick = () => {
      st.name = $('#s-name').value.trim() || 'Rahul';
      if ($('#s-email')) st.email = $('#s-email').value.trim();
      ['dayStart:s-ds','dayEnd:s-de','peakStart:s-ps','peakEnd:s-pe'].forEach(p => { const [k, id] = p.split(':'); const v = $('#' + id).value; if (validTime(v)) st[k] = v; });
      closeSheet(); saveSettings(); toast('Settings saved.');
    };
  });
}


function openInboxSheet() {
  const myPid = S.profileId || 'rahul';
  const profName = S.settings.name || (myPid === 'sri-chandana' ? 'Chandana' : myPid === 'adithya' ? 'Adithya' : 'Rahul');
  const items = getInboxItemsForProfile(myPid);
  const unread = items.filter(i => i.status !== 'done').length;

  openSheet(`<h2>Inbox · ${esc(profName)}</h2>
    <p class="muted" style="font-size:13px;margin-bottom:16px">Tasks and promises sent to you from teammates (${items.length} total, ${unread} open)</p>
    <div id="inbox-list" style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto;padding-right:4px">
      ${items.length ? items.map(it => {
        const sender = it.fromProfileId === 'sri-chandana' ? 'Chandana' : it.fromProfileId === 'adithya' ? 'Adithya' : 'Rahul';
        const c = clientById(it.client);
        const d = dueLabel(it.due);
        const isDone = it.status === 'done';
        return `<div class="card ${isDone ? 'done' : ''}" style="padding:12px 14px;display:flex;align-items:flex-start;gap:12px;opacity:${isDone ? 0.6 : 1}">
          <button class="check" data-inboxtoggle="${it.id}" style="margin-top:2px" aria-label="${isDone ? 'Mark open' : 'Mark done'}"><svg><use href="#i-check"/></svg></button>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="chip" style="font-size:11px;padding:1px 6px;background:var(--surface-3);font-weight:600">From ${esc(sender)}</span>
              ${c ? `<span class="chip" style="font-size:11px;padding:1px 6px">${esc(c.short || c.name)}</span>` : ''}
              ${d.text ? `<span class="faint" style="font-size:12px">${esc(d.text)}</span>` : ''}
            </div>
            <div style="font-size:14.5px;font-weight:600;margin-top:5px;${isDone ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(it.title)}</div>
            ${it.notes ? `<div class="faint" style="font-size:12.5px;margin-top:4px">${esc(it.notes)}</div>` : ''}
          </div>
          <span class="chip ${isDone ? 'fin' : ''}" style="font-size:11px;flex:none">${isDone ? 'Kept' : 'Open'}</span>
        </div>`;
      }).join('') : `<div class="empty">No tasks or promises sent to you yet.<br><span class="faint" style="font-size:12px">When a team member selects "To whom: ${esc(profName)}", it will show up here.</span></div>`}
    </div>
    <div class="sheet-actions" style="margin-top:20px">
      <button class="btn primary" id="inbox-done" type="button">Close</button>
    </div>`, sh => {
    sh.querySelector('#inbox-done').onclick = closeSheet;
  });
}
