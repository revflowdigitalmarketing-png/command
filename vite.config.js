import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mergeStore(current, incoming) {
  const result = { ...current };

  // 1. History: merge array by entry id, keep newest first, cap at 300
  const existingHistory = Array.isArray(current.history) ? current.history : [];
  const incomingHistory = Array.isArray(incoming.history) ? incoming.history : [];
  const histMap = new Map();
  [...incomingHistory, ...existingHistory].forEach(h => {
    if (h && h.id && !histMap.has(h.id)) {
      histMap.set(h.id, h);
    }
  });
  result.history = Array.from(histMap.values())
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 300);

  // 2. Chat messages: merge by id
  const existingChat = Array.isArray(current.chat_messages) ? current.chat_messages : [];
  const incomingChat = Array.isArray(incoming.chat_messages) ? incoming.chat_messages : [];
  const chatMap = new Map();
  [...existingChat, ...incomingChat].forEach(m => {
    if (m && m.id && !chatMap.has(m.id)) chatMap.set(m.id, m);
  });
  result.chat_messages = Array.from(chatMap.values()).sort((a, b) => (a.time || 0) - (b.time || 0));

  // 3. Pending notifications
  if (Array.isArray(incoming.pending_chat_notifications)) {
    result.pending_chat_notifications = incoming.pending_chat_notifications;
  }

  // 3b. Pending deletion requests
  if (Array.isArray(incoming.pending_deletion_requests)) {
    result.pending_deletion_requests = incoming.pending_deletion_requests;
  } else if (Array.isArray(current.pending_deletion_requests)) {
    result.pending_deletion_requests = current.pending_deletion_requests;
  }

  // 4. Deleted item IDs (if client explicitly deleted items, biz, clients)
  const deletedItemIds = new Set(Array.isArray(incoming.deletedItemIds) ? incoming.deletedItemIds : []);
  const deletedBizIds = new Set(Array.isArray(incoming.deletedBizIds) ? incoming.deletedBizIds : []);
  const deletedClientIds = new Set(Array.isArray(incoming.deletedClientIds) ? incoming.deletedClientIds : []);

  // 5. Shared Businesses master sync:
  const bizMap = new Map();
  // 1. Seed from current businesses
  (Array.isArray(current.businesses) ? current.businesses : []).forEach(b => {
    if (b && b.id && !deletedBizIds.has(b.id)) {
      bizMap.set(b.id, { ...b });
    }
  });
  // 2. Incoming root businesses
  (Array.isArray(incoming.businesses) ? incoming.businesses : []).forEach(b => {
    if (b && b.id && !deletedBizIds.has(b.id)) {
      const prev = bizMap.get(b.id);
      if (!prev || (b.updated || 0) >= (prev.updated || 0)) {
        bizMap.set(b.id, { ...(prev || {}), ...b });
      }
    }
  });
  // 3. Incoming profile settings businesses
  ['rahul', 'sri-chandana', 'adithya'].forEach(pid => {
    const incBizs = incoming[`settings_${pid}`] && incoming[`settings_${pid}`].businesses;
    if (Array.isArray(incBizs)) {
      incBizs.forEach(b => {
        if (b && b.id && !deletedBizIds.has(b.id)) {
          const prev = bizMap.get(b.id);
          if (!prev || (b.updated || 0) >= (prev.updated || 0)) {
            bizMap.set(b.id, { ...(prev || {}), ...b });
          }
        }
      });
    }
  });
  let allBusinesses = Array.from(bizMap.values()).filter(b => !deletedBizIds.has(b.id));
  // Enforce members array and ordering (RevFlow, WEBLIT, LARPING)
  allBusinesses.forEach(b => {
    if (!b.members || !Array.isArray(b.members) || b.members.length === 0) {
      b.members = (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping'))
        ? ['rahul', 'sri-chandana']
        : ['rahul', 'sri-chandana', 'adithya'];
    }
  });
  const orderRank = { 'biz-revflow': 1, 'biz-weblit': 2, 'biz-larping': 3 };
  allBusinesses.sort((a, b) => (orderRank[a.id] || 99) - (orderRank[b.id] || 99));

  // 6. Shared Clients master sync:
  const clientMap = new Map();
  // 1. Seed from current clients
  (Array.isArray(current.clients) ? current.clients : []).forEach(c => {
    if (c && c.id && !deletedClientIds.has(c.id)) {
      clientMap.set(c.id, { ...c });
    }
  });
  // 2. Incoming root clients
  (Array.isArray(incoming.clients) ? incoming.clients : []).forEach(c => {
    if (c && c.id && !deletedClientIds.has(c.id)) {
      const prev = clientMap.get(c.id);
      if (!prev || (c.updated || 0) >= (prev.updated || 0)) {
        clientMap.set(c.id, { ...(prev || {}), ...c });
      }
    }
  });
  // 3. Incoming profile settings clients
  ['rahul', 'sri-chandana', 'adithya'].forEach(pid => {
    const incCls = incoming[`settings_${pid}`] && incoming[`settings_${pid}`].clients;
    if (Array.isArray(incCls)) {
      incCls.forEach(c => {
        if (c && c.id && !deletedClientIds.has(c.id)) {
          const prev = clientMap.get(c.id);
          if (!prev || (c.updated || 0) >= (prev.updated || 0)) {
            clientMap.set(c.id, { ...(prev || {}), ...c });
          }
        }
      });
    }
  });
  let allClients = Array.from(clientMap.values()).filter(c => !deletedClientIds.has(c.id));

  // 7. Profile Settings & Items
  ['rahul', 'sri-chandana', 'adithya'].forEach(pid => {
    const curSet = current[`settings_${pid}`] || {};
    const incSet = incoming[`settings_${pid}`] || {};
    const mergedSettings = { ...curSet, ...incSet };

    // Synchronize businesses: only include businesses this profile is doing
    mergedSettings.businesses = allBusinesses.filter(b => {
      const m = b.members || (b.id === 'biz-larping' || (b.name && b.name.toLowerCase() === 'larping') ? ['rahul', 'sri-chandana'] : ['rahul', 'sri-chandana', 'adithya']);
      return m.includes(pid);
    });

    // Synchronize clients: only include clients if their business is in this profile
    const pidBizIds = new Set(mergedSettings.businesses.map(b => b.id));
    mergedSettings.clients = allClients.filter(c => {
      if (c.biz) return pidBizIds.has(c.biz);
      return true;
    }).map(c => {
      if (c.shares && c.shares[pid] !== undefined && c.shares[pid] !== null && c.shares[pid] !== '') {
        return { ...c, yourShare: Number(c.shares[pid]) || 0 };
      }
      return c;
    });

    result[`settings_${pid}`] = mergedSettings;

    // Items for profile
    const curItems = Array.isArray(current[`items_${pid}`]) ? current[`items_${pid}`] : [];
    const incItems = Array.isArray(incoming[`items_${pid}`]) ? incoming[`items_${pid}`] : null;

    if (incItems) {
      const itemMap = new Map();
      curItems.forEach(i => {
        if (i && i.id && !deletedItemIds.has(i.id)) itemMap.set(i.id, i);
      });
      incItems.forEach(i => {
        if (i && i.id && !deletedItemIds.has(i.id)) {
          const prev = itemMap.get(i.id);
          if (!prev || (i.updated || 0) >= (prev.updated || 0)) {
            itemMap.set(i.id, i);
          }
        }
      });
      result[`items_${pid}`] = Array.from(itemMap.values());
    } else {
      result[`items_${pid}`] = curItems.filter(i => i && i.id && !deletedItemIds.has(i.id));
    }

    // Crushers for profile
    if (incoming[`crushers_${pid}`]) {
      result[`crushers_${pid}`] = incoming[`crushers_${pid}`];
    } else if (current[`crushers_${pid}`]) {
      result[`crushers_${pid}`] = current[`crushers_${pid}`];
    }
  });

  result.businesses = allBusinesses;
  result.clients = allClients;

  // 8. Custom branding & banners
  if (incoming.app_name) result.app_name = incoming.app_name;
  if (incoming.custom_icon) result.custom_icon = incoming.custom_icon;
  ['rahul', 'sri-chandana', 'adithya'].forEach(pid => {
    if (incoming[`banner_${pid}`]) result[`banner_${pid}`] = incoming[`banner_${pid}`];
  });

  return result;
}

function dashboardStorePlugin() {
  const dataDir = path.resolve(__dirname, 'data');
  const dataFile = path.resolve(dataDir, 'dashboard-store.json');

  function ensureFile() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, JSON.stringify({}, null, 2), 'utf-8');
    }
  }

  function handleApi(req, res) {
    ensureFile();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET') {
      try {
        const raw = fs.readFileSync(dataFile, 'utf-8') || '{}';
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(raw);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const incoming = JSON.parse(body || '{}');
          let current = {};
          try {
            current = JSON.parse(fs.readFileSync(dataFile, 'utf-8') || '{}');
          } catch {}
          const merged = mergeStore(current, incoming);
          merged.lastUpdated = Date.now();
          fs.writeFileSync(dataFile, JSON.stringify(merged, null, 2), 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, lastUpdated: merged.lastUpdated }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end('Method Not Allowed');
  }

  return {
    name: 'dashboard-store-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/data') {
          handleApi(req, res);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/data') {
          handleApi(req, res);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [dashboardStorePlugin()],
  server: {
    port: 5173,
    host: true
  }
});
