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
const clientOptions = sel => `<option value="">Client</option>` + clients().map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

function editItem(id, preset) {
  const existing = id ? S.items.find(x => x.id === id) : null;
  if (existing && existing.kind === 'payment') {
    editPayment(id, preset);
    return;
  }
  if (!id && preset && preset.kind === 'payment') {
    editPayment(null, preset);
    return;
  }
  const it = existing || makeItem(preset || {});
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
    if (del) del.onclick = () => {
      const curPid = (S && S.profileId) || 'rahul';
      const coOwners = [];
      if (it.person) {
        const targetPid = profileIdForPerson(it.person);
        if (targetPid && targetPid !== curPid && !coOwners.includes(targetPid)) coOwners.push(targetPid);
      }
      if (it.client) {
        const clOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(it.client, curPid) : [];
        clOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
      }
      if (it.biz) {
        const bizOwners = typeof getCoOwnersForBusiness === 'function' ? getCoOwnersForBusiness(it.biz, curPid) : [];
        bizOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
      }
      if (coOwners.length > 0) {
        closeSheet();
        alertCoOwnerDeletion(it.title, coOwners, 'task', it.id);
        return;
      }
      if (del.dataset.sure) { closeSheet(); removeItem(it.id); toast('Deleted.'); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; }
    };
  });
}

function editFocusTask(id) {
  const it = id ? S.items.find(x => x.id === id) : makeItem({ kind:'task', isFocus: true, due: today(), priority:'med', category:'Video Editing' });
  if (!it) return;
  const isNew = !id;
  const curCat = it.category || 'Video Editing';
  const curBiz = taskBiz(it);
  const curClient = it.client || '';
  const bList = businesses();
  const bizOptions = `<option value="">General / No business</option>` + bList.map(b => `<option value="${b.id}" ${b.id === curBiz ? 'selected' : ''}>${esc(b.name)} (${b.kind === 'product' ? 'App' : 'Agency'})</option>`).join('');

  openSheet(`<h2>${isNew ? 'New Focus Task' : 'Edit Focus Task'}</h2>
    <div class="field"><label for="ft-title">One line about the task</label><input class="in" id="ft-title" value="${esc(it.title)}" placeholder="e.g. Cut 3 short-form videos for RevFlow"></div>
    <div class="frow">
      <div class="field"><label for="ft-biz">Business</label><select class="in" id="ft-biz">${bizOptions}</select></div>
      <div class="field"><label for="ft-client">Client</label><select class="in" id="ft-client">${clientOptions(curClient)}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="ft-cat">Type</label><select class="in" id="ft-cat">${FOCUS_CATEGORIES.map(c => `<option value="${c}" ${c === curCat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="ft-prio">Priority</label><select class="in" id="ft-prio"><option value="high" ${it.priority==='high'?'selected':''}>High</option><option value="med" ${it.priority==='med'?'selected':''}>Medium</option><option value="low" ${it.priority==='low'?'selected':''}>Low</option></select></div>
    </div>
    <div class="field"><label for="ft-notes">Notes (optional)</label><textarea class="in" id="ft-notes" placeholder="Details or links">${esc(it.notes || '')}</textarea></div>
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn danger left" id="ft-del" type="button">Delete</button>`}
      <button class="btn" id="ft-cancel" type="button">Cancel</button>
      <button class="btn primary" id="ft-save" type="button">Save task</button>
    </div>`, sh => {
    const clSel = sh.querySelector('#ft-client');
    const bizSel = sh.querySelector('#ft-biz');
    if (clSel && bizSel) {
      clSel.onchange = () => {
        const c = clientById(clSel.value);
        if (c && c.biz) {
          bizSel.value = c.biz;
        }
      };
    }

    const collect = () => {
      it.title = $('#ft-title').value.trim();
      it.biz = $('#ft-biz').value;
      it.client = $('#ft-client').value;
      if (!it.biz && it.client) {
        const c = clientById(it.client);
        if (c && c.biz) it.biz = c.biz;
      }
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
      const curPid = (S && S.profileId) || 'rahul';
      const coOwners = [];
      if (it.person) {
        const targetPid = profileIdForPerson(it.person);
        if (targetPid && targetPid !== curPid && !coOwners.includes(targetPid)) coOwners.push(targetPid);
      }
      if (it.client) {
        const clOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(it.client, curPid) : [];
        clOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
      }
      if (it.biz) {
        const bizOwners = typeof getCoOwnersForBusiness === 'function' ? getCoOwnersForBusiness(it.biz, curPid) : [];
        bizOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
      }
      if (coOwners.length > 0) {
        closeSheet();
        alertCoOwnerDeletion(it.title, coOwners, 'task', it.id);
        return;
      }
      if (del.dataset.sure) { closeSheet(); removeItem(it.id); toast('Deleted.'); }
      else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; }
    };
  });
}

function editBusiness(id) {
  const b = id ? { ...(bizById(id) || {}) } : {
    id: newId(),
    name: '',
    kind: 'agency',
    tagline: '',
    cover: '',
    members: ['rahul', 'sri-chandana', 'adithya']
  };
  const isNew = !id;
  const currentMembers = b.members || (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);

  openSheet(`<h2>${isNew ? 'New business' : 'Edit business'}</h2>
    <div class="field"><label for="b-name">Name</label><input class="in" id="b-name" value="${esc(b.name || '')}" placeholder="Business name"></div>
    <div class="frow">
      <div class="field"><label for="b-kind">Type</label><select class="in" id="b-kind"><option value="agency" ${b.kind==='agency'?'selected':''}>Agency (clients + retainers)</option><option value="product" ${b.kind==='product'?'selected':''}>App / Product idea</option></select></div>
      <div class="field"><label for="b-tag">Tagline / note</label><input class="in" id="b-tag" value="${esc(b.tagline || '')}" placeholder="What it does"></div>
    </div>

    <!-- Who is doing this business -->
    <div class="field" style="margin-top:6px">
      <label>Who is doing this business?</label>
      <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap">
        ${PROFILES.map(p => {
          const isChecked = currentMembers.includes(p.id);
          return `<label class="card biz-mem-card" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;font-size:13px;border-radius:10px;background:${isChecked ? 'var(--surface-3)' : 'var(--surface-2)'};user-select:none">
            <input type="checkbox" name="biz-member" value="${p.id}" ${isChecked ? 'checked' : ''} style="accent-color:var(--ink);cursor:pointer">
            <span style="font-weight:600">${esc(p.name)}</span>
          </label>`;
        }).join('')}
      </div>
      <span class="faint" style="font-size:11.5px;margin-top:4px;display:block">Selected members will have this business & its clients in their profile.</span>
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

    sh.querySelectorAll('input[name="biz-member"]').forEach(cb => {
      cb.onchange = () => {
        const card = cb.closest('.biz-mem-card');
        if (card) card.style.borderColor = cb.checked ? 'var(--ink)' : 'var(--hair)';
      };
    });

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
      const selectedMembers = Array.from(sh.querySelectorAll('input[name="biz-member"]:checked')).map(cb => cb.value);
      if (!selectedMembers.length) { toast('Select at least one member doing this business.'); return; }
      const curPid = (S && S.profileId) || 'rahul';
      if (!isNew) {
        const initialMembers = b.members || (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
        const removedOthers = initialMembers.filter(m => m !== curPid && !selectedMembers.includes(m));
        if (removedOthers.length > 0) {
          removedOthers.forEach(m => {
            if (!selectedMembers.includes(m)) selectedMembers.push(m);
          });
          b.name = name;
          b.kind = $('#b-kind').value;
          b.tagline = $('#b-tag').value.trim();
          b.members = selectedMembers;
          b.cover = currentCover;
          if (typeof saveMasterBusiness === 'function') saveMasterBusiness(b);
          else saveSettings();
          closeSheet();
          render();
          alertCoOwnerDeletion(b.name, removedOthers, 'business', b.id);
          return;
        }
      }
      b.name = name;
      b.kind = $('#b-kind').value;
      b.tagline = $('#b-tag').value.trim();
      b.members = selectedMembers;
      b.cover = currentCover;
      const list = typeof allMasterBusinesses === 'function' ? allMasterBusinesses() : (S.settings.businesses || []);
      const idx = list.findIndex(x => x.id === b.id);
      if (idx >= 0) list[idx] = b;
      else list.push(b);
      S.settings.businesses = list;
      if (typeof recordHistory === 'function') {
        recordHistory({
          action: isNew ? 'add' : 'edit',
          category: 'business',
          title: b.name,
          details: (b.kind === 'product' ? 'Product / App' : 'Agency') + ` · Doing: ${selectedMembers.map(m => profileName(m)).join(', ')}`
        });
      }
      closeSheet();
      if (typeof saveMasterBusiness === 'function') {
        saveMasterBusiness(b);
      } else {
        saveSettings();
      }
      render();
      toast(isNew ? 'Business added.' : 'Business saved.');
    };
    const del = sh.querySelector('#b-del');
    if (del) del.onclick = () => {
      closeSheet();
      promptDeleteBusiness(b.id);
    };
  });
}

function promptDeleteBusiness(bid) {
  const targetBiz = (typeof allMasterBusinesses === 'function' ? allMasterBusinesses() : (S.settings.businesses || [])).find(x => x.id === bid);
  if (!targetBiz) return;

  const currentMembers = targetBiz.members || (targetBiz.id === 'biz-larping' || (targetBiz.name && targetBiz.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
  const curPid = (S && S.profileId) || 'rahul';

  openSheet(`<h2>Delete business · ${esc(targetBiz.name)}</h2>
    <p class="muted" style="font-size:13px;margin:0 0 14px">Select which of the three members to remove or delete this business from:</p>
    
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      ${PROFILES.map(p => {
        const isDoing = currentMembers.includes(p.id);
        return `<label class="card biz-del-mem-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;cursor:pointer;background:var(--surface-2);user-select:none">
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" name="del-biz-profile" value="${p.id}" ${isDoing ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--ink);cursor:pointer">
            <div>
              <b style="font-size:14px;display:block">${esc(p.name)}</b>
              <span class="faint" style="font-size:11.5px">${p.email}</span>
            </div>
          </div>
          <span class="chip" style="font-size:11px;padding:2px 8px">${isDoing ? 'Doing business' : 'Not in profile'}</span>
        </label>`;
      }).join('')}
    </div>

    <div class="cal-note" style="margin:0 0 16px;font-size:12px;line-height:1.5">
      <b>Deletion Rules:</b><br>
      • Removing from yourself will immediately remove this business & its clients from your profile.<br>
      • Deleting from another member who has control will send them a confirmation message first.<br>
      • Deleting from all members will delete this business completely.
    </div>

    <div class="sheet-actions">
      <button class="btn" id="del-biz-cancel">Cancel</button>
      <button class="btn danger" id="del-biz-confirm">Delete from selected profiles</button>
    </div>`, sh => {
    sh.querySelector('#del-biz-cancel').onclick = () => {
      openManageBusinesses();
    };

    sh.querySelectorAll('input[name="del-biz-profile"]').forEach(cb => {
      cb.onchange = () => {
        const card = cb.closest('.biz-del-mem-card');
        if (card) card.style.borderColor = cb.checked ? 'var(--ink)' : 'var(--hair)';
      };
    });

    sh.querySelector('#del-biz-confirm').onclick = () => {
      const selectedPids = Array.from(sh.querySelectorAll('input[name="del-biz-profile"]:checked')).map(cb => cb.value);
      if (!selectedPids.length) {
        toast('Select at least one profile to remove or delete this business from.');
        return;
      }

      // Check if other co-owners were selected to be deleted
      const otherCoOwnersToDelete = selectedPids.filter(p => p !== curPid && currentMembers.includes(p));

      // Check if current user is selected to be deleted
      const removeSelf = selectedPids.includes(curPid) && currentMembers.includes(curPid);

      if (otherCoOwnersToDelete.length > 0) {
        // If other co-owners are selected, do not directly delete from their profile:
        // Alert exact required message and send confirmation request
        closeSheet();
        alertCoOwnerDeletion(targetBiz.name, otherCoOwnersToDelete, 'business', targetBiz.id);

        // If self was also selected, remove self immediately
        if (removeSelf) {
          targetBiz.members = currentMembers.filter(m => m !== curPid);
          if (typeof saveMasterBusiness === 'function') {
            saveMasterBusiness(targetBiz);
          } else {
            saveSettings();
          }
          if (S.biz === targetBiz.id) { S.biz = null; S.client = null; }
          render();
          toast(`Removed ${targetBiz.name} from your profile.`);
        }
        return;
      }

      // Only self is being removed, or business was only done by self:
      closeSheet();
      const remaining = currentMembers.filter(m => !selectedPids.includes(m));

      if (remaining.length === 0) {
        // All members removed -> Delete business entirely!
        if (typeof recordHistory === 'function') {
          recordHistory({
            action: 'delete',
            category: 'business',
            title: targetBiz.name
          });
        }
        if (typeof deleteMasterBusiness === 'function') {
          deleteMasterBusiness(targetBiz.id);
        } else {
          const delBiz = lsGet('cmd.deleted_biz', []);
          if (!delBiz.includes(targetBiz.id)) delBiz.push(targetBiz.id);
          lsSet('cmd.deleted_biz', delBiz);
          S.settings.businesses = (S.settings.businesses || []).filter(x => x.id !== targetBiz.id);
          saveSettings();
        }
        if (S.biz === targetBiz.id) { S.biz = null; S.client = null; }
        render();
        toast('Business deleted.');
        openManageBusinesses();
      } else {
        targetBiz.members = remaining;
        if (typeof saveMasterBusiness === 'function') {
          saveMasterBusiness(targetBiz);
        } else {
          saveSettings();
        }
        if (removeSelf && S.biz === targetBiz.id) { S.biz = null; S.client = null; }
        render();
        toast(`Removed ${targetBiz.name} from your profile.`);
        openManageBusinesses();
      }
    };
  });
}

function openManageBusinesses() {
  const bList = typeof allMasterBusinesses === 'function' ? allMasterBusinesses() : businesses();
  const curPid = (S && S.profileId) || 'rahul';
  openSheet(`<h2>Manage Businesses</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or select which members are doing each business</p>
      <button class="btn primary small" id="mb-add"><svg><use href="#i-plus"/></svg>Add business</button>
    </div>
    <div class="manage-list">
      ${bList.length ? bList.map(b => {
        const clCount = bizClients(b.id).length;
        const thumbStyle = b.cover ? `background-image:url('${esc(b.cover)}')` : '';
        const members = b.members || (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
        return `<div class="manage-item" style="flex-direction:column;align-items:stretch;gap:10px;padding:12px 14px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="manage-thumb" style="${thumbStyle}">${b.cover ? '' : esc(b.name.charAt(0))}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <b style="font-size:15px">${esc(b.name)}</b>
                <span class="chip" style="font-size:10.5px;padding:0 6px">${b.kind === 'product' ? 'Product' : 'Agency'}</span>
              </div>
              <div class="faint" style="font-size:12px;margin-top:2px">
                ${b.tagline ? esc(b.tagline) + ' · ' : ''}${b.kind === 'product' ? 'Apps & ideas' : `${clCount} client${clCount === 1 ? '' : 's'}`}
              </div>
            </div>
            <button class="btn small" data-editbiz="${b.id}"><svg><use href="#i-pen"/></svg>Edit</button>
            <button class="btn small danger" data-delbiz="${b.id}">Delete</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:8px">
            <span style="font-size:12px;color:var(--faint);font-weight:600">Doing this business (added to profile):</span>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${PROFILES.map(p => {
                const isDoing = members.includes(p.id);
                return `<label class="biz-chip-select" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;background:${isDoing ? 'var(--surface-3)' : 'var(--surface-2)'};color:${isDoing ? 'var(--ink)' : 'var(--faint)'};user-select:none;transition:all 0.15s ease">
                  <input type="checkbox" data-bizid="${b.id}" data-pid="${p.id}" ${isDoing ? 'checked' : ''} style="cursor:pointer;accent-color:var(--ink);width:13px;height:13px;margin:0">
                  <span>${esc(p.name)}</span>
                </label>`;
              }).join('')}
            </div>
          </div>
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
    sh.querySelectorAll('input[data-bizid][data-pid]').forEach(cb => {
      cb.onchange = () => {
        const bid = cb.dataset.bizid;
        const pid = cb.dataset.pid;
        const targetBiz = (typeof allMasterBusinesses === 'function' ? allMasterBusinesses() : (S.settings.businesses || [])).find(x => x.id === bid);
        if (!targetBiz) return;

        let curMembers = targetBiz.members || (targetBiz.id === 'biz-larping' || (targetBiz.name && targetBiz.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
        curMembers = [...curMembers];

        if (cb.checked) {
          if (!curMembers.includes(pid)) curMembers.push(pid);
          targetBiz.members = curMembers;
          if (typeof saveMasterBusiness === 'function') {
            saveMasterBusiness(targetBiz);
          } else {
            saveSettings();
          }
          render();
          toast(`Added ${targetBiz.name} to ${profileName(pid)}'s profile.`);
          openManageBusinesses();
        } else {
          // If attempting to remove another user who also has control over this business:
          if (pid !== curPid && curMembers.includes(pid)) {
            cb.checked = true; // revert checkbox
            alertCoOwnerDeletion(targetBiz.name, [pid], 'business', targetBiz.id);
            return;
          }

          // If unchecking oneself and only oneself remains:
          if (curMembers.length <= 1) {
            promptDeleteBusiness(bid);
            return;
          }

          targetBiz.members = curMembers.filter(m => m !== pid);
          if (typeof saveMasterBusiness === 'function') {
            saveMasterBusiness(targetBiz);
          } else {
            saveSettings();
          }
          if (S.biz === bid && pid === curPid) { S.biz = null; S.client = null; }
          render();
          toast(`Removed ${targetBiz.name} from ${profileName(pid)}'s profile.`);
          openManageBusinesses();
        }
      };
    });
    sh.querySelectorAll('[data-delbiz]').forEach(btn => {
      btn.onclick = () => {
        const bid = btn.dataset.delbiz;
        promptDeleteBusiness(bid);
      };
    });
  });
}

function openManageClients(bizId = null) {
  const b = bizId && bizById(bizId);
  const clList = bizId ? bizClients(bizId) : clients();
  const retClients = clList.filter(c => Number(c.retainer) > 0 && !c.oneTime);
  const oneTimeClients = clList.filter(c => Number(c.oneTime) > 0);
  const otherClients = clList.filter(c => !c.oneTime && !c.retainer);

  const renderManageItem = (c) => {
    const thumbStyle = c.cover ? `background-image:url('${esc(c.cover)}')` : '';
    const cbiz = bizById(clientBiz(c));
    const isOneTime = Number(c.oneTime) > 0;
    const curPid = (S && S.profileId) || 'rahul';
    const curS = clientShare(c, curPid);
    const teamMembers = typeof getTeamMembersForClient === 'function' ? getTeamMembersForClient(c) : PROFILES;
    const otherMembers = teamMembers.filter(m => m.id !== curPid);
    const shareParts = [];
    if (curS) shareParts.push(`Your share: ${inr(curS)}${isOneTime ? ' (Fixed)' : ' / mo'}`);
    otherMembers.forEach(m => {
      const s = clientShare(c, m.id);
      if (s) shareParts.push(`${esc(m.name)}: ${inr(s)}${isOneTime ? ' (Fixed)' : ' / mo'}`);
    });
    const sharesText = shareParts.length ? ` · ${shareParts.join(' · ')}` : '';
    const pricingText = c.retainer
      ? `${inr(c.retainer)} / mo`
      : (c.oneTime ? inr(c.oneTime) : 'No pricing set');

    return `<div class="manage-item">
      <div class="manage-thumb" style="${thumbStyle}">${c.cover ? '' : esc(c.short ? c.short.charAt(0) : c.name.charAt(0))}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <b style="font-size:14.5px">${esc(c.name)}</b>
          <span class="chip" style="font-size:10.5px;padding:0 6px">★ ${starsOf(c).toFixed(1)}</span>
        </div>
        <div class="muted" style="font-size:12px;margin-top:2px">
          ${cbiz ? esc(cbiz.name) + ' · ' : ''}${pricingText}${sharesText}
        </div>
      </div>
      <button class="btn small" data-editclient="${c.id}"><svg><use href="#i-pen"/></svg>Edit</button>
      <button class="btn small danger" data-delclient="${c.id}">Delete</button>
    </div>`;
  };

  let listContentHtml = '';
  if (!clList.length) {
    listContentHtml = '<div class="empty">No clients here yet. Tap "Add client" above.</div>';
  } else {
    listContentHtml = clList.map(renderManageItem).join('');
  }

  openSheet(`<h2>Manage Clients ${b ? '· ' + esc(b.name) : ''}</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete clients, retainers & covers</p>
      <button class="btn primary small" id="mc-add"><svg><use href="#i-plus"/></svg>Add client</button>
    </div>
    <div class="manage-list">
      ${listContentHtml}
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
        const targetCl = clientById(cid) || (typeof allMasterClients === 'function' ? allMasterClients().find(x => x.id === cid) : null);
        const coOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(targetCl || cid) : [];
        if (coOwners.length > 0) {
          alertCoOwnerDeletion(targetCl ? targetCl.name : 'Client', coOwners, 'client', cid);
          return;
        }
        if (btn.dataset.sure) {
          if (typeof recordHistory === 'function' && targetCl) {
            recordHistory({
              action: 'delete',
              category: 'client',
              title: targetCl.name
            });
          }
          if (typeof deleteMasterClient === 'function') {
            deleteMasterClient(cid);
          } else {
            const delCl = lsGet('cmd.deleted_clients', []);
            if (!delCl.includes(cid)) delCl.push(cid);
            lsSet('cmd.deleted_clients', delCl);
            S.settings.clients = (S.settings.clients || []).filter(x => x.id !== cid);
            saveSettings();
          }
          if (S.client === cid) S.client = null;
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
    oneTime: 0,
    yourShare: 0,
    shares: {},
    color: (typeof allMasterClients === 'function' ? allMasterClients().length : (S.settings.clients || []).length),
    signed: today(),
    biz: presetBiz || S.biz || clientBiz(null),
    cover: ''
  };
  if (!c.shares && typeof c.shares !== 'object') c.shares = {};
  const isNew = !id;
  const curPid = (S && S.profileId) || 'rahul';
  const curProfile = PROFILES.find(p => p.id === curPid) || { id: 'rahul', name: 'Rahul' };
  const otherProfiles = PROFILES.filter(p => p.id !== curPid);

  const getInitialShare = (mId) => {
    if (c.shares && c.shares[mId] !== undefined && c.shares[mId] !== null && c.shares[mId] !== '') {
      return c.shares[mId];
    }
    if (mId === curPid && c.yourShare !== undefined && c.yourShare !== null && c.yourShare !== '') {
      return c.yourShare;
    }
    const pSet = lsGet('cmd.settings_' + mId, null) || defaultSettingsFor(mId);
    if (pSet && Array.isArray(pSet.clients)) {
      const pc = pSet.clients.find(x => x.id === c.id);
      if (pc && pc.yourShare !== undefined && pc.yourShare !== null && pc.yourShare !== '') {
        return pc.yourShare;
      }
    }
    return '';
  };

  const p0 = curProfile;
  const p1 = otherProfiles[0] || { id: 'sri-chandana', name: 'Sri Chandana' };
  const p2 = otherProfiles[1] || { id: 'adithya', name: 'Adithya' };

  const val0 = getInitialShare(p0.id);
  const val1 = getInitialShare(p1.id);
  const val2 = getInitialShare(p2.id);

  const bizOptions = businesses().map(b => `<option value="${b.id}" ${b.id === c.biz ? 'selected' : ''}>${esc(b.name)}</option>`).join('');

  openSheet(`<h2>${isNew ? 'New client' : 'Edit client'}</h2>
    <div class="field"><label for="c-name">Company name</label><input class="in" id="c-name" value="${esc(c.name)}" placeholder="Company name"></div>
    <div class="frow">
      <div class="field"><label for="c-short">Short name</label><input class="in" id="c-short" value="${esc(c.short)}" placeholder="What you call them"></div>
      <div class="field"><label for="c-biz">Business</label><select class="in" id="c-biz">${bizOptions || '<option value="">No businesses</option>'}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="c-ret">Retainer (₹)</label><input class="in mono" type="number" inputmode="numeric" id="c-ret" value="${c.retainer || ''}" placeholder="50000"></div>
      <div class="field"><label for="c-onetime">One-Time (₹)</label><input class="in mono" type="number" inputmode="numeric" id="c-onetime" value="${c.oneTime || ''}" placeholder="100000"></div>
    </div>
    <div class="frow">
      <div class="field">
        <label for="c-share">${esc(p0.name)}'s Share (₹)</label>
        <input class="in mono c-member-share" type="number" inputmode="numeric" id="c-share" data-share-pid="${p0.id}" value="${val0 !== '' ? val0 : ''}" placeholder="0">
      </div>
      <div class="field">
        <label for="c-share-${p1.id}">${esc(p1.name)}'s Share (Optional) (₹)</label>
        <input class="in mono c-member-share" type="number" inputmode="numeric" id="c-share-${p1.id}" data-share-pid="${p1.id}" value="${val1 !== '' ? val1 : ''}" placeholder="Optional">
      </div>
    </div>
    <div class="frow">
      <div class="field">
        <label for="c-share-${p2.id}">${esc(p2.name)}'s Share (Optional) (₹)</label>
        <input class="in mono c-member-share" type="number" inputmode="numeric" id="c-share-${p2.id}" data-share-pid="${p2.id}" value="${val2 !== '' ? val2 : ''}" placeholder="Optional">
      </div>
      <div class="field"><label for="c-stars">Priority (stars)</label><select class="in" id="c-stars">${[5,4.5,4,3.5,3,2.5,2,1.5,1].map(v => `<option value="${v}" ${starsOf(c)===v?'selected':''}>${'★'.repeat(Math.floor(v))}${v % 1 ? '½' : ''}  ${v.toFixed(1)}</option>`).join('')}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label for="c-signed">Contract signed</label><input class="in" type="date" id="c-signed" value="${c.signed || c.since || ''}"></div>
    </div>
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

    const retIn = sh.querySelector('#c-ret');
    const oneTimeIn = sh.querySelector('#c-onetime');

    if (retIn && oneTimeIn) {
      retIn.oninput = () => {
        if (retIn.value.trim()) oneTimeIn.value = '';
      };
      oneTimeIn.oninput = () => {
        if (oneTimeIn.value.trim()) retIn.value = '';
      };
    }

    sh.querySelector('#c-cancel').onclick = closeSheet;
    sh.querySelector('#c-save').onclick = () => {
      c.name = $('#c-name').value.trim();
      if (!c.name) { toast('Add the client name.'); return; }
      c.short = $('#c-short').value.trim();
      c.biz = $('#c-biz') ? $('#c-biz').value : c.biz;
      c.stars = Number($('#c-stars').value);
      const retVal = Number($('#c-ret').value) || 0;
      const oneTimeVal = Number($('#c-onetime').value) || 0;
      if (oneTimeVal) {
        c.oneTime = oneTimeVal;
        c.retainer = 0;
      } else {
        c.retainer = retVal;
        c.oneTime = 0;
      }

      const memberShares = {};
      PROFILES.forEach(p => {
        const inp = sh.querySelector(`[data-share-pid="${p.id}"]`);
        if (inp) {
          memberShares[p.id] = Number(inp.value) || 0;
        } else if (c.shares && c.shares[p.id] !== undefined) {
          memberShares[p.id] = Number(c.shares[p.id]) || 0;
        }
      });
      c.shares = memberShares;
      c.yourShare = memberShares[curPid] || 0;
      c.signed = $('#c-signed').value;
      delete c.note;
      c.cover = currentCover;
      if (typeof recordHistory === 'function') {
        recordHistory({
          action: isNew ? 'add' : 'edit',
          category: 'client',
          title: c.name,
          details: c.oneTime ? `One-time: ${inr(c.oneTime)}` : `Retainer: ${inr(c.retainer)}`
        });
      }
      closeSheet();
      if (typeof saveMasterClient === 'function') {
        saveMasterClient(c);
      } else {
        const list = S.settings.clients || [];
        const i = list.findIndex(x => x.id === c.id);
        if (i >= 0) list[i] = c;
        else list.push(c);
        S.settings.clients = list;
        saveSettings();
      }
      render();
      toast('Client saved.');
    };
    const del = sh.querySelector('#c-del');
    if (del) del.onclick = () => {
      const coOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(c) : [];
      if (coOwners.length > 0) {
        closeSheet();
        alertCoOwnerDeletion(c.name, coOwners, 'client', c.id);
        return;
      }
      if (del.dataset.sure) {
        if (typeof recordHistory === 'function') {
          recordHistory({
            action: 'delete',
            category: 'client',
            title: c.name
          });
        }
        if (typeof deleteMasterClient === 'function') {
          deleteMasterClient(c.id);
        } else {
          const delCl = lsGet('cmd.deleted_clients', []);
          if (!delCl.includes(c.id)) delCl.push(c.id);
          lsSet('cmd.deleted_clients', delCl);
          S.settings.clients = (S.settings.clients || []).filter(x => x.id !== c.id);
          saveSettings();
        }
        if (S.client === c.id) S.client = null;
        closeSheet();
        render();
        toast('Client removed.');
      } else {
        del.dataset.sure = '1';
        del.textContent = 'Tap again to remove';
      }
    };
  });
}

function logPayment(clientId, status = 'received') {
  editPayment(null, { clientId, status });
}

function editPayment(id, preset = {}) {
  const it = id ? S.items.find(x => x.id === id) : null;
  const isNew = !it;
  const curPid = (S && S.profileId) || 'rahul';

  let status = it ? (it.status === 'done' ? 'received' : 'pending') : (preset.status === 'received' ? 'received' : 'pending');
  const initialClientId = it ? (it.client || '') : (preset.clientId || '');
  const initialClient = clientById(initialClientId);

  const initialPerson = it ? (it.person || '') : (preset.person || '');
  const initialTitle = it ? (it.title || '') : (preset.title || (initialClient ? (initialClient.oneTime ? 'One-time project payment' : `${new Date().toLocaleDateString('en-IN', {month:'long'})} retainer`) : ''));
  const initialAmount = it ? (it.amount || it.yourShare || '') : (preset.amount || (initialClient ? (initialClient.yourShare || initialClient.oneTime || initialClient.retainer || '') : ''));
  const initialShare = it ? (it.yourShare !== undefined && it.yourShare !== null ? it.yourShare : (it.amount || '')) : (preset.yourShare || initialAmount || '');
  const initialDue = it ? (it.due || (it.doneAt ? ymd(new Date(it.doneAt)) : today())) : (preset.due || today());
  const initialNotes = it ? (it.notes || '') : (preset.notes || '');
  const initialPriority = it ? (it.priority || 'med') : (preset.priority || 'med');

  const quickPayers = ['Sri Chandana', 'Adithya', 'Rahul', 'Previous Client', 'External / Other'];

  openSheet(`<h2 id="pay-sheet-title">${isNew ? (status === 'pending' ? 'Add To Be Received' : 'Log Received Payment') : (status === 'pending' ? 'Edit To Be Received' : 'Edit Received Payment')}</h2>
    <div class="seg pay-seg" role="group" aria-label="Status">
      <button type="button" data-pst="pending" aria-pressed="${status === 'pending'}">To be received</button>
      <button type="button" data-pst="received" aria-pressed="${status === 'received'}">Received</button>
    </div>

    <div class="field" style="margin-top:14px">
      <label for="pay-person">From / Payer <span class="faint" style="font-weight:400">(Team member, previous client, or other)</span></label>
      <input class="in" id="pay-person" value="${esc(initialPerson)}" placeholder="e.g. Sri Chandana, Adithya, or Previous client">
      <div class="quick-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        ${quickPayers.map(p => `<button type="button" class="chip-btn" data-set-payer="${esc(p)}">${esc(p)}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label for="pay-client">Client in business folder <span class="faint" style="font-weight:400">(Optional)</span></label>
      <select class="in" id="pay-client">
        <option value="" ${!initialClientId ? 'selected' : ''}>None / Standalone (Team member, past client, external)</option>
        ${clients().map(cl => `<option value="${cl.id}" ${initialClientId === cl.id ? 'selected' : ''}>${esc(cl.name)}</option>`).join('')}
      </select>
      <p class="muted" style="font-size:11.5px;margin:4px 0 0;line-height:1.4">
        Keep as "None / Standalone" so this payment only shows in To be received and <b>does NOT create a client in the business folder</b>.
      </p>
    </div>

    <div class="field">
      <label for="pay-title">What is this payment for</label>
      <input class="in" id="pay-title" value="${esc(initialTitle)}" placeholder="e.g. Previous client share from Adithya, Retainer, Settlement">
    </div>

    <div class="frow">
      <div class="field">
        <label for="pay-amount" id="pay-amount-l">${status === 'pending' ? 'Amount to be received (₹)' : 'Amount received (₹)'}</label>
        <input class="in mono" type="number" inputmode="numeric" id="pay-amount" value="${initialAmount}" placeholder="25000">
      </div>
      <div class="field">
        <label for="pay-share">Your share (₹)</label>
        <input class="in mono" type="number" inputmode="numeric" id="pay-share" value="${initialShare}" placeholder="25000">
      </div>
    </div>

    <div class="frow">
      <div class="field">
        <label for="pay-date" id="pay-date-l">${status === 'pending' ? 'Expected by' : 'Date received'}</label>
        <input class="in" type="date" id="pay-date" value="${initialDue}">
      </div>
      <div class="field">
        <label for="pay-prio">Priority</label>
        <select class="in" id="pay-prio">
          <option value="high" ${initialPriority === 'high' ? 'selected' : ''}>High</option>
          <option value="med" ${initialPriority === 'med' ? 'selected' : ''}>Medium</option>
          <option value="low" ${initialPriority === 'low' ? 'selected' : ''}>Low</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="pay-notes">Notes <span class="faint" style="font-weight:400">(optional)</span></label>
      <textarea class="in" id="pay-notes" placeholder="UPI ID, bank transfer, invoice details, remarks">${esc(initialNotes)}</textarea>
    </div>

    <div class="sheet-actions">
      ${!isNew ? `<button class="btn danger left" id="pay-del" type="button">Delete</button>` : ''}
      ${!isNew && it.status !== 'done' ? `<button class="btn left" id="pay-quick-recv" type="button"><svg><use href="#i-check"/></svg>Mark received</button>` : ''}
      <button class="btn" id="pay-cancel" type="button">Cancel</button>
      <button class="btn primary" id="pay-save" type="button">${isNew ? (status === 'pending' ? 'Add to be received' : 'Save payment') : 'Save changes'}</button>
    </div>`, sh => {

    sh.querySelectorAll('[data-set-payer]').forEach(btn => {
      btn.onclick = () => {
        const p = btn.dataset.setPayer;
        const personInput = sh.querySelector('#pay-person');
        const titleInput = sh.querySelector('#pay-title');
        if (personInput) personInput.value = p;
        if (titleInput && (!titleInput.value.trim() || titleInput.value.startsWith('Payment from ') || titleInput.value === 'Previous client payment')) {
          titleInput.value = (p === 'Previous Client' ? 'Previous client payment' : `Payment from ${p}`);
        }
      };
    });

    const clSelect = sh.querySelector('#pay-client');
    if (clSelect) {
      clSelect.onchange = () => {
        const selectedC = clientById(clSelect.value);
        if (selectedC) {
          const isOneTime = Number(selectedC.oneTime) > 0;
          const tot = selectedC.oneTime || selectedC.retainer || '';
          const curAmt = sh.querySelector('#pay-amount');
          const curSh = sh.querySelector('#pay-share');
          const curTtl = sh.querySelector('#pay-title');
          if (curAmt && !curAmt.value && tot) curAmt.value = tot;
          if (curSh && !curSh.value) curSh.value = selectedC.yourShare !== undefined ? selectedC.yourShare : tot;
          if (curTtl && !curTtl.value.trim()) curTtl.value = isOneTime ? 'One-time project payment' : `${new Date().toLocaleDateString('en-IN', {month:'long'})} retainer`;
        }
      };
    }

    const amtInput = sh.querySelector('#pay-amount');
    const shareInput = sh.querySelector('#pay-share');
    if (amtInput && shareInput) {
      amtInput.oninput = () => {
        if (!shareInput.value || shareInput.dataset.synced === '1' || shareInput.value === amtInput.dataset.prevVal) {
          shareInput.value = amtInput.value;
          shareInput.dataset.synced = '1';
        }
        amtInput.dataset.prevVal = amtInput.value;
      };
      shareInput.oninput = () => {
        shareInput.dataset.synced = '0';
      };
    }

    sh.querySelectorAll('[data-pst]').forEach(b => {
      b.onclick = () => {
        status = b.dataset.pst;
        sh.querySelectorAll('[data-pst]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        const isPending = status === 'pending';
        const heading = sh.querySelector('#pay-sheet-title');
        if (heading) {
          heading.textContent = isNew
            ? (isPending ? 'Add To Be Received' : 'Log Received Payment')
            : (isPending ? 'Edit To Be Received' : 'Edit Received Payment');
        }
        const dateLbl = sh.querySelector('#pay-date-l');
        if (dateLbl) dateLbl.textContent = isPending ? 'Expected by' : 'Date received';
        const amtLbl = sh.querySelector('#pay-amount-l');
        if (amtLbl) amtLbl.textContent = isPending ? 'Amount to be received (₹)' : 'Amount received (₹)';
        const saveBtn = sh.querySelector('#pay-save');
        if (saveBtn) {
          saveBtn.textContent = isNew
            ? (isPending ? 'Add to be received' : 'Save payment')
            : 'Save changes';
        }
      };
    });

    const qrBtn = sh.querySelector('#pay-quick-recv');
    if (qrBtn && it) {
      qrBtn.onclick = async () => {
        it.status = 'done';
        it.doneAt = Date.now();
        const shVal = paymentShare(it);
        if (S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '') {
          S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) + shVal);
          saveSettings();
        }
        closeSheet();
        await saveItem(it);
        toast(`Marked ${inr(shVal)} as received.`);
      };
    }

    const delBtn = sh.querySelector('#pay-del');
    if (delBtn && it) {
      delBtn.onclick = () => {
        const coOwners = [];
        if (it.person) {
          const targetPid = profileIdForPerson(it.person);
          if (targetPid && targetPid !== curPid && !coOwners.includes(targetPid)) coOwners.push(targetPid);
        }
        if (it.client) {
          const clOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(it.client, curPid) : [];
          clOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
        }
        if (it.biz) {
          const bizOwners = typeof getCoOwnersForBusiness === 'function' ? getCoOwnersForBusiness(it.biz, curPid) : [];
          bizOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
        }
        if (coOwners.length > 0) {
          closeSheet();
          alertCoOwnerDeletion(it.title, coOwners, 'task', it.id);
          return;
        }
        if (delBtn.dataset.sure) {
          closeSheet();
          removeItem(it.id);
          toast('Payment deleted.');
        } else {
          delBtn.dataset.sure = '1';
          delBtn.textContent = 'Tap again to delete';
        }
      };
    }

    sh.querySelector('#pay-cancel').onclick = closeSheet;

    sh.querySelector('#pay-save').onclick = async () => {
      const amt = Number(sh.querySelector('#pay-amount').value) || 0;
      if (!amt) { toast('Enter the amount.'); return; }
      const person = sh.querySelector('#pay-person').value.trim();
      const targetClientId = sh.querySelector('#pay-client') ? sh.querySelector('#pay-client').value : '';
      const targetC = targetClientId ? clientById(targetClientId) : null;
      const titleVal = sh.querySelector('#pay-title').value.trim() || (person ? `Payment from ${person}` : (targetC ? `${targetC.name} payment` : (status === 'pending' ? 'Payment to be received' : 'Payment received')));
      const yShare = Number(sh.querySelector('#pay-share').value) || amt;
      const dateVal = sh.querySelector('#pay-date').value || today();
      const prioVal = sh.querySelector('#pay-prio').value || 'med';
      const notesVal = sh.querySelector('#pay-notes').value.trim();
      const isOneTimePayment = !!(targetC && Number(targetC.oneTime) > 0);

      if (isNew) {
        const newItem = makeItem({
          kind: 'payment',
          title: titleVal,
          client: targetClientId,
          person: person,
          amount: amt,
          totalRetainer: amt,
          yourShare: yShare,
          isOneTime: isOneTimePayment,
          paymentType: isOneTimePayment ? 'one-time' : 'retainer',
          due: dateVal,
          priority: prioVal,
          notes: notesVal
        });
        if (status === 'received') {
          newItem.status = 'done';
          const d = parseYmd(dateVal);
          d.setHours(12, 0, 0, 0);
          newItem.doneAt = d.getTime();
          if (S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '') {
            S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) + yShare);
            saveSettings();
          }
        } else {
          newItem.status = 'open';
          newItem.doneAt = null;
        }
        closeSheet();
        await saveItem(newItem);
        toast(status === 'received' ? `${inr(yShare)} logged as received.` : `${inr(yShare)} added to be received.`);
      } else {
        const wasDone = it.status === 'done';
        const oldShare = paymentShare(it);
        it.title = titleVal;
        it.client = targetClientId;
        it.person = person;
        it.amount = amt;
        it.yourShare = yShare;
        it.due = dateVal;
        it.priority = prioVal;
        it.notes = notesVal;
        if (status === 'received') {
          it.status = 'done';
          if (!it.doneAt || (dateVal && dateVal !== ymd(new Date(it.doneAt)))) {
            const d = parseYmd(dateVal);
            d.setHours(12, 0, 0, 0);
            it.doneAt = d.getTime();
          }
          if (!wasDone && S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '') {
            S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) + yShare);
            saveSettings();
          } else if (wasDone && S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '' && oldShare !== yShare) {
            S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) - oldShare + yShare);
            saveSettings();
          }
        } else {
          it.status = 'open';
          it.doneAt = null;
          if (wasDone && S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '') {
            S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) - oldShare);
            saveSettings();
          }
        }
        closeSheet();
        await saveItem(it);
        toast('Payment updated.');
      }
    };
  });
}
function editGoal(id) {
  const g = id ? { ...(S.settings.goals || []).find(x => x.id === id) } : { id: newId(), name:'', target:0, saved:0, date:'', note:'', image:'' };
  const k = ((g.id || '') + ' ' + (g.name || '')).toLowerCase();
  const defaultBg = g.image
    ? `background-image:url('${esc(g.image)}');display:flex;`
    : (k.includes('dubai')
      ? `background-image:url('assets/dubai.jpg');display:flex;`
      : (k.includes('bali')
        ? `background-image:url('assets/bali.jpg');display:flex;`
        : 'display:none;'));

  openSheet(`<h2>${id ? esc(g.name) : 'New goal'}</h2>
    <div class="field"><label for="g-name">Goal name</label><input class="in" id="g-name" value="${esc(g.name)}" placeholder="Dubai trip"></div>
    <div class="frow">
      <div class="field"><label for="g-saved">Saved so far (₹)</label><input class="in mono" type="number" inputmode="numeric" id="g-saved" value="${g.saved || ''}" placeholder="0"></div>
      <div class="field"><label for="g-target">Target budget (₹)</label><input class="in mono" type="number" inputmode="numeric" id="g-target" value="${g.target || ''}" placeholder="0"></div>
    </div>
    <div class="frow">
      <div class="field"><label for="g-date">Trip date</label><input class="in" type="date" id="g-date" value="${g.date || ''}"></div>
      <div class="field"><label for="g-note">Note</label><input class="in" id="g-note" value="${esc(g.note)}" placeholder="1 week with the crew"></div>
    </div>

    <div class="field" style="margin-top:10px">
      <label>Trip photo</label>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        <label class="btn small" style="cursor:pointer">
          <svg><use href="#i-image"/></svg>Upload photo from device
          <input type="file" accept="image/*" id="g-img-file" style="display:none">
        </label>
        <input class="in" id="g-img-url" style="flex:1" placeholder="Or paste image URL" value="${esc(g.image || '')}">
      </div>
      <div id="g-img-preview" class="cover-preview" style="margin-top:8px;height:130px;border-radius:10px;background-size:cover;background-position:center;align-items:flex-end;justify-content:flex-end;padding:8px;${defaultBg}">
        <button type="button" class="btn small danger" id="g-img-rm" style="${g.image ? '' : 'display:none'}">Remove custom photo</button>
      </div>
    </div>

    <div class="sheet-actions">${id ? `<button class="btn danger left" id="g-del">Delete goal</button>` : ''}<button class="btn" id="g-cancel">Cancel</button><button class="btn primary" id="g-save">Save</button></div>`, sh => {
    let currentImg = g.image || '';
    const fileIn = sh.querySelector('#g-img-file');
    const urlIn = sh.querySelector('#g-img-url');
    const prev = sh.querySelector('#g-img-preview');
    const rmBtn = sh.querySelector('#g-img-rm');

    fileIn.onchange = async () => {
      const file = fileIn.files && fileIn.files[0];
      if (file) {
        try {
          currentImg = await readImageFile(file, 1200, 800);
          urlIn.value = currentImg.slice(0, 32) + '...';
          prev.style.backgroundImage = `url('${currentImg}')`;
          prev.style.display = 'flex';
          rmBtn.style.display = 'inline-flex';
        } catch (e) {
          toast('Could not load image');
        }
      }
    };

    urlIn.oninput = () => {
      currentImg = urlIn.value.trim();
      if (currentImg) {
        prev.style.backgroundImage = `url('${currentImg}')`;
        prev.style.display = 'flex';
        rmBtn.style.display = 'inline-flex';
      } else {
        const nameKey = (sh.querySelector('#g-name').value || g.name || '').toLowerCase();
        if (nameKey.includes('dubai')) {
          prev.style.backgroundImage = "url('assets/dubai.jpg')";
          prev.style.display = 'flex';
        } else if (nameKey.includes('bali')) {
          prev.style.backgroundImage = "url('assets/bali.jpg')";
          prev.style.display = 'flex';
        } else {
          prev.style.display = 'none';
        }
        rmBtn.style.display = 'none';
      }
    };

    rmBtn.onclick = () => {
      currentImg = '';
      urlIn.value = '';
      const nameKey = (sh.querySelector('#g-name').value || g.name || '').toLowerCase();
      if (nameKey.includes('dubai')) {
        prev.style.backgroundImage = "url('assets/dubai.jpg')";
        prev.style.display = 'flex';
      } else if (nameKey.includes('bali')) {
        prev.style.backgroundImage = "url('assets/bali.jpg')";
        prev.style.display = 'flex';
      } else {
        prev.style.display = 'none';
      }
      rmBtn.style.display = 'none';
    };

    sh.querySelector('#g-cancel').onclick = closeSheet;
    sh.querySelector('#g-save').onclick = () => {
      g.name = sh.querySelector('#g-name').value.trim(); if (!g.name) { toast('Name the goal.'); return; }
      g.saved = Number(sh.querySelector('#g-saved').value) || 0; g.target = Number(sh.querySelector('#g-target').value) || 0; g.date = sh.querySelector('#g-date').value; g.note = sh.querySelector('#g-note').value.trim(); g.image = currentImg; g.updated = Date.now();
      const list = S.settings.goals || []; const i = list.findIndex(x => x.id === g.id);
      const isNew = i < 0;
      if (i >= 0) list[i] = g; else list.push(g);
      S.settings.goals = list;
      if (typeof recordHistory === 'function') {
        recordHistory({
          action: isNew ? 'add' : 'edit',
          category: 'goal',
          title: g.name,
          details: `Target: ₹${g.target?.toLocaleString('en-IN') || 0}${g.date ? ' · Date: ' + g.date : ''}`,
          profileId: S.profileId
        });
      }
      closeSheet(); saveSettings(); toast('Saved.');
    };
    const del = sh.querySelector('#g-del');
    if (del) del.onclick = () => {
      if (del.dataset.sure) {
        if (typeof recordHistory === 'function') {
          recordHistory({
            action: 'delete',
            category: 'goal',
            title: g.name,
            details: 'Deleted savings goal',
            profileId: S.profileId
          });
        }
        S.settings.goals = S.settings.goals.filter(x => x.id !== g.id);
        closeSheet(); saveSettings();
      } else {
        del.dataset.sure = '1'; del.textContent = 'Tap again to delete';
      }
    };
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
      const isNew = i < 0;
      if (i >= 0) list[i] = w; else list.push(w);
      S.settings.wishlist = list;
      if (typeof recordHistory === 'function') {
        recordHistory({
          action: isNew ? 'add' : 'edit',
          category: 'wishlist',
          title: w.name,
          details: `Cost: ₹${w.cost?.toLocaleString('en-IN') || 0} · Category: ${w.cat}`,
          profileId: S.profileId
        });
      }
      closeSheet(); saveSettings(); toast('Saved.');
    };
    const del = sh.querySelector('#w-del');
    if (del) del.onclick = () => {
      if (del.dataset.sure) {
        if (typeof recordHistory === 'function') {
          recordHistory({
            action: 'delete',
            category: 'wishlist',
            title: w.name,
            details: 'Removed from wishlist',
            profileId: S.profileId
          });
        }
        S.settings.wishlist = S.settings.wishlist.filter(x => x.id !== w.id);
        closeSheet(); saveSettings();
      } else {
        del.dataset.sure = '1'; del.textContent = 'Tap again to delete';
      }
    };
  });
}
function openProfileSheet() {
  const pid = S.profileId || 'rahul';
  openSheet(`<h2>Switch Profile</h2>
    <p class="muted" style="font-size:13px;margin-bottom:16px">Select an active profile to switch workspace context, businesses, and clients.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${PROFILES.map(p => {
        const isActive = p.id === pid;
        const profSettings = getProfileSettings(p.id);
        const bizList = profSettings.businesses || [];
        const bizNames = bizList.map(b => b.name).join(', ');
        return `<button class="card prof-card" data-switchprofile="${p.id}" style="padding:14px 16px;text-align:left;display:flex;align-items:center;gap:14px;cursor:pointer;background:${isActive ? 'var(--surface-3)' : 'var(--surface-2)'}">
          <span class="pfp" style="width:38px;height:38px;font-size:16px;display:grid;place-items:center;background:${isActive ? 'var(--ink)' : 'var(--surface)'};color:${isActive ? 'var(--bg)' : 'var(--ink)'};border-radius:50%;flex:none;font-weight:700">${p.avatarLetter}</span>
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
    <div class="sheet-actions" style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
      <button class="btn danger" id="prof-signout" type="button"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign Out</button>
      <div style="display:flex;gap:8px">
        <button class="btn" id="prof-edit" type="button"><svg><use href="#i-gear"/></svg>Settings</button>
        <button class="btn primary" id="prof-done" type="button">Close</button>
      </div>
    </div>`, sh => {
    sh.querySelector('#prof-done').onclick = closeSheet;
    sh.querySelector('#prof-edit').onclick = () => { closeSheet(); editSettings(); };
    const soBtn = sh.querySelector('#prof-signout');
    if (soBtn) soBtn.onclick = () => { closeSheet(); signOutGoogle(); };
  });
}

function openManageFocus() {
  const focusItems = S.items.filter(i => (i.isFocus || i.kind === 'task') && i.kind !== 'promise' && i.kind !== 'glitch' && i.kind !== 'reel' && i.kind !== 'payment' && i.kind !== 'note');
  
  const allBiz = businesses();
  const groups = [];
  allBiz.forEach(b => {
    const items = focusItems.filter(i => taskBiz(i) === b.id);
    if (items.length) {
      groups.push({ id: b.id, name: b.name, kind: b.kind, items });
    }
  });
  const general = focusItems.filter(i => {
    const bId = taskBiz(i);
    return !bId || !allBiz.some(b => b.id === bId);
  });
  if (general.length) {
    groups.push({ id: '', name: 'General Tasks', kind: '', items: general });
  }

  const renderManageItem = it => {
    const c = clientById(it.client);
    const cat = (it.category && it.category.toLowerCase() !== 'website' && it.category.toLowerCase() !== 'other') ? it.category : '';
    const isDone = it.status === 'done';
    return `<div class="manage-item ${isDone ? 'done' : ''}">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <b style="font-size:14.5px;${isDone ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(it.title)}</b>
          ${cat ? `<span class="chip" style="font-size:10.5px;padding:0 6px">${esc(cat)}</span>` : ''}
        </div>
        <div class="faint" style="font-size:12px;margin-top:2px">
          ${c ? esc(c.short || c.name) + ' · ' : ''}Status: ${isDone ? 'Done' : 'Open'}
        </div>
      </div>
      <button class="btn small" data-editfocustask="${it.id}"><svg><use href="#i-pen"/></svg>Edit</button>
      <button class="btn small danger" data-delfocus="${it.id}">Delete</button>
    </div>`;
  };

  const listHtml = groups.length ? groups.map(g => `
    <div class="manage-biz-group" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;margin-bottom:6px">
        <span style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--ink)">${esc(g.name)}</span>
        <span class="faint" style="font-size:11.5px">${g.items.length} task${g.items.length === 1 ? '' : 's'}</span>
      </div>
      <div class="manage-list">${g.items.map(renderManageItem).join('')}</div>
    </div>
  `).join('') : '<div class="empty">No focus tasks yet. Tap "Add focus task" above.</div>';

  openSheet(`<h2>Manage Focus Tasks</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p class="muted" style="font-size:13px;margin:0">Add, edit, or delete focus items</p>
      <button class="btn primary small" id="mf-add"><svg><use href="#i-plus"/></svg>Add focus task</button>
    </div>
    <div>
      ${listHtml}
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
        const it = S.items.find(x => x.id === id);
        const curPid = (S && S.profileId) || 'rahul';
        const coOwners = [];
        if (it && it.person) {
          const targetPid = profileIdForPerson(it.person);
          if (targetPid && targetPid !== curPid && !coOwners.includes(targetPid)) coOwners.push(targetPid);
        }
        if (it && it.client) {
          const clOwners = typeof getCoOwnersForClient === 'function' ? getCoOwnersForClient(it.client, curPid) : [];
          clOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
        }
        if (it && it.biz) {
          const bizOwners = typeof getCoOwnersForBusiness === 'function' ? getCoOwnersForBusiness(it.biz, curPid) : [];
          bizOwners.forEach(p => { if (!coOwners.includes(p)) coOwners.push(p); });
        }
        if (coOwners.length > 0) {
          alertCoOwnerDeletion(it ? it.title : 'Task', coOwners, 'task', id);
          return;
        }
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
              Target: ${inr(g.target)} · Saved: ${inr(g.saved || 0)} (${formatGoalPct(g.saved || 0, g.target)})
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
  const goals = S.settings.goals || [];
  const curPid = S.profileId || 'rahul';

  const pays = (S.items || []).filter(i => i.kind === 'payment');
  const now = new Date();
  const mKey = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const actualRecv = pays.filter(i => i.status === 'done' && i.doneAt && ymd(new Date(i.doneAt)).startsWith(mKey))
    .reduce((s, i) => s + (paymentShare(i) || 0), 0);
  const currentRecv = (S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '')
    ? Number(S.settings.receivedThisMonth)
    : actualRecv;

  openSheet(`<h2>Manage Payments & Savings</h2>
    <p class="muted" style="font-size:13px;margin:2px 0 16px">Adjust overview figures: money received this month and your trip savings.</p>

    <div style="margin-bottom:20px;padding:16px;background:var(--surface);border-radius:12px">
      <label style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--muted);display:block;margin-bottom:8px">Received this month (₹)</label>
      <input type="number" id="mp-received" class="in" style="font-size:17px;font-weight:600;font-family:var(--mono);padding:10px 14px;border-radius:8px;width:100%" value="${currentRecv}" placeholder="0" min="0" step="500" />
      <p class="muted" style="font-size:12px;margin:8px 0 0">Directly sets the "Received this month" figure on your Money page.</p>
    </div>

    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <label style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--muted);margin:0">Savings for Trips</label>
        <span class="muted" style="font-size:12px">${goals.length} trip goal${goals.length === 1 ? '' : 's'}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${goals.length ? goals.map(g => `
          <div style="padding:14px 16px;background:var(--surface);border-radius:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="trip-thumb" style="width:38px;height:38px;border-radius:8px;background-size:cover;background-position:center;${g.image ? `background-image:url('${esc(g.image)}')` : (g.name.toLowerCase().includes('dubai') ? `background-image:url('assets/dubai.jpg')` : (g.name.toLowerCase().includes('bali') ? `background-image:url('assets/bali.jpg')` : 'background:var(--surface-2)'))}"></div>
                <div>
                  <b style="font-size:15px">${esc(g.name)}</b>
                  <div class="muted" style="font-size:11.5px">${g.date ? dueLabel(g.date).text || g.date : 'No date'} · ${formatGoalPct(g.saved || 0, g.target || 0)}</div>
                </div>
              </div>
              <label class="btn small" style="cursor:pointer;font-size:11.5px;padding:4px 10px">
                <svg><use href="#i-image"/></svg>Change photo
                <input type="file" accept="image/*" class="mp-goal-file" data-goal-id="${g.id}" style="display:none">
              </label>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Saved so far (₹)</label>
                <input type="number" class="in mp-goal-saved" data-goal-id="${g.id}" style="font-family:var(--mono);font-weight:600;width:100%;padding:8px 10px" value="${Number(g.saved) || 0}" min="0" step="1000" />
              </div>
              <div>
                <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Target budget (₹)</label>
                <input type="number" class="in mp-goal-target" data-goal-id="${g.id}" style="font-family:var(--mono);width:100%;padding:8px 10px" value="${Number(g.target) || 0}" min="0" step="1000" />
              </div>
            </div>
          </div>
        `).join('') : '<div class="empty">No trip goals configured yet. Tap "Manage" under Trip Goals to create one.</div>'}
      </div>
    </div>

    <div class="sheet-actions" style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px">
      <button class="btn" id="mp-cancel">Cancel</button>
      <button class="btn primary" id="mp-save">Save changes</button>
    </div>`, sh => {
    sh.querySelectorAll('.mp-goal-file').forEach(inp => {
      inp.onchange = async () => {
        const file = inp.files && inp.files[0];
        const gid = inp.dataset.goalId;
        if (file && gid) {
          try {
            const dataUrl = await readImageFile(file, 1200, 800);
            const g = (S.settings.goals || []).find(x => x.id === gid);
            if (g) {
              g.image = dataUrl;
              g.updated = Date.now();
              const thumb = inp.closest('div')?.parentElement?.querySelector('.trip-thumb');
              if (thumb) thumb.style.backgroundImage = `url('${dataUrl}')`;
              saveSettings();
              render();
              toast(`Updated photo for ${g.name}.`);
            }
          } catch (e) {
            toast('Could not load image');
          }
        }
      };
    });

    sh.querySelector('#mp-cancel').onclick = closeSheet;
    sh.querySelector('#mp-save').onclick = () => {
      const recVal = sh.querySelector('#mp-received').value;
      S.settings.receivedThisMonth = recVal === '' ? null : Math.max(0, Number(recVal) || 0);

      sh.querySelectorAll('.mp-goal-saved').forEach(inp => {
        const gid = inp.dataset.goalId;
        const g = (S.settings.goals || []).find(x => x.id === gid);
        if (g) g.saved = Math.max(0, Number(inp.value) || 0);
      });

      sh.querySelectorAll('.mp-goal-target').forEach(inp => {
        const gid = inp.dataset.goalId;
        const g = (S.settings.goals || []).find(x => x.id === gid);
        if (g) g.target = Math.max(0, Number(inp.value) || 0);
      });

      saveSettings();
      render();
      closeSheet();
      toast('Payments & trip savings updated.');
    };
  });
}

function openBannerCustomizer() {
  const pid = S.profileId || 'rahul';
  const curBanner = lsGet(`cmd.banner_${pid}`, null) || (pid === 'sri-chandana' ? 'kung fu panda.jpg' : 'assets/banner.jpg');
  
  openSheet(`<h2>Customize Cover Banner</h2>
    <p class="muted" style="font-size:13px;margin-bottom:14px">Change the hero banner image at the top of your dashboard.</p>
    
    <div style="width:100%;aspect-ratio:16/7;border-radius:12px;background-image:url('${esc(curBanner)}');background-size:cover;background-position:center;box-shadow:0 8px 24px rgba(0,0,0,0.3);margin-bottom:16px;position:relative;overflow:hidden" id="banner-custom-preview">
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

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--surface-2);border-radius:12px;margin-bottom:16px">
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
    
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:var(--surface-2);border-radius:14px">
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
        <button type="button" class="btn small" data-setpreseticon="panda" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:4px;background:var(--surface-3);display:inline-block"></span>Panda</button>
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
    
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface-2);border-radius:12px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-3);display:grid;place-items:center;color:var(--ink)"><svg style="width:18px;height:18px"><use href="#i-folder"/></svg></div>
        <div>
          <b style="font-size:13.5px;display:block">Manage Businesses</b>
          <span class="faint" style="font-size:11.5px">Select which members do each business, add, edit, or delete businesses</span>
        </div>
      </div>
      <button type="button" class="btn small primary" id="s-open-manage-biz"><svg><use href="#i-pen"/></svg>Manage</button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface-2);border-radius:12px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${esc(lsGet('cmd.custom_icon', 'icon-192.png'))}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;background:#0c0d11">
        <div>
          <b style="font-size:13.5px;display:block">${esc(lsGet('cmd.app_name', 'My Dashboard'))}</b>
          <span class="faint" style="font-size:11.5px">Customize icon & app name</span>
        </div>
      </div>
      <button type="button" class="btn small primary" id="s-customize-icon"><svg><use href="#i-pen"/></svg>Customize</button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface-2);border-radius:12px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-3);display:grid;place-items:center;color:var(--ink)"><svg style="width:18px;height:18px"><use href="#i-bell"/></svg></div>
        <div>
          <b style="font-size:13.5px;display:block">Deadline & Post Reminders</b>
          <span class="faint" style="font-size:11.5px">Dynamic alerts & reminder lead times</span>
        </div>
      </div>
      <button type="button" class="btn small primary" id="s-open-reminders"><svg><use href="#i-gear"/></svg>Configure</button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface-2);border-radius:12px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-3);display:grid;place-items:center;color:var(--ink)"><svg style="width:18px;height:18px"><use href="#i-clock"/></svg></div>
        <div>
          <b style="font-size:13.5px;display:block">Change History</b>
          <span class="faint" style="font-size:11.5px">Activity log of manual changes across tasks & assets</span>
        </div>
      </div>
      <button type="button" class="btn small primary" id="s-open-history"><svg><use href="#i-list"/></svg>View History</button>
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
    const mbBtn = sh.querySelector('#s-open-manage-biz');
    if (mbBtn) mbBtn.onclick = () => { closeSheet(); setTimeout(() => openManageBusinesses(), 150); };
    sh.querySelector('#s-customize-icon').onclick = () => { closeSheet(); openIconCustomizer(); };
    sh.querySelector('#s-open-reminders').onclick = () => { closeSheet(); openNotificationSettingsSheet(); };
    sh.querySelector('#s-open-history').onclick = () => { closeSheet(); setTimeout(() => openHistorySheet(), 200); };
    sh.querySelector('#s-save').onclick = () => {
      st.name = $('#s-name').value.trim() || 'Rahul';
      if ($('#s-email')) st.email = $('#s-email').value.trim();
      ['dayStart:s-ds','dayEnd:s-de','peakStart:s-ps','peakEnd:s-pe'].forEach(p => { const [k, id] = p.split(':'); const v = $('#' + id).value; if (validTime(v)) st[k] = v; });
      closeSheet(); saveSettings(); toast('Settings saved.');
    };
  });
}

function formatHistoryTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const d = new Date(timestamp);
  const isToday = ymd(d) === today();
  if (isToday) {
    return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const isYesterday = ymd(d) === addDays(today(), -1);
  if (isYesterday) {
    return 'Yesterday, ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function openHistorySheet(initialCategory = 'all') {
  let activeFilter = initialCategory;
  let searchTerm = '';

  const renderContent = () => {
    const all = typeof getHistory === 'function' ? getHistory() : (lsGet('cmd.history', []) || []);
    let filtered = all;

    if (activeFilter && activeFilter !== 'all') {
      if (activeFilter === 'tasks') {
        filtered = filtered.filter(h => ['task', 'focus', 'glitch', 'reel'].includes(h.category));
      } else if (activeFilter === 'businesses') {
        filtered = filtered.filter(h => h.category === 'business');
      } else if (activeFilter === 'clients') {
        filtered = filtered.filter(h => h.category === 'client');
      } else if (activeFilter === 'promises') {
        filtered = filtered.filter(h => h.category === 'promise');
      } else if (activeFilter === 'other') {
        filtered = filtered.filter(h => ['goal', 'wishlist', 'payment', 'crusher', 'banner'].includes(h.category));
      }
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(h =>
        (h.title && h.title.toLowerCase().includes(q)) ||
        (h.details && h.details.toLowerCase().includes(q)) ||
        (h.profileName && h.profileName.toLowerCase().includes(q)) ||
        (h.category && h.category.toLowerCase().includes(q)) ||
        (h.action && h.action.toLowerCase().includes(q))
      );
    }

    const countTxt = filtered.length === all.length
      ? `${all.length} change${all.length === 1 ? '' : 's'} recorded`
      : `${filtered.length} of ${all.length} changes`;

    const getActionBadge = action => {
      switch (action) {
        case 'add': return '<span class="hist-act-badge hist-act-add">+ Added</span>';
        case 'complete': return '<span class="hist-act-badge hist-act-complete">✓ Done</span>';
        case 'reopen': return '<span class="hist-act-badge hist-act-reopen">↺ Reopened</span>';
        case 'delete': return '<span class="hist-act-badge hist-act-delete">✕ Deleted</span>';
        case 'stage': return '<span class="hist-act-badge hist-act-stage">→ Stage</span>';
        default: return '<span class="hist-act-badge hist-act-edit">✎ Edited</span>';
      }
    };

    const getCategoryPill = cat => {
      const label = KIND_LABEL[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Item');
      return `<span class="hist-cat-pill">${esc(label)}</span>`;
    };

    return `<h2>Change History</h2>
      <p class="muted" style="font-size:12.5px;margin-top:2px;margin-bottom:12px">Real-time log of manual changes made by Rahul, Sri Chandana, and Adithya.</p>
      
      <div class="hist-search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="in" id="hist-search-input" value="${esc(searchTerm)}" placeholder="Search changes by title, client, or person…">
      </div>

      <div class="hist-filter-bar">
        <button type="button" class="btn small ${activeFilter === 'all' ? 'primary' : ''}" data-histfilter="all">All (${all.length})</button>
        <button type="button" class="btn small ${activeFilter === 'tasks' ? 'primary' : ''}" data-histfilter="tasks">Tasks</button>
        <button type="button" class="btn small ${activeFilter === 'businesses' ? 'primary' : ''}" data-histfilter="businesses">Businesses</button>
        <button type="button" class="btn small ${activeFilter === 'clients' ? 'primary' : ''}" data-histfilter="clients">Clients</button>
        <button type="button" class="btn small ${activeFilter === 'promises' ? 'primary' : ''}" data-histfilter="promises">Promises</button>
        <button type="button" class="btn small ${activeFilter === 'other' ? 'primary' : ''}" data-histfilter="other">Other</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="faint" style="font-size:12px">${esc(countTxt)}</span>
        ${all.length ? `<button type="button" class="link faint" id="hist-clear-btn" style="font-size:11.5px">Clear history</button>` : ''}
      </div>

      <div class="hist-list" id="hist-items-container">
        ${filtered.length ? filtered.map(h => {
          const letter = (h.profileName || 'U').charAt(0).toUpperCase();
          return `<div class="hist-item">
            <div class="hist-avatar" title="${esc(h.profileName || 'User')}">${esc(letter)}</div>
            <div class="hist-body">
              <div class="hist-top">
                <span class="hist-author">${esc(h.profileName || 'Teammate')}</span>
                ${getActionBadge(h.action)}
                ${getCategoryPill(h.category)}
                <span class="hist-time">${esc(formatHistoryTime(h.timestamp))}</span>
              </div>
              <div class="hist-title">${esc(h.title)}</div>
              ${h.details ? `<div class="hist-details">${esc(h.details)}</div>` : ''}
            </div>
          </div>`;
        }).join('') : `<div class="empty" style="text-align:center;padding:32px 16px">No manual changes found${searchTerm ? ' matching "' + esc(searchTerm) + '"' : ''}.<br><span class="faint" style="font-size:12px">When you add, edit, or complete tasks, businesses, or clients, they will appear here.</span></div>`}
      </div>

      <div class="sheet-actions" style="margin-top:16px">
        <button class="btn left" id="hist-back-settings"><svg><use href="#i-back"/></svg>Settings</button>
        <button class="btn primary" id="hist-close-btn">Done</button>
      </div>`;
  };

  openSheet(renderContent(), sh => {
    const bindEvents = () => {
      const searchIn = sh.querySelector('#hist-search-input');
      if (searchIn) {
        searchIn.oninput = () => {
          searchTerm = searchIn.value.trim();
          updateListOnly();
        };
      }

      sh.querySelectorAll('[data-histfilter]').forEach(b => {
        b.onclick = () => {
          activeFilter = b.dataset.histfilter;
          sh.innerHTML = renderContent();
          bindEvents();
          const newIn = sh.querySelector('#hist-search-input');
          if (newIn && searchTerm) {
            newIn.focus();
            newIn.setSelectionRange(searchTerm.length, searchTerm.length);
          }
        };
      });

      const clearBtn = sh.querySelector('#hist-clear-btn');
      if (clearBtn) {
        clearBtn.onclick = () => {
          if (clearBtn.dataset.sure) {
            clearHistory();
            sh.innerHTML = renderContent();
            bindEvents();
            toast('Change history cleared.');
          } else {
            clearBtn.dataset.sure = '1';
            clearBtn.textContent = 'Tap again to confirm';
          }
        };
      }

      const backBtn = sh.querySelector('#hist-back-settings');
      if (backBtn) {
        backBtn.onclick = () => {
          closeSheet();
          setTimeout(() => editSettings(), 200);
        };
      }

      const closeBtn = sh.querySelector('#hist-close-btn');
      if (closeBtn) closeBtn.onclick = closeSheet;
    };

    const updateListOnly = () => {
      const all = typeof getHistory === 'function' ? getHistory() : (lsGet('cmd.history', []) || []);
      let filtered = all;

      if (activeFilter && activeFilter !== 'all') {
        if (activeFilter === 'tasks') {
          filtered = filtered.filter(h => ['task', 'focus', 'glitch', 'reel'].includes(h.category));
        } else if (activeFilter === 'businesses') {
          filtered = filtered.filter(h => h.category === 'business');
        } else if (activeFilter === 'clients') {
          filtered = filtered.filter(h => h.category === 'client');
        } else if (activeFilter === 'promises') {
          filtered = filtered.filter(h => h.category === 'promise');
        } else if (activeFilter === 'other') {
          filtered = filtered.filter(h => ['goal', 'wishlist', 'payment', 'crusher', 'banner'].includes(h.category));
        }
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter(h =>
          (h.title && h.title.toLowerCase().includes(q)) ||
          (h.details && h.details.toLowerCase().includes(q)) ||
          (h.profileName && h.profileName.toLowerCase().includes(q)) ||
          (h.category && h.category.toLowerCase().includes(q)) ||
          (h.action && h.action.toLowerCase().includes(q))
        );
      }

      const container = sh.querySelector('#hist-items-container');
      if (!container) return;

      const getActionBadge = action => {
        switch (action) {
          case 'add': return '<span class="hist-act-badge hist-act-add">+ Added</span>';
          case 'complete': return '<span class="hist-act-badge hist-act-complete">✓ Done</span>';
          case 'reopen': return '<span class="hist-act-badge hist-act-reopen">↺ Reopened</span>';
          case 'delete': return '<span class="hist-act-badge hist-act-delete">✕ Deleted</span>';
          case 'stage': return '<span class="hist-act-badge hist-act-stage">→ Stage</span>';
          default: return '<span class="hist-act-badge hist-act-edit">✎ Edited</span>';
        }
      };

      const getCategoryPill = cat => {
        const label = KIND_LABEL[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Item');
        return `<span class="hist-cat-pill">${esc(label)}</span>`;
      };

      container.innerHTML = filtered.length ? filtered.map(h => {
        const letter = (h.profileName || 'U').charAt(0).toUpperCase();
        return `<div class="hist-item">
          <div class="hist-avatar" title="${esc(h.profileName || 'User')}">${esc(letter)}</div>
          <div class="hist-body">
            <div class="hist-top">
              <span class="hist-author">${esc(h.profileName || 'Teammate')}</span>
              ${getActionBadge(h.action)}
              ${getCategoryPill(h.category)}
              <span class="hist-time">${esc(formatHistoryTime(h.timestamp))}</span>
            </div>
            <div class="hist-title">${esc(h.title)}</div>
            ${h.details ? `<div class="hist-details">${esc(h.details)}</div>` : ''}
          </div>
        </div>`;
      }).join('') : `<div class="empty" style="text-align:center;padding:32px 16px">No manual changes found${searchTerm ? ' matching "' + esc(searchTerm) + '"' : ''}.</div>`;
    };

    bindEvents();
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
