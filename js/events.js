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
  window.scrollTo({ top: 0 }); renderNow();
  if (view === 'ask') {
    renderChat();
    const isHidden = lsGet('cmd.inbox_hidden', false);
    const layout = $('#ask-layout');
    if (layout) layout.classList.toggle('inbox-hidden', isHidden);
    const reopen = $('#inbox-reopen-btn');
    if (reopen) reopen.style.display = isHidden ? 'inline-flex' : 'none';
    setTimeout(() => $('#ask-in').focus(), 50);
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
  const t = e.target.closest('button,[data-edit],[role=button]');
  if (!t) { if (e.target === $('#scrim')) closeSheet(); return; }
  const d = t.dataset;
  if (d.menu) { if (window.innerWidth < 600) document.body.classList.add('menu-open'); else { document.body.classList.remove('side-collapsed'); lsSet('cmd.side', 'open'); } return; }
  if (d.sidetoggle) { if (window.innerWidth < 600) document.body.classList.remove('menu-open'); else { document.body.classList.add('side-collapsed'); lsSet('cmd.side', 'closed'); } return; }
  if (d.go) { document.body.classList.remove('menu-open'); go(d.go); return; }
  if (d.toggle) { const it = S.items.find(x => x.id === d.toggle); if (it) { it.status = it.status === 'done' ? 'open' : 'done'; it.doneAt = it.status === 'done' ? Date.now() : null; if (it.kind === 'glitch') it.stage = it.status === 'done' ? 'fixed' : 'todo'; if (it.kind === 'reel') it.stage = it.status === 'done' ? 'posted' : 'edit'; saveItem(it); if (it.status === 'done') toast(it.kind === 'promise' ? 'Promise kept.' : it.kind === 'payment' ? `Marked ${inr(it.amount)} as received.` : 'Done.'); } return; }
  if (d.edit) { const it = S.items.find(x => x.id === d.edit); if (it && it.kind === 'reel') editReel(d.edit); else editItem(d.edit); return; }
  if (d.client) { markEntering('clients'); S.view = 'clients'; S.client = d.client; S.biz = clientBiz(clientById(d.client)); S.ctab = 'open'; window.scrollTo({ top:0 }); renderNow(); return; }
  if (d.back) { if (d.back === 'all') { S.biz = null; S.client = null; } else S.client = null; markEntering('clients'); window.scrollTo({ top:0 }); renderNow(); return; }
  if (d.biz) { markEntering('clients'); S.view = 'clients'; S.biz = d.biz; S.client = null; window.scrollTo({ top:0 }); renderNow(); return; }
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
    return;
  }
  if (d.action === 'reopen-inbox') {
    const layout = $('#ask-layout');
    if (layout) layout.classList.remove('inbox-hidden');
    const reopen = $('#inbox-reopen-btn');
    if (reopen) reopen.style.display = 'none';
    lsSet('cmd.inbox_hidden', false);
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
  if (d.wishtoggle) { const w = (S.settings.wishlist || []).find(x => x.id === d.wishtoggle); if (w) { w.bought = !w.bought; w.boughtAt = w.bought ? Date.now() : null; saveSettings(); } return; }
  if (d.wish) { editWish(d.wish); return; }
  if (d.fill) { fillDump(d.fill); return; }
  if (d.pcdate) { PC.date = d.pcdate; renderComposer(); return; }
  if (d.pctime !== undefined) { PC.time = d.pctime; renderComposer(); return; }
  if (d.h24 !== undefined) { PC.h24 = d.h24 === '1'; renderComposer(); return; }
  if (d.action === 'profiles') { document.body.classList.remove('menu-open'); openProfileSheet(); return; }
  if (d.action === 'settings') { document.body.classList.remove('menu-open'); editSettings(); return; }
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
    renderGoalCrushers();
    if (typeof renderCrushersMini === 'function') renderCrushersMini();
    toast('New goal added.');
    return;
  }
  if (d.action === 'new-week-crushers') {
    const curPid = S.profileId || 'rahul';
    const fresh = defaultCrushersFor(curPid);
    saveProfileCrushers(fresh, curPid);
    renderGoalCrushers();
    if (typeof renderCrushersMini === 'function') renderCrushersMini();
    toast('New week started! Plan your goal crushers.');
    return;
  }
  if (d.delCrusherGoal) {
    const curPid = S.profileId || 'rahul';
    const cData = getProfileCrushers(curPid);
    cData.goals = (cData.goals || []).filter(x => x.id !== d.delCrusherGoal);
    saveProfileCrushers(cData, curPid);
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
  if (d.action === 'new-item') { editItem(null, { kind:'task', due: today() }); return; }
  if (d.action === 'new-promise') { editItem(null, { kind:'promise', priority:'high' }); return; }
  if (d.action === 'new-payment') { logPayment(''); return; }
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
$('#dump-card').addEventListener('submit', e => { e.preventDefault(); organise(); });
$('#pc-form').addEventListener('submit', e => { e.preventDefault(); savePromise(); });
$('#glitch-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#glitch-in').value.trim(); if (!v) return; saveItem(makeItem({ kind:'glitch', title: v, biz: S.biz || productBiz(), priority:'med' })); $('#glitch-in').value = ''; toast('Glitch logged.'); });
['#pc-what','#pc-who'].forEach(sel => { const el = $(sel); if (el) { el.addEventListener('input', renderComposerInfo); el.addEventListener('change', renderComposerInfo); } });
$('#pc-client').addEventListener('change', renderComposerInfo);
$('#pc-what').addEventListener('input', e => autoGrow(e.target));
$('#ask-in').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#ask-form').requestSubmit(); } });
function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(320, Math.max(el.scrollHeight, 52)) + 'px'; }
['#dump','#ask-in'].forEach(sel => $(sel).addEventListener('input', e => autoGrow(e.target)));
function fillDump(kind) {
  if (kind === 'plan') { planDay(); $('#plan-card').scrollIntoView({ behavior:'smooth', block:'start' }); return; }
  const c = clients()[0];
  const tpl = { meeting: `Meeting with ${c ? (c.short || c.name) : 'client'}: `, promise: 'I told ___ I would ___ by ___', payment: `${c ? (c.short || c.name) : 'Client'} owes ₹___ for ___` }[kind] || '';
  const el = $('#dump'); el.value = (el.value ? el.value.trim() + '\n' : '') + tpl; el.focus(); autoGrow(el);
}
$('#dump').addEventListener('input', () => { clearTimeout(quickTask._d); quickTask._d = setTimeout(() => lsSet('cmd.draft', $('#dump').value), 400); });
function clientQuickAdd() {
  const v = $('#client-quick').value.trim(); if (!v || !S.client) return;
  saveItem(makeItem({ title: v, client: S.client, kind: S.ctab === 'notes' ? 'note' : 'task' }));
  $('#client-quick').value = ''; toast('Added.');
}

/* ================= menu drawer ================= */
$$('.topbar').forEach(tb => { const b = document.createElement('button'); b.className = 'icon-btn menu-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Menu'); b.dataset.menu = '1'; b.innerHTML = '<svg><use href="#i-panel"/></svg>'; tb.prepend(b); });
if (lsGet('cmd.side', 'open') === 'closed') document.body.classList.add('side-collapsed');
$('#side-scrim').addEventListener('click', () => document.body.classList.remove('menu-open'));
window.addEventListener('resize', () => { cancelAnimationFrame(placeNavInd._r); placeNavInd._r = requestAnimationFrame(placeNavInd); });
markEntering('home');

/* ================= boot ================= */
$('#dump').value = lsGet('cmd.draft', '') || '';
renderNow(); renderReview(); renderPlan(); renderChat();
initStore();
loadCalendar(false);
if (typeof checkUpcomingDeadlines === 'function') checkUpcomingDeadlines();
setInterval(() => { if (S.view === 'home') renderDay(); }, 60000);
