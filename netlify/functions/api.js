const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const { demoClan, demoMembers, demoCurrentWar, demoWarLog } = require('../../data/demoData');
const discord = require('../../services/discord');

// Load base configuration with fallback to environment variables
let config = {
  apiToken: process.env.COC_API_TOKEN || '',
  clanTag: process.env.COC_CLAN_TAG || '#2CVLCU8L9',
  demoMode: process.env.DEMO_MODE === 'true' || false,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  discordRoleMention: process.env.DISCORD_ROLE_MENTION || '<@&1567197063039688866>',
  discordAlerts: {
    enabled: true,
    warAttacks: true,
    warPhases: true,
    slackerReminders: true
  }
};

const configFilePath = path.join(__dirname, '../../config.json');
if (fs.existsSync(configFilePath)) {
  try {
    const raw = fs.readFileSync(configFilePath, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Could not read config.json in serverless environment:', err.message);
  }
}

// Override with process.env if present
if (process.env.COC_API_TOKEN) config.apiToken = process.env.COC_API_TOKEN;
if (process.env.COC_CLAN_TAG) config.clanTag = process.env.COC_CLAN_TAG;
if (process.env.DISCORD_WEBHOOK_URL) config.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (process.env.DISCORD_ROLE_MENTION) config.discordRoleMention = process.env.DISCORD_ROLE_MENTION;

function makeHttpsRequest(reqUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(reqUrl);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'ClashManagerPro/1.0',
        ...headers
      },
      timeout: 9000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

async function callCocApi(endpoint) {
  if (config.demoMode || !config.apiToken) {
    return { demo: true };
  }

  const cleanTag = encodeURIComponent(config.clanTag.trim().toUpperCase());
  const pathWithTag = endpoint.replace('{tag}', cleanTag);
  const targetUrl = `https://api.clashofclans.com/v1${pathWithTag}`;

  try {
    const response = await makeHttpsRequest(targetUrl, {
      'Authorization': `Bearer ${config.apiToken}`,
      'Accept': 'application/json'
    });

    if (response.statusCode === 200) {
      return { success: true, data: response.data };
    } else {
      let errorReason = 'Unknown API error';
      if (response.statusCode === 403) {
        errorReason = 'Supercell 403 Forbidden: Invalid token, or current IP is not whitelisted.';
      } else if (response.statusCode === 404) {
        errorReason = `Clan tag ${config.clanTag} not found.`;
      }
      return { success: false, statusCode: response.statusCode, error: errorReason, raw: response.data || response.raw };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function enrichMembers(membersList) {
  return membersList.map((m) => {
    const donated = m.donations || 0;
    const received = m.donationsReceived || 0;
    const ratio = received === 0 ? (donated > 0 ? 99.0 : 1.0) : parseFloat((donated / received).toFixed(2));
    
    let status = 'normal';
    if (donated >= 5000) status = 'mvp';
    else if (ratio >= 1.0) status = 'healthy';
    else if (ratio < 0.25 && received >= 1000) status = 'leech';
    else if (ratio < 0.5) status = 'warning';

    const normalizedRole = m.role === 'admin' ? 'elder' : m.role;
    return {
      ...m,
      role: normalizedRole,
      donationRatio: ratio,
      donationStatus: status
    };
  });
}

function analyzeWar(warData) {
  if (!warData || !warData.clan || !warData.clan.members) {
    return { ...warData, slackerRadar: [] };
  }

  if (warData.state === 'preparation') {
    return { ...warData, slackerRadar: [], isPreparation: true };
  }
  if (warData.state === 'warEnded') {
    return { ...warData, slackerRadar: [], isEnded: true };
  }
  if (warData.state === 'notInWar') {
    return { ...warData, slackerRadar: [], notInWar: true };
  }

  const attacksPerMember = warData.attacksPerMember || 2;
  const slackers = [];

  warData.clan.members.forEach((member) => {
    const attacksDone = (member.attacks || []).length;
    const attacksRemaining = attacksPerMember - attacksDone;

    if (attacksRemaining > 0) {
      slackers.push({
        tag: member.tag,
        name: member.name,
        mapPosition: member.mapPosition,
        townhallLevel: member.townhallLevel,
        attacksDone,
        attacksRemaining,
        severity: attacksRemaining === attacksPerMember ? 'danger' : 'warning'
      });
    }
  });

  slackers.sort((a, b) => a.mapPosition - b.mapPosition);
  return { ...warData, slackerRadar: slackers, attacksPerMember };
}

// Netlify Serverless Handler
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Strip prefix: /.netlify/functions/api or /api
  let subpath = (event.path || '/')
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');
  if (!subpath.startsWith('/')) subpath = '/' + subpath;

  // 1. GET /status or /config
  if ((subpath === '/status' || subpath === '/config') && event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        demoMode: config.demoMode,
        hasToken: !!config.apiToken,
        clanTag: config.clanTag,
        configured: !config.demoMode && !!config.apiToken && !!config.clanTag,
        isNetlify: true,
        publicIp: 'Netlify Dynamic AWS Pool',
        apiStatus: {
          success: false,
          statusCode: 403,
          error: 'Supercell requires a static whitelisted IP. Connect via ndl-clash-live tunnel for real-time live sync.',
          currentPublicIp: 'Netlify Dynamic IP'
        },
        discordWebhookUrl: config.discordWebhookUrl || '',
        discordRoleMention: config.discordRoleMention || '@coc',
        discordAlerts: config.discordAlerts
      })
    };
  }

  // 2. POST /config
  if (subpath === '/config' && event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      if (typeof payload.clanTag === 'string') config.clanTag = payload.clanTag.trim().toUpperCase();
      if (typeof payload.discordWebhookUrl === 'string') config.discordWebhookUrl = payload.discordWebhookUrl.trim();
      if (typeof payload.discordRoleMention === 'string') config.discordRoleMention = payload.discordRoleMention.trim();
      if (payload.discordAlerts && typeof payload.discordAlerts === 'object') {
        config.discordAlerts = { ...config.discordAlerts, ...payload.discordAlerts };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, config }) };
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  // 3. GET /clan
  if (subpath === '/clan') {
    if (config.demoMode) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo', data: demoClan }) };
    }
    const result = await callCocApi('/clans/{tag}');
    if (result.success) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'live', data: result.data }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo_fallback', error: result.error, data: demoClan }) };
  }

  // 4. GET /members
  if (subpath === '/members') {
    if (config.demoMode) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo', data: enrichMembers(demoMembers), count: demoMembers.length }) };
    }
    const result = await callCocApi('/clans/{tag}/members');
    if (result.success && result.data && result.data.items) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'live', data: enrichMembers(result.data.items), count: result.data.items.length }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo_fallback', error: result.error, data: enrichMembers(demoMembers), count: demoMembers.length }) };
  }

  // 5. GET /war
  if (subpath === '/war') {
    if (config.demoMode) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo', data: analyzeWar(demoCurrentWar) }) };
    }
    const result = await callCocApi('/clans/{tag}/currentwar');
    if (result.success) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'live', data: analyzeWar(result.data) }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo_fallback', error: result.error, data: analyzeWar(demoCurrentWar) }) };
  }

  // 6. GET /warlog
  if (subpath === '/warlog') {
    if (config.demoMode) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo', data: demoWarLog }) };
    }
    const result = await callCocApi('/clans/{tag}/warlog');
    if (result.success && result.data && result.data.items) {
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'live', data: result.data.items }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ source: 'demo_fallback', error: result.error, data: demoWarLog }) };
  }

  // 7. POST /discord/test
  if (subpath === '/discord/test' && event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const webhookUrl = payload.webhookUrl || config.discordWebhookUrl;
      if (!webhookUrl) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No Discord Webhook URL provided.' }) };
      }
      let clan = demoClan;
      if (!config.demoMode && config.apiToken) {
        const resClan = await callCocApi('/clans/{tag}');
        if (resClan.success) clan = resClan.data;
      }
      const roleMention = payload.roleMention || config.discordRoleMention || '@coc';
      const result = await discord.sendTestNotification(webhookUrl, clan, roleMention);
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  // 8. POST /discord/broadcast
  if (subpath === '/discord/broadcast' && event.httpMethod === 'POST') {
    try {
      const { title, message, roleMention, audience } = JSON.parse(event.body || '{}');
      if (!config.discordWebhookUrl) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No Discord Webhook URL configured.' }) };
      }
      let clan = demoClan;
      if (!config.demoMode && config.apiToken) {
        const resClan = await callCocApi('/clans/{tag}');
        if (resClan.success) clan = resClan.data;
      }
      const mentionToUse = roleMention !== undefined ? roleMention : (config.discordRoleMention || '@coc');
      const result = await discord.sendCustomAnnouncement(config.discordWebhookUrl, clan, title, message, mentionToUse, audience);
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: `Endpoint not found: ${subpath}` }) };
};
