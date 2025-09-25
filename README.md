# Sıfır Maliyetli 1:1 WebRTC Sohbet Sistemi + Telegram Bildirimi

Bu proje, web sitenize entegre edebileceğiniz ücretsiz bir 1:1 ses/görüntü/yazı sohbet sistemi sunar. Kullanıcılar üye olmadan anında sohbet başlatabilir ve Telegram üzerinden bildirim alırsınız.

## 🚀 Özellikler

- **Sıfır Maliyet**: Tamamen ücretsiz servislerle çalışır
- **Anında Bildirim**: Telegram Bot API ile anlık bildirimler
- **WebRTC**: Peer-to-peer ses/görüntü araması
- **Fallback**: Medya başarısızsa otomatik metin sohbeti
- **Mobil Uyumlu**: iOS ve Android'de mükemmel çalışır
- **Telefon UI**: Modern telefon arayüzü tasarımı
- **Keep-Alive**: Sunucu sürekli aktif kalır

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- Telegram Bot Token
- Telegram Chat ID
- Ücretsiz hosting (Render, Railway, Heroku vb.)

## 🛠️ Kurulum

### 1. Projeyi İndirin

```bash
git clone <repository-url>
cd free-webrtc-telegram-chat
npm install
```

### 2. Telegram Bot Oluşturun

1. Telegram'da [@BotFather](https://t.me/botfather) ile konuşun
2. `/newbot` komutunu kullanarak yeni bot oluşturun
3. Bot token'ınızı kaydedin (örn: `123456789:ABCDEF...`)

### 3. Chat ID'nizi Bulun

**Yöntem 1: @userinfobot kullanın**
1. [@userinfobot](https://t.me/userinfobot) ile konuşun
2. `/start` yazın, size Chat ID'nizi verecek

**Yöntem 2: Manuel olarak bulun**
1. Botunuza herhangi bir mesaj gönderin
2. Tarayıcıda şu URL'yi açın: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. `chat.id` değerini bulun

### 4. Environment Variables Ayarlayın

`.env` dosyası oluşturun:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCDEF_your_bot_token_here
TELEGRAM_CHAT_ID=123456789
BASE_URL=https://your-domain.com
PORT=3000
```

### 5. Yerel Test

```bash
npm start
```

Tarayıcıda `http://localhost:3000` adresini açın.

## 🌐 Deployment (Ücretsiz Hosting)

### Render.com (Önerilen)

1. [Render.com](https://render.com) hesabı oluşturun
2. "New Web Service" seçin
3. GitHub repository'nizi bağlayın
4. Ayarlar:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: `.env` dosyanızdaki değerleri ekleyin

### Railway.app

1. [Railway.app](https://railway.app) hesabı oluşturun
2. "Deploy from GitHub" seçin
3. Environment variables ekleyin
4. Deploy edin

## ⏰ Keep-Alive Servisleri (Sunucu Uykuya Dalmasın)

Ücretsiz hosting servisleri genellikle 30 dakika hareketsizlik sonrası uyur. Bu sistem **3 farklı keep-alive yöntemi** sunar:

### 🔄 1. Dahili Self-Ping (Otomatik - Yeni!)

Sistem kendi kendini 14 dakikada bir ping atar:
- ✅ **Otomatik çalışır** - Ek kurulum gerektirmez
- ✅ **BASE_URL** production URL'si olduğunda aktif olur
- ✅ **14 dakika aralık** - 30 dakika timeout'undan önce
- ✅ **Sessiz çalışır** - Hata durumunda log yazmaz

### 🤖 2. Harici Monitoring Servisleri (Önerilen)

### UptimeRobot (Önerilen - 5 dakika ping)

1. [UptimeRobot.com](https://uptimerobot.com) hesabı oluşturun
2. "Add New Monitor" tıklayın
3. Ayarlar:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://your-domain.com/healthz`
   - **Monitoring Interval**: 5 minutes
   - **Monitor Name**: "WebRTC Chat Keep-Alive"

### Cron-job.org (4 dakika ping)

1. [Cron-job.org](https://cron-job.org) hesabı oluşturun
2. "Create cronjob" tıklayın
3. Ayarlar:
   - **URL**: `https://your-domain.com/healthz`
   - **Schedule**: `*/4 * * * *` (her 4 dakika)
   - **Title**: "WebRTC Keep-Alive"

### 🌐 3. Tarayıcı Tabanlı (Ziyaretçi Sayfası Açıkken)

Chat widget sayfası açık olduğunda otomatik ping gönderir:
- ✅ **Ziyaretçi sayfası açıkken** aktif
- ✅ **30 saniye aralık** - Çok sık ping
- ✅ **Ek kurulum gerektirmez**
- ⚠️ **Sadece sayfa açıkken** çalışır

## 🔧 Web Sitenize Entegrasyon

### HTML Entegrasyonu

Web sitenizin istediğiniz sayfasına şu kodu ekleyin:

```html
<!-- Chat Widget CSS -->
<link rel="stylesheet" href="https://your-domain.com/styles.css">

<!-- Chat Widget HTML -->
<button class="chat-fab" onclick="launchChat()">💬 Sohbet</button>

<div class="popup hidden" id="chatPopup">
  <div class="phone">
    <div class="phone-top">
      <span id="statusText">Admin'e bağlanıyor...</span>
      <button class="close" onclick="closeChat()">×</button>
    </div>
    <div class="phone-body">
      <video id="remoteVideo" autoplay playsinline></video>
      <video id="localVideo" class="localPiP" autoplay playsinline muted></video>
      <div class="messages" id="messages"></div>
      <form class="chatForm" id="chatForm">
        <input type="text" id="messageInput" placeholder="Mesajınızı yazın..." autocomplete="off">
        <button type="submit">Gönder</button>
      </form>
    </div>
    <div class="phone-bottom">
      <button class="ctl" id="callBtn" title="Sesli arama başlat">📞</button>
      <button class="ctl" id="videoBtn" title="Görüntülü arama başlat">📹</button>
      <button class="ctl" id="micBtn" title="Mikrofon aç/kapat">🎤</button>
      <button class="ctl" id="camBtn" title="Kamera aç/kapat">📷</button>
      <button class="ctl danger" id="endBtn" title="Aramayı sonlandır">📵</button>
    </div>
  </div>
</div>

<!-- Chat Widget JavaScript -->
<script src="https://your-domain.com/utils.js"></script>
<script src="https://your-domain.com/chat-widget.js"></script>
```

## 🐛 Sorun Giderme

### Telegram Bildirimi Gelmiyor

1. Bot token'ının doğru olduğundan emin olun
2. Chat ID'nin doğru olduğundan emin olun
3. Bota en az bir kez mesaj gönderdiğinizden emin olun
4. Server loglarını kontrol edin

### Ses/Görüntü Çalışmıyor

1. **HTTPS gerekli**: HTTP'de WebRTC çalışmaz
2. **Mikrofon/Kamera izni**: Tarayıcı izin vermiş olmalı
3. **NAT/Firewall**: Bazı ağlarda TURN server gerekebilir
4. **Fallback**: Medya çalışmazsa metin sohbet otomatik aktif olur

### Sunucu Uyuyor

1. Keep-alive servisinin çalıştığından emin olun
2. `/healthz` endpoint'inin erişilebilir olduğunu kontrol edin
3. Ping interval'ını 5 dakikadan az yapın

## 📊 Monitoring

### Health Check

Sistem sağlığını kontrol etmek için:

```bash
curl https://your-domain.com/healthz
```

Yanıt: `{"status":"ok","timestamp":"..."}`

## 🔒 Güvenlik

- **No PII Storage**: Kişisel bilgi saklanmaz
- **Ephemeral Rooms**: Odalar geçicidir, kalıcı değil
- **Rate Limiting**: Spam koruması mevcuttur
- **HTTPS Only**: Sadece güvenli bağlantılar

---

**🎉 Tebrikler!** Artık web sitenizde ücretsiz 1:1 sohbet sisteminiz hazır. Ziyaretçileriniz tek tıkla sizinle iletişime geçebilir!
