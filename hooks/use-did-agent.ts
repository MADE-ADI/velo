import { useState, useEffect, useRef, useCallback } from 'react'
import { DIDService, DIDCallbacks, DIDMessage } from '@/lib/d-id-service'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export const useDIDAgent = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<string>('new')
  const [videoState, setVideoState] = useState<string>('STOP')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agent, setAgent] = useState<any>(null)
  const [starterMessages, setStarterMessages] = useState<string[]>([])
  const [isBrowser, setIsBrowser] = useState(false)

  const streamVideoRef = useRef<HTMLVideoElement>(null)
  const idleVideoRef = useRef<HTMLVideoElement>(null)
  const didServiceRef = useRef<DIDService | null>(null)
  const srcObjectRef = useRef<MediaStream | null>(null)

  // Check if we're in browser environment
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined')
  }, [])

  // Callback functions untuk D-ID SDK
  const callbacks: DIDCallbacks = {
    onSrcObjectReady: useCallback((value: MediaStream | null) => {
      console.log("SrcObject Ready")
      srcObjectRef.current = value
      if (streamVideoRef.current) {
        streamVideoRef.current.srcObject = value
      }
    }, []),

    onVideoStateChange: useCallback((state: string) => {
      console.log("Video State: ", state)
      setVideoState(state)
      
      // Video state handling matching working example (legacy dual video approach)
      if (state === "START") {
        if (streamVideoRef.current && srcObjectRef.current) {
          streamVideoRef.current.muted = false
          streamVideoRef.current.srcObject = srcObjectRef.current
          if (idleVideoRef.current) {
            idleVideoRef.current.style.opacity = '0'
          }
          streamVideoRef.current.style.opacity = '1'
        }
      } else { // STOP
        if (streamVideoRef.current) {
          streamVideoRef.current.muted = true
        }
        if (idleVideoRef.current) {
          idleVideoRef.current.style.opacity = '1'
        }
        if (streamVideoRef.current) {
          streamVideoRef.current.style.opacity = '0'
        }
      }
    }, []),

    onConnectionStateChange: useCallback((state: string) => {
      console.log("Connection State: ", state)
      setConnectionState(state)
      setIsConnecting(state === 'connecting')
      setIsConnected(state === 'connected')
      
      if (state === "connecting") {
        setError(null)
        // Set idle video when connecting
        if (agent?.presenter?.idle_video && idleVideoRef.current) {
          idleVideoRef.current.src = agent.presenter.idle_video
          idleVideoRef.current.play()
          idleVideoRef.current.style.opacity = '1'
        }
        if (streamVideoRef.current) {
          streamVideoRef.current.style.opacity = '0'
        }
      } else if (state === "connected") {
        setError(null)
        setIsLoading(false)
        
        // Add greeting message like in working example
        if (agent?.greetings && agent.greetings.length > 0) {
          const greetingMessage: Message = {
            id: Date.now().toString(),
            text: agent.greetings[0],
            isUser: false,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, greetingMessage])
        }
      } else if (state === "disconnected" || state === "closed") {
        setError('Koneksi terputus')
      }
    }, [agent]),

    onNewMessage: useCallback((didMessages: DIDMessage[], type: string) => {
      console.log('New messages:', didMessages, type)
      
      // Konversi dari format D-ID ke format aplikasi
      const convertedMessages: Message[] = didMessages.map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at)
      }))
      
      if (type === 'answer') {
        setMessages(convertedMessages)
        setIsLoading(false)
      }
    }, []),

    onError: useCallback((error: any, errorData?: any) => {
      console.error("Error:", error, "Error Data:", errorData)
      setError(error?.message || 'Something went wrong :(')
      setIsLoading(false)
      setIsConnecting(false)
    }, [])
  }

  // Initialize D-ID service
  const initializeAgent = useCallback(async () => {
    if (!isBrowser) {
      setError('Agent hanya dapat digunakan di browser')
      return false
    }

    const agentId = process.env.NEXT_PUBLIC_DID_AGENT_ID
    const clientKey = process.env.NEXT_PUBLIC_DID_CLIENT_KEY

    if (!agentId || !clientKey) {
      setError('D-ID credentials tidak ditemukan. Silakan setup environment variables.')
      return false
    }

    try {
      setIsConnecting(true)
      setError(null)

      const didService = new DIDService(agentId, clientKey, callbacks)
      await didService.initialize()
      
      didServiceRef.current = didService
      
      // Get agent info dan starter messages
      const agentInfo = didService.getAgent()
      const starters = didService.getStarterMessages()
      
      setAgent(agentInfo)
      setStarterMessages(starters)
      
      return true
    } catch (error) {
      console.error('Failed to initialize D-ID agent:', error)
      setError('Gagal menginisialisasi AI agent')
      setIsConnecting(false)
      return false
    }
  }, [callbacks, isBrowser])

  // Connect to agent
  const connect = useCallback(async () => {
    if (!isBrowser) {
      setError('Agent hanya dapat digunakan di browser')
      return false
    }

    if (!didServiceRef.current) {
      const initialized = await initializeAgent()
      if (!initialized) return false
    }

    try {
      setIsConnecting(true)
      await didServiceRef.current!.connect()
      return true
    } catch (error) {
      console.error('Failed to connect:', error)
      setError('Gagal terhubung ke AI agent')
      return false
    }
  }, [initializeAgent, isBrowser])

  // Disconnect from agent
  const disconnect = useCallback(async () => {
    if (didServiceRef.current) {
      try {
        await didServiceRef.current.disconnect()
        setIsConnected(false)
        setConnectionState('disconnected')
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
  }, [])

  // Send message to agent
  const sendMessage = useCallback(async (message: string) => {
    if (!didServiceRef.current || !isConnected) {
      setError('Agent belum terhubung')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Add user message immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        text: message,
        isUser: true,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, userMessage])
      
      // Send to D-ID agent
      await didServiceRef.current.sendMessage(message)
      
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Gagal mengirim pesan')
      setIsLoading(false)
    }
  }, [isConnected])

  // Speak text
  const speak = useCallback(async (text: string) => {
    if (!didServiceRef.current || !isConnected) {
      setError('Agent belum terhubung')
      return
    }

    try {
      setIsLoading(true)
      await didServiceRef.current.speak({ type: 'text', text })
    } catch (error) {
      console.error('Failed to speak:', error)
      setError('Gagal memutar audio')
      setIsLoading(false)
    }
  }, [isConnected])

  // Rate message
  const rateMessage = useCallback(async (messageId: string, score: number) => {
    if (!didServiceRef.current) return
    
    try {
      await didServiceRef.current.rateMessage(messageId, score)
    } catch (error) {
      console.error('Failed to rate message:', error)
    }
  }, [])

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      if (didServiceRef.current) {
        didServiceRef.current.disconnect()
      }
    }
  }, [])

  return {
    // State
    isConnected,
    isConnecting,
    connectionState,
    videoState,
    messages,
    isLoading,
    error,
    agent,
    starterMessages,
    isBrowser,
    
    // Refs
    streamVideoRef,
    idleVideoRef,
    
    // Actions
    initializeAgent,
    connect,
    disconnect,
    sendMessage,
    speak,
    rateMessage,
    
    // Utils
    clearError: () => setError(null),
    clearMessages: () => setMessages([])
  }
} 