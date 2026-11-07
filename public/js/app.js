// ClashManager Pro — Frontend Application Logic

// Application State
const state = {
  activeTab: 'overview',
  clan: null,
  members: [],
  war: null,
  warLog: [],
  status: null,
  filters: {
    search: '',
    role: 'all',
    th: 'all',
    status: 'all',
    sort: 'rank'
  },
  warTimerInterval: null
};

// DOM Elements
const el = {
  // Navigation
  tabs: document.querySelectorAll('.nav-tab'),
  panes: document.querySelectorAll('.tab-pane'),
  refreshBtn: document.getElementById('refreshBtn'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  statusAlert: document.getElementById('statusAlert'),
  alertMessage: document.getElementById('alertMessage'),
  closeAlertBtn: document.getElementById('closeAlertBtn'),

  // Header / Clan Identity
  clanBadge: document.getElementById('clanBadge'),
  clanLevelBadge: document.getElementById('clanLevelBadge'),
  clanName: document.getElementById('clanName'),
  clanTag: document.getElementById('clanTag'),
  modeBadge: document.getElementById('modeBadge'),
  clanDescription: document.getElementById('clanDescription'),
  tabMemberCount: document.getElementById('tabMemberCount'),
  warTabBadge: document.getElementById('warTabBadge'),

  // Overview Tab
  clanPoints: document.getElementById('clanPoints'),
  builderPoints: document.getElementById('builderPoints'),
  warWins: document.getElementById('warWins'),
  warLosses: document.getElementById('warLosses'),
  winStreak: document.getElementById('winStreak'),
  membersCount: document.getElementById('membersCount'),
  reqTh: document.getElementById('reqTh'),
  capitalHall: document.getElementById('capitalHall'),
  warLeague: document.getElementById('warLeague'),
  
  // War Preview (Overview)
  warStatusTag: document.getElementById('warStatusTag'),
  warOurClanName: document.getElementById('warOurClanName'),
  warOurStars: document.getElementById('warOurStars'),
  warOurDestruction: document.getElementById('warOurDestruction'),
  warOurAttacks: document.getElementById('warOurAttacks'),
  warCountdown: document.getElementById('warCountdown'),
  warEnemyClanName: document.getElementById('warEnemyClanName'),
  warEnemyStars: document.getElementById('warEnemyStars'),
  warEnemyDestruction: document.getElementById('warEnemyDestruction'),
  warEnemyAttacks: document.getElementById('warEnemyAttacks'),
  warSlackerSummary: document.getElementById('warSlackerSummary'),

  // Donors & Health (Overview)
  topDonorsList: document.getElementById('topDonorsList'),
  healthyBar: document.getElementById('healthyBar'),
  warningBar: document.getElementById('warningBar'),
  dangerBar: document.getElementById('dangerBar'),
  countHealthy: document.getElementById('countHealthy'),
  countWarning: document.getElementById('countWarning'),
  countDanger: document.getElementById('countDanger'),

  // Roster Tab
  memberSearchInput: document.getElementById('memberSearchInput'),
  roleFilter: document.getElementById('roleFilter'),
  thFilter: document.getElementById('thFilter'),
  statusFilter: document.getElementById('statusFilter'),
  sortSelect: document.getElementById('sortSelect'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  rosterTableBody: document.getElementById('rosterTableBody'),

  // War Room Tab
  warHeroState: document.getElementById('warHeroState'),
  warHeroTimer: document.getElementById('warHeroTimer'),
  warHeroOurBadge: document.getElementById('warHeroOurBadge'),
  warHeroOurName: document.getElementById('warHeroOurName'),
  warHeroOurStars: document.getElementById('warHeroOurStars'),
  warHeroOurDestruct: document.getElementById('warHeroOurDestruct'),
  warOurProgressBar: document.getElementById('warOurProgressBar'),
  warHeroOurAttacksText: document.getElementById('warHeroOurAttacksText'),
  warHeroEnemyBadge: document.getElementById('warHeroEnemyBadge'),
  warHeroEnemyName: document.getElementById('warHeroEnemyName'),
  warHeroEnemyStars: document.getElementById('warHeroEnemyStars'),
  warHeroEnemyDestruct: document.getElementById('warHeroEnemyDestruct'),
  warEnemyProgressBar: document.getElementById('warEnemyProgressBar'),
  warHeroEnemyAttacksText: document.getElementById('warHeroEnemyAttacksText'),
  slackerRadarBody: document.getElementById('slackerRadarBody'),
  copyWarPingBtn: document.getElementById('copyWarPingBtn'),
  warLogContainer: document.getElementById('warLogContainer'),

  // Command Center Tab
  discordWarMsg: document.getElementById('discordWarMsg'),
  donationWarnMsg: document.getElementById('donationWarnMsg'),
  promoRecMsg: document.getElementById('promoRecMsg'),
  clanMailMsg: document.getElementById('clanMailMsg'),

  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  modeLiveBtn: document.getElementById('modeLiveBtn'),
  modeDemoBtn: document.getElementById('modeDemoBtn'),
  demoModeHidden: document.getElementById('demoModeHidden'),
  publicIpDisplay: document.getElementById('publicIpDisplay'),
  copyIpBtn: document.getElementById('copyIpBtn'),
  inputClanTag: document.getElementById('inputClanTag'),
  inputApiToken: document.getElementById('inputApiToken'),
  toggleTokenView: document.getElementById('toggleTokenView'),

  // Discord Integration Elements
  inputDiscordWebhook: document.getElementById('inputDiscordWebhook'),
  testDiscordWebhookBtn: document.getElementById('testDiscordWebhookBtn'),
  discordAlertsEnabled: document.getElementById('discordAlertsEnabled'),
  chkWarAttacks: document.getElementById('chkWarAttacks'),
  chkWarPhases: document.getElementById('chkWarPhases'),
  chkSlackerReminders: document.getElementById('chkSlackerReminders'),

  // Command Center Broadcast Buttons
  postDiscordWarBtn: document.getElementById('postDiscordWarBtn'),
  postDiscordDonationBtn: document.getElementById('postDiscordDonationBtn'),
  postDiscordPromoBtn: document.getElementById('postDiscordPromoBtn'),
  postDiscordMailBtn: document.getElementById('postDiscordMailBtn'),

  // Toast
  toast: document.getElementById('toast')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAllData();
});

function setupEventListeners() {
  // Tab switching
  el.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  // Refresh
  el.refreshBtn.addEventListener('click', () => {
    el.refreshBtn.classList.add('loading');
    loadAllData().finally(() => {
      el.refreshBtn.classList.remove('loading');
      showToast('Data refreshed!');
    });
  });

  // Alert dismiss
  el.closeAlertBtn.addEventListener('click', () => {
    el.statusAlert.classList.add('hidden');
  });

  // Roster Filters
  el.memberSearchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value.toLowerCase().trim();
    renderRoster();
  });
  el.roleFilter.addEventListener('change', (e) => {
    state.filters.role = e.target.value;
    renderRoster();
  });
  el.thFilter.addEventListener('change', (e) => {
    state.filters.th = e.target.value;
    renderRoster();
  });
  el.statusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderRoster();
  });
  el.sortSelect.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    renderRoster();
  });

  // Export CSV
  el.exportCsvBtn.addEventListener('click', () => {
    window.location.href = '/api/export/csv';
  });

  // Copy Buttons in Command Center
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const textarea = document.getElementById(targetId);
      if (textarea) {
        copyToClipboard(textarea.value, 'Message copied to clipboard!');
      }
    });
  });

  el.copyWarPingBtn.addEventListener('click', () => {
    if (el.discordWarMsg) {
      copyToClipboard(el.discordWarMsg.value, 'War ping message copied!');
    }
  });

  // Direct Broadcast to Discord Buttons
  if (el.postDiscordWarBtn) {
    el.postDiscordWarBtn.addEventListener('click', () => {
      sendBroadcastToDiscord('⚔️ War Attack & Radar Notice', el.discordWarMsg.value);
    });
  }

  if (el.postDiscordDonationBtn) {
    el.postDiscordDonationBtn.addEventListener('click', () => {
      sendBroadcastToDiscord('📢 Clan Activity & Donation Audit', el.donationWarnMsg.value);
    });
  }

  if (el.postDiscordPromoBtn) {
    el.postDiscordPromoBtn.addEventListener('click', () => {
      sendBroadcastToDiscord('🎖️ Promotion Recommendations Audit', el.promoRecMsg.value);
    });
  }

  if (el.postDiscordMailBtn) {
    el.postDiscordMailBtn.addEventListener('click', () => {
      sendBroadcastToDiscord('📜 Clan Mail Broadcast', el.clanMailMsg.value);
    });
  }

  // Discord Test Webhook Button
  if (el.testDiscordWebhookBtn) {
    el.testDiscordWebhookBtn.addEventListener('click', async () => {
      const webhookUrl = el.inputDiscordWebhook.value.trim();
      if (!webhookUrl) {
        return alert('Please enter a Discord Webhook URL first.');
      }
      el.testDiscordWebhookBtn.textContent = 'Sending...';
      try {
        const res = await fetch('/api/discord/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl })
        }).then(r => r.json());

        if (res.success) {
          showToast('🔔 Test notification sent to Discord!');
        } else {
          alert('Discord Error: ' + (res.error || 'Failed to send'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      } finally {
        el.testDiscordWebhookBtn.textContent = 'Send Test';
      }
    });
  }

  // Settings Modal & Mode Switcher
  el.modeLiveBtn.addEventListener('click', () => {
    el.modeLiveBtn.classList.add('active');
    el.modeDemoBtn.classList.remove('active', 'demo-active');
    el.demoModeHidden.value = 'false';
  });

  el.modeDemoBtn.addEventListener('click', () => {
    el.modeDemoBtn.classList.add('active', 'demo-active');
    el.modeLiveBtn.classList.remove('active');
    el.demoModeHidden.value = 'true';
  });

  el.openSettingsBtn.addEventListener('click', openSettings);
  el.closeSettingsBtn.addEventListener('click', closeSettings);
  el.cancelSettingsBtn.addEventListener('click', closeSettings);
  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) closeSettings();
  });

  el.copyIpBtn.addEventListener('click', () => {
    const ip = el.publicIpDisplay.textContent;
    copyToClipboard(ip, 'Public IP copied to clipboard!');
  });

  el.toggleTokenView.addEventListener('click', () => {
    if (el.inputApiToken.type === 'password') {
      el.inputApiToken.type = 'text';
      el.toggleTokenView.textContent = '🔒';
    } else {
      el.inputApiToken.type = 'password';
      el.toggleTokenView.textContent = '👁️';
    }
  });

  el.saveSettingsBtn.addEventListener('click', saveSettings);
}

// Global function to switch tabs
window.switchTab = function(tabName) {
  state.activeTab = tabName;
  el.tabs.forEach(t => {
    if (t.getAttribute('data-tab') === tabName) t.classList.add('active');
    else t.classList.remove('active');
  });

  el.panes.forEach(p => {
    if (p.id === `tab-${tabName}`) p.classList.add('active');
    else p.classList.remove('active');
  });
};

// ==================== DATA FETCHING ====================
async function loadAllData() {
  try {
    const [statusRes, clanRes, membersRes, warRes, warLogRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/clan').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
      fetch('/api/war').then(r => r.json()),
      fetch('/api/warlog').then(r => r.json())
    ]);

    state.status = statusRes;
    state.clan = clanRes.data;
    state.members = membersRes.data || [];
    state.war = warRes.data;
    state.warLog = warLogRes.data || [];

    // Handle warning or fallback notification
    if (clanRes.error || membersRes.error || warRes.error) {
      const err = clanRes.error || membersRes.error || warRes.error;
      el.alertMessage.textContent = err;
      el.statusAlert.classList.remove('hidden');
    } else {
      el.statusAlert.classList.add('hidden');
    }

    renderHeader();
    renderOverview();
    renderRoster();
    renderWarRoom();
    renderCommandCenter();
  } catch (err) {
    console.error('Failed to load clan data:', err);
    el.alertMessage.textContent = 'Network error connecting to local server: ' + err.message;
    el.statusAlert.classList.remove('hidden');
  }
}

// ==================== RENDERING ====================

function renderHeader() {
  if (!state.clan) return;

  const clan = state.clan;
  el.clanName.textContent = clan.name || 'Unknown Clan';
  el.clanTag.textContent = clan.tag || '#';
  el.clanLevelBadge.textContent = clan.clanLevel || 1;
  el.clanDescription.textContent = clan.description || 'No description set.';
  
  if (clan.badgeUrls && (clan.badgeUrls.medium || clan.badgeUrls.large)) {
    el.clanBadge.src = clan.badgeUrls.medium || clan.badgeUrls.large;
  }

  // Demo vs Live Mode badge
  if (state.status && !state.status.demoMode && state.status.hasToken) {
    el.modeBadge.textContent = 'Live API';
    el.modeBadge.className = 'mode-badge live';
  } else {
    el.modeBadge.textContent = 'Demo Mode';
    el.modeBadge.className = 'mode-badge demo';
  }

  el.tabMemberCount.textContent = state.members.length;
}

function renderOverview() {
  if (!state.clan) return;

  const clan = state.clan;
  el.clanPoints.textContent = (clan.clanPoints || 0).toLocaleString();
  el.builderPoints.textContent = (clan.clanBuilderBasePoints || 0).toLocaleString();
  el.warWins.textContent = `${clan.warWins || 0}W`;
  el.warLosses.textContent = `${clan.warLosses || 0}L`;
  el.winStreak.textContent = `${clan.warWinStreak || 0}`;
  el.membersCount.textContent = `${state.members.length} / 50`;
  el.reqTh.textContent = clan.requiredTownhallLevel ? `TH ${clan.requiredTownhallLevel}` : 'Any';
  
  const capHall = clan.clanCapital && clan.clanCapital.capitalHallLevel
    ? `Level ${clan.clanCapital.capitalHallLevel}`
    : (clan.clanLevel < 2 ? 'Unlocks at Lv 2' : 'Unranked');
  el.capitalHall.textContent = capHall;
  el.warLeague.textContent = clan.warLeague ? clan.warLeague.name : 'Unranked';

  // War Preview Card
  if (state.war && state.war.clan && state.war.opponent) {
    const war = state.war;
    const ourClan = war.clan;
    const enemy = war.opponent;
    const warState = war.state;
    
    // Status Tag Badge
    if (warState === 'preparation') {
      el.warStatusTag.textContent = 'Preparation Day';
      el.warStatusTag.className = 'phase-tag prep';
    } else if (warState === 'inWar') {
      el.warStatusTag.textContent = 'Battle Day';
      el.warStatusTag.className = 'phase-tag in-war';
    } else if (warState === 'warEnded') {
      el.warStatusTag.textContent = 'War Ended';
      el.warStatusTag.className = 'phase-tag ended';
    } else {
      el.warStatusTag.textContent = 'Not In War';
      el.warStatusTag.className = 'phase-tag ended';
    }

    el.warOurClanName.textContent = ourClan.name || 'Our Clan';
    el.warOurStars.textContent = `${ourClan.stars || 0} ★`;
    el.warOurDestruction.textContent = `${(ourClan.destructionPercentage || 0).toFixed(1)}%`;
    const totalPossibleAttacks = (war.teamSize || 15) * (war.attacksPerMember || 2);
    el.warOurAttacks.textContent = `${ourClan.attacks || 0} / ${totalPossibleAttacks} Attacks Used`;

    if (ourClan.badgeUrls && (ourClan.badgeUrls.medium || ourClan.badgeUrls.large)) {
      const ourBadge = document.getElementById('warArenaOurBadge');
      if (ourBadge) ourBadge.src = ourClan.badgeUrls.medium || ourClan.badgeUrls.large;
    }

    el.warEnemyClanName.textContent = enemy.name || 'Opponent';
    el.warEnemyStars.textContent = `${enemy.stars || 0} ★`;
    el.warEnemyDestruction.textContent = `${(enemy.destructionPercentage || 0).toFixed(1)}%`;
    el.warEnemyAttacks.textContent = `${enemy.attacks || 0} / ${totalPossibleAttacks} Attacks Used`;

    if (enemy.badgeUrls && (enemy.badgeUrls.medium || enemy.badgeUrls.large)) {
      const enemyBadge = document.getElementById('warArenaEnemyBadge');
      if (enemyBadge) enemyBadge.src = enemy.badgeUrls.medium || enemy.badgeUrls.large;
    }

    if (warState === 'preparation') {
      el.warSlackerSummary.textContent = 'Preparation Day active. Attacks unlock once Battle Day begins.';
      el.warTabBadge.textContent = 'Prep Day';
      el.warTabBadge.className = 'status-pill prep';
      el.warTabBadge.classList.remove('hidden');
    } else if (warState === 'inWar') {
      const slackersCount = (war.slackerRadar || []).length;
      if (slackersCount > 0) {
        el.warSlackerSummary.textContent = `${slackersCount} members have unspent war attacks.`;
        el.warTabBadge.textContent = `${slackersCount} Alerts`;
        el.warTabBadge.className = 'status-pill danger';
        el.warTabBadge.classList.remove('hidden');
      } else {
        el.warSlackerSummary.textContent = `All attacks are completed.`;
        el.warTabBadge.classList.add('hidden');
      }
    } else {
      el.warSlackerSummary.textContent = 'No active war attacks pending.';
      el.warTabBadge.classList.add('hidden');
    }
  }

  // Top Donors Podium
  renderTopDonors();

  // Health Breakdown
  renderHealthMeter();
}

function renderTopDonors() {
  const sorted = [...state.members].sort((a, b) => (b.donations || 0) - (a.donations || 0));
  const top = sorted.slice(0, 5);

  el.topDonorsList.innerHTML = top.map((m, idx) => {
    let topClass = '';
    if (idx === 0) topClass = 'top1';
    else if (idx === 1) topClass = 'top2';
    else if (idx === 2) topClass = 'top3';

    const thLevel = m.townHallLevel || 1;

    return `
      <div class="donor-row">
        <div class="donor-profile">
          <span class="donor-rank-num ${topClass}">#${idx + 1}</span>
          <div class="donor-name-tag">
            <span class="donor-name">${escapeHtml(m.name)}</span>
            <span class="donor-tag">${m.tag} • <span class="th-pill th${thLevel}">TH ${thLevel}</span></span>
          </div>
        </div>
        <div class="donor-stats-col">
          <span class="donor-amount">${(m.donations || 0).toLocaleString()}</span>
          <span class="donor-ratio-val">Ratio: ${m.donationRatio || 1.0}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderHealthMeter() {
  let healthy = 0;
  let warning = 0;
  let danger = 0;

  state.members.forEach(m => {
    if (m.donationStatus === 'healthy' || m.donationStatus === 'mvp') healthy++;
    else if (m.donationStatus === 'warning') warning++;
    else if (m.donationStatus === 'leech') danger++;
    else healthy++;
  });

  const total = state.members.length || 1;
  const hPct = ((healthy / total) * 100).toFixed(0);
  const wPct = ((warning / total) * 100).toFixed(0);
  const dPct = ((danger / total) * 100).toFixed(0);

  el.healthyBar.style.width = `${hPct}%`;
  el.warningBar.style.width = `${wPct}%`;
  el.dangerBar.style.width = `${dPct}%`;

  el.countHealthy.textContent = healthy;
  el.countWarning.textContent = warning;
  el.countDanger.textContent = danger;
}

function renderRoster() {
  let list = [...state.members];

  // Search Filter
  if (state.filters.search) {
    const q = state.filters.search;
    list = list.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) || 
      (m.tag && m.tag.toLowerCase().includes(q))
    );
  }

  // Role Filter
  if (state.filters.role !== 'all') {
    list = list.filter(m => m.role === state.filters.role);
  }

  // Town Hall Filter
  if (state.filters.th !== 'all') {
    const thTarget = parseInt(state.filters.th, 10);
    if (thTarget === 13) {
      list = list.filter(m => (m.townHallLevel || 14) <= 13);
    } else {
      list = list.filter(m => m.townHallLevel === thTarget);
    }
  }

  // Status Filter
  if (state.filters.status !== 'all') {
    if (state.filters.status === 'healthy') {
      list = list.filter(m => m.donationStatus === 'healthy' || m.donationStatus === 'mvp');
    } else {
      list = list.filter(m => m.donationStatus === state.filters.status);
    }
  }

  // Sorting
  list.sort((a, b) => {
    switch (state.filters.sort) {
      case 'trophies': return (b.trophies || 0) - (a.trophies || 0);
      case 'donations': return (b.donations || 0) - (a.donations || 0);
      case 'received': return (b.donationsReceived || 0) - (a.donationsReceived || 0);
      case 'ratio': return (b.donationRatio || 0) - (a.donationRatio || 0);
      case 'townHall': return (b.townHallLevel || 0) - (a.townHallLevel || 0);
      case 'rank':
      default:
        return (a.clanRank || 99) - (b.clanRank || 99);
    }
  });

  if (list.length === 0) {
    el.rosterTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--text-dim);">No clan members match your current filters.</td></tr>`;
    return;
  }

  el.rosterTableBody.innerHTML = list.map(m => {
    const thLevel = m.townHallLevel || 1;
    const thClass = 'th' + thLevel;
    
    let statusClass = 'healthy';
    let statusLabel = 'Healthy';
    if (m.donationStatus === 'mvp') { statusClass = 'mvp'; statusLabel = 'Top Donor'; }
    else if (m.donationStatus === 'warning') { statusClass = 'warning'; statusLabel = 'Low Ratio'; }
    else if (m.donationStatus === 'leech') { statusClass = 'leech'; statusLabel = 'Inactive'; }

    return `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--text-dim);">#${m.clanRank || '-'}</td>
        <td>
          <div class="player-meta">
            <span class="player-name">${escapeHtml(m.name)}</span>
            <span class="player-tag">${m.tag}</span>
          </div>
        </td>
        <td><span class="role-tag ${m.role}">${formatRole(m.role)}</span></td>
        <td><span class="th-pill ${thClass}">TH ${thLevel}</span></td>
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--gold);">${(m.trophies || 0).toLocaleString()}</td>
        <td style="font-family:var(--font-mono); color:var(--green); font-weight:600;">${(m.donations || 0).toLocaleString()}</td>
        <td style="font-family:var(--font-mono); color:var(--text-muted);">${(m.donationsReceived || 0).toLocaleString()}</td>
        <td style="font-family:var(--font-mono); font-weight:600;">${m.donationRatio || 1.0}</td>
        <td><span class="activity-tag ${statusClass}">${statusLabel}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${m.tag}', 'Copied player tag ${m.tag}!')" title="Copy Tag">Tag</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderWarRoom() {
  if (!state.war || !state.war.clan) return;

  const war = state.war;
  const ourClan = war.clan;
  const enemy = war.opponent || { name: 'Opponent', stars: 0, destructionPercentage: 0, attacks: 0 };
  const warState = war.state;

  if (warState === 'preparation') {
    el.warHeroState.textContent = 'Preparation Day';
    el.warHeroState.className = 'phase-tag prep';
  } else if (warState === 'inWar') {
    el.warHeroState.textContent = 'Battle Day';
    el.warHeroState.className = 'phase-tag in-war';
  } else if (warState === 'warEnded') {
    el.warHeroState.textContent = 'War Ended';
    el.warHeroState.className = 'phase-tag ended';
  } else {
    el.warHeroState.textContent = 'Not In War';
    el.warHeroState.className = 'phase-tag ended';
  }

  el.warHeroOurName.textContent = ourClan.name || 'Our Clan';
  el.warHeroOurStars.textContent = `${ourClan.stars || 0} ★`;
  el.warHeroOurDestruct.textContent = `${(ourClan.destructionPercentage || 0).toFixed(2)}%`;
  
  const totalAttacks = (war.teamSize || 15) * (war.attacksPerMember || 2);
  const ourPct = Math.min(100, (((ourClan.attacks || 0) / totalAttacks) * 100)).toFixed(0);
  el.warOurProgressBar.style.width = `${ourPct}%`;
  el.warHeroOurAttacksText.textContent = `${ourClan.attacks || 0} / ${totalAttacks} Attacks Used`;

  if (ourClan.badgeUrls && ourClan.badgeUrls.large) {
    el.warHeroOurBadge.src = ourClan.badgeUrls.large;
  }

  el.warHeroEnemyName.textContent = enemy.name || 'Opponent';
  el.warHeroEnemyStars.textContent = `${enemy.stars || 0} ★`;
  el.warHeroEnemyDestruct.textContent = `${(enemy.destructionPercentage || 0).toFixed(2)}%`;
  const enemyPct = Math.min(100, (((enemy.attacks || 0) / totalAttacks) * 100)).toFixed(0);
  el.warEnemyProgressBar.style.width = `${enemyPct}%`;
  el.warHeroEnemyAttacksText.textContent = `${enemy.attacks || 0} / ${totalAttacks} Attacks Used`;

  if (enemy.badgeUrls && enemy.badgeUrls.large) {
    el.warHeroEnemyBadge.src = enemy.badgeUrls.large;
  }

  // Setup War Timer
  setupWarCountdown(war.startTime, war.endTime, war.state);

  // Slacker Radar Table
  if (warState === 'preparation') {
    el.slackerRadarBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color: var(--gold);">Preparation Day active. Attacks unlock once Battle Day begins. Remind members to scout bases and donate defensive clan castle troops.</td></tr>`;
  } else {
    const slackers = war.slackerRadar || [];
    if (slackers.length === 0) {
      el.slackerRadarBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color: var(--green);">All clan members have used both attacks!</td></tr>`;
    } else {
      el.slackerRadarBody.innerHTML = slackers.map(s => {
        const isUrgent = s.attacksRemaining === (war.attacksPerMember || 2);
        return `
          <tr>
            <td style="font-family:var(--font-mono); font-weight:700;">#${s.mapPosition}</td>
            <td>
              <div class="player-meta">
                <span class="player-name">${escapeHtml(s.name)}</span>
                <span class="player-tag">${s.tag}</span>
              </div>
            </td>
            <td><span class="th-pill th${s.townhallLevel || 14}">TH ${s.townhallLevel}</span></td>
            <td style="font-family:var(--font-mono);">${s.attacksDone} used</td>
            <td style="font-family:var(--font-mono); font-weight:700; color:${isUrgent ? 'var(--red)' : 'var(--gold)'};">${s.attacksRemaining} left</td>
            <td>
              <span class="urgency-pill ${isUrgent ? 'danger' : 'warning'}">
                ${isUrgent ? '2 Left (Urgent)' : '1 Left'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // War Log List
  renderWarLog();
}

function renderWarLog() {
  if (!state.warLog || state.warLog.length === 0) {
    el.warLogContainer.innerHTML = `<p style="color:var(--text-dim); padding:1rem;">No public war log history available for this clan.</p>`;
    return;
  }

  el.warLogContainer.innerHTML = state.warLog.map(w => {
    const isWin = w.result === 'win';
    const isTie = w.result === 'tie';
    const resClass = isWin ? 'win' : isTie ? 'tie' : 'lose';
    const resText = isWin ? 'WIN' : isTie ? 'TIE' : 'LOSS';

    return `
      <div class="history-item">
        <span class="result-badge ${resClass}">${resText}</span>
        <div class="history-clans">
          <span>${escapeHtml(w.clan.name)}</span>
          <span style="color:var(--text-dim); margin: 0 4px;">vs</span>
          <span style="color:var(--text-muted);">${escapeHtml(w.opponent.name)}</span>
        </div>
        <div class="history-score">
          <span style="color:var(--gold); font-weight:700;">${w.clan.stars} ★</span>
          <span style="color:var(--text-dim);">(${w.clan.destructionPercentage.toFixed(1)}%)</span>
          <span style="margin: 0 6px;">-</span>
          <span>${w.opponent.stars} ★</span>
          <span style="color:var(--text-dim);">(${w.opponent.destructionPercentage.toFixed(1)}%)</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderCommandCenter() {
  if (!state.clan || !state.war) return;

  const slackers = state.war.slackerRadar || [];
  const slackerNames = slackers.map(s => `@${s.name} (${s.attacksRemaining} left)`).join(', ');

  // 1. Discord War Message
  if (state.war.state === 'preparation') {
    el.discordWarMsg.value = `🛡️ **WAR PREPARATION DAY**
Clan: **${state.clan.name}** vs **${state.war.opponent ? state.war.opponent.name : 'Opponent'}** (${state.war.teamSize}v${state.war.teamSize})

• Fill war Clan Castles with max defensive troops.
• Scout your mirror and plan your army composition.
Battle Day begins soon!`;
  } else {
    el.discordWarMsg.value = `⚔️ **WAR ATTACK REMINDER**
Clan: **${state.clan.name}** vs **${state.war.opponent ? state.war.opponent.name : 'Opponent'}**
Score: **${state.war.clan.stars} ★** vs **${state.war.opponent ? state.war.opponent.stars : 0} ★**

Pending Attacks:
${slackers.length > 0 ? slackerNames : 'None! Everyone has used their attacks.'}

Please get your attacks in before the battle day ends!`;
  }

  // 2. Donation Warning
  const leeches = state.members.filter(m => m.donationStatus === 'leech' || m.donationStatus === 'warning');
  const leechList = leeches.map(m => `• ${m.name} (Donated: ${m.donations} / Received: ${m.donationsReceived})`).join('\n');

  el.donationWarnMsg.value = `📢 **CLAN DONATION CHECK**
Doing a quick seasonal donation check. The following members have low donations:

${leechList || 'None! Donation activity looks healthy.'}

Please help fill troop requests when you are online.`;

  // 3. Promotion Recommendations
  const candidates = state.members.filter(m => (m.role === 'member' || m.role === 'admin' || m.role === 'elder') && (m.donations || 0) >= 3000 && (m.donationRatio || 0) >= 1.0);
  const candidateList = candidates.map(m => `• ${m.name} (${formatRole(m.role)}) — Donated: ${m.donations}, Ratio: ${m.donationRatio}, Trophies: ${m.trophies}`).join('\n');

  el.promoRecMsg.value = `🎖️ **PROMOTION SUGGESTIONS**
The following members have high donations and positive ratios:

${candidateList || 'No members currently meet the 3,000 donation threshold.'}

Criteria: 3,000+ donations, 1.0+ ratio, active war attacks.`;
}

// Setup War Timer
function setupWarCountdown(startTimeIso, endTimeIso, warState) {
  if (state.warTimerInterval) clearInterval(state.warTimerInterval);

  function parseTime(isoStr) {
    if (!isoStr) return null;
    const formatted = isoStr.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d+)Z$/, '$1-$2-$3T$4:$5:$6.$7Z');
    const t = new Date(formatted).getTime();
    return isNaN(t) ? null : t;
  }

  function update() {
    let diff = 14 * 3600;
    let label = 'Left';

    if (warState === 'preparation') {
      const startT = parseTime(startTimeIso);
      if (startT) {
        diff = Math.max(0, Math.floor((startT - Date.now()) / 1000));
        label = 'Until Battle';
      }
    } else if (warState === 'inWar') {
      const endT = parseTime(endTimeIso);
      if (endT) {
        diff = Math.max(0, Math.floor((endT - Date.now()) / 1000));
        label = 'Left';
      }
    }

    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;

    const timerStr = `${hours}h ${mins}m ${secs}s`;
    el.warHeroTimer.textContent = timerStr;
    el.warCountdown.textContent = `${hours}h ${mins}m ${label}`;
  }

  update();
  state.warTimerInterval = setInterval(update, 1000);
}

// ==================== SETTINGS MODAL ====================
function openSettings() {
  if (state.status) {
    const isDemo = !!state.status.demoMode;
    el.demoModeHidden.value = isDemo ? 'true' : 'false';
    if (isDemo) {
      el.modeDemoBtn.classList.add('active', 'demo-active');
      el.modeLiveBtn.classList.remove('active');
    } else {
      el.modeLiveBtn.classList.add('active');
      el.modeDemoBtn.classList.remove('active', 'demo-active');
    }

    el.inputClanTag.value = state.status.clanTag || '#2CVLCU8L9';
    el.publicIpDisplay.textContent = state.status.publicIp || 'Detecting...';

    // Populate Discord settings
    if (el.inputDiscordWebhook) {
      el.inputDiscordWebhook.value = state.status.discordWebhookUrl || '';
    }
    if (state.status.discordAlerts) {
      el.discordAlertsEnabled.checked = !!state.status.discordAlerts.enabled;
      el.chkWarAttacks.checked = state.status.discordAlerts.warAttacks !== false;
      el.chkWarPhases.checked = state.status.discordAlerts.warPhases !== false;
      el.chkSlackerReminders.checked = state.status.discordAlerts.slackerReminders !== false;
    }
  }
  el.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  el.settingsModal.classList.add('hidden');
}

async function saveSettings() {
  const isDemo = el.demoModeHidden.value === 'true';
  const tag = el.inputClanTag.value.trim();
  const token = el.inputApiToken.value.trim();
  const webhookUrl = el.inputDiscordWebhook ? el.inputDiscordWebhook.value.trim() : '';
  const discordAlerts = {
    enabled: el.discordAlertsEnabled ? el.discordAlertsEnabled.checked : false,
    warAttacks: el.chkWarAttacks ? el.chkWarAttacks.checked : true,
    warPhases: el.chkWarPhases ? el.chkWarPhases.checked : true,
    slackerReminders: el.chkSlackerReminders ? el.chkSlackerReminders.checked : true
  };

  try {
    const payload = {
      demoMode: isDemo,
      clanTag: tag.startsWith('#') ? tag : `#${tag}`,
      discordWebhookUrl: webhookUrl,
      discordAlerts: discordAlerts
    };
    if (token) payload.apiToken = token;

    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      closeSettings();
      showToast('Settings saved successfully!');
      loadAllData();
    } else {
      alert('Error saving settings: ' + (res.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Failed to connect to server: ' + err.message);
  }
}

// Send Broadcast to Discord helper
async function sendBroadcastToDiscord(title, message) {
  if (!state.status || !state.status.discordWebhookUrl) {
    openSettings();
    return alert('Please configure your Discord Webhook URL first in Clan & API Settings.');
  }

  try {
    showToast('Sending to Discord...');
    const res = await fetch('/api/discord/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message })
    }).then(r => r.json());

    if (res.success) {
      showToast('🚀 Broadcast sent to Discord channel!');
    } else {
      alert('Discord Error: ' + (res.error || 'Failed to post message'));
    }
  } catch (err) {
    alert('Network error posting to Discord: ' + err.message);
  }
}

// ==================== UTILITY FUNCTIONS ====================
function formatRole(role) {
  switch (role) {
    case 'leader': return 'Leader';
    case 'coLeader': return 'Co-Leader';
    case 'admin':
    case 'elder': return 'Elder';
    case 'member': return 'Member';
    default: return role;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function copyToClipboard(text, msg = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(msg));
  } else {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(msg);
  }
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 2500);
}
