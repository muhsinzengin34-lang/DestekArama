# 🌾 HayDay Malzemeleri - DestekArama Entegrasyon Kılavuzu

## 📋 Genel Bakış
Bu kılavuz, DestekArama canlı destek sistemini HayDay Malzemeleri web sitenize nasıl entegre edeceğinizi açıklar.

## 🚀 Hızlı Başlangıç

### 1. Basit Entegrasyon (Önerilen)
Web sitenizin HTML dosyasında `</body>` etiketinden hemen önce şu kodu ekleyin:

```html
<!-- DestekArama Chat Widget -->
<script src="https://your-destek-arama.onrender.com/chat-widget.js"></script>
<script>
  // HayDay temalı chat widget'ı başlat
  initChatWidget({
    position: 'bottom-right',
    theme: 'hayday',
    language: 'tr'
  });
</script>
```

### 2. Özelleştirme Seçenekleri

```javascript
initChatWidget({
  position: 'bottom-right',    // bottom-left, top-right, top-left
  theme: 'hayday',            // hayday, default
  language: 'tr',             // tr, en
  autoOpen: false,            // Otomatik açılsın mı?
  showOnPages: ['/', '/iletisim', '/destek'] // Hangi sayfalarda gösterilsin
});
```

## 🎨 HayDay Teması Özellikleri

### Renkler
- **Ana Renk**: Yeşil (#4CAF50) - HayDay çiftlik teması
- **Vurgu Rengi**: Sarı (#FFC107) - Altın/hasat teması  
- **Aksiyon Rengi**: Turuncu (#FF9800) - Enerji teması

### Özel Özellikler
- 🌾 Çiftlik emojisi header'da
- 📞 Telefon ikonu arama butonunda
- HayDay terminolojisi kullanımı
- Mobil uyumlu tasarım

## 📱 Mobil Uyumluluk
Widget otomatik olarak mobil cihazlarda optimize edilir:
- Ekran genişliğinin %90'ını kaplar
- Touch-friendly butonlar
- Responsive tasarım

## 🔧 Gelişmiş Entegrasyon

### WordPress için
```php
// functions.php dosyasına ekleyin
function add_destek_arama_widget() {
    ?>
    <script src="https://your-destek-arama.onrender.com/chat-widget.js"></script>
    <script>
      initChatWidget({
        position: 'bottom-right',
        theme: 'hayday',
        language: 'tr'
      });
    </script>
    <?php
}
add_action('wp_footer', 'add_destek_arama_widget');
```

### Shopify için
```liquid
<!-- theme.liquid dosyasının </body> etiketinden önce -->
<script src="https://your-destek-arama.onrender.com/chat-widget.js"></script>
<script>
  initChatWidget({
    position: 'bottom-right',
    theme: 'hayday',
    language: 'tr'
  });
</script>
```

## 📊 Admin Panel Özellikleri

### Ziyaretçi Takibi
- Gerçek zamanlı ziyaretçi listesi
- Sayfa bilgileri
- Coğrafi konum (opsiyonel)

### Telegram Entegrasyonu
- Yeni ziyaretçi bildirimleri
- Direkt admin panel linki
- Mobil yönetim

## 🔐 Güvenlik

### HTTPS Zorunluluğu
- WebRTC için HTTPS gereklidir
- SSL sertifikası otomatik (Render)

### Veri Koruma
- Mesajlar geçici olarak saklanır
- Kişisel veri şifreleme
- GDPR uyumlu

## 🛠️ Teknik Gereksinimler

### Sunucu Tarafı
- Node.js 18+
- WebSocket desteği
- HTTPS/SSL

### İstemci Tarafı
- Modern tarayıcılar (Chrome 60+, Firefox 55+, Safari 11+)
- WebRTC desteği
- JavaScript etkin

## 📞 Destek ve İletişim

### Teknik Destek
- GitHub Issues: [Repository Link]
- E-posta: [Destek E-postası]

### Özelleştirme Talepleri
- Özel tema tasarımı
- Ek dil desteği
- Entegrasyon yardımı

## 🔄 Güncelleme Notları

### v1.0.0
- HayDay teması eklendi
- Türkçe dil desteği
- Mobil optimizasyon
- Telegram entegrasyonu

---

**Not**: Bu entegrasyon kılavuzu HayDay Malzemeleri web sitesi için özel olarak hazırlanmıştır. Genel kullanım için ana dokümantasyonu inceleyin.