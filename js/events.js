/* Command · Clicks, keyboard, menu drawer and boot. Loaded last. */
/* ================= events ================= */
function markEntering(id) {
  const v = $('#v-' + id); if (!v) return;
  v.classList.remove('entering'); void v.offsetWidth; v.classList.add('entering');
  clearTimeout(markEntering['_' + id]); markEntering['_' + id] = setTimeout(() => v.classList.remove('entering'), 1300);
}
function go(view) {
  markEntering(view);
  if (view === 'clients') { S.biz = null; S.client = null; }
  S.view = view; if (view !== 'clients') S.client = null;
  if (view !== 'ask') S.inboxFocused = false;
  window.scrollTo({ top: 0 }); renderNow();
  if (view === 'ask') {
    S.inboxContactId = null;
    renderChat();
    const isHidden = lsGet('cmd.inbox_hidden', false);
    const layout = $('#ask-layout');
    if (layout) layout.classList.toggle('inbox-hidden', isHidden);
    const reopen = $('#inbox-reopen-btn');
    if (reopen) reopen.style.display = isHidden ? 'inline-flex' : 'none';
    setTimeout(() => {
      const askIn = $('#ask-in');
      if (askIn && !S.inboxFocused) askIn.focus();
    }, 50);
  }
}
document.addEventListener('click', e => {
  const bannerBtn = e.target.closest('.banner-edit-btn');
  if (bannerBtn) {
    e.stopPropagation();
    e.preventDefault();
    openBannerCustomizer();
    return;
  }
  const editBadge = e.target.closest('.p-edit-badge');
  if (editBadge) {
    e.stopPropagation();
    e.preventDefault();
    openBannerCustomizer();
    return;
  }
  const t = e.target.closest('button, [role=button], [data-go], [data-action], [data-edit], [data-toggle], [data-client], [data-biz], [data-back], [data-stage], [data-reel], [data-newreel], [data-rweek], [data-ctab], [data-editbiz], [data-editclient], [data-logpay], [data-goal], [data-day], [data-wday], [data-wishtoggle], [data-wish], [data-fill], [data-pcdate], [data-pctime], [data-h24], [data-switchprofile], [data-opencontact], [data-auth-login], [data-toggle-crusher], [data-editfocustask]');
  if (!t) {
    if (e.target === $('#scrim')) closeSheet();
    if (e.target && (e.target.id === 'auth-gate' || e.target.classList.contains('auth-gate'))) hideAuthGate();
    return;
  }
  const d = t.dataset;
  if (d.action === 'close-auth') { hideAuthGate(); return; }
  if (d.authLogin) { loginWithGoogleAccount(d.authLogin); return; }
  if (d.action === 'signout') { signOutGoogle(); return; }
  if (d.menu) { if (window.innerWidth < 600) document.body.classList.add('menu-open'); else { document.body.classList.remove('side-collapsed'); lsSet('cmd.side', 'open'); } return; }
  if (d.sidetoggle) { if (window.innerWidth < 600) document.body.classList.remove('menu-open'); else { document.body.classList.add('side-collapsed'); lsSet('cmd.side', 'closed'); } return; }
  if (d.go) {
    document.body.classList.remove('menu-open');
    if (d.focusInbox) {
      S.inboxFocused = true;
      lsSet('cmd.inbox_hidden', false);
    } else if (d.go === 'ask') {
      S.inboxFocused = false;
    }
    go(d.go);
    return;
  }
  if (d.toggle) {
    const it = S.items.find(x => x.id === d.toggle);
    if (it) {
      it.status = it.status === 'done' ? 'open' : 'done';
      it.doneAt = it.status === 'done' ? Date.now() : null;
      if (it.kind === 'glitch') it.stage = it.status === 'done' ? 'fixed' : 'todo';
      if (it.kind === 'reel') it.stage = it.status === 'done' ? 'posted' : 'edit';
      if (it.kind === 'payment' && S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '') {
        const sh = paymentShare(it);
        if (it.status === 'done') S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) + sh);
        else S.settings.receivedThisMonth = Math.max(0, Number(S.settings.receivedThisMonth) - sh);
        saveSettings();
      }
      saveItem(it);
      if (it.status === 'done') toast(it.kind === 'promise' ? 'Promise kept.' : it.kind === 'payment' ? `Marked ${inr(paymentShare(it))} as received.` : 'Done.');
    }
    return;
  }
  if (d.edit) { const it = S.items.find(x => x.id === d.edit); if (it && it.kind === 'reel') editReel(d.edit); else if (it && it.kind === 'payment') editPayment(d.edit); else editItem(d.edit); return; }
  if (d.client) { markEntering('clients'); S.view = 'clients'; S.client = d.client; S.biz = clientBiz(clientById(d.client)); S.ctab = 'open'; window.scrollTo({ top: 0 }); renderNow(); return; }
  if (d.back) { if (d.back === 'all') { S.biz = null; S.client = null; } else S.client = null; markEntering('clients'); window.scrollTo({ top: 0 }); renderNow(); return; }
  if (d.biz) { markEntering('clients'); S.view = 'clients'; S.biz = d.biz; S.client = null; window.scrollTo({ top: 0 }); renderNow(); return; }
  if (d.stage) { const it = S.items.find(x => x.id === d.stage); if (it) { const st = (it.kind === 'glitch' ? GLITCH_STAGES : REEL_STAGES).map(x => x[0]); const n = st[(st.indexOf(it.stage) + 1) % st.length]; it.stage = n; const fin = n === 'fixed' || n === 'posted'; it.status = fin ? 'done' : 'open'; it.doneAt = fin ? Date.now() : null; saveItem(it); if (fin) toast(it.kind === 'glitch' ? 'Glitch fixed. Make a reel about it?' : 'Reel posted.'); } return; }
  if (d.reel) { editReel(d.reel); return; }
  if (d.newreel) { editReel(null, d.newreel); return; }
  if (d.rweek) { S.rweek = (S.rweek || 0) + Number(d.rweek); renderNow(); return; }
  if (d.action === 'close-inbox-pane') {
    const layout = $('#ask-layout');
    if (layout) layout.classList.add('inbox-hidden');
    const reopen = $('#inbox-reopen-btn');
    if (reopen) reopen.style.display = 'inline-flex';
    lsSet('cmd.inbox_hidden', true);
    S.inboxContactId = null;
    return;
  }
  if (d.action === 'reopen-inbox') {
    const layout = $('#ask-layout');
    if (layout) layout.classList.remove('inbox-hidden');
    const reopen = $('#inbox-reopen-btn');
    if (reopen) reopen.style.display = 'none';
    lsSet('cmd.inbox_hidden', false);
    S.inboxContactId = null;
    renderInboxChat();
    return;
  }
  if (d.action === 'manage-businesses') { openManageBusinesses(); return; }
  if (d.action === 'manage-clients') { openManageClients(S.biz); return; }
  if (d.action === 'manage-focus') { openManageFocus(); return; }
  if (d.action === 'manage-goals') { openManageGoals(); return; }
  if (d.action === 'manage-wishlist') { openManageWishlist(); return; }
  if (d.action === 'manage-payments') { openManagePayments(); return; }
  if (d.action === 'customize-banner') { openBannerCustomizer(); return; }
  if (d.action === 'customize-icon') { openIconCustomizer(); return; }
  if (d.action === 'reminders') { openNotificationSettingsSheet(); return; }
  if (d.action === 'new-business') { openManageBusinesses(); return; }
  if (d.action === 'new-reel') { editReel(null, today()); return; }
  if (d.ctab) { S.ctab = d.ctab; renderNow(); return; }
  if (d.editbiz) { editBusiness(d.editbiz); return; }
  if (d.editclient) { editClient(d.editclient); return; }
  if (d.logpay !== undefined) { logPayment(d.logpay); return; }
  if (d.goal) { editGoal(d.goal); return; }
  if (d.day) { if (d.scope) { S.cday = d.day; renderDay(d.scope); } else { S.day = d.day; renderDay(); } return; }
  if (d.wday) { S.selectedWeekDay = d.wday; if (typeof renderWeekStrip === 'function') renderWeekStrip(); return; }
  if (d.wishtoggle) {
    const w = (S.settings.wishlist || []).find(x => x.id === d.wishtoggle);
    if (w) {
      w.bought = !w.bought;
      w.boughtAt = w.bought ? Date.now() : null;
      if (typeof recordHistory === 'function') {
        recordHistory({
          action: w.bought ? 'complete' : 'reopen',
          category: 'wishlist',
          title: w.name || 'Wish item',
          details: w.bought ? 'Marked as bought' : 'Unmarked bought',
          profileId: S.profileId
        });
      }
      saveSettings();
    }
    return;
  }
  if (d.wish) { editWish(d.wish); return; }
  if (d.fill) { fillDump(d.fill); return; }
  if (d.pcdate) { PC.date = d.pcdate; renderComposer(); return; }
  if (d.pctime !== undefined) { PC.time = d.pctime; renderComposer(); return; }
  if (d.h24 !== undefined) { PC.h24 = d.h24 === '1'; renderComposer(); return; }
  if (d.action === 'profiles') { document.body.classList.remove('menu-open'); openProfileSheet(); return; }
  if (d.action === 'settings') { document.body.classList.remove('menu-open'); editSettings(); return; }
  if (d.action === 'history' || d.action === 'open-history') { document.body.classList.remove('menu-open'); openHistorySheet(); return; }
  if (d.action === 'toggle-expand-biz') {
    S.expandedBiz = S.expandedBiz || {};
    S.expandedBiz[d.bizId] = !S.expandedBiz[d.bizId];
    renderHome();
    return;
  }
  if (d.action === 'save-client-notes') {
    const input = $('#client-notes-input');
    if (input) commitClientNotes(input, d.client);
    return;
  }
  if (d.action === 'move-note-to-task') {
    const noteId = d.noteId;
    const note = S.items.find(x => x.id === noteId);
    if (note && !note.convertedToTaskId) {
      const c = clientById(note.clientId || note.client);
      const bId = note.businessId || (c ? clientBiz(c) : '') || 'unassigned';
      const newTask = makeItem({
        title: note.title,
        businessId: bId,
        clientId: note.clientId || note.client || '',
        status: 'open',
        convertedFromNoteId: note.id
      });
      note.convertedToTaskId = newTask.id;
      saveItem(newTask);
      saveItem(note);
      toast('Task created from note.');
      renderNow();
    }
    return;
  }
  if (d.opencontact) {
    S.inboxContactId = d.opencontact;
    if (typeof markChatRead === 'function') {
      markChatRead(S.profileId || 'rahul', d.opencontact);
    }
    renderInboxChat();
    return;
  }
  if (d.action === 'back-to-inbox-list') { S.inboxContactId = null; renderInboxChat(); return; }
  if (d.chattab) { S.inboxContactId = d.chattab; renderInboxChat(); return; }
  if (d.quickmsg) { sendChatMessage(S.inboxContactId, d.quickmsg); renderInboxChat(); return; }
  if (d.action === 'start-streak') {
    const curPid = S.profileId || 'rahul';
    if (curPid === 'sri-chandana') lsSet('cmd.sri_streak_started', true);
    S.settings.streakStarted = true;
    S.settings.streakStartDate = today();
    saveSettings();
    toast('Streak started! Keep momentum going.');
    if (typeof renderStreak === 'function') renderStreak();
    return;
  }
  if (d.toggleCrusher) {
    toggleCrusherGoal(d.toggleCrusher);
    return;
  }
  if (d.action === 'add-crusher-goal') {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    cData.goals = cData.goals || [];
    cData.goals.push({ id: newId(), text: '', targetScore: 2, earnedScore: 0, done: false });
    saveProfileCrushers(cData, curPid);
    if (typeof recordHistory === 'function') {
      recordHistory({
        action: 'add',
        category: 'crusher',
        title: 'New Goal Crusher task',
        details: 'Added Goal Crusher item (Target: 2pts)',
        profileId: curPid
      });
    }
    renderGoalCrushers();
    if (typeof renderCrushersMini === 'function') renderCrushersMini();
    toast('New goal added.');
    return;
  }
  if (d.action === 'new-week-crushers') {
    const curPid = S.profileId || 'rahul';
    const current = getProfileCrushers(curPid);
    const goals = current.goals || [];
    const totalEarned = goals.reduce((sum, g) => sum + (g.done ? (Number(g.targetScore) || 2) : (Number(g.earnedScore) || 0)), 0);
    const hitStreak = totalEarned >= 7;

    const fresh = defaultCrushersFor(curPid);
    if (hitStreak) {
      fresh.weekStreak = (Number(current.weekStreak) || 0) + 1;
      toast(`Goal crushed with ${totalEarned} pts! Week streak increased to ${fresh.weekStreak} 🔥`);
    } else {
      fresh.weekStreak = 0;
      toast('New week started! Earn 7+ points this week to build your streak.');
    }

    saveProfileCrushers(fresh, curPid);
    if (typeof recordHistory === 'function') {
      recordHistory({
        action: 'edit',
        category: 'crusher',
        title: 'Started new week for Goal Crushers',
        details: hitStreak ? `Ended week with ${totalEarned} pts (7+ hit). Streak: ${fresh.weekStreak} weeks` : `Ended week with ${totalEarned} pts. Streak reset to 0`,
        profileId: curPid
      });
    }
    renderGoalCrushers();
    if (typeof renderCrushersMini === 'function') renderCrushersMini();
    return;
  }
  if (d.delCrusherGoal) {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    const goalItem = (cData.goals || []).find(x => x.id === d.delCrusherGoal);
    cData.goals = (cData.goals || []).filter(x => x.id !== d.delCrusherGoal);
    saveProfileCrushers(cData, curPid);
    if (typeof recordHistory === 'function') {
      recordHistory({
        action: 'delete',
        category: 'crusher',
        title: goalItem?.text || 'Goal Crusher task',
        details: 'Removed from Goal Crushers',
        profileId: curPid
      });
    }
    renderGoalCrushers();
    if (typeof renderCrushersMini === 'function') renderCrushersMini();
    toast('Goal removed.');
    return;
  }
  if (d.action === 'add-crusher-reward') {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    cData.rewards = cData.rewards || [];
    cData.rewards.push({ id: newId(), points: '10+', reward: '' });
    saveProfileCrushers(cData, curPid);
    renderGoalCrushers();
    toast('Reward tier added.');
    return;
  }
  if (d.delCrusherReward) {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    cData.rewards = (cData.rewards || []).filter(x => x.id !== d.delCrusherReward);
    saveProfileCrushers(cData, curPid);
    renderGoalCrushers();
    toast('Reward tier removed.');
    return;
  }
  if (d.action === 'remove-focus-goal') {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    cData.hideFocusGoal = true;
    saveProfileCrushers(cData, curPid);
    renderGoalCrushers();
    toast('Weekly focus goal row removed.');
    return;
  }
  if (d.action === 'restore-focus-goal') {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    cData.hideFocusGoal = false;
    saveProfileCrushers(cData, curPid);
    renderGoalCrushers();
    toast('Weekly focus goal restored.');
    return;
  }
  if (d.action === 'new-focus-task') { editFocusTask(null); return; }
  if (d.editfocustask) { editFocusTask(d.editfocustask); return; }
  if (d.inboxtoggle) { toggleInboxItem(d.inboxtoggle); renderInboxChat(); return; }
  if (d.switchprofile) {
    const rect = t.getBoundingClientRect();
    const originX = (e.clientX && e.clientX > 0) ? e.clientX : (rect.left + rect.width / 2);
    const originY = (e.clientY && e.clientY > 0) ? e.clientY : (rect.top + rect.height / 2);
    closeSheet();
    switchProfile(d.switchprofile, { x: originX, y: originY });
    return;
  }
  if (d.action === 'new-client') { openManageClients(S.biz); return; }
  if (d.action === 'new-item') { editItem(null, { kind: 'task', due: today() }); return; }
  if (d.action === 'new-promise') { editItem(null, { kind: 'promise', priority: 'high' }); return; }
  if (d.action === 'new-payment' || d.action === 'new-receivable') { editPayment(null, { status: 'pending', kind: 'payment' }); return; }
  if (d.action === 'new-received') { editPayment(null, { status: 'received', kind: 'payment' }); return; }
  if (d.action === 'new-goal') { editGoal(null); return; }
  if (d.action === 'new-wish') { editWish(null); return; }
  if (t.id === 'quick-task') { quickTask(); return; }
  if (t.id === 'rv-add') { addReviewed(); return; }
  if (t.id === 'rv-cancel') { S.review = null; renderReview(); return; }
  if (t.id === 'plan-btn') { planDay(); return; }
  if (t.id === 'plan-block') { blockPlan(); return; }
  if (t.id === 'cal-refresh') { loadCalendar(true); return; }
  if (t.id === 'chat-clear') { askCtl && askCtl.abort(); S.chat = []; renderChat(); return; }
  if (t.id === 'orb') { go('home'); setTimeout(() => { $('#dump').focus(); }, 60); return; }
  if (t.id === 'client-quick-add') { clientQuickAdd(); return; }
  if (t.closest('#suggest')) { ask(t.textContent); return; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#scrim').hidden) closeSheet();
  if (e.key === 'Enter' && e.target.matches('[role=button][data-edit]')) editItem(e.target.dataset.edit);
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.id === 'dump') organise();
  if (e.key === 'Enter' && e.target.id === 'client-quick') clientQuickAdd();
});
$('#scrim').addEventListener('click', e => { if (e.target.id === 'scrim') closeSheet(); });
$('#ask-form').addEventListener('submit', e => { e.preventDefault(); const q = $('#ask-in').value; $('#ask-in').value = ''; autoGrow($('#ask-in')); ask(q); });
document.addEventListener('submit', e => {
  if (e.target && e.target.id === 'auth-custom-form') {
    e.preventDefault();
    const inEl = $('#auth-email-in');
    const errEl = $('#auth-error-msg');
    if (errEl) errEl.hidden = true;
    if (!inEl) return;
    const res = loginWithGoogleAccount(inEl.value);
    if (!res.ok) {
      if (errEl) {
        errEl.textContent = res.message;
        errEl.hidden = false;
      }
    } else {
      inEl.value = '';
    }
    return;
  }

  // Home capture box submit handler
  if (e.target && e.target.id === 'dump-card') {
    e.preventDefault();
    if (typeof organise === 'function') organise();
    return;
  }

  // Business page Add Task form
  if (e.target && e.target.id === 'biz-task-form') {
    e.preventDefault();
    const bId = e.target.dataset.biz;
    const title = $('#biz-task-title').value.trim();
    const client = $('#biz-task-client').value || '';
    if (!title) { toast('Please enter a task title.'); return; }
    if (!bId) { toast('Business is missing.'); return; }
    const task = makeItem({ title, businessId: bId, clientId: client, status: 'open' });
    saveItem(task);
    $('#biz-task-title').value = '';
    toast('Task added.');
    renderNow();
    return;
  }

  // My Word Promise form (Creates normal task with promisedTo and required due date)
  if (e.target && e.target.id === 'pc-form') {
    e.preventDefault();
    const what = $('#pc-what').value.trim();
    const who = $('#pc-who').value;
    const date = $('#pc-date').value;
    const time = $('#pc-time') ? $('#pc-time').value : '';
    const biz = $('#pc-biz').value;
    const client = $('#pc-client') ? $('#pc-client').value : '';

    if (!what) { toast('Write what you promised first.'); return; }
    if (!who) { toast('Select whom you made the promise to.'); return; }
    if (!date) { toast('Due date is required for a promise.'); return; }
    if (!biz) { toast('Select a business for this promise.'); return; }

    const task = makeItem({
      title: what,
      promisedTo: who,
      dueDate: date,
      time,
      businessId: biz,
      clientId: client || '',
      status: 'open'
    });
    saveItem(task);
    $('#pc-what').value = '';
    $('#pc-date').value = '';
    if ($('#pc-time')) $('#pc-time').value = '';
    toast('Promise saved.');
    renderNow();
    return;
  }
  if (e.target && e.target.id === 'inbox-chat-form') {
    e.preventDefault();
    const input = $('#inbox-chat-text');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    sendChatMessage(S.inboxContactId, val);
    input.value = '';
    renderInboxChat();
  }
});
const dumpCard = $('#dump-card');
if (dumpCard) dumpCard.addEventListener('submit', e => { e.preventDefault(); if (typeof organise === 'function') organise(); });

const pcForm = $('#pc-form');
if (pcForm) pcForm.addEventListener('submit', e => { e.preventDefault(); if (typeof savePromise === 'function') savePromise(); });

const larpTaskForm = $('#larp-task-form') || $('#glitch-form');
if (larpTaskForm) larpTaskForm.addEventListener('submit', e => {
  e.preventDefault();
  const inEl = $('#larp-task-in') || $('#glitch-in');
  const v = inEl ? inEl.value.trim() : '';
  if (!v) return;
  saveItem(makeItem({ kind: 'task', title: v, biz: S.biz || productBiz(), client: '', priority: 'med' }));
  inEl.value = '';
  toast('Task added.');
});

['#pc-what', '#pc-who'].forEach(sel => {
  const el = $(sel);
  if (el) {
    el.addEventListener('input', renderComposerInfo);
    el.addEventListener('change', renderComposerInfo);
  }
});
const pcCl = $('#pc-client');
if (pcCl) pcCl.addEventListener('change', renderComposerInfo);
const pcWhat = $('#pc-what');
if (pcWhat) pcWhat.addEventListener('input', e => autoGrow(e.target));

const askIn = $('#ask-in');
if (askIn) {
  askIn.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const af = $('#ask-form');
      if (af) af.requestSubmit();
    }
  });
  askIn.addEventListener('input', e => autoGrow(e.target));
}

function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(320, Math.max(el.scrollHeight, 52)) + 'px';
}

const dumpEl = $('#dump');
if (dumpEl) {
  dumpEl.addEventListener('input', e => {
    autoGrow(e.target);
    clearTimeout(quickTask._d);
    quickTask._d = setTimeout(() => lsSet('cmd.draft', dumpEl.value), 400);
  });
  dumpEl.value = lsGet('cmd.draft', '') || '';
}

function fillDump(kind) {
  if (kind === 'plan') {
    if (typeof planDay === 'function') planDay();
    const pc = $('#plan-card');
    if (pc) pc.scrollIntoView({ behavior:'smooth', block:'start' });
    return;
  }
  const c = clients()[0];
  const tpl = {
    meeting: `Meeting with ${c ? (c.short || c.name) : 'client'}: `,
    promise: 'I told ___ I would ___ by ___',
    payment: `${c ? (c.short || c.name) : 'Client'} owes ₹___ for ___`
  }[kind] || '';
  const el = $('#dump');
  if (!el) return;
  el.value = (el.value ? el.value.trim() + '\n' : '') + tpl;
  el.focus();
  autoGrow(el);
}

function clientQuickAdd() {
  const cq = $('#client-quick');
  const v = cq ? cq.value.trim() : '';
  if (!v || !S.client) return;
  saveItem(makeItem({ title: v, client: S.client, kind: S.ctab === 'notes' ? 'note' : 'task' }));
  if (cq) cq.value = '';
  toast('Added.');
}

/* ================= menu drawer ================= */
$$('.topbar').forEach(tb => {
  if (!tb.querySelector('.menu-btn')) {
    const b = document.createElement('button');
    b.className = 'icon-btn menu-btn';
    b.type = 'button';
    b.setAttribute('aria-label', 'Menu');
    b.dataset.menu = '1';
    b.innerHTML = '<svg><use href="#i-panel"/></svg>';
    tb.prepend(b);
  }
});

if (lsGet('cmd.side', 'open') === 'closed') document.body.classList.add('side-collapsed');
const sideScrim = $('#side-scrim');
if (sideScrim) sideScrim.addEventListener('click', () => document.body.classList.remove('menu-open'));
window.addEventListener('resize', () => {
  cancelAnimationFrame(placeNavInd._r);
  placeNavInd._r = requestAnimationFrame(placeNavInd);
});

document.addEventListener('change', async e => {
  if (e.target && e.target.classList.contains('goal-card-file')) {
    const gid = e.target.dataset.goalId;
    const file = e.target.files && e.target.files[0];
    if (file && gid) {
      try {
        const dataUrl = await readImageFile(file, 1200, 800);
        const g = (S.settings.goals || []).find(x => x.id === gid);
        if (g) {
          g.image = dataUrl;
          g.updated = Date.now();
          saveSettings();
          render();
          toast(`Updated photo for ${g.name}.`);
        }
      } catch (err) {
        toast('Could not load image');
      }
    }
  }
});

markEntering('home');

/* ================= boot ================= */
try { renderNow(); } catch (err) { console.error('Error in renderNow:', err); }
try { if (typeof renderReview === 'function') renderReview(); } catch { }
try { if (typeof renderPlan === 'function') renderPlan(); } catch { }
try { if (typeof renderChat === 'function') renderChat(); } catch { }
try { if (typeof initStore === 'function') initStore(); } catch { }
try { if (typeof loadCalendar === 'function') loadCalendar(false); } catch { }
try { if (typeof checkUpcomingDeadlines === 'function') checkUpcomingDeadlines(); } catch { }
setInterval(() => { if (S.view === 'home') renderDay(); }, 60000);
