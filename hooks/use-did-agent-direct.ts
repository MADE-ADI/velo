import { useState, useEffect, useRef, useCallback } from 'react'

// Direct import D-ID SDK seperti di main.js
let createAgentManager: any = null
let StreamType: any = null

// Dynamic import untuk avoid SSR issues
async function loadDIDSDK() {
  if (typeof window === 'undefined') {
    throw new Error('D-ID SDK dapat hanya digunakan di browser')
  }
  
  if (!createAgentManager) {
    const sdk = await import('@d-id/client-sdk')
    createAgentManager = sdk.createAgentManager
    StreamType = sdk.StreamType
  }
  return { createAgentManager, StreamType }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  matches?: any[]
}

export const useDIDAgentDirect = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<string>('new')
  const [videoState, setVideoState] = useState<string>('STOP')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agent, setAgent] = useState<any>(null)
  const [isBrowser, setIsBrowser] = useState(false)
  const [connectionLabel, setConnectionLabel] = useState<string>('Connecting..')

  // Refs matching main.js exactly
  const streamVideoRef = useRef<HTMLVideoElement>(null)
  const idleVideoRef = useRef<HTMLVideoElement>(null)
  const agentManagerRef = useRef<any>(null)
  const srcObjectRef = useRef<MediaStream | null>(null)
  const streamTypeRef = useRef<any>(null)

  // Check browser environment
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined')
  }, [])

  // Callbacks matching main.js exactly
  const callbacks = {
    // Link the HTML Video element with the WebRTC Stream Object (Video & Audio tracks)
    onSrcObjectReady(value: MediaStream | null) {
      console.log("SrcObject Ready")
      if (streamVideoRef.current) {
        streamVideoRef.current.srcObject = value
      }
      srcObjectRef.current = value
      return srcObjectRef.current
    },

    // Connection States callback method - exact match main.js
    onConnectionStateChange(state: string) {
      console.log("Connection State: ", state)
      setConnectionState(state)
      setIsConnecting(state === 'connecting')
      setIsConnected(state === 'connected')

      if (state === "connecting") {
        setConnectionLabel("Connecting..")
        setError(null)

        // Get agent manager reference
        const agentManager = agentManagerRef.current
        if (agentManager?.agent) {
          // Displaying the Agent's name in the pages' header
          setAgent(agentManager.agent)

          // Setting the video elements' sources and display - EXACT MATCH main.js
          if (idleVideoRef.current && agentManager.agent.presenter?.idle_video) {
            console.log("Setting idle video src:", agentManager.agent.presenter.idle_video)
            idleVideoRef.current.src = agentManager.agent.presenter.idle_video
            idleVideoRef.current.play().catch(e => console.log("Idle video play error:", e))
            idleVideoRef.current.style.opacity = '1'
          }
          if (streamVideoRef.current) {
            streamVideoRef.current.style.opacity = '0'
          }

          // Set background image like main.js
          console.log("Agent connected:", agentManager.agent.preview_name)
        }
      }
      else if (state === "connected") {
        const agentManager = agentManagerRef.current
        if (agentManager) {
          // Add greeting message
          if (agentManager.agent?.greetings && agentManager.agent.greetings.length > 0) {
            const greetingMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: agentManager.agent.greetings[0],
              created_at: new Date().toISOString()
            }
            setMessages(prev => [...prev, greetingMessage])
          }
          
          if (streamTypeRef.current !== StreamType?.Fluent) {
            setConnectionLabel("Connected")
          }
        }
        setError(null)
        setIsLoading(false)
      }
      else if (state === "disconnected" || state === "closed") {
        setConnectionLabel("")
        setError('Lost connection')
        setIsConnected(false)
      }
    },

    // Video state change - exact match main.js
    onVideoStateChange(state: string) {
      console.log("Video State: ", state)
      setVideoState(state)
      
      // NEW ARCHITECTURE (Fluent: Single Video for both Idle and Streaming)
      if (streamTypeRef.current === StreamType?.Fluent) {
        if (state === "START") {
          setConnectionLabel("Connected")
          if (streamVideoRef.current) {
            streamVideoRef.current.style.opacity = '1'
          }
          if (idleVideoRef.current) {
            idleVideoRef.current.style.opacity = '0'
          }
        }
      }
      // OLD ARCHITECTURE (Legacy: Switching between the idle and streamed videos elements) - EXACT MATCH main.js
      else {
        if (state === "START") {
          console.log("Video START - showing stream, hiding idle")
          if (streamVideoRef.current && srcObjectRef.current) {
            streamVideoRef.current.muted = false
            streamVideoRef.current.srcObject = srcObjectRef.current
            if (idleVideoRef.current) {
              idleVideoRef.current.style.opacity = '0'
            }
            streamVideoRef.current.style.opacity = '1'
          }
        }
        else { // STOP - EXACT MATCH main.js
          console.log("Video STOP - showing idle, hiding stream")
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
      }
    },

    // New messages callback method - exact match main.js
    onNewMessage(messages: Message[], type: string) {
      console.log('New messages received:', messages, type)
      
      // Show only the last message from the entire 'messages' array
      let lastIndex = messages.length - 1
      let msg = messages[lastIndex]

      if (type === "answer") {
        setMessages(messages)
        setConnectionLabel("Online")
        setIsLoading(false)
      }

      // User Messages
      if (msg && msg.role === 'user') {
        console.log(`New Message:\n[${msg.role}] ${msg.content}`)
      }
    },

    // New callback to show the Talking/Idle states with the Fluent stream type
    onAgentActivityStateChange(state: string) {
      console.log("Agent Activity State: ", state)
    },

    // Error handling - exact match main.js
    onError(error: any, errorData?: any) {
      setConnectionLabel(`Something went wrong :(`)
      console.log("Error:", error, "Error Data:", errorData)
      setError(error?.message || 'Something went wrong :(')
      setIsLoading(false)
      setIsConnecting(false)
    }
  }

  // Initialize agent manager - exact match main.js approach
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

    // Agent ID and Client Key check - exact match main.js
    if (agentId === "" || clientKey === "") {
      setConnectionLabel(`Missing agentID and auth.clientKey variables`)
      console.error("Missing agentID and auth.clientKey variables")
      return false
    }

    try {
      setIsConnecting(true)
      setError(null)

      // Load D-ID SDK
      const { createAgentManager: createManager, StreamType: ST } = await loadDIDSDK()
      
      // Auth object - exact match main.js
      const auth = { type: 'key', clientKey: clientKey }
      
      // Stream options - exact match main.js
      const streamOptions = { 
        compatibilityMode: "on", 
        streamWarmup: false, 
        fluent: false 
      }

      // Create the 'agentManager' instance - exact match main.js
      const agentManager = await createManager(agentId, { auth, callbacks, streamOptions })
      console.log("Create Agent Manager: ", agentManager)
      
      agentManagerRef.current = agentManager
      
      // Check for the set Stream type (Legacy/Fluent)
      streamTypeRef.current = agentManager.getStreamType()
      console.log("Stream Type:", streamTypeRef.current)
      
      setAgent(agentManager.agent)
      
      return true
    } catch (error) {
      console.error('Failed to initialize D-ID agent:', error)
      setError('Gagal menginisialisasi AI agent')
      setIsConnecting(false)
      return false
    }
  }, [isBrowser])

  // Connect to agent - exact match main.js
  const connect = useCallback(async () => {
    if (!isBrowser) {
      setError('Agent hanya dapat digunakan di browser')
      return false
    }

    if (!agentManagerRef.current) {
      const initialized = await initializeAgent()
      if (!initialized) return false
    }

    try {
      console.log("Connecting to Agent ID: ", process.env.NEXT_PUBLIC_DID_AGENT_ID)
      await agentManagerRef.current.connect()
      return true
    } catch (error) {
      console.error('Failed to connect:', error)
      setError('Gagal terhubung ke AI agent')
      return false
    }
  }, [initializeAgent, isBrowser])

  // Disconnect from agent
  const disconnect = useCallback(async () => {
    if (agentManagerRef.current) {
      try {
        const disconnectResult = agentManagerRef.current.disconnect()
        console.log("Disconnect")
        setIsConnected(false)
        setConnectionState('disconnected')
        return disconnectResult
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
  }, [])

  // Reconnect - exact match main.js
  const reconnect = useCallback(async () => {
    if (agentManagerRef.current) {
      try {
        const reconnectResult = agentManagerRef.current.reconnect()
        console.log("Reconnect")
        return reconnectResult
      } catch (error) {
        console.error('Failed to reconnect:', error)
      }
    }
  }, [])

  // Chat function - exact match main.js
  const chat = useCallback(async (message: string) => {
    if (!agentManagerRef.current || !isConnected) {
      setError('Agent belum terhubung')
      return
    }

    if (message !== "") {
      try {
        setIsLoading(true)
        setConnectionLabel("Thinking..")
        
        const chatResult = agentManagerRef.current.chat(message)
        console.log(`Chat: ("${message}")`)
        
        return chatResult
      } catch (error) {
        console.error('Failed to send chat:', error)
        setError('Gagal mengirim pesan')
        setIsLoading(false)
      }
    }
  }, [isConnected])

  // Speak function - exact match main.js
  const speak = useCallback(async (text: string) => {
    if (!agentManagerRef.current || !isConnected) {
      setError('Agent belum terhubung')
      return
    }

    // 'Speak' supports a minimum of 3 characters
    if (text !== "" && text.length > 2) {
      try {
        setIsLoading(true)
        const speakResult = agentManagerRef.current.speak({
          type: "text",
          input: text,
        })
        console.log(`Speak: "${text}"`)
        return speakResult
      } catch (error) {
        console.error('Failed to speak:', error)
        setError('Gagal memutar audio')
        setIsLoading(false)
      }
    }
  }, [isConnected])

  // Rate function - exact match main.js
  const rate = useCallback(async (messageID: string, score: number) => {
    if (agentManagerRef.current) {
      try {
        const rateResult = agentManagerRef.current.rate(messageID, score)
        console.log(`Message ID: ${messageID} Rated:${score}\n`, "Result", rateResult)
        return rateResult
      } catch (error) {
        console.error('Failed to rate message:', error)
      }
    }
  }, [])

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      if (agentManagerRef.current) {
        agentManagerRef.current.disconnect()
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
    isBrowser,
    connectionLabel,
    
    // Refs
    streamVideoRef,
    idleVideoRef,
    agentManagerRef,
    
    // Actions - exact match main.js functions
    initializeAgent,
    connect,
    disconnect,
    reconnect,
    chat,        // Use chat instead of sendMessage
    speak,
    rate,        // Use rate instead of rateMessage
    
    // Utils
    clearError: () => setError(null),
    clearMessages: () => setMessages([])
  }
} 