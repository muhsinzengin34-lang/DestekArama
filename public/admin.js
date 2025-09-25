import { qs } from './utils.js';

// Sabit oda sistemi - artık URL'den oda ID almıyoruz
const FIXED_ROOM_ID = 'destek-odasi';
const roomId = FIXED_ROOM_ID;

const remoteVideo = document.getElementById('remoteVideo');
const localVideo  = document.getElementById('localVideo');
const btnAnsAudio = document.getElementById('btnAnsAudio');
const btnAnsVideo = document.getElementById('btnAnsVideo');
const btnMic = document.getElementById('btnMic');
const btnCam = document.getElementById('btnCam');
const btnEnd = document.getElementById('btnEnd');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const msgInput = document.getElementById('msgInput');
const roomInfo = document.getElementById('roomInfo');

// Sabit oda bilgisini göster
roomInfo.textContent = `Destek Odası: ${roomId}`;
log('Destek odası hazır, müşteri bekleniyor...', 'system');

let ws, pc, dc, localStream;
let connectionState = 'disconnected';
let mediaState = { audio: false, video: false };
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

// Sabit oda sisteminde otomatik bağlan
connectWS();

function connectWS() {
  console.log('🔗 ADMIN WS DEBUG: Attempting to connect WebSocket');
  console.log('🔗 ADMIN WS DEBUG: Room ID:', roomId);
  const wsUrl = (location.origin.startsWith('https') ? 'wss://' : 'ws://') + location.host + '/ws';
  console.log('🔗 ADMIN WS DEBUG: WebSocket URL:', wsUrl);
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('🔗 ADMIN WS DEBUG: WebSocket connection opened');
    connectionState = 'connected';
    reconnectAttempts = 0;
    const joinMessage = { type:'join', roomId, role:'callee' };
    console.log('🔗 ADMIN WS DEBUG: Sending join message:', joinMessage);
    ws.send(JSON.stringify(joinMessage));
    log('Odaya bağlandı, ziyaretçi bekleniyor...', 'system');
  };
  
  ws.onmessage = onSignal;
  
  ws.onclose = () => {
    console.log('🔗 ADMIN WS DEBUG: WebSocket connection closed');
    if (connectionState !== 'disconnected') {
      connectionState = 'reconnecting';
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`🔗 ADMIN WS DEBUG: Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
        log(`Yeniden bağlanıyor... (${reconnectAttempts}/${maxReconnectAttempts})`, 'system');
        setTimeout(connectWS, 2000 * reconnectAttempts);
      } else {
        console.log('🔗 ADMIN WS DEBUG: Max reconnect attempts reached');
        log('Bağlantı kesildi. Lütfen sayfayı yenileyin.', 'system');
      }
    }
  };
  
  ws.onerror = (error) => {
    console.log('🔗 ADMIN WS DEBUG: WebSocket error:', error);
    log('WebSocket bağlantı hatası', 'system');
  };
}

async function ensurePC() {
  if (pc) return;
  
  pc = new RTCPeerConnection({ iceServers });
  pc.onicecandidate = e => {
    if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
      send({ type:'candidate', candidate:e.candidate });
    }
  };
  
  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
    log('Ziyaretçinin medya akışı alındı', 'system');
  };
  
  pc.ondatachannel = (e) => attachDC(e.channel);
  
  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === 'connected') {
      log('WebRTC bağlantısı kuruldu', 'system');
    } else if (state === 'disconnected' || state === 'failed') {
      log('Medya bağlantısı kesildi, metin sohbet aktif', 'system');
    }
  };
}

function attachDC(channel) {
  dc = channel;
  dc.onopen = () => log('Metin sohbet kanalı açık', 'system');
  dc.onmessage = (e) => log(e.data, 'them');
  dc.onerror = (e) => {
    log('Metin sohbet hatası, WebSocket üzerinden gönderilecek', 'system');
  };
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

btnAnsAudio.onclick = () => answer(false);
btnAnsVideo.onclick = () => answer(true);
btnMic.onclick = () => toggleTrack('audio');
btnCam.onclick = () => toggleTrack('video');
btnEnd.onclick = endAll;

function log(text, who='you') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function answer(withVideo) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log('Bağlantı yok, medya başlatılamıyor', 'system');
    return;
  }
  
  await ensurePC();
  
  try {
    const constraints = { audio: true, video: withVideo };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    localVideo.srcObject = localStream;
    
    // Update UI state
    mediaState.audio = true;
    mediaState.video = withVideo;
    btnMic.classList.add('active');
    if (withVideo) btnCam.classList.add('active');
    
    // Disable answer buttons after starting
    btnAnsAudio.disabled = true;
    btnAnsVideo.disabled = true;
    
    log(`${withVideo ? 'Görüntülü' : 'Sesli'} yanıt başlatıldı`, 'system');
    
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
  }
}

async function onSignal(ev) {
  const msg = JSON.parse(ev.data);
  
  if (msg.type === 'room_full') {
    log(msg.message, 'system');
    log('Oda dolu - bağlantı kapatılıyor', 'system');
    return;
  }
  
  if (msg.type === 'peers') {
    const count = msg.count;
    log(`Odadaki kişi sayısı: ${count}`, 'system');
  }
  
  if (msg.type === 'chat') log(msg.text, 'them');

  if (msg.type === 'offer') {
    await ensurePC();
    try {
      await pc.setRemoteDescription({ type:'offer', sdp: msg.sdp });
      const ansDesc = await pc.createAnswer();
      await pc.setLocalDescription(ansDesc);
      send({ type:'answer', sdp: ansDesc.sdp });
      log('Ziyaretçinin arama teklifini kabul etti', 'system');
    } catch (e) {
      log('WebRTC offer işleme hatası', 'system');
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

function toggleTrack(kind) {
  if (!localStream) {
    log('Önce ses/görüntü yanıtını başlatın', 'system');
    return;
  }
  
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
  
  // Reset UI
  btnMic.classList.remove('active');
  btnCam.classList.remove('active');
  btnAnsAudio.disabled = false;
  btnAnsVideo.disabled = false;
  mediaState = { audio: false, video: false };
  
  log('Görüşme sonlandırıldı', 'system');
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ roomId, ...obj }));
  }
}
