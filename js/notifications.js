/* Command · Dynamic Notifications & Deadline Reminders System
   Inspired by rit3zh/expo-dynamic-notifications
   Provides in-app Dynamic Island notifications, deadline alerts, and browser alerts.
*/

// Default configuration
const DEFAULT_NOTIFICATION_CONFIG = {
  hoursBeforeDeadline: 2,       // Alert X hours before deadline (e.g. 1, 2, 4, 12, 24)
  dayBeforePostReminder: true,  // Alert the day before scheduled post/reel
  browserAlerts: false,         // HTML5 Web Notifications
  soundEnabled: true            // Gentle synthesized chime
};

function getNotificationConfig() {
  const saved = lsGet('cmd.notifications_config', null);
  return { ...DEFAULT_NOTIFICATION_CONFIG, ...(saved || {}) };
}

function saveNotificationConfig(cfg) {
  lsSet('cmd.notifications_config', cfg);
}

// Track item IDs that have already triggered a deadline reminder
function getNotifiedDeadlines() {
  return lsGet('cmd.notified_deadlines', {});
}

function markDeadlineNotified(key) {
  const map = getNotifiedDeadlines();
  map[key] = Date.now();
  lsSet('cmd.notified_deadlines', map);
}

function clearNotifiedDeadlines() {
  lsSet('cmd.notified_deadlines', {});
}

// Gentle 2-tone audio chime synthesized with Web Audio API (no external file dependencies)
function playNotificationChime() {
  const cfg = getNotificationConfig();
  if (!cfg.soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (_) {
    // Audio context may be restricted by browser gesture policies
  }
}

// Ensure the Dynamic Island container exists in DOM
let dynamicIslandTimer = null;

function ensureDynamicIslandDOM() {
  let container = document.getElementById('dynamic-island-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dynamic-island-container';
    container.className = 'dynamic-island-container';
    container.innerHTML = `
      <div class="dynamic-island" id="dynamic-island" role="alert" aria-live="assertive">
        <div class="island-avatar" id="island-avatar">★</div>
        <div class="island-content" id="island-content">
          <div class="island-title" id="island-title">Notification</div>
          <div class="island-msg" id="island-msg">Message details</div>
        </div>
        <div class="island-actions" id="island-actions" style="display:none"></div>
        <div class="island-meta" id="island-meta">
          <span class="island-badge" id="island-badge" style="display:none">Soon</span>
          <button type="button" class="island-close" id="island-close" aria-label="Dismiss">&times;</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    const islandEl = document.getElementById('dynamic-island');
    const closeBtn = document.getElementById('island-close');

    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      dismissDynamicNotification();
    });

    islandEl.addEventListener('click', e => {
      if (e.target.closest('.island-btn') || e.target.closest('.island-close')) return;
      if (islandEl._onPress && typeof islandEl._onPress === 'function') {
        const fn = islandEl._onPress;
        dismissDynamicNotification();
        fn();
      }
    });
  }
  return container;
}

/**
 * Trigger an in-app Dynamic Island notification
 * Matches the API contract from rit3zh/expo-dynamic-notifications
 *
 * @param {Object} opts
 * @param {string} opts.title - Heading text
 * @param {string} [opts.message] - Explanatory subtitle
 * @param {string} [opts.avatar] - Image URL or single letter / initial
 * @param {string} [opts.badge] - Small deadline/status pill (e.g. 'In 2h')
 * @param {Array<{label: string, cls?: string, onClick: Function}>} [opts.actions] - Action buttons
 * @param {number|null} [opts.duration] - Lifetime in ms (default 4500, null for persistent)
 * @param {Function} [opts.onPress] - Click handler
 */
function triggerDynamicNotification(opts = {}) {
  ensureDynamicIslandDOM();
  const island = document.getElementById('dynamic-island');
  const avatarEl = document.getElementById('island-avatar');
  const titleEl = document.getElementById('island-title');
  const msgEl = document.getElementById('island-msg');
  const badgeEl = document.getElementById('island-badge');
  const actionsEl = document.getElementById('island-actions');

  if (!island) return;

  if (dynamicIslandTimer) {
    clearTimeout(dynamicIslandTimer);
    dynamicIslandTimer = null;
  }

  // Populate data
  titleEl.textContent = opts.title || 'Alert';
  msgEl.textContent = opts.message || '';
  island._onPress = opts.onPress || null;

  // Actions (e.g. Yes / No buttons)
  if (Array.isArray(opts.actions) && opts.actions.length > 0) {
    island.classList.add('has-actions');
    if (actionsEl) {
      actionsEl.style.display = 'flex';
      actionsEl.innerHTML = opts.actions.map((act, idx) => `
        <button type="button" class="island-btn ${act.cls || ''}" data-act-idx="${idx}">${esc(act.label)}</button>
      `).join('');
      actionsEl.querySelectorAll('.island-btn').forEach(btn => {
        btn.onclick = e => {
          e.stopPropagation();
          const act = opts.actions[Number(btn.dataset.actIdx)];
          if (act && typeof act.onClick === 'function') {
            act.onClick();
          }
        };
      });
    }
  } else {
    island.classList.remove('has-actions');
    if (actionsEl) {
      actionsEl.style.display = 'none';
      actionsEl.innerHTML = '';
    }
  }

  // Avatar / Icon
  if (opts.avatar && (opts.avatar.startsWith('http') || opts.avatar.startsWith('assets/') || opts.avatar.startsWith('data:'))) {
    avatarEl.innerHTML = `<img src="${esc(opts.avatar)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  } else if (opts.avatar) {
    avatarEl.textContent = opts.avatar.slice(0, 2).toUpperCase();
  } else {
    avatarEl.innerHTML = '<svg style="width:16px;height:16px"><use href="#i-bell"/></svg>';
  }

  // Badge
  if (opts.badge) {
    badgeEl.textContent = opts.badge;
    badgeEl.style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
  }

  // Activate Dynamic Island animation
  island.classList.remove('active');
  void island.offsetWidth; // Force reflow
  island.classList.add('active');

  // Audio feedback
  playNotificationChime();

  // Trigger HTML5 Web Notification if allowed and page is hidden/backgrounded
  const cfg = getNotificationConfig();
  if (cfg.browserAlerts && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(opts.title, {
        body: opts.message || '',
        icon: lsGet('cmd.custom_icon', 'icon-192.png')
      });
      n.onclick = () => {
        window.focus();
        if (opts.onPress) opts.onPress();
        n.close();
      };
    } catch (_) {}
  }

  // Auto-dismiss duration
  const duration = opts.duration !== undefined ? opts.duration : 4500;
  if (duration !== null && duration > 0) {
    dynamicIslandTimer = setTimeout(() => {
      dismissDynamicNotification();
    }, duration);
  }
}

function dismissDynamicNotification() {
  const island = document.getElementById('dynamic-island');
  if (island) {
    island.classList.remove('active');
    island.classList.remove('has-actions');
    island._onPress = null;
    const actionsEl = document.getElementById('island-actions');
    if (actionsEl) {
      actionsEl.style.display = 'none';
      actionsEl.innerHTML = '';
    }
  }
  if (dynamicIslandTimer) {
    clearTimeout(dynamicIslandTimer);
    dynamicIslandTimer = null;
  }
}

// Request browser notification permission
async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Browser desktop notifications not supported on this device.');
    return false;
  }
  try {
    const res = await Notification.requestPermission();
    const granted = res === 'granted';
    const cfg = getNotificationConfig();
    cfg.browserAlerts = granted;
    saveNotificationConfig(cfg);
    toast(granted ? 'Desktop alerts enabled!' : 'Desktop alerts permission was not granted.');
    return granted;
  } catch (err) {
    toast('Error requesting permissions: ' + err.message);
    return false;
  }
}

// ========================================================
// DEADLINE REMINDER ENGINE
// Evaluates open tasks, promises, and deliverables against
// the user's configurable lead times (e.g. 2h before, day before)
// ========================================================

function checkUpcomingDeadlines() {
  if (!S || !Array.isArray(S.items)) return;

  const cfg = getNotificationConfig();
  const hoursThreshold = Number(cfg.hoursBeforeDeadline) || 2;
  const now = Date.now();
  const open = S.items.filter(i => i.status === 'open' && i.due);

  open.forEach(item => {
    // Parse due datetime
    const dueStr = item.due; // Format 'YYYY-MM-DD'
    const timeStr = item.time || '18:00'; // Default 6:00 PM if time not set
    const dueIso = `${dueStr}T${timeStr}:00`;
    const dueDate = new Date(dueIso);
    const dueTime = dueDate.getTime();

    if (isNaN(dueTime)) return;

    const diffMs = dueTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Reminder 1: Approaching deadline (within configured hours threshold)
    if (diffHours > 0 && diffHours <= hoursThreshold) {
      const reminderKey = `dl_${item.id}_${dueStr}_${hoursThreshold}h`;
      const notified = getNotifiedDeadlines();
      if (!notified[reminderKey]) {
        markDeadlineNotified(reminderKey);
        const c = typeof clientById === 'function' ? clientById(item.client) : null;
        const displayHours = diffHours < 1 ? `${Math.max(1, Math.round(diffHours * 60))}m` : `${Math.round(diffHours)}h`;

        triggerDynamicNotification({
          title: `Deadline Approaching: ${item.title}`,
          message: `${item.kind === 'promise' ? 'Promise' : 'Task'}${c ? ' for ' + (c.short || c.name) : ''} due in ${displayHours}`,
          avatar: c && c.cover ? c.cover : (c ? c.name.slice(0, 1) : null),
          badge: `In ${displayHours}`,
          duration: 6000,
          onPress: () => {
            if (typeof editItem === 'function') editItem(item.id);
          }
        });
      }
    }

    // Reminder 2: Scheduled Post / Deliverable reminder (Day before scheduled post)
    if (cfg.dayBeforePostReminder && item.kind === 'reel') {
      // If the post is scheduled for tomorrow (between 12h and 36h away)
      if (diffHours >= 12 && diffHours <= 36) {
        const postReminderKey = `post_daybefore_${item.id}_${dueStr}`;
        const notified = getNotifiedDeadlines();
        if (!notified[postReminderKey]) {
          markDeadlineNotified(postReminderKey);
          const c = typeof clientById === 'function' ? clientById(item.client) : null;
          triggerDynamicNotification({
            title: `Scheduled Post Tomorrow`,
            message: `"${item.title}"${c ? ' for ' + (c.short || c.name) : ''} is scheduled for tomorrow`,
            avatar: c && c.cover ? c.cover : (c ? c.name.slice(0, 1) : null),
            badge: 'Tomorrow',
            duration: 6000,
            onPress: () => {
              if (typeof editReel === 'function') editReel(item.id);
            }
          });
        }
      }
    }
  });

  // Call the modular content calendar hook
  checkContentCalendarReminders();
}

// ========================================================
// MODULAR EXTENSION POINT: CLIENT CONTENT CALENDAR REMINDERS
// Reserved specifically for parsing content-calendar files in
// each client's folder once separate user instructions are provided.
// ========================================================
function checkContentCalendarReminders() {
  // Modular stub hook:
  // Once separate instructions for client content-calendar files are provided,
  // calendar parsing and scheduled post alerts will be hooked in here.
  return [];
}

// Start recurring scheduler
setInterval(checkUpcomingDeadlines, 60000); // Check every 60 seconds

// Open the Notification Configuration Sheet
function openNotificationSettingsSheet() {
  const cfg = getNotificationConfig();
  const hasBrowserSupport = 'Notification' in window;
  const isBrowserGranted = hasBrowserSupport && Notification.permission === 'granted';

  const html = `
    <h2>Notification Reminders</h2>
    <p class="muted" style="font-size:13px;margin-bottom:16px">
      Configure Dynamic Island alerts and deadline notifications for your dashboard.
    </p>

    <!-- LEAD TIME BEFORE DEADLINES -->
    <div class="field" style="margin-bottom:16px">
      <label for="cfg-hours-lead" style="display:block;margin-bottom:6px">Remind before deadline</label>
      <select class="in" id="cfg-hours-lead" style="width:100%">
        <option value="1" ${cfg.hoursBeforeDeadline === 1 ? 'selected' : ''}>1 hour before deadline</option>
        <option value="2" ${cfg.hoursBeforeDeadline === 2 ? 'selected' : ''}>2 hours before deadline (Recommended)</option>
        <option value="4" ${cfg.hoursBeforeDeadline === 4 ? 'selected' : ''}>4 hours before deadline</option>
        <option value="12" ${cfg.hoursBeforeDeadline === 12 ? 'selected' : ''}>12 hours before deadline</option>
        <option value="24" ${cfg.hoursBeforeDeadline === 24 ? 'selected' : ''}>24 hours before (Day before)</option>
      </select>
      <p class="faint" style="font-size:12px;margin-top:5px">Triggers an alert when an open task or promise deadline falls within this window.</p>
    </div>

    <!-- DAY BEFORE SCHEDULED POST -->
    <div style="margin-bottom:16px;padding:12px 14px;background:var(--surface-2);border-radius:12px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <b style="font-size:13.5px;display:block">Day Before Scheduled Posts</b>
        <span class="faint" style="font-size:12px">Alert 1 day before reels and scheduled content</span>
      </div>
      <label class="tog" style="margin:0">
        <input type="checkbox" id="cfg-day-before" ${cfg.dayBeforePostReminder ? 'checked' : ''}>
      </label>
    </div>

    <!-- AUDIO CHIME -->
    <div style="margin-bottom:16px;padding:12px 14px;background:var(--surface-2);border-radius:12px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <b style="font-size:13.5px;display:block">Audio Chime</b>
        <span class="faint" style="font-size:12px">Subtle sound when alert appears</span>
      </div>
      <label class="tog" style="margin:0">
        <input type="checkbox" id="cfg-sound" ${cfg.soundEnabled ? 'checked' : ''}>
      </label>
    </div>

    <!-- BROWSER DESKTOP ALERTS -->
    <div style="margin-bottom:20px;padding:12px 14px;background:var(--surface-2);border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div>
          <b style="font-size:13.5px;display:block">Browser Desktop Notifications</b>
          <span class="faint" style="font-size:12px">${isBrowserGranted ? 'Permission granted (Active)' : 'Receive alerts even when tab is backgrounded'}</span>
        </div>
        <button type="button" class="btn small ${isBrowserGranted ? '' : 'primary'}" id="cfg-browser-btn" style="font-size:12px;padding:5px 12px">
          ${isBrowserGranted ? 'Granted' : 'Enable'}
        </button>
      </div>
    </div>

    <!-- TEST & ACTION BUTTONS -->
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <button type="button" class="btn small" id="cfg-test-alert" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px">
        <svg style="width:14px;height:14px"><use href="#i-bell"/></svg>Test Dynamic Alert
      </button>
      <button type="button" class="btn small" id="cfg-clear-history" style="flex:1">
        Reset Alert History
      </button>
    </div>

    <div class="sheet-actions">
      <button class="btn" id="cfg-cancel" type="button">Cancel</button>
      <button class="btn primary" id="cfg-save" type="button">Save Reminders</button>
    </div>
  `;

  openSheet(html, sh => {
    sh.querySelector('#cfg-cancel').onclick = closeSheet;

    sh.querySelector('#cfg-browser-btn').onclick = async () => {
      await requestBrowserNotificationPermission();
      closeSheet();
      openNotificationSettingsSheet();
    };

    sh.querySelector('#cfg-test-alert').onclick = () => {
      const hours = Number($('#cfg-hours-lead').value) || 2;
      triggerDynamicNotification({
        title: 'Demo: Content Deliverable Due',
        message: `RevFlow brochure review due in ${hours} hour${hours > 1 ? 's' : ''}`,
        avatar: '★',
        badge: `In ${hours}h`,
        duration: 5000,
        onPress: () => {
          toast('Dynamic Island notification tapped!');
        }
      });
    };

    sh.querySelector('#cfg-clear-history').onclick = () => {
      clearNotifiedDeadlines();
      toast('Alert history reset. Upcoming deadlines will alert again.');
    };

    sh.querySelector('#cfg-save').onclick = () => {
      const hours = Number($('#cfg-hours-lead').value) || 2;
      const dayBefore = $('#cfg-day-before').checked;
      const sound = $('#cfg-sound').checked;

      const newCfg = {
        ...cfg,
        hoursBeforeDeadline: hours,
        dayBeforePostReminder: dayBefore,
        soundEnabled: sound
      };
      saveNotificationConfig(newCfg);
      closeSheet();
      toast(`Reminders configured: ${hours}h lead time saved.`);
      checkUpcomingDeadlines();
    };
  });
}
