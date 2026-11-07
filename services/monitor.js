// Background Live Monitoring & Discord Alert Engine
const discord = require('./discord');

class ClanWarMonitor {
  constructor(apiCaller, getConfig) {
    this.apiCaller = apiCaller;
    this.getConfig = getConfig;
    this.intervalId = null;
    
    // Tracking state
    this.lastWarState = null;
    this.lastAttacksSeen = new Set();
    this.slackerRemindersSent = { fourHour: false, oneHour: false };
    this.currentClan = null;
  }

  start(intervalMs = 60000) {
    if (this.intervalId) clearInterval(this.intervalId);
    console.log(`📡 Background Discord War Monitor initialized (Polling every ${intervalMs / 1000}s)`);
    
    // Initial check after 5s
    setTimeout(() => this.check(), 5000);
    this.intervalId = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async check() {
    const config = this.getConfig();
    if (!config.discordWebhookUrl || !config.discordAlerts || !config.discordAlerts.enabled) {
      return;
    }

    const roleMention = config.discordRoleMention || '@coc';

    try {
      // 1. Fetch Clan info if not cached
      if (!this.currentClan) {
        const clanRes = await this.apiCaller('/clans/{tag}');
        if (clanRes.success) {
          this.currentClan = clanRes.data;
        }
      }

      // 2. Fetch Current War
      const warRes = await this.apiCaller('/clans/{tag}/currentwar');
      if (!warRes.success || !warRes.data) return;

      const war = warRes.data;
      const currentState = war.state;

      // Check Phase Transition
      if (this.lastWarState && this.lastWarState !== currentState) {
        console.log(`🔔 War Phase Transition detected: ${this.lastWarState} -> ${currentState}`);
        if (config.discordAlerts.warPhases) {
          await discord.sendWarPhaseNotification(config.discordWebhookUrl, war, this.currentClan, currentState, roleMention);
        }

        // Reset tracking on new war
        if (currentState === 'preparation' || currentState === 'inWar') {
          this.lastAttacksSeen.clear();
          this.slackerRemindersSent = { fourHour: false, oneHour: false };
        }
      }
      this.lastWarState = currentState;

      // In-War Attack Tracking & Slacker Radar
      if (currentState === 'inWar' && war.clan && war.clan.members) {
        // Collect all attacks
        const allAttacks = [];
        const memberMap = new Map();

        war.clan.members.forEach(m => {
          memberMap.set(m.tag, m.name);
          (m.attacks || []).forEach(atk => {
            allAttacks.push({
              ...atk,
              attackerName: m.name,
              attackerPos: m.mapPosition
            });
          });
        });

        // Opponent member map for defender names
        const opponentMap = new Map();
        if (war.opponent && war.opponent.members) {
          war.opponent.members.forEach(op => {
            opponentMap.set(op.tag, `#${op.mapPosition} ${op.name}`);
          });
        }

        // Check for new attacks
        for (const atk of allAttacks) {
          const atkKey = `${atk.attackerTag}_${atk.order}`;
          if (!this.lastAttacksSeen.has(atkKey)) {
            this.lastAttacksSeen.add(atkKey);

            // Only notify if this isn't our very first sync run
            if (this.initializedAttacks && config.discordAlerts.warAttacks) {
              const defenderName = opponentMap.get(atk.defenderTag) || 'Enemy Base';
              console.log(`⚔️ New War Attack detected: ${atk.attackerName} -> ${defenderName}`);
              await discord.sendWarAttackNotification(config.discordWebhookUrl, atk, atk.attackerName, defenderName, this.currentClan, roleMention);
            }
          }
        }
        this.initializedAttacks = true;

        // Slacker Countdown Reminders
        if (config.discordAlerts.slackerReminders && war.endTime) {
          const endFormatted = war.endTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d+)Z$/, '$1-$2-$3T$4:$5:$6.$7Z');
          const endTimestamp = new Date(endFormatted).getTime();
          const msLeft = endTimestamp - Date.now();
          const hoursLeft = msLeft / (1000 * 3600);

          // Find members with unspent attacks
          const attacksPerMember = war.attacksPerMember || 2;
          const slackers = [];
          war.clan.members.forEach(m => {
            const done = (m.attacks || []).length;
            if (done < attacksPerMember) {
              slackers.push({
                mapPosition: m.mapPosition,
                name: m.name,
                townhallLevel: m.townhallLevel,
                attacksRemaining: attacksPerMember - done
              });
            }
          });

          // 4 Hours Reminder
          if (hoursLeft <= 4 && hoursLeft > 3.5 && !this.slackerRemindersSent.fourHour && slackers.length > 0) {
            this.slackerRemindersSent.fourHour = true;
            console.log(`🚨 Triggering 4-Hour Slacker Warning to Discord`);
            await discord.sendSlackerReminder(config.discordWebhookUrl, war, this.currentClan, slackers, '4 Hours', roleMention);
          }

          // 1 Hour Reminder
          if (hoursLeft <= 1 && hoursLeft > 0 && !this.slackerRemindersSent.oneHour && slackers.length > 0) {
            this.slackerRemindersSent.oneHour = true;
            console.log(`🚨 Triggering 1-Hour FINAL Slacker Warning to Discord`);
            await discord.sendSlackerReminder(config.discordWebhookUrl, war, this.currentClan, slackers, '1 Hour (FINAL CALL)', roleMention);
          }
        }
      }
    } catch (err) {
      console.warn('War Monitor check error:', err.message);
    }
  }
}

module.exports = ClanWarMonitor;
