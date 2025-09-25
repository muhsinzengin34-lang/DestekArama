import { uuid } from './utils.js';

const popup = document.getElementById('chat-popup');
const launch = document.getElementById('chat-launch');
const closeBtn = document.getElementById('closePopup');
const statusEl = document.getElementById('status');
const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const btnCall = document.getElementById('btnCall');
const btnVideo = document.getElementById('btnVideo');
const btnMic = document.getElementById('btnMic');
const btnCam = document.getElementById('btnCam');
const btnEnd = document.getElementById('btnEnd');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const msgInput = document.getElementById('msgInput');

let roomId, ws, pc, dc, localStream;
let connectionState = 'disconnected';
let mediaState = { audio: false, video: false };
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

// Chat widget başlatma fonksiyonu
function initChatWidget(options = {}) {
    const config = {
        position: options.position || 'bottom-right',
        theme: options.theme || 'default',
        language: options.language || 'tr',
        ...options
    };
    
    createChatWidget(config);
}

function createChatWidget(config = {}) {
    // Tema CSS'ini yükle
    if (config.theme === 'hayday') {
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = '/hayday-theme.css';
        document.head.appendChild(themeLink);
    }
    
    // Dil metinleri
    const texts = {
        tr: {
            header: config.theme === 'hayday' ? 'HayDay Destek' : 'Canlı Destek',
            waiting: 'Destek temsilcisi bekleniyor...',
            placeholder: 'Mesajınızı yazın...',
            callButton: config.theme === 'hayday' ? 'Çiftçi Desteği Ara' : 'Sesli Görüşme Başlat'
        },
        en: {
            header: 'Live Support',
            waiting: 'Waiting for support representative...',
            placeholder: 'Type your message...',
            callButton: 'Start Voice Call'
        }
    };
    
    const t = texts[config.language] || texts.tr;
    
    // Chat widget container oluştur
    const widget = document.createElement('div');
    widget.className = `chat-widget ${config.theme ? config.theme + '-theme' : ''}`;
    widget.innerHTML = `
        <div class="chat-header">
            <span>${t.header}</span>
            <button class="close-btn">&times;</button>
        </div>
        <div class="status-message">${t.waiting}</div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-container">
            <input type="text" class="chat-input" placeholder="${t.placeholder}" id="chatInput">
            <button class="call-button" id="startCall">${t.callButton}</button>
        </div>
        <div class="chat-footer">
            <a href="https://www.haydaymalzeme.com" target="_blank" class="website-link">
                🌾 www.haydaymalzeme.com
            </a>
        </div>
    `;
    
    // Pozisyon ayarla
    if (config.position) {
        const positions = config.position.split('-');
        if (positions.includes('bottom')) widget.style.bottom = '20px';
        if (positions.includes('top')) widget.style.top = '20px';
        if (positions.includes('right')) widget.style.right = '20px';
        if (positions.includes('left')) widget.style.left = '20px';
    }
    
    document.body.appendChild(widget);
}

launch.onclick = async () => {
  console.log('🚀 LAUNCH DEBUG: Chat button clicked!');
  // Check if room ID is provided in URL (from admin panel link)
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomId = urlParams.get('room');
  
  console.log('🔍 WIDGET DEBUG: Current URL:', window.location.href);
  console.log('🔍 WIDGET DEBUG: URL search params:', window.location.search);
  console.log('🔍 WIDGET DEBUG: Extracted room ID:', urlRoomId);
  
  if (urlRoomId) {
    // Use room ID from URL (admin panel link)
    roomId = urlRoomId;
    console.log('✅ WIDGET DEBUG: Using URL room ID:', roomId);
    updateStatus('🔄 Admin tarafından yönlendirildiniz, bağlanıyor…');
  } else {
    // Create new room ID for new visitors
    roomId = uuid();
    console.log('🆕 WIDGET DEBUG: Created new room ID:', roomId);
    updateStatus('🔄 Admin\'e bağlanıyor…');
    // Optional REST notify (server will also auto-notify on join when role=caller)
    fetch('/notify', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ roomId }) }).catch(()=>{});
  }
  
  popup.classList.remove('hidden');
  connectWS();
  // Keep-alive ping while page open (does not replace external uptime pings)
  setInterval(()=>fetch('/ping').catch(()=>{}), 240000); // 4 min
};

closeBtn.onclick = endAll;
btnEnd.onclick = endAll;

function endAll() {
  connectionState = 'disconnected';
  if (dc) try{dc.close()}catch(e){}
  if (pc) try{pc.close()}catch(e){}
  if (ws) try{ws.close()}catch(e){}
  if (localStream) {
    localStream.getTracks().forEach(t=>t.stop());
    localStream = null;
  }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  popup.classList.add('hidden');
  resetUI();
}

function resetUI() {
  btnMic.classList.remove('active');
  btnCam.classList.remove('active');
  btnCall.disabled = false;
  btnVideo.disabled = false;
  mediaState = { audio: false, video: false };
}

function updateStatus(text) {
  statusEl.innerHTML = `${text}<br><small style="color: #666; font-size: 11px; margin-top: 4px; display: block;">🌾 <a href="https://www.haydaymalzeme.com" target="_blank" style="color: #4CAF50; text-decoration: none;">www.haydaymalzeme.com</a></small>`;
  log(`Durum: ${text}`, 'system');
}

function connectWS() {
  const wsUrl = (location.origin.startsWith('https') ? 'wss://' : 'ws://') + location.host + '/ws';
  console.log('🔍 WS DEBUG: Attempting to connect to:', wsUrl);
  console.log('🔍 WS DEBUG: Room ID for connection:', roomId);
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WS DEBUG: WebSocket connection opened');
    connectionState = 'connected';
    reconnectAttempts = 0;
    const joinMessage = { type:'join', roomId, role:'caller' };
    console.log('📤 WS DEBUG: Sending join message:', joinMessage);
    ws.send(JSON.stringify(joinMessage));
    updateStatus('✅ Bağlantı hazır! Mesaj yazın veya arama başlatın, admin hemen size dönüş sağlayacak');
  };
  
  ws.onmessage = onSignal;
  
  ws.onclose = (event) => {
    console.log('❌ WS DEBUG: WebSocket connection closed:', event.code, event.reason);
    if (connectionState !== 'disconnected') {
      connectionState = 'reconnecting';
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        updateStatus(`🔄 Yeniden bağlanıyor... (${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connectWS, 2000 * reconnectAttempts);
      } else {
        updateStatus('❌ Bağlantı kesildi. Lütfen sayfayı yenileyin.');
        log('Bağlantı kurulamadı. Sadece metin sohbet kullanılabilir.', 'system');
      }
    }
  };
  
  ws.onerror = (error) => {
    console.log('⚠️ WS DEBUG: WebSocket error:', error);
    updateStatus('⚠️ Bağlantı hatası - Tekrar deneniyor...');
  };
}

async function setupPC() {
  if (pc) return;
  
  pc = new RTCPeerConnection({ iceServers });
  pc.onicecandidate = e => {
    if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
      send({ type:'candidate', candidate:e.candidate });
    }
  };
  
  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
    updateStatus('📞 Görüşme başladı');
  };
  
  pc.ondatachannel = (e) => attachDC(e.channel);
  
  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === 'connected') {
      updateStatus('🎥 WebRTC bağlantısı kuruldu');
    } else if (state === 'disconnected' || state === 'failed') {
      updateStatus('💬 Medya bağlantısı kesildi, metin sohbet aktif');
      log('Ses/görüntü bağlantısı kesildi. Metin sohbet kullanılabilir.', 'system');
    }
  };
  
  // Caller creates data channel
  dc = pc.createDataChannel('chat');
  attachDC(dc);
}

function attachDC(channel) {
  dc = channel;
  dc.onopen = () => {
    log('Metin sohbet hazır', 'system');
    updateStatus('💬 Metin sohbet aktif - Admin size hemen yanıt verecek');
  };
  dc.onmessage = (e) => log(e.data, 'them');
  dc.onerror = (e) => {
    log('Metin sohbet hatası, WebSocket üzerinden gönderilecek', 'system');
  };
}

function log(text, who='you') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

chatForm.onsubmit = (e) => {
  e.preventDefault();
  const txt = msgInput.value.trim();
  if (!txt) return;
  
  // Try DataChannel first, fallback to WebSocket
  if (dc && dc.readyState === 'open') {
    dc.send(txt);
  } else if (ws && ws.readyState === WebSocket.OPEN) {
    send({ type:'chat', text: txt });
  } else {
    log('Bağlantı yok, mesaj gönderilemedi', 'system');
    return;
  }
  
  log(txt, 'you');
  msgInput.value = '';
};

btnCall.onclick = () => startCall(false);
btnVideo.onclick = () => startCall(true);

async function startCall(withVideo) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log('Bağlantı yok, arama başlatılamıyor', 'system');
    return;
  }
  
  await setupPC();
  
  try {
    // Request permissions with user-friendly error handling
    const constraints = { audio: true, video: withVideo };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    localVideo.srcObject = localStream;
    
    // Update UI state
    mediaState.audio = true;
    mediaState.video = withVideo;
    btnMic.classList.add('active');
    if (withVideo) btnCam.classList.add('active');
    
    updateStatus('📞 Arama başlatılıyor… Admin bilgilendirildi');
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type:'offer', sdp: offer.sdp });
    
    // Disable call buttons after starting
    btnCall.disabled = true;
    btnVideo.disabled = true;
    
  } catch (e) {
    let errorMsg = 'Mikrofon/kamera erişimi reddedildi veya kullanılamıyor.';
    
    if (e.name === 'NotAllowedError') {
      errorMsg = 'Mikrofon/kamera izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.';
    } else if (e.name === 'NotFoundError') {
      errorMsg = 'Mikrofon/kamera bulunamadı.';
    } else if (e.name === 'NotReadableError') {
      errorMsg = 'Mikrofon/kamera başka bir uygulama tarafından kullanılıyor.';
    }
    
    log(errorMsg, 'system');
    updateStatus('⚠️ Kamera/mikrofon erişimi reddedildi - Metin sohbet kullanılabilir');
  }
}

btnMic.onclick = () => toggleTrack('audio');
btnCam.onclick = () => toggleTrack('video');

function toggleTrack(kind) {
  if (!localStream) return;
  
  const track = localStream.getTracks().find(t => t.kind === kind);
  if (!track) return;
  
  track.enabled = !track.enabled;
  mediaState[kind] = track.enabled;
  
  // Update UI
  const btn = kind === 'audio' ? btnMic : btnCam;
  if (track.enabled) {
    btn.classList.add('active');
    btn.title = kind === 'audio' ? 'Mikrofonu kapat' : 'Kamerayı kapat';
  } else {
    btn.classList.remove('active');
    btn.title = kind === 'audio' ? 'Mikrofonu aç' : 'Kamerayı aç';
  }
  
  log(`${kind === 'audio' ? 'Mikrofon' : 'Kamera'} ${track.enabled ? 'açıldı' : 'kapatıldı'}`, 'system');
}

async function onSignal(ev) {
  const msg = JSON.parse(ev.data);
  
  if (msg.type === 'peers') {
    const count = msg.count;
    if (count > 1) {
      updateStatus(`🟢 Admin bağlandı (${count} kişi)`);
      } else {
        updateStatus('💬 Admin bekleniyor... Mesaj yazabilir veya arama başlatabilirsiniz');
      }
  }
  
  if (msg.type === 'chat') log(msg.text, 'them');
  
  if (msg.type === 'answer') {
    if (!pc) return;
    try {
      await pc.setRemoteDescription({ type:'answer', sdp: msg.sdp });
      updateStatus('✅ Bağlantı kuruldu - Sohbet başlayabilir');
    } catch (e) {
      log('WebRTC bağlantı hatası, metin sohbet kullanılabilir', 'system');
    }
  }
  
  if (msg.type === 'candidate' && pc) {
    try { 
      await pc.addIceCandidate(msg.candidate); 
    } catch (e) {
      // ICE candidate error - connection may still work
    }
  }
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ roomId, ...obj }));
  }
}
