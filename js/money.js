/* Command · Money page: summary, trip goals, wishlist. */
/* ---- money ---- */
function renderMoney() {
  const cl = clients();
  const curPid = (S && S.profileId) || 'rahul';

  // TRUE monthly retainers (excluding one-time payments)
  const retClients = cl.filter(c => Number(c.retainer) > 0 && !c.oneTime);
  const totalMonthlyRetainers = retClients.reduce((s, c) => s + (Number(c.retainer) || 0), 0);
  const myRetainerShare = retClients.reduce((s, c) => s + (clientShare(c, curPid) || 0), 0);

  // TRUE one-time project share
  const oneTimeClients = cl.filter(c => Number(c.oneTime) > 0);
  const myOneTimeShare = oneTimeClients.reduce((s, c) => {
    const sh = clientShare(c, curPid);
    if (sh > 0) return s + sh;
    const fallback = (c.shares && (c.shares[curPid] || c.shares['sri-chandana'] || c.shares.rahul)) || c.yourShare || 0;
    return s + (Number(fallback) || 0);
  }, 0);

  const pays = (S.items || []).filter(i => i.kind === 'payment');
  const pending = pays.filter(i => i.status !== 'done');
  const pendingSum = pending.reduce((s, i) => s + (paymentShare(i) || 0), 0);

  const now = new Date(); const mKey = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const recv = pays.filter(i => i.status === 'done');
  const actualRecv = recv.filter(i => i.doneAt && ymd(new Date(i.doneAt)).startsWith(mKey)).reduce((s, i) => s + (paymentShare(i) || 0), 0);
  const recvMonth = (S.settings.receivedThisMonth !== undefined && S.settings.receivedThisMonth !== null && S.settings.receivedThisMonth !== '')
    ? Number(S.settings.receivedThisMonth)
    : actualRecv;

  const goals = S.settings.goals || [];
  const saved = goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
  const targets = goals.reduce((s, g) => s + (Number(g.target) || 0), 0);
  const nextPay = sortItems([...pending])[0];

  $('#money-stats').innerHTML = [
    ['Received this month', inr(recvMonth), recvMonth > 0 ? `${now.toLocaleDateString('en-IN',{month:'long'})}` : 'None yet'],
    ['To be received', inr(pendingSum), pending.length ? `${pending.length} payment${pending.length === 1 ? '' : 's'}` : 'All received'],
    ['Monthly retainers', inr(myRetainerShare), retClients.length ? `Across ${retClients.length} client${retClients.length === 1 ? '' : 's'}${totalMonthlyRetainers ? ` · Business: ${inr(totalMonthlyRetainers)} / mo` : ''}` : 'No active retainers'],
    ['Saved for trips', inr(saved), targets ? `of ${inr(targets)} across ${goals.length} trip${goals.length === 1 ? '' : 's'}` : 'Set trip budgets below']
  ].map(([k, v, p]) => `<div class="stat"><small>${k}</small><b class="mono">${v}</b><p>${p}</p></div>`).join('');

  const wl = S.settings.wishlist || [];
  const wOpen = wl.filter(w => !w.bought), wDone = wl.filter(w => w.bought);
  const sum = a => a.reduce((x, w) => x + (Number(w.cost) || 0), 0);
  const totalCost = sum(wl);
  const amtEl = $('#things-to-buy-amount');
  if (amtEl) {
    amtEl.textContent = wl.length && totalCost > 0 ? inr(totalCost) : (wl.length ? '₹0' : '');
  }
  $('#wish-total').innerHTML = '';
  $('#wishlist').innerHTML = wl.length ? [...wOpen, ...wDone].map(w => {
    const g = (S.settings.goals || []).find(x => x.id === w.goal);
    return `<div class="wish ${w.bought ? 'bought' : ''}">
      <button class="check" data-wishtoggle="${w.id}" aria-label="${w.bought ? 'Mark not bought' : 'Mark bought'}"><svg><use href="#i-check"/></svg></button>
      <button class="body" data-wish="${w.id}" style="min-width:0;display:flex;flex-direction:column;gap:2px">
        <span class="ttl">${esc(w.name)}</span>
        <span class="sub">${[w.cat || 'Other', g ? g.name + ' trip' : '', w.note || ''].filter(Boolean).map(esc).join(' · ')}</span>
      </button>
      <button class="cost" data-wish="${w.id}">${w.cost ? inr(w.cost) : '<span class="faint">Add price</span>'}</button>
    </div>`;
  }).join('') : `<div class="empty">List what you want to buy: clothes, a new phone, the Airbnb. Tap "Manage".</div>`;
  $('#goals').innerHTML = goals.length ? goals.map(goalCard).join('') : `<div class="empty">No goals yet. Tap "Manage" to add Dubai or Bali.</div>`;
  $('#pending').innerHTML = pending.length ? sortItems(pending).map(i => taskRow(i)).join('') : `<div class="empty">No payments to be received.<br><button class="btn small primary" data-action="new-receivable" style="margin-top:10px"><svg><use href="#i-plus"/></svg>Add to be received</button></div>`;

  const rl = recv.sort((a,b) => (b.doneAt||0) - (a.doneAt||0));
  $('#received').innerHTML = rl.length ? rl.map(i => taskRow(i)).join('') : `<div class="empty">No payments received yet.<br><button class="btn small" data-action="new-received" style="margin-top:8px"><svg><use href="#i-plus"/></svg>Log received payment</button></div>`;
}
function tripImg(g) {
  if (g.image) return 'has-img';
  const k = ((g.id || '') + ' ' + (g.name || '')).toLowerCase();
  return k.includes('dubai') ? 'has-img img-dubai' : k.includes('bali') ? 'has-img img-bali' : '';
}
function goalCard(g) {
  const target = Number(g.target) || 0, saved = Number(g.saved) || 0;
  const left = Math.max(0, target - saved);
  const rawPct = target ? (saved / target * 100) : 0;
  const pct = formatGoalPct(saved, target);
  const barWidth = saved > 0 ? Math.max(2, Math.min(100, rawPct)) : 0;
  const planned = (S.settings.wishlist || []).filter(w => w.goal === g.id && !w.bought).reduce((x, w) => x + (Number(w.cost) || 0), 0);
  let daysTxt = 'Set a trip date', perWeek = '';
  if (validDate(g.date)) {
    const days = dayDiff(g.date);
    daysTxt = days > 1 ? `${days} days left` : days === 1 ? '1 day left' : days === 0 ? 'Trip day' : 'Trip date passed';
    if (target && left === 0) perWeek = 'Fully saved';
    else if (target && days > 0) perWeek = `${inr(Math.ceil(left / Math.max(1, days / 7)))} / week`;
  }
  const meta = [validDate(g.date) ? parseYmd(g.date).toLocaleDateString('en-IN',{day:'numeric', month:'short', year:'numeric'}) : '', g.note || ''].filter(Boolean).map(esc).join(' · ');
  const customImgStyle = g.image ? `style="background-image:url('${esc(g.image)}');background-size:cover;background-position:center"` : '';
  return `<div class="goal">
    <div class="goal-img ${tripImg(g)}" ${customImgStyle}>
      <div class="goal-img-actions">
        <label class="pen" style="cursor:pointer" title="Upload new photo from device" aria-label="Upload photo for ${esc(g.name)}">
          <svg><use href="#i-image"/></svg>
          <input type="file" accept="image/*" class="goal-card-file" data-goal-id="${g.id}" style="display:none">
        </label>
        <button class="pen" type="button" data-goal="${g.id}" aria-label="Edit ${esc(g.name)}"><svg><use href="#i-pen"/></svg></button>
      </div>
      <span class="goal-name">${esc(g.name)}</span>
    </div>
    <div class="goal-body">
      ${meta ? `<div class="goal-meta">${meta}</div>` : ''}
      <div class="goal-amt"><span class="big">${inr(saved)}</span><span class="of">${target ? 'of ' + inr(target) : 'Set a budget'}</span><span class="pct">${pct}</span></div>
      <div class="bar"><i style="width:${barWidth}%"></i></div>
      <div class="goal-foot"><span>${daysTxt}</span><span>${perWeek}</span></div>
      ${planned ? `<div class="goal-plan">Planned buys <b>${inr(planned)}</b></div>` : ''}
    </div>
  </div>`;
}
