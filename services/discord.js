// Discord Webhook Service for NDL Clan Manager
const https = require('node:https');

const EMBED_COLORS = {
  GOLD: 0xF59E0B,     // 16096779
  RED: 0xEF4444,      // 15680580
  GREEN: 0x10B981,    // 1096065
  BLUE: 0x3B82F6,     // 3900150
  PURPLE: 0x8B5CF6    // 9133302
};

const DEFAULT_ROLE_ID = '1567197063039688866';

// Resolves raw strings (@coc, role ID digits, <@&...>) into Discord role mention syntax
function formatDiscordMention(mention) {
  if (!mention) return `<@&${DEFAULT_ROLE_ID}>`;
  const trimmed = mention.trim();
  if (/^<@&?\d+>$/.test(trimmed) || trimmed === '@everyone' || trimmed === '@here') {
    return trimmed;
  }
  // Pure role ID digits
  if (/^\d{17,20}$/.test(trimmed)) {
    return `<@&${trimmed}>`;
  }
  if (/^@\d{17,20}$/.test(trimmed)) {
    return `<@&${trimmed.substring(1)}>`;
  }
  // If user provided @coc or coc, map to their verified role ID
  if (trimmed.toLowerCase() === '@coc' || trimmed.toLowerCase() === 'coc') {
    return `<@&${DEFAULT_ROLE_ID}>`;
  }
  return trimmed;
}

function buildAllowedMentions(mentionStr) {
  const roleMatch = (mentionStr || '').match(/<@&(\d+)>/);
  if (roleMatch) {
    return {
      roles: [roleMatch[1]],
      parse: ['users', 'everyone']
    };
  }
  return {
    parse: ['roles', 'users', 'everyone']
  };
}

function postDiscordWebhook(webhookUrl, payload) {
  return new Promise((resolve) => {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return resolve({ success: false, error: 'Invalid Discord Webhook URL. It must start with https://discord.com/api/webhooks/' });
    }

    try {
      if (!payload.allowed_mentions) {
        payload.allowed_mentions = buildAllowedMentions(payload.content || '');
      }

      const parsed = new URL(webhookUrl);
      const postData = JSON.stringify(payload);

      const options = {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'NDLClanManager/1.0'
        },
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            resolve({ success: false, statusCode: res.statusCode, error: `Discord rejected request (Status ${res.statusCode}): ${responseBody}` });
          }
        });
      });

      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Discord request timed out.' });
      });

      req.write(postData);
      req.end();
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

// 1. Test Notification
async function sendTestNotification(webhookUrl, clan, roleMention = '<@&1567197063039688866>') {
  const clanName = clan ? clan.name : 'NDL (NAADAN LEGACY)';
  const clanBadge = clan && clan.badgeUrls ? (clan.badgeUrls.medium || clan.badgeUrls.large) : null;
  const clanTag = clan ? clan.tag : '#2CVLCU8L9';
  const resolved = formatDiscordMention(roleMention);
  const mention = resolved ? `${resolved} ` : '';

  const payload = {
    username: 'NDL BOT',
    avatar_url: clanBadge || 'https://api-assets.clashofclans.com/badges/512/BIZ4D9ihzimhDQ4y8GKb0VbXvJKDiLVIJ_MyIQxDVLA.png',
    content: `${mention}🔔 **Discord Live Webhook Connected & Role Mention Verified!**`,
    allowed_mentions: buildAllowedMentions(resolved),
    embeds: [
      {
        title: '🛡️ NDL Tactical War Radar Connected',
        description: `Successfully linked Discord notifications for **${clanName}** (${clanTag})!\n\nAll automated live war alerts, preparation starts, and attack reminders will ping the ${resolved} role.`,
        color: EMBED_COLORS.GREEN,
        thumbnail: clanBadge ? { url: clanBadge } : undefined,
        fields: [
          { name: 'Role Mention', value: resolved, inline: true },
          { name: 'Clan Tag', value: `\`${clanTag}\``, inline: true },
          { name: 'Status', value: '🟢 Active & Ready', inline: true }
        ],
        footer: { text: 'NAADAN LEGACY ESPORTS • War Intelligence Hub' },
        timestamp: new Date().toISOString()
      }
    ]
  };

  return postDiscordWebhook(webhookUrl, payload);
}

// 2. War Phase Notification
async function sendWarPhaseNotification(webhookUrl, war, clan, phase, roleMention = '<@&1567197063039688866>') {
  if (!war || !war.clan) return { success: false, error: 'Invalid war data' };

  const clanName = clan ? clan.name : war.clan.name;
  const enemyName = war.opponent ? war.opponent.name : 'Enemy Clan';
  const clanBadge = clan && clan.badgeUrls ? (clan.badgeUrls.medium || clan.badgeUrls.large) : null;
  const resolved = formatDiscordMention(roleMention);
  const mention = resolved ? `${resolved} ` : '';

  let title = '';
  let description = '';
  let color = EMBED_COLORS.GOLD;
  let headerContent = '';

  if (phase === 'preparation') {
    headerContent = `${mention}🛡️ **WAR PREPARATION DAY HAS BEGUN!**`;
    title = `🛡️ War Match Found: ${clanName} vs ${enemyName}`;
    description = `War Preparation Day is active! Battle size is **${war.teamSize}v${war.teamSize}**.\n\n• **Donate CC Troops:** Fill defensive War Clan Castles immediately!\n• **Scout Targets:** Coordinate assignments in the War Room.`;
    color = EMBED_COLORS.GOLD;
  } else if (phase === 'inWar') {
    headerContent = `${mention}⚔️ **BATTLE DAY IS LIVE — COMMENCE ATTACKS!**`;
    title = `⚔️ Battle Day Has Begun: ${clanName} vs ${enemyName}!`;
    description = `War is officially LIVE! Both clans have 24 hours.\n\n⚠️ **Remember to use BOTH attacks before battle day expires!**`;
    color = EMBED_COLORS.RED;
  } else if (phase === 'warEnded') {
    const ourStars = war.clan.stars || 0;
    const enemyStars = war.opponent ? war.opponent.stars : 0;
    const isWin = ourStars > enemyStars;
    const isTie = ourStars === enemyStars;

    headerContent = `${mention}🏁 **WAR HAS ENDED!**`;
    title = isWin ? `🏆 VICTORY for ${clanName}!` : isTie ? `🤝 War Ended in a TIE!` : `💔 Defeat in Clan War`;
    description = `Final Score: **${clanName} ${ourStars} ⭐** (${(war.clan.destructionPercentage || 0).toFixed(1)}%) vs **${enemyName} ${enemyStars} ⭐** (${(war.opponent ? war.opponent.destructionPercentage || 0 : 0).toFixed(1)}%)`;
    color = isWin ? EMBED_COLORS.GREEN : isTie ? EMBED_COLORS.GOLD : EMBED_COLORS.RED;
  }

  const payload = {
    username: 'NDL BOT',
    avatar_url: clanBadge || undefined,
    content: headerContent,
    allowed_mentions: buildAllowedMentions(resolved),
    embeds: [
      {
        title,
        description,
        color,
        thumbnail: clanBadge ? { url: clanBadge } : undefined,
        fields: [
          { name: 'Our Clan', value: `${clanName} (${war.clan.stars || 0} ★)`, inline: true },
          { name: 'Opponent', value: `${enemyName} (${war.opponent ? war.opponent.stars : 0} ★)`, inline: true },
          { name: 'Format', value: `${war.teamSize} vs ${war.teamSize}`, inline: true }
        ],
        footer: { text: 'NAADAN LEGACY ESPORTS • War Tracker' },
        timestamp: new Date().toISOString()
      }
    ]
  };

  return postDiscordWebhook(webhookUrl, payload);
}

// 3. New War Attack Notification
async function sendWarAttackNotification(webhookUrl, attack, attackerName, defenderName, clan, roleMention = '<@&1567197063039688866>') {
  const starsStr = '★'.repeat(attack.stars) + '☆'.repeat(3 - attack.stars);
  const clanBadge = clan && clan.badgeUrls ? (clan.badgeUrls.medium || clan.badgeUrls.large) : null;
  const isTriple = attack.stars === 3;
  const resolved = formatDiscordMention(roleMention);
  const mention = resolved ? `${resolved} ` : '';

  const headerContent = isTriple
    ? `${mention}💥 **3-STAR TRIPLE SECURED BY ${attackerName}!**`
    : `${mention}⚔️ **War Attack Executed by ${attackerName}**`;

  const payload = {
    username: 'NDL BOT',
    avatar_url: clanBadge || undefined,
    content: headerContent,
    allowed_mentions: buildAllowedMentions(resolved),
    embeds: [
      {
        title: isTriple ? `🔥 3-Star Triple! — ${attackerName}` : `War Attack — ${attackerName}`,
        description: `**${attackerName}** attacked **${defenderName}**\n**Result:** ${starsStr} (${attack.destructionPercentage}% Destruction)`,
        color: isTriple ? EMBED_COLORS.GREEN : attack.stars >= 2 ? EMBED_COLORS.GOLD : EMBED_COLORS.RED,
        thumbnail: clanBadge ? { url: clanBadge } : undefined,
        fields: [
          { name: 'Stars Won', value: `${attack.stars} ★`, inline: true },
          { name: 'Destruction', value: `${attack.destructionPercentage}%`, inline: true },
          { name: 'Duration', value: `${Math.floor((attack.duration || 180) / 60)}m ${(attack.duration || 180) % 60}s`, inline: true }
        ],
        footer: { text: `Attack #${attack.order || 1} • NAADAN LEGACY ESPORTS` },
        timestamp: new Date().toISOString()
      }
    ]
  };

  return postDiscordWebhook(webhookUrl, payload);
}

// 4. Slacker War Reminder
async function sendSlackerReminder(webhookUrl, war, clan, slackers, timeLeftText, roleMention = '<@&1567197063039688866>') {
  if (!slackers || slackers.length === 0) return { success: true, skipped: true };

  const clanName = clan ? clan.name : war.clan.name;
  const enemyName = war.opponent ? war.opponent.name : 'Opponent';
  const clanBadge = clan && clan.badgeUrls ? (clan.badgeUrls.medium || clan.badgeUrls.large) : null;
  const resolved = formatDiscordMention(roleMention);
  const mention = resolved ? `${resolved} ` : '';

  const slackerLines = slackers.map(s => `• **#${s.mapPosition} ${s.name}** (TH${s.townhallLevel}) — **${s.attacksRemaining}** attack(s) left`).join('\n');

  const payload = {
    username: 'NDL BOT',
    avatar_url: clanBadge || undefined,
    content: `${mention}🚨 **WAR ATTACK REMINDER: Only ${timeLeftText} Left!**`,
    allowed_mentions: buildAllowedMentions(resolved),
    embeds: [
      {
        title: `⏳ War Countdown: Only ${timeLeftText} Left!`,
        description: `Score: **${war.clan.stars} ★** vs **${war.opponent.stars} ★**\n\nThe following members still have attacks remaining. Please use your attacks before the battle day ends to avoid benching!`,
        color: EMBED_COLORS.RED,
        thumbnail: clanBadge ? { url: clanBadge } : undefined,
        fields: [
          { name: 'Pending Attacks', value: slackerLines.slice(0, 1024), inline: false }
        ],
        footer: { text: 'NAADAN LEGACY ESPORTS • Disciplinary Ledger' },
        timestamp: new Date().toISOString()
      }
    ]
  };

  return postDiscordWebhook(webhookUrl, payload);
}

// 5. Custom Announcement from Leader Command Center
async function sendCustomAnnouncement(webhookUrl, clan, title, message, roleMention = '<@&1567197063039688866>', audience = '') {
  const clanName = clan ? clan.name : 'NAADAN LEGACY';
  const clanBadge = clan && clan.badgeUrls ? (clan.badgeUrls.medium || clan.badgeUrls.large) : null;
  const resolved = formatDiscordMention(roleMention);
  const mention = resolved ? `${resolved} ` : '';

  const fields = [];
  if (audience) {
    fields.push({ name: 'Target Audience', value: `\`${audience}\``, inline: true });
  }

  const payload = {
    username: 'NDL BOT',
    avatar_url: clanBadge || undefined,
    content: `${mention}📢 **Official Clan Notice from Leadership**`,
    allowed_mentions: buildAllowedMentions(resolved),
    embeds: [
      {
        title: title || `Directive: ${clanName}`,
        description: message,
        color: EMBED_COLORS.GOLD,
        thumbnail: clanBadge ? { url: clanBadge } : undefined,
        fields: fields.length > 0 ? fields : undefined,
        footer: { text: `${clanName} • Leader Dispatch Hub` },
        timestamp: new Date().toISOString()
      }
    ]
  };

  return postDiscordWebhook(webhookUrl, payload);
}

module.exports = {
  DEFAULT_ROLE_ID,
  formatDiscordMention,
  buildAllowedMentions,
  postDiscordWebhook,
  sendTestNotification,
  sendWarPhaseNotification,
  sendWarAttackNotification,
  sendSlackerReminder,
  sendCustomAnnouncement
};
