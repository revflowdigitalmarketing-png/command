/* Command · Money page: summary, trip goals, wishlist. */
/* ---- money ---- */
function renderMoney() {
  const cl = clients();
  const monthly = cl.reduce((s, c) => s + (Number(c.retainer) || 0), 0);
  const pays = S.items.filter(i => i.kind === 'payment');
  const pending = pays.filter(i => i.status !== 'done');
  const pendingSum = pending.reduce((s, i) => s + (i.amount || 0), 0);
  const now = new Date(); const mKey = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const recv = pays.filter(i => i.status === 'done');
  const recvMonth = recv.filter(i => i.doneAt && ymd(new Date(i.doneAt)).startsWith(mKey)).reduce((s, i) => s + (i.amount || 0), 0);
  const goals = S.settings.goals || [];
  const saved = goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
  const targets = goals.reduce((s, g) => s + (Number(g.target) || 0), 0);
  const nextPay = sortItems([...pending])[0];
  const retSet = cl.filter(c => c.retainer).length;
  $('#money-stats').innerHTML = [
    ['Received this month', inr(recvMonth), monthly ? `of ${inr(monthly)} expected from retainers` : `${now.toLocaleDateString('en-IN',{month:'long'})} so far`],
    ['Waiting to be paid', inr(pendingSum), pending.length ? `${pending.length} payment${pending.length === 1 ? '' : 's'}${nextPay && nextPay.due ? ' · next ' + dueLabel(nextPay.due).text.toLowerCase() : ''}` : 'Nobody owes you right now'],
    ['Monthly retainers', inr(monthly), `${retSet} of ${cl.length} clients have a retainer set`],
    ['Saved for trips', inr(saved), targets ? `of ${inr(targets)} across ${goals.length} trip${goals.length === 1 ? '' : 's'}` : 'Set trip budgets below']
  ].map(([k, v, p]) => `<div class="stat"><small>${k}</small><b class="mono">${v}</b><p>${p}</p></div>`).join('');

  const wl = S.settings.wishlist || [];
  const wOpen = wl.filter(w => !w.bought), wDone = wl.filter(w => w.bought);
  const sum = a => a.reduce((x, w) => x + (Number(w.cost) || 0), 0);
  $('#wish-total').innerHTML = wl.length ? `<span>Still to buy<b>${inr(sum(wOpen))}</b></span><span>Bought<b>${inr(sum(wDone))}</b></span>${wOpen.some(w => !w.cost) ? `<span>${wOpen.filter(w => !w.cost).length} without a price yet</span>` : ''}` : '';
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
  }).join('') : `<div class="empty">List what you want to buy: clothes, a new phone, the Airbnb. Tap "+ Add".</div>`;
  $('#goals').innerHTML = goals.length ? goals.map(goalCard).join('') : `<div class="empty">No goals yet. Tap "+ Goal" to add Dubai or Bali.</div>`;
  $('#pending').innerHTML = pending.length ? sortItems(pending).map(i => taskRow(i)).join('') : `<div class="empty">Nobody owes you anything right now.</div>`;
  $('#retainers').innerHTML = cl.length ? cl.map(c => `<button class="task" data-editclient="${c.id}" style="grid-template-columns:minmax(0,1fr) auto;text-align:left">
      <span class="stripe" style="background:${clientColor(c)}"></span>
      <span class="body"><span class="ttl">${esc(c.name)}</span><span class="sub">${c.retainer ? 'per month' : 'Tap to set the retainer'}</span></span>
      <span class="mono" style="font-weight:600">${c.retainer ? inr(c.retainer) : '—'}</span></button>`).join('') : `<div class="empty">Add clients to set retainers.</div>`;
  const rl = recv.sort((a,b) => (b.doneAt||0) - (a.doneAt||0)).slice(0, 10);
  $('#received').innerHTML = rl.length ? rl.map(i => taskRow(i)).join('') : `<div class="empty">When a payment comes in, tick it and it moves here.</div>`;
}
function tripImg(g) {
  const k = ((g.id || '') + ' ' + (g.name || '')).toLowerCase();
  return k.includes('dubai') ? 'has-img img-dubai' : k.includes('bali') ? 'has-img img-bali' : '';
}
function goalCard(g) {
  const target = Number(g.target) || 0, saved = Number(g.saved) || 0;
  const left = Math.max(0, target - saved);
  const pct = target ? Math.min(100, Math.round(saved / target * 100)) : 0;
  const planned = (S.settings.wishlist || []).filter(w => w.goal === g.id && !w.bought).reduce((x, w) => x + (Number(w.cost) || 0), 0);
  let daysTxt = 'Set a trip date', perWeek = '';
  if (validDate(g.date)) {
    const days = dayDiff(g.date);
    daysTxt = days > 1 ? `${days} days left` : days === 1 ? '1 day left' : days === 0 ? 'Trip day' : 'Trip date passed';
    if (target && left === 0) perWeek = 'Fully saved';
    else if (target && days > 0) perWeek = `${inr(Math.ceil(left / Math.max(1, days / 7)))} / week`;
  }
  const meta = [validDate(g.date) ? parseYmd(g.date).toLocaleDateString('en-IN',{day:'numeric', month:'short', year:'numeric'}) : '', g.note || ''].filter(Boolean).map(esc).join(' · ');
  return `<div class="goal">
    <div class="goal-img ${tripImg(g)}">
      <button class="pen" type="button" data-goal="${g.id}" aria-label="Edit ${esc(g.name)}"><svg><use href="#i-pen"/></svg></button>
      <span class="goal-name">${esc(g.name)}</span>
    </div>
    <div class="goal-body">
      ${meta ? `<div class="goal-meta">${meta}</div>` : ''}
      <div class="goal-amt"><span class="big">${inr(saved)}</span><span class="of">${target ? 'of ' + inr(target) : 'Set a budget'}</span><span class="pct">${target ? pct + '%' : ''}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="goal-foot"><span>${daysTxt}</span><span>${perWeek}</span></div>
      ${planned ? `<div class="goal-plan">Planned buys <b>${inr(planned)}</b></div>` : ''}
    </div>
  </div>`;
}
