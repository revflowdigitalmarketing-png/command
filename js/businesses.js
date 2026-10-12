/* Command · Businesses + client folders + client detail. */
/* ---- clients page ---- */
function setTopBtn(label, action) { const b = $('#clients-topbtn'); b.textContent = label; b.dataset.action = action; }
function renderClients() {
  const c = S.client && clientById(S.client);
  if (c) S.biz = clientBiz(c);
  const b = S.biz && bizById(S.biz);
  if (!b) S.biz = null;
  $('#biz-list').hidden = !!b;
  $('#biz-head').hidden = !b || !!c || b.kind === 'product';
  $('#clients-list').hidden = !b || !!c || b.kind === 'product';
  $('#larp').hidden = !b || b.kind !== 'product';
  $('#client-detail').hidden = !c;
  if (!b) {
    S.client = null;
    $('#clients-crumb').innerHTML = `${esc(S.settings.name || 'Rahul')} / <b>Businesses</b>`;
    $('#clients-title').textContent = 'Businesses';
    setTopBtn('Manage businesses', 'manage-businesses');
    $('#biz-list').innerHTML = businesses().length ? businesses().map(mainFolder).join('') : `<div class="empty">No businesses yet. Tap "Manage businesses".</div>`;
    return;
  }
  if (b.kind === 'product') { renderLarp(b); return; }
  if (!c) {
    $('#clients-crumb').innerHTML = `<button class="link" data-back="all">${esc(S.settings.name || 'Rahul')}</button> / <b>${esc(b.name)}</b>`;
    $('#clients-title').textContent = b.name;
    setTopBtn('Manage clients', 'manage-clients');
    const cl = bizClients(b.id);
    const open = openItems().filter(i => cl.some(x => x.id === i.client) && i.kind !== 'note');
    const monthly = cl.reduce((x, k) => x + (Number(k.retainer) || 0), 0);
    const myShareTotal = cl.reduce((x, k) => x + (Number(k.yourShare !== undefined ? k.yourShare : k.retainer) || 0), 0);
    $('#biz-head').innerHTML = `${b.cover ? `<div class="biz-banner" style="background-image:url('${esc(b.cover)}')"></div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <button class="back-btn" type="button" data-back="all" style="margin-bottom:0"><svg><use href="#i-back"/></svg>All businesses</button>
        <button class="btn small" data-editbiz="${b.id}"><svg><use href="#i-pen"/></svg>Edit business</button>
      </div>
      <div class="glass detail-head"><div class="rev"><small>Revenue from ${esc(b.name)} clients</small><b>${inr(bizRevenue(b.id))}</b>${b.tagline ? `<span>${esc(b.tagline)}</span>` : ''}</div>
      <div class="kv"><div><small>Clients</small><b>${cl.length}</b></div><div><small>Open work</small><b>${open.length}</b></div><div><small>Total retainers / mo</small><b class="mono">${monthly ? inr(monthly) : '—'}</b></div><div><small>Your share / mo</small><b class="mono">${myShareTotal ? inr(myShareTotal) : '—'}</b></div></div></div>`;
    $('#clients-list').innerHTML = cl.length ? cl.map(clientCard).join('') : `<div class="empty">No clients in ${esc(b.name)} yet. Tap "Manage clients" to add or organize.</div>`;
    return;
  }
  setTopBtn('Manage clients', 'manage-clients');
  $('#clients-crumb').innerHTML = `<button class="link" data-back="all">${esc(S.settings.name || 'Rahul')}</button> / <button class="link" data-back="biz">${esc(b.name)}</button> / <b>${esc(c.short || c.name)}</b>`;
  $('#clients-title').textContent = c.name;
  const mine = S.items.filter(i => i.client === c.id);
  const open = mine.filter(i => i.status !== 'done' && i.kind !== 'note');
  const pending = mine.filter(i => i.kind === 'payment' && i.status !== 'done').reduce((s, i) => s + (i.amount || 0), 0);
  const rev = clientRevenue(c.id);
  const mk = today().slice(0, 7);
  const revMonth = mine.filter(i => i.kind === 'payment' && i.status === 'done' && i.doneAt && ymd(new Date(i.doneAt)).startsWith(mk)).reduce((x, i) => x + (i.amount || 0), 0);
  const signed = c.signed || c.since || '';
  $('#client-head').innerHTML = `
    ${c.cover ? `<div class="client-banner" style="background-image:url('${esc(c.cover)}')"></div>` : ''}
    <button class="back-btn" type="button" data-back="biz"><svg><use href="#i-back"/></svg>Back to ${esc((bizById(clientBiz(c)) || {}).name || "clients")}</button>
    <div class="glass detail-head">
    <div class="dh-top">
      <div style="min-width:0">${starRow(starsOf(c))}<span class="dh-rate">${starsOf(c).toFixed(1)} / 5</span>
        <div class="muted" style="font-size:13px;margin-top:4px">${esc(c.note || 'Client')}</div></div>
      <div class="dh-actions"><button class="btn small" data-editclient="${c.id}"><svg><use href="#i-pen"/></svg>Edit client</button><button class="btn small primary" data-logpay="${c.id}">Log payment</button></div>
    </div>
    <div class="rev"><small>Revenue from ${esc(c.short || c.name)}</small><b>${inr(rev)}</b><span>${revMonth ? inr(revMonth) + ' this month' : 'Nothing received this month yet'}${pending ? ' · ' + inr(pending) + ' pending' : ''}</span></div>
    <div class="kv">
      <div><small>Contract signed</small><b>${signed ? esc(parseYmd(signed).toLocaleDateString('en-IN',{day:'numeric', month:'short', year:'numeric'})) : '—'}</b></div>
      <div><small>Total Retainer</small><b class="mono">${c.retainer ? inr(c.retainer) : '—'}</b></div>
      <div><small>Your Share</small><b class="mono">${c.yourShare ? inr(c.yourShare) : (c.retainer ? inr(c.retainer) : '—')}</b></div>
      <div><small>Open work</small><b>${open.length}</b></div>
    </div></div>`;
  $$('#client-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.ctab === S.ctab));
  let list;
  if (S.ctab === 'open') list = sortItems(open.filter(i => i.kind !== 'payment'));
  else if (S.ctab === 'notes') list = mine.filter(i => i.kind === 'note').sort((a,b) => (a.status === 'done') - (b.status === 'done') || (b.created || 0) - (a.created || 0));
  else if (S.ctab === 'money') list = mine.filter(i => i.kind === 'payment').sort((a,b) => (a.status === 'done') - (b.status === 'done') || ((b.doneAt || parseYmd(b.due || '2000-01-01').getTime()) - (a.doneAt || parseYmd(a.due || '2000-01-01').getTime())));
  else list = mine.filter(i => i.status === 'done' && i.kind !== 'note').sort((a,b) => (b.doneAt||0) - (a.doneAt||0));
  const emptyMsg = { open:'No open work for this client.', notes:'No notes yet.', money:'No payments logged yet.', done:'Nothing finished yet.' }[S.ctab];
  renderDay(c.id);
  $('#client-quick').placeholder = S.ctab === 'notes' ? 'Add a note for this client and press Enter' : 'Add a task for this client and press Enter';
  $('#client-items').innerHTML = (S.ctab === 'money' ? `<button class="logpay-row" data-logpay="${c.id}"><svg><use href="#i-plus"/></svg>Log a payment from ${esc(c.short || c.name)}</button>` : '') + (list.length ? list.map(i => i.kind === 'note' ? noteRow(i) : taskRow(i, { showClient:false })).join('') : `<div class="empty">${emptyMsg}</div>`);
}
function noteRow(i) {
  const fmt = t => new Date(t).toLocaleDateString('en-IN',{day:'numeric', month:'short', year:'numeric'}) + ', ' + new Date(t).toLocaleTimeString('en-IN',{hour:'numeric', minute:'2-digit'});
  return `<div class="task note ${i.status === 'done' ? 'done' : ''}">
    <button class="check" data-toggle="${i.id}" aria-label="${i.status === 'done' ? 'Mark not done' : 'Mark done'}"><svg><use href="#i-check"/></svg></button>
    <button class="body" data-edit="${i.id}">
      <span class="ttl">${esc(i.title)}</span>
      ${i.notes ? `<span class="note-body">${esc(i.notes)}</span>` : ''}
      <span class="when faint">${i.created ? `<span>Added ${esc(fmt(i.created))}</span>` : ''}${i.status === 'done' && i.doneAt ? `<span>Done ${esc(fmt(i.doneAt))}</span>` : ''}</span>
    </button>
    <button class="more" data-edit="${i.id}" aria-label="Edit"><svg><use href="#i-dots"/></svg></button>
  </div>`;
}
