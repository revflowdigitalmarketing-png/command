/* Command · Goal Crushers table scoreboard and rewards */

function defaultCrushersFor(pid) {
  return {
    weekTitle: '( WEEK 01 )  This Week’s Focus:',
    focusGoal: '',
    hideFocusGoal: false,
    weekStreak: 0,
    goals: [
      { id: newId(), text: '', targetScore: 2, earnedScore: 0, done: false }
    ],
    rewards: [
      { id: newId(), points: '6+', reward: '' },
      { id: newId(), points: '7+', reward: '' },
      { id: newId(), points: '8+', reward: '' },
      { id: newId(), points: '9+', reward: '' }
    ]
  };
}

function getProfileCrushers(pid = (S && S.profileId) || 'rahul') {
  const saved = lsGet(`cmd.crushers_${pid}`, null);
  if (saved && Array.isArray(saved.goals)) {
    // Check if it's old legacy mock data (e.g. dummy Revflow text)
    if (saved.goals.some(g => g.id === 'ct-1' || (g.text && g.text.includes('Revflow')))) {
      const fresh = defaultCrushersFor(pid);
      saveProfileCrushers(fresh, pid);
      return fresh;
    }
    return saved;
  }
  // If saved from previous turn with `tasks`
  if (saved && Array.isArray(saved.tasks)) {
    if (saved.tasks.some(t => t.id === 'ct-1' || (t.text && t.text.includes('Revflow')))) {
      const fresh = defaultCrushersFor(pid);
      saveProfileCrushers(fresh, pid);
      return fresh;
    }
    const fresh = {
      weekTitle: saved.weekTitle || '( WEEK 01 )  This Week’s Focus:',
      focusGoal: saved.focusGoal || '',
      hideFocusGoal: !!saved.hideFocusGoal,
      goals: saved.tasks.map(t => ({
        id: t.id || newId(),
        text: t.text || '',
        targetScore: Number(t.targetScore || t.score || 2),
        earnedScore: Number(t.earnedScore || (t.done ? (t.targetScore || t.score || 2) : 0)),
        done: !!t.done
      })),
      rewards: saved.rewards || defaultCrushersFor(pid).rewards
    };
    saveProfileCrushers(fresh, pid);
    return fresh;
  }
  const fresh = defaultCrushersFor(pid);
  saveProfileCrushers(fresh, pid);
  return fresh;
}

function saveProfileCrushers(data, pid = (S && S.profileId) || 'rahul') {
  lsSet(`cmd.crushers_${pid}`, data);
  if (typeof pushAllToServer === 'function') pushAllToServer();
}

function toggleCrusherGoal(goalId) {
  const pid = (S && S.profileId) || 'rahul';
  const data = getProfileCrushers(pid);
  const goal = (data.goals || []).find(g => g.id === goalId);
  if (!goal) return;
  goal.done = !goal.done;
  const target = Number(goal.targetScore) || 2;
  goal.earnedScore = goal.done ? target : 0;
  saveProfileCrushers(data, pid);
  if (typeof recordHistory === 'function') {
    recordHistory({
      action: goal.done ? 'complete' : 'reopen',
      category: 'crusher',
      title: goal.text || 'Goal Crusher',
      details: goal.done ? `Earned: +${target} pts` : 'Marked open'
    });
  }
  if (typeof renderCrushersMini === 'function') renderCrushersMini();
  if (typeof renderGoalCrushers === 'function' && S && S.view === 'crushers') renderGoalCrushers();
  toast(goal.done ? `Goal crushed! (+${target} pts)` : 'Goal marked open.');
}

function renderGoalCrushers() {
  const pid = (S && S.profileId) || 'rahul';
  const crumb = $('#crushers-crumb');
  if (crumb) crumb.innerHTML = `${esc(profileName(pid))} / <b>Goal Crushers</b>`;

  const container = $('#goal-crushers-container');
  if (!container) return;
  const data = getProfileCrushers(pid);
  const goals = data.goals || [];

  const totalEarned = goals.reduce((sum, g) => sum + (g.done ? (Number(g.targetScore) || 2) : (Number(g.earnedScore) || 0)), 0);
  const currentWeekHit = totalEarned >= 7;
  const baseStreak = Number(data.weekStreak) || 0;
  const displayStreak = baseStreak + (currentWeekHit ? 1 : 0);
  const streakPct = Math.min(100, Math.round(totalEarned / 7 * 100));

  container.innerHTML = `
    <!-- WEEK STREAK (Qualifies only with 7+ pts) -->
    <div class="c-week-streak-card" style="grid-column:1/-1;margin-bottom:20px;padding:16px 20px;background:var(--surface);border-radius:16px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase">Weekly Streak · Goal Crushers</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:var(--ink);display:flex;align-items:baseline;gap:8px">
          <span>${displayStreak}</span>
          <span style="font-size:13px;font-weight:600;color:var(--muted)">${displayStreak === 1 ? 'WEEK' : 'WEEKS'}</span>
          ${currentWeekHit ? '<span class="chip" style="font-size:11px;padding:2px 8px;background:var(--ink);color:var(--bg)">✓ 7+ Pts Unlocked</span>' : ''}
        </div>
      </div>
      <div style="flex:1;min-width:220px;max-width:380px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
          <span style="font-weight:600;color:var(--ink)">${totalEarned} / 7 pts</span>
          <span class="faint">${currentWeekHit ? 'Streak qualified for this week!' : `${7 - totalEarned} pts needed to hit streak`}</span>
        </div>
        <div style="width:100%;height:8px;background:var(--surface-3);border-radius:4px;overflow:hidden">
          <div style="width:${streakPct}%;height:100%;background:var(--ink);border-radius:4px;transition:width 0.3s ease"></div>
        </div>
      </div>
    </div>

    <!-- TABLE 1: This Week's Focus & Goals -->
    <div class="crushers-card crushers-tasks-card" data-pid="${esc(pid)}" style="background:var(--surface)!important">
      <!-- Week Title -->
      <div class="c-week-header" contenteditable="true" data-crusher="weekTitle" spellcheck="false" title="Click to edit week title" style="background:var(--surface)!important">${esc(data.weekTitle)}</div>
      
      <!-- Focus Goal -->
      ${data.hideFocusGoal ? `
        <div style="padding:10px 16px;text-align:center;background:var(--surface)!important">
          <button type="button" class="btn small" data-action="restore-focus-goal" style="padding:4px 10px;font-size:12px;display:inline-flex;align-items:center;gap:4px">
            <svg style="width:12px;height:12px"><use href="#i-plus"/></svg>Add Weekly Focus Goal
          </button>
        </div>
      ` : `
        <div class="c-focus-goal-wrap" style="background:var(--surface)!important">
          <div class="c-focus-goal ${!data.focusGoal ? 'is-empty' : ''}" contenteditable="true" data-crusher="focusGoal" spellcheck="false" data-placeholder="What is your main focus this week?" title="Click to edit focus goal" style="background:var(--surface)!important">${esc(data.focusGoal || '')}</div>
          <button type="button" class="c-focus-del" data-action="remove-focus-goal" aria-label="Remove focus goal" title="Remove focus goal">&times;</button>
        </div>
      `}
      
      <!-- Subheading / Column Headers -->
      <div class="c-tasks-thead" style="background:var(--surface)!important">
        <div></div>
        <div class="c-th-left" style="background:var(--surface)!important">Break the focus down into weekly goals</div>
        <div class="c-th-right" style="background:var(--surface)!important">Score</div>
      </div>

      <!-- Goal rows -->
      <div class="c-task-rows" style="background:var(--surface)!important">
        ${goals.map(it => {
          const target = Number(it.targetScore) || 2;
          const earned = it.done ? target : (Number(it.earnedScore) || 0);
          return `
            <div class="c-goal-row ${it.done ? 'done' : ''}" data-goal-id="${esc(it.id)}" style="background:var(--surface)!important">
              <div class="c-goal-check-wrap" style="background:var(--surface)!important">
                <button type="button" class="check" data-toggle-crusher="${esc(it.id)}" aria-label="${it.done ? 'Mark incomplete' : 'Mark completed'}">
                  <svg><use href="#i-check"/></svg>
                </button>
              </div>
              <div class="c-goal-desc ${!it.text ? 'is-empty' : ''}" contenteditable="true" data-goal-field="text" spellcheck="false" data-placeholder="Still haven't listed out, huh..." style="background:var(--surface)!important">${esc(it.text || '')}</div>
              <div class="c-goal-score-wrap" style="background:var(--surface)!important">
                <span class="c-goal-score-current">${it.done ? target : (earned > 0 ? earned : '__')}</span>
                <span>/</span>
                <span class="c-goal-score-target" contenteditable="true" data-goal-field="targetScore" spellcheck="false" title="Click to edit target points">${target}</span>
                <button type="button" class="c-row-del" data-del-crusher-goal="${esc(it.id)}" aria-label="Delete goal" title="Delete goal">&times;</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Add Goal Row Footer -->
      <div class="c-goals-footer" style="background:var(--surface)!important">
        <button type="button" class="btn small" data-action="add-crusher-goal" style="padding:6px 12px;font-size:12.5px;color:var(--muted)">
          <svg style="width:12px;height:12px;margin-right:4px"><use href="#i-plus"/></svg>Add Goal
        </button>
      </div>

      <!-- Total Row -->
      <div class="c-total-row" style="background:var(--surface)!important">
        <div class="c-total-label" style="background:var(--surface)!important">Total</div>
        <div class="c-total-score" style="background:var(--surface)!important"><span id="crusher-total-val">${totalEarned > 0 ? totalEarned : '__'}</span><span class="c-total-max">/10</span></div>
      </div>
    </div>

    <!-- TABLE 2: Rewards -->
    <div class="crushers-card crushers-rewards-card" data-pid="${esc(pid)}" style="background:var(--surface)!important">
      <!-- Reward Header -->
      <div class="c-reward-header" style="background:var(--surface)!important">Reward</div>

      <!-- Reward rows -->
      <div class="c-reward-rows" style="background:var(--surface)!important">
        ${(data.rewards || []).map(r => `
          <div class="c-reward-row" data-reward-id="${esc(r.id)}" style="background:var(--surface)!important">
            <div class="c-reward-pts" contenteditable="true" data-reward-field="points" spellcheck="false" title="Click to edit threshold" style="background:var(--surface)!important">${esc(r.points)}</div>
            <div class="c-reward-desc-wrap" style="background:var(--surface)!important">
              <div class="c-reward-desc ${!r.reward ? 'is-empty' : ''}" contenteditable="true" data-reward-field="reward" spellcheck="false" data-placeholder="Add a reward for reaching this tier..." style="background:var(--surface)!important">${esc(r.reward || '')}</div>
              <button type="button" class="c-row-del" data-del-crusher-reward="${esc(r.id)}" aria-label="Delete reward tier" title="Delete reward tier">&times;</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="padding:8px 12px;background:var(--surface)!important">
        <button type="button" class="btn small" data-action="add-crusher-reward" style="padding:4px 10px;font-size:12px;color:var(--muted)">
          <svg style="width:11px;height:11px;margin-right:4px"><use href="#i-plus"/></svg>Add Reward Tier
        </button>
      </div>
    </div>

    <!-- Below the Table: New Week Goal Crushers Button -->
    <div class="crushers-actions-bottom" style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;margin-top:24px;margin-bottom:12px">
      <button type="button" class="btn primary" data-action="new-week-crushers" style="padding:11px 26px;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:8px">
        <svg style="width:15px;height:15px"><use href="#i-spark"/></svg>New Week Goal Crushers
      </button>
    </div>
  `;
}

// Inline editing event handler
document.addEventListener('input', e => {
  const t = e.target;
  if (!t || !t.closest('#goal-crushers-container')) return;
  const pid = (S && S.profileId) || 'rahul';
  const data = getProfileCrushers(pid);

  // Week Title
  if (t.dataset.crusher === 'weekTitle') {
    data.weekTitle = t.innerText.trim();
    saveProfileCrushers(data, pid);
    return;
  }
  // Focus Goal
  if (t.dataset.crusher === 'focusGoal') {
    const val = t.innerText.trim();
    data.focusGoal = val;
    t.classList.toggle('is-empty', val === '');
    saveProfileCrushers(data, pid);
    return;
  }
  // Goal Field
  const goalRow = t.closest('.c-goal-row');
  if (goalRow) {
    const goalId = goalRow.dataset.goalId;
    const goal = (data.goals || []).find(x => x.id === goalId);
    if (goal) {
      if (t.dataset.goalField === 'text') {
        const val = t.innerText.trim();
        goal.text = val;
        t.classList.toggle('is-empty', val === '');
      } else if (t.dataset.goalField === 'targetScore') {
        const rawScore = t.innerText.trim();
        const num = rawScore === '' ? 2 : (isNaN(Number(rawScore)) ? 2 : Number(rawScore));
        goal.targetScore = num;
        if (goal.done) goal.earnedScore = num;
        // Dynamically recalculate and update total score
        const newTotal = (data.goals || []).reduce((sum, x) => sum + (x.done ? (Number(x.targetScore) || 0) : (Number(x.earnedScore) || 0)), 0);
        const totalEl = $('#crusher-total-val');
        if (totalEl) totalEl.textContent = newTotal > 0 ? newTotal : '__';
      }
      saveProfileCrushers(data, pid);
      if (typeof renderCrushersMini === 'function') renderCrushersMini();
    }
    return;
  }
  // Reward Field
  const rewardRow = t.closest('.c-reward-row');
  if (rewardRow) {
    const rewardId = rewardRow.dataset.rewardId;
    const r = (data.rewards || []).find(x => x.id === rewardId);
    if (r) {
      if (t.dataset.rewardField === 'points') {
        r.points = t.innerText.trim();
      } else if (t.dataset.rewardField === 'reward') {
        const val = t.innerText.trim();
        r.reward = val;
        t.classList.toggle('is-empty', val === '');
      }
      saveProfileCrushers(data, pid);
    }
    return;
  }
});

document.addEventListener('focusout', e => {
  const t = e.target;
  if (!t || !t.getAttribute || t.getAttribute('contenteditable') !== 'true') return;
  if (t.innerText.trim() === '') {
    t.classList.add('is-empty');
    t.innerText = '';
  }
});

function renderCrushersMini() {
  const container = $('#crushers-mini');
  if (!container) return;
  const pid = (S && S.profileId) || 'rahul';
  const data = getProfileCrushers(pid);
  const goals = data.goals || [];
  const activeGoals = goals.filter(g => g.text && g.text.trim().length > 0);

  if (!activeGoals.length) {
    container.innerHTML = `
      <div class="card crushers-home-card" style="padding:14px 18px">
        <div class="crushers-card-header" style="margin-bottom:0;padding-bottom:0;border-bottom:none">
          <span class="crushers-card-header-label">Weekly Goals</span>
          <span class="crushers-card-header-score">__ / 10</span>
        </div>
      </div>
    `;
    return;
  }

  const totalEarned = activeGoals.reduce((sum, g) => sum + (g.done ? (Number(g.targetScore) || 2) : (Number(g.earnedScore) || 0)), 0);
  const currentWeekHit = totalEarned >= 7;
  const baseStreak = Number(data.weekStreak) || 0;
  const displayStreak = baseStreak + (currentWeekHit ? 1 : 0);

  container.innerHTML = `
    <div class="card crushers-home-card">
      <div class="crushers-card-header">
        <span class="crushers-card-header-label">This Week’s Crushers</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="chip" style="font-size:11px;padding:2px 8px;font-weight:600;background:var(--surface-3);color:var(--ink)">⚡ ${displayStreak}W Streak</span>
          <span class="crushers-card-header-score">${totalEarned > 0 ? totalEarned : '__'} / 10</span>
        </div>
      </div>
      <div class="crushers-card-list">
        ${activeGoals.map(it => {
          const target = Number(it.targetScore) || 2;
          const earned = it.done ? target : (Number(it.earnedScore) || 0);
          const scoreText = `${it.done ? target : (earned > 0 ? earned : '__')} / ${target}`;
          return `
            <div class="crusher-home-row ${it.done ? 'done' : ''}" data-goal-id="${esc(it.id)}">
              <button type="button" class="check" data-toggle-crusher="${esc(it.id)}" aria-label="${it.done ? 'Mark incomplete' : 'Mark complete'}">
                <svg><use href="#i-check"/></svg>
              </button>
              <div class="ttl" data-go="crushers" style="cursor:pointer" title="Click to view Goal Crushers">${esc(it.text)}</div>
              <span class="crusher-score-plain">${scoreText}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
