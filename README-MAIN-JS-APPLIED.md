# 🚀 Main.js Approach Applied to Next.js

Implementasi **DIRECT** dari `example/main.js` ke dalam Next.js hooks dengan WebSocket connection yang identik.

## 🔄 **Key Changes Made**

### **1. Direct SDK Usage (No Wrapper)**
```typescript
// BEFORE (With Service Layer)
import { DIDService } from '@/lib/d-id-service'
const didService = new DIDService(agentId, clientKey, callbacks)

// AFTER (Direct SDK - Match main.js) ✅
import { createAgentManager } from '@d-id/client-sdk'
const agentManager = await createAgentManager(agentId, { auth, callbacks, streamOptions })
```

### **2. Exact Callback Implementation**
```typescript
// Callbacks match main.js exactly ✅
const callbacks = {
  onSrcObjectReady(value) {
    streamVideoElement.srcObject = value  // Direct assignment
    return value
  },
  
  onConnectionStateChange(state) {
    if (state === "connecting") {
      idleVideoElement.src = agent.presenter.idle_video
      idleVideoElement.play()
    }
  },
  
  onVideoStateChange(state) {
    // Dual video handling EXACTLY like main.js
    if (state === "START") {
      streamVideo.muted = false
      streamVideo.srcObject = srcObject
      idleVideo.opacity = '0'
      streamVideo.opacity = '1'
    }
  }
}
```

### **3. WebSocket & Stream Configuration**
```typescript
// Exact match main.js configuration ✅
const streamOptions = { 
  compatibilityMode: "on",    // VP8 codec
  streamWarmup: false,        // No warmup delays
  fluent: false              // Legacy dual-video mode
}

// Stream type detection like main.js
streamType = agentManager.getStreamType()
console.log("Stream Type:", streamType)
```

### **4. Agent Manager Methods**
```typescript
// Direct method calls matching main.js ✅
agentManager.connect()           // WebSocket connection
agentManager.chat(message)       // Chat with LLM
agentManager.speak({type, input}) // Text-to-speech
agentManager.rate(messageId, score) // Rate responses
agentManager.reconnect()         // Session recovery
agentManager.disconnect()        // Close connection
```

## 📁 **Files Created/Updated**

### **New Hook (Direct Approach)**
- ✅ `hooks/use-did-agent-direct.ts` - Direct SDK integration
  - **No service layer** abstraction
  - **Exact callback implementation** from main.js
  - **WebSocket connection** handling
  - **Stream type detection** (Legacy/Fluent)

### **Updated Component**
- ✅ `components/virtual-ai-agent-client.tsx`
  - Uses **`chat()`** instead of `sendMessage()`
  - Uses **`rate()`** instead of `rateMessage()`
  - **Rating buttons** for assistant messages
  - **Reconnect button** for disconnected states
  - **Connection labels** matching main.js

## 🎯 **WebSocket Features Applied**

### **✅ Connection States (Exact Match)**
```typescript
// Main.js connection states ✅
"connecting" → Set idle video, show "Connecting.."
"connected"  → Show greeting, set "Connected" label  
"disconnected" → Show reconnect option
"closed"     → Reset to initial state
```

### **✅ Video States (Exact Match)**
```typescript
// Legacy dual-video architecture ✅
"START" → Show streaming video, hide idle
"STOP"  → Show idle video, hide streaming

// Fluent architecture support ✅  
if (streamType === StreamType.Fluent) {
  // Single video for both idle and streaming
}
```

### **✅ Message Flow (Exact Match)**
```typescript
// Message handling like main.js ✅
onNewMessage(messages, type) {
  if (type === "answer") {
    setMessages(messages)           // Full message array
    setConnectionLabel("Online")    // Status update
  }
}
```

## 🔧 **Configuration Applied**

### **Environment Variables**
```env
NEXT_PUBLIC_DID_CLIENT_KEY=your_client_key
NEXT_PUBLIC_DID_AGENT_ID=v2_agt_your_agent_id
```

### **Stream Options (Exact Match)**
```typescript
// Main.js stream configuration ✅
compatibilityMode: "on"     // Force VP8 (more compatible)
streamWarmup: false         // Faster connection
fluent: false              // Stable dual-video mode
```

### **Auth Configuration (Exact Match)**
```typescript
// Main.js auth object ✅
const auth = { 
  type: 'key', 
  clientKey: process.env.NEXT_PUBLIC_DID_CLIENT_KEY 
}
```

## 🎮 **Usage Examples**

### **Chat Function**
```typescript
// Like main.js chat() function ✅
const { chat } = useDIDAgentDirect()

await chat("Hello, how are you?")
// Automatically handles:
// - WebSocket message sending
// - "Thinking.." status display  
// - Response with video streaming
// - Message history update
```

### **Speak Function**  
```typescript
// Like main.js speak() function ✅
const { speak } = useDIDAgentDirect()

await speak("This is a test message")
// Requirements: minimum 3 characters (like main.js)
// Streams video without LLM processing
```

### **Rate Function**
```typescript
// Like main.js rate() function ✅
const { rate } = useDIDAgentDirect()

await rate(messageId, 1)   // Positive rating
await rate(messageId, -1)  // Negative rating
```

## 🚀 **Performance Benefits**

### **✅ Direct WebSocket Connection**
- **No middleware layers** - direct to D-ID API
- **Faster connection** establishment
- **Lower latency** for real-time streaming
- **Better error handling** at source

### **✅ Stream Efficiency**
- **VP8 codec** forced for compatibility
- **No warmup delays** - instant connection
- **Legacy mode** for stability
- **WebRTC optimization** 

### **✅ Memory Management**
- **Direct refs** to video elements
- **Automatic cleanup** on unmount
- **Stream object recycling**
- **Connection pooling**

## 🔍 **Debugging Features**

### **Console Logs (Match Main.js)**
```typescript
// Exact logging like main.js ✅
console.log("Create Agent Manager: ", agentManager)
console.log("Stream Type:", streamType)  
console.log("Connection State: ", state)
console.log("Video State: ", state)
console.log(`Chat: ("${message}")`)
console.log(`Speak: "${text}"`)
```

### **Connection Labels**
```typescript
// Real-time status like main.js ✅
"Connecting.." → Initial connection
"Connected"    → Ready for interaction
"Online"       → Active conversation
"Thinking.."   → Processing request
"Disconnected" → Connection lost
```

## 🎯 **Expected Results**

### **✅ Identical Behavior to Main.js**
- 🔄 **WebSocket connection** with same flow
- 🎥 **Video streaming** with exact transitions  
- 💬 **Chat responses** with LLM integration
- 🔊 **Speech synthesis** without LLM
- ⭐ **Message rating** for analytics
- 🔄 **Reconnection** for session recovery

### **✅ React Integration Benefits**  
- 🎣 **React hooks** for state management
- 🔄 **Real-time updates** with useState
- 🎨 **UI components** with modern design
- 📱 **Responsive layout** for mobile
- ⚡ **TypeScript support** for development

## 🛠️ **Migration Guide**

### **From Previous Implementation**
```typescript
// OLD (Service Layer)
const { sendMessage } = useDIDAgent()
await sendMessage(text)

// NEW (Direct) ✅  
const { chat } = useDIDAgentDirect()
await chat(text)
```

### **Component Updates**
```typescript
// Update imports
import { useDIDAgentDirect } from "@/hooks/use-did-agent-direct"

// Update method calls
chat(message)           // instead of sendMessage()
rate(messageId, score)  // instead of rateMessage()
```

## 🔒 **Security & Performance**

### **✅ Same Security as Main.js**
- **Client-side only** credentials
- **Domain whitelist** enforcement  
- **WebSocket encryption** (WSS)
- **No server-side storage**

### **✅ Production Ready**
- ✅ **Build tested** - no TypeScript errors
- ✅ **SSR compatible** with dynamic imports
- ✅ **Memory efficient** with proper cleanup
- ✅ **Error resilient** with fallback handling

---

## 🎉 **Status: ✅ COMPLETE**

**Main.js approach successfully applied to Next.js with:**
- 🔄 **Identical WebSocket connection** flow
- 🎥 **Exact video streaming** behavior  
- 💬 **Same chat/speak** functionality
- ⭐ **Message rating** system
- 🔄 **Reconnection** capability

**Ready for production with proven working configuration!** 🚀 