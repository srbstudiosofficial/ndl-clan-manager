const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const { demoClan, demoMembers, demoCurrentWar, demoWarLog } = require('./data/demoData');
const discord = require('./services/discord');
const ClanWarMonitor = require('./services/monitor');

let lastApiStatus = { success: false, statusCode: null, error: null, currentPublicIp: null, lastSuccessTime: null };

const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize config
let config = {
  apiToken: '',
  clanTag: '#2CVLCU8L9',
  demoMode: false,
  discordWebhookUrl: '',
  discordRoleMention: '<@&1567197063039688866>',
  discordAlerts: {
    enabled: false,
    warAttacks: true,
    warPhases: true,
    slackerReminders: true
  }
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error reading config.json:', err.message);
  }
}

// Override with environment variables for cloud platforms (Render, Railway, Heroku)
if (process.env.COC_API_TOKEN) config.apiToken = process.env.COC_API_TOKEN;
if (process.env.COC_CLAN_TAG) config.clanTag = process.env.COC_CLAN_TAG;
if (process.env.DISCORD_WEBHOOK_URL) config.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (process.env.DISCORD_ROLE_MENTION) config.discordRoleMention = process.env.DISCORD_ROLE_MENTION;
if (process.env.DEMO_MODE) config.demoMode = process.env.DEMO_MODE === 'true';

function saveConfig(newConfig) {
  config = { ...config, ...newConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// Fetch helper for Clash of Clans API or external HTTPS
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
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

// Fetch Public IP to assist with Supercell API IP whitelisting
async function getPublicIp() {
  try {
    const res = await makeHttpsRequest('https://api.ipify.org?format=json');
    if (res.statusCode === 200 && res.data && res.data.ip) {
      return res.data.ip;
    }
  } catch (err) {
    console.warn('Could not determine public IP:', err.message);
  }
  return 'Unable to detect (Check router / ISP)';
}

// Call Clash of Clans API
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
        lastApiStatus.success = true;
        lastApiStatus.statusCode = 200;
        lastApiStatus.error = null;
        lastApiStatus.lastSuccessTime = new Date().toISOString();
        return { success: true, data: response.data };
      } else {
        let errorReason = 'Unknown API error';
        if (response.statusCode === 403) {
          errorReason = (response.data && response.data.message) ? response.data.message : 'Invalid authorization: IP not whitelisted in Supercell Dev Portal';
        } else if (response.statusCode === 404) {
          errorReason = `Clan tag ${config.clanTag} not found.`;
        } else if (response.statusCode === 503) {
          errorReason = 'Supercell servers are undergoing maintenance.';
        }
        lastApiStatus.success = false;
        lastApiStatus.statusCode = response.statusCode;
        lastApiStatus.error = errorReason;
        return { success: false, statusCode: response.statusCode, error: errorReason, raw: response.data || response.raw };
      }
    } catch (err) {
      lastApiStatus.success = false;
      lastApiStatus.error = err.message;
      return { success: false, error: err.message };
    }
  }

// Calculate donation stats and slacker flags
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

    // Normalize role: Supercell API returns 'admin' for Elders
    const normalizedRole = m.role === 'admin' ? 'elder' : m.role;

    return {
      ...m,
      role: normalizedRole,
      rawRole: m.role,
      donationRatio: ratio,
      donationStatus: status
    };
  });
}

// Generate Slacker Radar for War
function analyzeWar(warData) {
  if (!warData || !warData.clan || !warData.clan.members) {
    return { ...warData, slackerRadar: [] };
  }

  // If war is in preparation, attacks have not opened yet!
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

  // Sort slackers by map position (key bases first)
  slackers.sort((a, b) => a.mapPosition - b.mapPosition);

  return {
    ...warData,
    slackerRadar: slackers
  };
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Main Server
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- API Endpoints ---
  if (pathname === '/api/status' || (pathname === '/api/config' && req.method === 'GET')) {
    const publicIp = await getPublicIp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      demoMode: config.demoMode,
      hasToken: !!config.apiToken,
      clanTag: config.clanTag,
      configured: !config.demoMode && !!config.apiToken && !!config.clanTag,
      publicIp,
      apiStatus: { ...lastApiStatus, currentPublicIp: publicIp },
      discordWebhookUrl: config.discordWebhookUrl || '',
      discordRoleMention: config.discordRoleMention || '@coc',
      discordAlerts: config.discordAlerts || {
        enabled: false,
        warAttacks: true,
        warPhases: true,
        slackerReminders: true
      }
    }));
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const updatedConfig = {
          apiToken: typeof payload.apiToken === 'string' ? payload.apiToken.trim() : config.apiToken,
          clanTag: typeof payload.clanTag === 'string' ? payload.clanTag.trim().toUpperCase() : config.clanTag,
          demoMode: typeof payload.demoMode === 'boolean' ? payload.demoMode : config.demoMode
        };

        if (typeof payload.discordWebhookUrl === 'string') {
          updatedConfig.discordWebhookUrl = payload.discordWebhookUrl.trim();
        }

        if (typeof payload.discordRoleMention === 'string') {
          updatedConfig.discordRoleMention = payload.discordRoleMention.trim();
        }

        if (payload.discordAlerts && typeof payload.discordAlerts === 'object') {
          updatedConfig.discordAlerts = { ...config.discordAlerts, ...payload.discordAlerts };
        }

        saveConfig(updatedConfig);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, config: { ...config, apiToken: config.apiToken ? '••••••••' : '' } }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Discord Test Endpoint
  if (pathname === '/api/discord/test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const webhookUrl = payload.webhookUrl || config.discordWebhookUrl;
        
        if (!webhookUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'No Discord Webhook URL provided.' }));
        }

        let clan = demoClan;
        if (!config.demoMode && config.apiToken) {
          const resClan = await callCocApi('/clans/{tag}');
          if (resClan.success) clan = resClan.data;
        }

        const roleMention = payload.roleMention || config.discordRoleMention || '@coc';
        const result = await discord.sendTestNotification(webhookUrl, clan, roleMention);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Discord Direct Broadcast Endpoint (From Command Center)
  if (pathname === '/api/discord/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { title, message, roleMention, audience } = JSON.parse(body);
        if (!config.discordWebhookUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Please configure your Discord Webhook URL first in Clan & API Settings.' }));
        }

        let clan = demoClan;
        if (!config.demoMode && config.apiToken) {
          const resClan = await callCocApi('/clans/{tag}');
          if (resClan.success) clan = resClan.data;
        }

        const mentionToUse = roleMention !== undefined ? roleMention : (config.discordRoleMention || '@coc');
        const result = await discord.sendCustomAnnouncement(config.discordWebhookUrl, clan, title, message, mentionToUse, audience);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/clan') {
    if (config.demoMode) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo', data: demoClan }));
    }

    const result = await callCocApi('/clans/{tag}');
    if (result.success) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'live', data: result.data }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo_fallback', error: result.error, data: demoClan }));
    }
  }

  if (pathname === '/api/members') {
    if (config.demoMode) {
      const enriched = enrichMembers(demoMembers);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo', data: enriched, count: enriched.length }));
    }

    const result = await callCocApi('/clans/{tag}/members');
    if (result.success && result.data && result.data.items) {
      try {
        fs.writeFileSync(path.join(__dirname, 'data', 'liveMembers.json'), JSON.stringify(result.data, null, 2));
      } catch (e) {}
      const enriched = enrichMembers(result.data.items);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'live', data: enriched, count: enriched.length }));
    } else {
      let fallbackList = demoMembers;
      try {
        const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'liveMembers.json'), 'utf8'));
        if (saved && saved.items && saved.items.length) fallbackList = saved.items;
      } catch (e) {}
      const enriched = enrichMembers(fallbackList);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo_fallback', error: result.error, data: enriched, count: enriched.length }));
    }
  }

  if (pathname === '/api/war') {
    if (config.demoMode) {
      const analyzed = analyzeWar(demoCurrentWar);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo', data: analyzed }));
    }

    const result = await callCocApi('/clans/{tag}/currentwar');
    if (result.success) {
      try {
        fs.writeFileSync(path.join(__dirname, 'data', 'liveWar.json'), JSON.stringify(result.data, null, 2));
      } catch (e) {}
      const analyzed = analyzeWar(result.data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'live', data: analyzed }));
    } else {
      let fallbackWar = demoCurrentWar;
      try {
        const savedWar = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'liveWar.json'), 'utf8'));
        if (savedWar && savedWar.clan) fallbackWar = savedWar;
      } catch (e) {}
      const analyzed = analyzeWar(fallbackWar);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo_fallback', error: result.error, data: analyzed }));
    }
  }

  if (pathname === '/api/warlog') {
    if (config.demoMode) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo', data: demoWarLog }));
    }

    const result = await callCocApi('/clans/{tag}/warlog');
    if (result.success && result.data && result.data.items) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'live', data: result.data.items }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ source: 'demo_fallback', error: result.error, data: demoWarLog }));
    }
  }

  if (pathname === '/api/export/csv') {
    // Generate CSV of members
    let members = demoMembers;
    if (!config.demoMode && config.apiToken) {
      const result = await callCocApi('/clans/{tag}/members');
      if (result.success && result.data && result.data.items) {
        members = result.data.items;
      }
    }

    const enriched = enrichMembers(members);
    const headers = ['Rank', 'Name', 'Tag', 'Role', 'TownHall', 'Trophies', 'Donated', 'Received', 'Ratio', 'Status'];
    const rows = enriched.map(m => [
      m.clanRank || '-',
      `"${(m.name || '').replace(/"/g, '""')}"`,
      m.tag,
      m.role,
      m.townHallLevel || '-',
      m.trophies || 0,
      m.donations || 0,
      m.donationsReceived || 0,
      m.donationRatio,
      m.donationStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clan-roster-${Date.now()}.csv"`
    });
    return res.end(csvContent);
  }

  // --- Static File Serving ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    return fs.createReadStream(filePath).pipe(res);
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`⚔️  Clash Nexus // Clan Telemetry & War Intelligence Hub is running!`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`⚡ Mode: ${config.demoMode ? 'DEMO (Sample Data)' : 'LIVE (Supercell API)'}`);
  console.log(`🛡️ Clan Tag: ${config.clanTag}`);
  console.log(`=======================================================`);

  // Start Background War & Discord Monitor
  const monitor = new ClanWarMonitor(callCocApi, () => config);
  monitor.start(45000); // Poll every 45 seconds
});
