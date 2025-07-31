# 🚨 CORS & Rate Limiting Quick Fix Guide

Panduan cepat untuk mengatasi error yang paling umum terjadi saat menggunakan D-ID AI Agent.

## 🔴 **Error: CORS Policy Blocked**

```
Access to fetch at 'https://api.d-id.com/agents/...' from origin 'http://89.116.134.106:3004' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

### **Penyebab:**
Domain `http://89.116.134.106:3004` belum ditambahkan ke **allowed domains** di D-ID Studio.

### **✅ Solusi (5 menit):**

1. **Login ke D-ID Studio**
   - Buka [https://studio.d-id.com](https://studio.d-id.com)
   - Login dengan akun Anda

2. **Akses Agent Settings**
   - Buka **"Agents Gallery"**
   - Hover ke Agent Anda (v2_agt_2I34jePL)
   - Klik tombol **`[...]`** 
   - Pilih **`</> Embed`**

3. **Update Allowed Domains**
   - Scroll ke bagian **"Allowed Domains"**
   - Tambahkan domain Anda:
   ```
   http://89.116.134.106:3004
   http://localhost:3000
   http://localhost:3004
   https://yourdomain.com
   ```

4. **Save & Wait**
   - Klik **"Save"** atau **"Update"**
   - **Tunggu 5-10 menit** untuk propagasi
   - Refresh browser dan coba lagi

### **🔍 Cara Cek Domain Anda:**
```javascript
// Jalankan di browser console
console.log('Current domain:', window.location.origin)
```

---

## ⚠️ **Error: 429 Too Many Requests**

```
POST https://api.d-id.com/agents/.../ice net::ERR_FAILED 429 (Too Many Requests)
```

### **Penyebab:**
- Terlalu banyak request dalam waktu singkat
- Rate limiting dari D-ID API
- Multiple connection attempts

### **✅ Solusi Immediate:**

1. **Tunggu 1-2 menit** sebelum mencoba lagi
2. **Jangan spam** tombol connect/reconnect
3. **Refresh halaman** jika perlu
4. **Tutup tab duplicate** yang menggunakan D-ID

### **✅ Solusi Automatic (Already Implemented):**
- ✅ **Retry mechanism** dengan exponential backoff
- ✅ **Rate limit detection** dengan auto-recovery
- ✅ **Connection pooling** untuk efisiensi

---

## 🛠️ **Implementation Details**

### **Error Handling Features:**
```typescript
// Auto-retry dengan exponential backoff
maxRetries: 3
retryDelay: 1000ms → 2000ms → 4000ms

// Enhanced error messages
CORS → Domain setup instructions
429  → Rate limit dengan auto-retry
401  → Credentials validation
WebRTC → Connection troubleshooting
```

### **UI Enhancements:**
- 🟡 **Yellow notification** untuk rate limiting dengan spinner
- 🔴 **Red notification** untuk critical errors
- 📋 **Step-by-step instructions** untuk CORS errors
- 🔄 **Auto-retry button** untuk recoverable errors

---

## 🚀 **Testing Your Setup**

### **1. Test CORS Fix:**
```bash
# After updating allowed domains, test:
curl -H "Origin: http://89.116.134.106:3004" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: authorization,content-type" \
     -X OPTIONS \
     https://api.d-id.com/agents/v2_agt_2I34jePL/streams
```

### **2. Monitor Network Tab:**
- Open **Chrome DevTools** → **Network** tab
- Look for **CORS preflight** requests (OPTIONS)
- Check **response headers** for Access-Control-Allow-Origin

### **3. Check Console Logs:**
```javascript
// Look for these messages:
"Rate limited. Retrying in 2000ms..."
"Auto-retrying after rate limit..."
"Connect to D-ID agent attempt 2 failed"
```

---

## 📱 **Quick Status Check**

### **✅ Working Indicators:**
- 🟢 Green dot = Connected
- 🎥 "LIVE" indicator during video
- 💬 Messages flow smoothly
- 🔊 Audio/video sync properly

### **❌ Problem Indicators:**
- 🔴 Red dot = Connection failed
- 🟡 Yellow dot = Connecting/retrying
- ⚠️ Error notifications
- 📡 WebRTC connection failures

---

## 🆘 **Still Having Issues?**

### **Check These:**
1. **Internet connection** stable?
2. **Firewall/proxy** blocking WebRTC?
3. **Browser compatibility** (Chrome/Firefox recommended)
4. **D-ID account** has sufficient credits?
5. **Environment variables** set correctly?

### **Debug Steps:**
```bash
# 1. Check environment
echo $NEXT_PUBLIC_DID_CLIENT_KEY
echo $NEXT_PUBLIC_DID_AGENT_ID

# 2. Restart development server
npm run dev

# 3. Clear browser cache
Ctrl+Shift+Delete (Chrome)
```

### **Contact Support:**
- D-ID Support: [support@d-id.com](mailto:support@d-id.com)
- Documentation: [docs.d-id.com](https://docs.d-id.com)

---

## 🎯 **Summary**

**CORS Error** → Update allowed domains di D-ID Studio (5 mins)  
**Rate Limiting** → Wait 1-2 minutes, system will auto-retry  
**WebRTC Issues** → Check browser compatibility & network  

**✅ All fixes are already implemented in the code - just follow domain setup!** 