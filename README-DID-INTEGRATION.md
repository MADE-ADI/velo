# 🤖 D-ID AI Agent Integration

Panduan lengkap untuk mengintegrasikan D-ID AI Agent ke dalam aplikasi web Anda.

## 📋 Prerequisites

### 1. Setup D-ID Studio Account
1. Login ke [D-ID Studio](https://studio.d-id.com)
2. Buat Agent baru dengan:
   - Pilih gambar/foto untuk avatar
   - Pilih voice/suara
   - Konfigurasi personality dan knowledge base
   - Setup starter messages (opsional)

### 2. Dapatkan Credentials
1. Di D-ID Studio, buka gallery Agents
2. Hover ke Agent yang sudah dibuat
3. Klik tombol `[...]` → `</> Embed`
4. Setup **allowed domains** (contoh: `http://localhost:3000`)
5. Copy `data-client-key` dan `data-agent-id`

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
npm install @d-id/client-sdk --legacy-peer-deps
```

### 2. Setup Environment Variables
Buat file `.env.local` di root project:
```env
# D-ID Configuration
NEXT_PUBLIC_DID_CLIENT_KEY=your_client_key_here
NEXT_PUBLIC_DID_AGENT_ID=your_agent_id_here

# Optional: D-ID Base URL
NEXT_PUBLIC_DID_BASE_URL=https://api.d-id.com
```

⚠️ **Penting**: Ganti `your_client_key_here` dan `your_agent_id_here` dengan nilai sebenarnya dari D-ID Studio.

### 3. Struktur File yang Ditambahkan
```
├── lib/
│   └── d-id-service.ts          # Service untuk mengelola D-ID API
├── hooks/
│   └── use-did-agent.ts         # React hook untuk state management
├── app/
│   └── page.tsx                 # Updated main component
└── .env.local                   # Environment variables
```

## 🚀 Fitur yang Terintegrasi

### ✅ Real-time Video Streaming
- **WebRTC streaming** dengan avatar AI
- **Auto fallback** ke gambar statis saat tidak berbicara
- **Live indicator** untuk status streaming
- **Responsive video display** dengan border dan effects

### ✅ Chat Integration
- **Bi-directional chat** dengan AI agent
- **Message history** dengan format user/assistant
- **Loading states** dan error handling
- **Starter messages** dari D-ID configuration

### ✅ Connection Management  
- **Auto-connect** saat component mount
- **Connection status indicator** (terhubung/menghubungkan/terputus)
- **Manual connect/disconnect** buttons
- **Reconnection** handling untuk session timeout

### ✅ Enhanced UI/UX
- **Error notifications** dengan dismiss button
- **Loading indicators** untuk semua async operations
- **Disabled states** untuk input saat tidak terhubung
- **Visual feedback** untuk recording dan speaking states

## 🎮 Cara Penggunaan

### 1. Jalankan Development Server
```bash
npm run dev
```

### 2. Buka Browser
```
http://localhost:3000
```

### 3. Testing Integration
1. **Connection**: Status akan otomatis terhubung saat page load
2. **Chat**: Ketik pesan dan tekan Enter atau klik Send
3. **Video**: Avatar akan berbicara saat memberikan response
4. **Starter Messages**: Klik tombol starter messages untuk quick test

## 📡 API Features Utilized

### D-ID Agent Manager Methods
- ✅ `agentManager.connect()` - Establish WebRTC connection
- ✅ `agentManager.chat(message)` - Send message and get AI response
- ✅ `agentManager.speak({type, input})` - Make agent speak text
- ✅ `agentManager.disconnect()` - Close connection
- ✅ `agentManager.reconnect()` - Reconnect after timeout
- ✅ `agentManager.rate(messageId, score)` - Rate AI responses

### Callback Functions Implemented
- ✅ `onSrcObjectReady` - Handle video stream setup
- ✅ `onVideoStateChange` - Manage video/idle state transitions
- ✅ `onConnectionStateChange` - Update connection status
- ✅ `onNewMessage` - Process chat messages
- ✅ `onError` - Handle errors gracefully

## 🔧 Configuration Options

### Stream Options
```typescript
{
  compatibilityMode: "auto",  // VP8/H264 auto-selection
  streamWarmup: true,         // Warmup video on connect
  outputResolution: 720       // Video resolution (150-1080)
}
```

### Custom Styling
Aplikasi menggunakan **Tailwind CSS** dengan tema:
- **Primary color**: `#3533CD` (purple)
- **Background**: Gradient dark theme
- **Glass-morphism effects** untuk modern UI
- **Responsive design** untuk mobile compatibility

## 🛠️ Troubleshooting

### Masalah Umum

**1. CORS Policy Error (PENTING!)** 🚨
```
Access to fetch at 'https://api.d-id.com/...' from origin 'http://your-domain' 
has been blocked by CORS policy
```
**Penyebab**: Domain Anda belum ditambahkan ke allowed domains di D-ID Studio.

**Solusi**:
1. Login ke [D-ID Studio](https://studio.d-id.com)
2. Buka **Agents Gallery**
3. Hover ke Agent Anda → Klik `[...]` → `</> Embed`
4. Di bagian **"Allowed Domains"**, tambahkan domain Anda:
   ```
   # Development
   http://localhost:3000
   http://localhost:3004
   
   # Production (ganti dengan domain real Anda)
   http://89.116.134.106:3004
   https://yourdomain.com
   ```
5. **PENTING**: Klik **"Save"** atau **"Update"**
6. Tunggu 5-10 menit untuk propagasi

**2. Rate Limiting (429 Too Many Requests)** ⚠️
```
POST https://api.d-id.com/... net::ERR_FAILED 429 (Too Many Requests)
```
**Penyebab**: Terlalu banyak request dalam waktu singkat.

**Solusi**:
- Tunggu 1-2 menit sebelum mencoba lagi
- Avoid rapid clicking/reconnecting
- Gunakan retry mechanism dengan backoff

**3. "D-ID credentials tidak ditemukan"**
- Pastikan file `.env.local` ada dan berisi credentials yang benar
- Restart development server setelah menambah environment variables

**4. "Koneksi ke agent gagal"**  
- Cek apakah domain sudah ditambahkan ke allowed domains di D-ID Studio
- Pastikan credentials valid dan tidak expired

**5. Video tidak muncul**
- Cek browser console untuk error WebRTC
- Pastikan browser support WebRTC (Chrome, Firefox, Safari modern)
- Cek network/firewall tidak memblokir WebRTC traffic

**6. Dependency conflicts**
- Install dengan flag: `npm install @d-id/client-sdk --legacy-peer-deps`

**7. Build Error: "window is not defined"**
- ✅ **SUDAH DIPERBAIKI** - Menggunakan dynamic import dengan `ssr: false`
- Component D-ID hanya di-load di client-side
- Browser environment check di semua hook dan service

**8. Build Error: "ssr: false not allowed in Server Components"**
- ✅ **SUDAH DIPERBAIKI** - Page component menggunakan `"use client"` directive
- Dynamic import bekerja dengan baik di Client Component

### Debug Mode
Enable console logging untuk debug:
```typescript
// Di file use-did-agent.ts, semua callback sudah ada console.log
// Buka browser DevTools → Console untuk melihat debug info
```

## 🔒 Security Notes

1. **Client Key** adalah public key, aman untuk frontend
2. **Agent ID** juga aman untuk frontend exposure  
3. **Domain whitelist** di D-ID Studio sebagai security layer
4. Jangan expose **API Key** (berbeda dari Client Key) di frontend

## 📚 Resources

- [D-ID Agents SDK Documentation](https://docs.d-id.com/reference/agents-sdk-overview)
- [D-ID Studio](https://studio.d-id.com)
- [GitHub Demo Repository](https://github.com/de-id/agents-sdk-demo)

## 🎯 Next Steps (Optional Enhancements)

1. **Voice Recording**: Implement actual microphone recording
2. **Multiple Agents**: Support switching between multiple agents
3. **Custom Knowledge**: Upload documents for agent knowledge base
4. **Analytics**: Implement message rating and analytics
5. **Mobile Optimization**: Enhanced mobile experience
6. **Offline Mode**: Fallback untuk saat tidak ada koneksi

---

## ✅ **IMPLEMENTATION COMPLETE**

### **Status**: 🎉 **Ready for Production & Build Fixed**

✅ **D-ID AI Agent integration** - Fully implemented  
✅ **Real-time video streaming** - Working with WebRTC  
✅ **Chat system** - Bi-directional messaging  
✅ **Error handling** - Comprehensive with UI feedback  
✅ **SSR issues** - Fixed with dynamic import  
✅ **Build success** - Production ready  
✅ **UI enhancements** - Modern glassmorphism design  

### **Build & Deploy Ready** 🚀
```bash
# Development
npm run dev

# Production Build (✅ WORKS!)
npm run build
npm start
```

**Integrasi D-ID AI Agent sudah lengkap dan siap digunakan!** 