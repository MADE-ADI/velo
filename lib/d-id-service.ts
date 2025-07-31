// Lazy import D-ID SDK to avoid SSR issues
let sdk: any = null

async function loadDIDSDK() {
  if (typeof window === 'undefined') {
    throw new Error('D-ID SDK dapat hanya digunakan di browser')
  }
  
  if (!sdk) {
    sdk = await import('@d-id/client-sdk')
  }
  return sdk
}

export interface DIDMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  matches?: any[]
}

export interface DIDCallbacks {
  onSrcObjectReady: (value: MediaStream | null) => void
  onVideoStateChange: (state: string) => void
  onConnectionStateChange: (state: string) => void
  onNewMessage: (messages: DIDMessage[], type: string) => void
  onError: (error: any, errorData?: any) => void
}

export class DIDService {
  private agentManager: any = null
  private callbacks: DIDCallbacks
  private agentId: string
  private clientKey: string
  
  constructor(agentId: string, clientKey: string, callbacks: DIDCallbacks) {
    this.agentId = agentId
    this.clientKey = clientKey
    this.callbacks = callbacks
  }

  async initialize() {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('D-ID service hanya dapat digunakan di browser')
      }

      // Load D-ID SDK dynamically
      const didSDK = await loadDIDSDK()

      const auth = { 
        type: 'key' as const, 
        clientKey: this.clientKey 
      }

      // Stream options matching working example
      const streamOptions = { 
        compatibilityMode: "on" as const,
        streamWarmup: false,
        fluent: false,
        outputResolution: 720
      }

      this.agentManager = await didSDK.createAgentManager(
        this.agentId, 
        { 
          auth, 
          callbacks: this.callbacks, 
          streamOptions 
        }
      )

      return this.agentManager
    } catch (error) {
      console.error('Failed to initialize D-ID agent:', error)
      this.callbacks.onError(error)
      throw error
    }
  }

  async connect() {
    if (!this.agentManager) {
      throw new Error('Agent manager belum diinisialisasi')
    }
    return await this.agentManager.connect()
  }

  async disconnect() {
    if (!this.agentManager) return
    return await this.agentManager.disconnect()
  }

  async reconnect() {
    if (!this.agentManager) return
    return await this.agentManager.reconnect()
  }

  async sendMessage(message: string) {
    if (!this.agentManager) {
      throw new Error('Agent manager belum diinisialisasi')
    }
    return await this.agentManager.chat(message)
  }

  async speak(input: { type: 'text' | 'audio', text?: string, audio_url?: string }) {
    if (!this.agentManager) {
      throw new Error('Agent manager belum diinisialisasi')
    }
    
    if (input.type === 'text' && input.text) {
      return await this.agentManager.speak({
        type: 'text',
        input: input.text
      })
    } else if (input.type === 'audio' && input.audio_url) {
      return await this.agentManager.speak({
        type: 'audio',
        audio_url: input.audio_url
      })
    }
  }

  async rateMessage(messageId: string, score: number) {
    if (!this.agentManager) return
    return await this.agentManager.rate(messageId, score)
  }

  getAgent() {
    return this.agentManager?.agent
  }

  getStarterMessages() {
    return this.agentManager?.starterMessages || []
  }

  isConnected() {
    return this.agentManager !== null
  }
} 