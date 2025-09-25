import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  BASE_URL = 'http://localhost:3000',
  PORT = 3000
} = process.env;

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Health checks for uptime services
app.get(['/healthz', '/ping'], (req, res) => res.status(200).send('ok'));

// Optional REST notify (client may call this once room is created)
app.post('/notify', async (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  const ok = await notifyTelegram(roomId);
  res.json({ ok });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** roomId -> Set<WebSocket> */
const rooms = new Map();
const FIXED_ROOM_ID = 'destek-odasi';
const MAX_ROOM_CAPACITY = 2;

wss.on('connection', (ws) => {
  console.log('🔗 SERVER DEBUG: New WebSocket connection established');
  let currentRoom = null;

  ws.on('message', async (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }

    if (msg.type === 'join') {
      const { role } = msg;
      const roomId = FIXED_ROOM_ID; // Her zaman sabit oda kullan
      
      console.log(`🔍 DEBUG: ${role} trying to join fixed room: ${roomId}`);
      
      // Oda kapasitesi kontrolü
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      
      const currentUsers = rooms.get(roomId).size;
      console.log(`👥 DEBUG: Room ${roomId} currently has ${currentUsers} users`);
      
      // Kapasite kontrolü
      if (currentUsers >= MAX_ROOM_CAPACITY) {
        console.log(`🚫 DEBUG: Room ${roomId} is full (${currentUsers}/${MAX_ROOM_CAPACITY})`);
        ws.send(JSON.stringify({ 
          type: 'room_full', 
          message: 'Destek şu anda meşgul. Lütfen birkaç dakika sonra tekrar deneyin.' 
        }));
        ws.close();
        return;
      }
      
      currentRoom = roomId;
      rooms.get(roomId).add(ws);
      
      console.log(`✅ DEBUG: ${role} successfully joined room: ${roomId} (${rooms.get(roomId).size}/${MAX_ROOM_CAPACITY})`);
      
      // İlk müşteri geldiğinde Telegram bildirimi gönder
      if (role === 'caller' && rooms.get(roomId).size === 1) {
        console.log(`📱 DEBUG: Sending Telegram notification for new customer in room: ${roomId}`);
        await notifyTelegram(roomId);
      }
      
      broadcast(roomId, { type: 'peers', count: rooms.get(roomId).size });
      return;
    }

    // Bridge signaling/chat messages within the room
    if (currentRoom && rooms.has(currentRoom)) {
      for (const client of rooms.get(currentRoom)) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(msg));
        }
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      if (rooms.get(currentRoom).size === 0) rooms.delete(currentRoom);
      else broadcast(currentRoom, { type: 'peers', count: rooms.get(currentRoom).size });
    }
  });
});

function broadcast(roomId, obj) {
  const set = rooms.get(roomId);
  if (!set) return;
  const s = JSON.stringify(obj);
  for (const client of set) {
    if (client.readyState === 1) client.send(s);
  }
}

async function notifyTelegram(roomId) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
    if (TELEGRAM_BOT_TOKEN === 'demo' || TELEGRAM_CHAT_ID === 'demo') return false;
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    // Sabit oda sistemi - artık room parametresi gerektirmiyor
    const adminUrl = `${BASE_URL}/admin.html`;
    const text = `🌾 *HayDay Malzemeleri* - Yeni müşteri destek odasında bekliyor!\n\n📞 *Destek Odası:* \`${roomId}\`\n🔗 *Admin Panel:* ${adminUrl}\n\n⚡ Hemen yanıtlayın!`;
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: TELEGRAM_CHAT_ID, 
        text, 
        parse_mode: 'Markdown',
        disable_web_page_preview: false 
      })
    });
    
    if (!resp.ok) {
      console.log('Telegram notification failed:', await resp.text());
      return false;
    }
    
    console.log(`✅ Telegram notification sent for room: ${roomId}`);
    return true;
  } catch (e) {
    console.log('Telegram notify error:', e.message);
    return false;
  }
}

const PORT_NUM = parseInt(PORT);
server.listen(PORT_NUM, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Server running on http://localhost:${PORT_NUM}`);
  }
});

// Keep-alive system for free hosting services
if (BASE_URL && BASE_URL !== 'http://localhost:3000') {
  const keepAlive = () => {
    fetch(`${BASE_URL}/ping`)
      .then(() => console.log('Keep-alive ping sent'))
      .catch(() => {}); // Silent fail
  };
  
  // Ping every 14 minutes (840 seconds) to prevent 30min timeout
  setInterval(keepAlive, 14 * 60 * 1000);
  console.log('Keep-alive system activated for:', BASE_URL);
}
