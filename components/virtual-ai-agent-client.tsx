                                                  "use client"

import React, { useRef, useEffect, useState } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Send, Volume2, Settings, Menu, Share, Shuffle, Plus, Loader2, AlertCircle, Power, PowerOff, MessageSquare, VolumeX, Wifi, WifiOff } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SignOutButton } from '@/components/sign-out-button'
import { useDIDAgentDirect } from "@/hooks/use-did-agent-direct"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import MarkdownRenderer from "@/components/markdown-renderer"

interface Character {
  id: string
  name: string
  avatar: string
  title: string
}

export default function VirtualAIAgentClient() {
  // D-ID Agent integration - Direct approach like main.js
  const {
    isConnected,
    isConnecting,
    connectionState,
    videoState,
    messages,
    isLoading,
    error,
    agent,
    connectionLabel,
    streamVideoRef,
    idleVideoRef,
    isBrowser,
    connect,
    disconnect,
    reconnect,
    chat,         // Use chat instead of sendMessage
    speak,
    rate,         // Use rate instead of rateMessage
    clearError
  } = useDIDAgentDirect()

  const [inputMessage, setInputMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  // Volume state
  const [volume, setVolume] = useState([75])
  const [selectedCharacter, setSelectedCharacter] = useState("veco")
  const [isVoiceChatMode, setIsVoiceChatMode] = useState(false) // Continuous voice chat
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const [showThinking, setShowThinking] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false) // For expandable chat history
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState<string>("")
  const [summaryLoading, setSummaryLoading] = useState(false)
  // Debug: capture messages possibly emitted by the D-ID embed
  const [embedMessages, setEmbedMessages] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([])
  const [lastEmbedEvent, setLastEmbedEvent] = useState<any>(null)
  const [summarySource, setSummarySource] = useState<'hook' | 'embed' | 'none'>('none')
  const isDev = process.env.NODE_ENV !== 'production'
  const [showDebug, setShowDebug] = useState<boolean>(isDev)

  // Speech Recognition Integration
  const {
    isListening,
    isPaused,
    isSupported: speechSupported,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    toggleListening,
    resetTranscript
  } = useSpeechRecognition()
  const [isInitialized, setIsInitialized] = useState(false)
  
  // User connection status
  const [userPing, setUserPing] = useState<number | null>(null)
  const [userConnectionStatus, setUserConnectionStatus] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>('good')

  // Measure user ping/latency
  const measurePing = async () => {
    try {
      const startTime = performance.now()
      const response = await fetch('https://api.d-id.com/agents', { 
        method: 'HEAD',
        mode: 'no-cors' 
      })
      const endTime = performance.now()
      const ping = Math.round(endTime - startTime)
      
      setUserPing(ping)
      
      // Determine connection quality based on ping
      if (ping < 50) {
        setUserConnectionStatus('excellent')
      } else if (ping < 100) {
        setUserConnectionStatus('good')
      } else if (ping < 200) {
        setUserConnectionStatus('fair')
      } else {
        setUserConnectionStatus('poor')
      }
    } catch (error) {
      // Fallback ping measurement using simple request
      try {
        const startTime = performance.now()
        await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
        const endTime = performance.now()
        const estimatedPing = Math.round((endTime - startTime) * 10) // Rough estimation
        
        setUserPing(estimatedPing)
        setUserConnectionStatus(estimatedPing < 100 ? 'good' : 'fair')
      } catch {
        setUserPing(null)
        setUserConnectionStatus('offline')
      }
    }
  }

  const characters: Character[] = [
    { id: "veco", name: "Veco", avatar: "/images/veco-character.png", title: "DATA ANALYSIS" },
    { id: "tesla", name: "Nikola Tesla", avatar: "/placeholder.svg?height=40&width=40", title: "INVENTOR" },
    { id: "curie", name: "Marie Curie", avatar: "/placeholder.svg?height=40&width=40", title: "SCIENTIST" },
  ]

  // Initialize connection on mount - only in browser + iOS video fix
  useEffect(() => {
    if (isBrowser && !isInitialized) {
      connect().then(() => {
        setIsInitialized(true)
      })
      
      // iOS video behavior fix
      const videos = document.querySelectorAll('video')
      videos.forEach(video => {
        // Prevent fullscreen behavior on iOS
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.setAttribute('x5-playsinline', 'true')
        video.setAttribute('x5-video-player-type', 'h5')
        video.setAttribute('x5-video-player-fullscreen', 'false')
        
        // Disable context menu and touch events
        video.style.pointerEvents = 'none'
        video.style.webkitUserSelect = 'none'
        video.style.userSelect = 'none'
        ;(video.style as any).webkitTouchCallout = 'none'
        
        // Remove all event listeners that might trigger fullscreen
        video.addEventListener('webkitbeginfullscreen', (e) => e.preventDefault())
        video.addEventListener('webkitendfullscreen', (e) => e.preventDefault())
        video.addEventListener('fullscreenchange', (e) => e.preventDefault())
        video.addEventListener('webkitfullscreenchange', (e) => e.preventDefault())
      })
    }
  }, [connect, isInitialized, isBrowser])

  // Debug: listen to postMessage events from the D-ID embed
  useEffect(() => {
    if (!isBrowser) return
    const handler = (event: MessageEvent) => {
      try {
        setLastEmbedEvent({ origin: event.origin, data: event.data })
        const d: any = event.data
        if (d && typeof d === 'object') {
          if (Array.isArray(d.messages)) {
            const converted = d.messages
              .map((m: any) => ({ role: m.role, content: m.content }))
              .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
            if (converted.length) setEmbedMessages(converted)
          } else if (d.role && d.content) {
            if (d.role === 'user' || d.role === 'assistant') {
              setEmbedMessages(prev => [...prev, { role: d.role, content: String(d.content) }])
            }
          }
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [isBrowser])

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, pendingUserMessage, showThinking])

  // Handle user input (text/voice) - simplified to chat mode only
  const handleAction = async () => {
    const message = inputMessage.trim()
    if (!message || !isConnected || videoState !== 'STOP') return

    // Show user message immediately
    setPendingUserMessage(message)
    setShowThinking(true)
    setInputMessage("")
    
    // Reset transcript when sending message
    resetTranscript()
    
    try {
      // Always use chat mode
      console.log(`Chat: ("${message}")`)
      await chat(message)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setPendingUserMessage(null)
      setShowThinking(false)
    }
  }

  // Build and request conversation summary from API
  const handleGetSummary = async () => {
    try {
      setSummaryLoading(true)
      setSummaryText("")
      // Prefer embed-captured messages if available; fallback to hook messages
      const sourceMessages = embedMessages.length > 0
        ? embedMessages
        : messages.map(m => ({ role: m.role, content: m.content }))
  setSummarySource(embedMessages.length > 0 ? 'embed' : (messages.length > 0 ? 'hook' : 'none'))
      const payload = { messages: sourceMessages }
      console.debug('Summary payload', { count: sourceMessages.length, source: embedMessages.length > 0 ? 'embed' : 'hook' })
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to summarize')
      setSummaryText(data.summary || '')
      setSummaryOpen(true)
    } catch (e: any) {
      setSummaryText(`Gagal membuat ringkasan: ${e?.message || e}`)
      setSummaryOpen(true)
    } finally {
      setSummaryLoading(false)
    }
  }

  // Handle voice input - put transcript in input field like webSpeechAPI.js
  useEffect(() => {
    if (transcript && isConnected && videoState === 'STOP') {
      setInputMessage(transcript)
      // In webSpeechAPI.js, transcript is accumulated in the textArea
    }
  }, [transcript, isConnected, videoState])

  const toggleRecording = () => {
    if (!speechSupported) {
      console.warn('Speech recognition not supported')
      return
    }
    
    // Use the new handleSpeechToText function for consistency
    handleSpeechToText()
  }

  // Handle voice toggle like in index.html - REMOVED DUPLICATE

  // Handle speech to text like webSpeechAPI.js - iOS optimized
  const handleSpeechToText = (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent any default behavior that might trigger video fullscreen on iOS
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!speechSupported) {
      console.warn('Speech recognition not supported')
      return
    }
    
    if (isListening) {
      // Stop listening and reset like webSpeechAPI.js reset function
      stopListening()
      setIsRecording(false)
      setInputMessage("") // Clear on stop like webSpeechAPI.js
    } else {
      // Start listening and clear input like webSpeechAPI.js
      setInputMessage("")
      resetTranscript()
      startListening()
      setIsRecording(true)
    }
  }

  // Voice toggle for continuous mode - iOS optimized
  const toggleVoiceChat = (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent any default behavior that might trigger video fullscreen on iOS
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    setIsVoiceChatMode(!isVoiceChatMode)
    if (!isVoiceChatMode) {
      // Start continuous voice chat
      if (!isListening) {
        setInputMessage("")
        resetTranscript()
        startListening()
      }
    } else {
      // Stop continuous voice chat
      if (isListening) {
        stopListening()
      }
    }
  }

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect()
    } else {
      await connect()
    }
  }

  const handleSpeak = async (text: string) => {
    if (isConnected && text.length > 2) {  // Match main.js requirement (minimum 3 characters)
      await speak(text)
    }
  }

  // Stop voice input when character is talking
  useEffect(() => {
    if (videoState !== 'STOP' && isListening) {
      console.log('Character is talking, stopping voice input')
      stopListening()
    }
  }, [videoState, isListening, stopListening])

  // Expose handleAction globally for webSpeechAPI.js compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleAction = handleAction
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).handleAction
      }
    }
  }, [handleAction])

  // Handle keyboard shortcuts - simplified
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if connected
      if (!isConnected) return
      
      // Enter key to send message - only if character not talking
      if (event.key === 'Enter' && !event.shiftKey && videoState === 'STOP') {
        event.preventDefault()
        handleAction()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if connected
      if (!isConnected) return
      
      // ESC key to stop voice input
      if (event.key === 'Escape' && isListening) {
        event.preventDefault()
        stopListening()
        console.log('Voice input stopped by ESC key')
      }
    }

    // Add event listeners like main.js
    document.addEventListener('keypress', handleKeyPress)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isConnected, handleAction, videoState, isListening, stopListening])

  const handleReconnect = async () => {
    if (reconnect) {
      await reconnect()
    }
  }

  // Update video volume saat volume berubah
  useEffect(() => {
    const v = (volume[0] ?? 75) / 100
    if (streamVideoRef.current) {
      streamVideoRef.current.volume = v
    }
    if (idleVideoRef.current) {
      idleVideoRef.current.volume = v
    }
  }, [volume, streamVideoRef, idleVideoRef])

  // Ensure idle video is set when agent data is available
  useEffect(() => {
    if (agent?.presenter?.idle_video && idleVideoRef.current && isConnected) {
      console.log("Backup: Setting idle video src from useEffect:", agent.presenter.idle_video)
      if (!idleVideoRef.current.src || idleVideoRef.current.src !== agent.presenter.idle_video) {
        idleVideoRef.current.src = agent.presenter.idle_video
        idleVideoRef.current.play().catch(e => console.log("Backup idle video play error:", e))
        if (videoState === 'STOP') {
          idleVideoRef.current.style.opacity = '1'
        }
      }
    }
  }, [agent, isConnected, videoState])

  // Measure ping periodically
  useEffect(() => {
    if (isBrowser) {
      // Initial ping measurement
      measurePing()
      
      // Measure ping every 10 seconds
      const pingInterval = setInterval(() => {
        measurePing()
      }, 10000)
      
      return () => clearInterval(pingInterval)
    }
  }, [isBrowser])

  // Get WiFi icon and color based on connection status
  const getWiFiStatus = () => {
    switch (userConnectionStatus) {
      case 'excellent':
        return { 
          icon: <Wifi className="h-4 w-4" />, 
          color: 'text-green-400', 
          bgColor: 'bg-green-400/20',
          label: 'Excellent'
        }
      case 'good':
        return { 
          icon: <Wifi className="h-4 w-4" />, 
          color: 'text-blue-400', 
          bgColor: 'bg-blue-400/20',
          label: 'Good'
        }
      case 'fair':
        return { 
          icon: <Wifi className="h-4 w-4" />, 
          color: 'text-yellow-400', 
          bgColor: 'bg-yellow-400/20',
          label: 'Fair'
        }
      case 'poor':
        return { 
          icon: <Wifi className="h-4 w-4" />, 
          color: 'text-orange-400', 
          bgColor: 'bg-orange-400/20',
          label: 'Poor'
        }
      case 'offline':
        return { 
          icon: <WifiOff className="h-4 w-4" />, 
          color: 'text-red-400', 
          bgColor: 'bg-red-400/20',
          label: 'Offline'
        }
      default:
        return { 
          icon: <Wifi className="h-4 w-4" />, 
          color: 'text-gray-400', 
          bgColor: 'bg-gray-400/20',
          label: 'Unknown'
        }
    }
  }

  // Debug video state changes
  useEffect(() => {
    console.log("Current videoState:", videoState)
    console.log("streamVideoRef opacity:", streamVideoRef.current?.style.opacity)
    console.log("idleVideoRef opacity:", idleVideoRef.current?.style.opacity)
    console.log("idleVideoRef src:", idleVideoRef.current?.src)
  }, [videoState])

  // Show loading state while client-side hydration
  if (!isBrowser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-[#3533CD] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading AI Agent...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-[#3533CD] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3533CD]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-3 md:p-6">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Get Summary */}
          <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                onClick={handleGetSummary}
        disabled={!isConnected || ((messages.length === 0) && (embedMessages.length === 0)) || summaryLoading}
                className="text-white border-white/30 hover:bg-white/10 bg-transparent text-xs md:text-sm px-2 md:px-4"
              >
                {summaryLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Summarizing…</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Get Summary</span>
                  </>
                )}
              </Button>
            </DialogTrigger>
            {/* Quick open Debug without generating summary */}
            <Button 
              variant="ghost"
              onClick={() => setSummaryOpen(true)}
              className="text-white hover:bg-white/10 text-xs md:text-sm px-2 md:px-3"
              title="Open debug panel"
            >
              Debug
            </Button>
            <DialogContent className="bg-white text-black">
              <DialogHeader>
                <DialogTitle>Chat Summary</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm space-y-3">
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>Messages: hook={messages.length} • embed={embedMessages.length} • using={summarySource}</span>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => setShowDebug(v => !v)}
                  >
                    {showDebug ? 'Hide debug' : 'Show debug'}
                  </button>
                </div>
                <div>{summaryText || 'No summary yet.'}</div>
                {showDebug && (
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="font-semibold">Hook messages (sample up to 3):</div>
                    <ul className="list-disc pl-4">
                      {messages.slice(0,3).map((m,i) => (
                        <li key={`h-${i}`}>[{m.role}] {m.content?.slice(0,120)}</li>
                      ))}
                      {messages.length === 0 && <li>Empty</li>}
                    </ul>
                    <div className="font-semibold">Embed messages (sample up to 3):</div>
                    <ul className="list-disc pl-4">
                      {embedMessages.slice(0,3).map((m,i) => (
                        <li key={`e-${i}`}>[{m.role}] {m.content?.slice(0,120)}</li>
                      ))}
                      {embedMessages.length === 0 && <li>Empty</li>}
                    </ul>
                    <div className="font-semibold">Last embed event:</div>
                    <pre className="bg-gray-100 p-2 rounded max-h-40 overflow-auto">
{JSON.stringify(lastEmbedEvent, null, 2) || 'No event captured'}
                    </pre>
                    {summarySource === 'none' && (
                      <div className="text-red-600">
                        No messages detected. If you use only the embed, it may not expose messages via postMessage. Consider using the SDK hook (useDIDAgentDirect) or enabling message broadcasting in the embed, then try again.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Menu className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          
          {/* User Connection Status - Mobile responsive */}
          <div className="bg-black/20 rounded-lg px-2 py-1 md:px-3 md:py-2 backdrop-blur-sm border border-white/10">
            <div className="flex items-center space-x-1 md:space-x-2">
              <div className={`${getWiFiStatus().color}`}>
                <Wifi className="h-3 w-3 md:h-4 md:w-4" />
              </div>
              <div className="hidden sm:flex items-center space-x-1">
                <span className={`text-xs px-2 py-1 rounded-full ${getWiFiStatus().bgColor} ${getWiFiStatus().color}`}>
                  {getWiFiStatus().label}
                </span>
                <span className="text-white/80 text-xs">
                  {userPing !== null ? `${userPing}ms` : '--ms'}
                </span>
              </div>
              {/* Mobile: Show only ping */}
              <span className="sm:hidden text-white/80 text-xs">
                {userPing !== null ? `${userPing}ms` : '--ms'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Status - Like main.js connectionLabel */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : 
            isConnecting ? 'bg-yellow-400 animate-pulse' : 
            'bg-red-400'
          }`} />
          <span className="text-white text-xs md:text-sm font-medium">
            {isConnecting ? 'Connecting..' : 
             isConnected ? (connectionLabel || 'Connected') : 
             connectionState === "disconnected" ? 'Want to continue where we left off?' :
             'Disconnected'}
          </span>
          {agent?.preview_name && isConnected && (
            <span className="hidden sm:inline text-white/70 text-xs md:text-sm">• {agent.preview_name}</span>
          )}
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <Button 
            variant="ghost" 
            onClick={handleConnect}
            disabled={isConnecting}
            className="text-white hover:bg-white/10 text-xs md:text-sm px-2 md:px-4"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 animate-spin" />
            ) : isConnected ? (
              <PowerOff className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
            ) : (
              <Power className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
            )}
            <span className="hidden sm:inline">
              {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
            </span>
          </Button>
          
          {/* Add Reconnect Button like in main.js */}
          {connectionState === "disconnected" && (
            <Button 
              variant="outline" 
              onClick={handleReconnect}
              className="text-white border-white/30 hover:bg-white/10 bg-transparent text-xs md:text-sm px-2 md:px-4"
            >
              🔄 <span className="hidden sm:inline ml-1">Reconnect</span>
            </Button>
          )}
          
          <Button variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent text-xs md:text-sm px-2 md:px-4">
            <Share className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">SHARE</span>
          </Button>
          {/* Logout placed to the right of Share */}
          <SignOutButton 
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10 bg-transparent text-xs md:text-sm px-2 md:px-4"
          >
            LOGOUT
          </SignOutButton>
        </div>
      </header>

      <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100dvh-90px)] md:h-[calc(100dvh-120px)] px-2 md:px-6 pb-3 md:pb-6 gap-2 md:gap-4">
        {/* Left Section: Sidebar only (chatbox removed) */}
        <div className="hidden lg:flex lg:flex-col lg:w-20 gap-2 md:gap-4">
          {/* Left sidebar (volume, etc) - Mobile responsive */}
          <div className="w-full lg:w-20 flex flex-row lg:flex-col items-center justify-center lg:justify-start space-x-4 lg:space-x-0 lg:space-y-6 bg-black/20 rounded-2xl p-2 lg:p-4 backdrop-blur-sm border border-white/10 min-h-[60px] lg:min-h-[400px]">
            <div className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 bg-[#3533CD]/20 rounded-full">
              <Volume2 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            
            {/* Volume slider - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:flex flex-col items-center space-y-4 h-48">
              <span className="text-white text-xs font-medium">Volume</span>
              <div className="relative h-32 w-2 bg-white/10 rounded-full">
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-[#3533CD] to-blue-400 rounded-full transition-all duration-300"
                  style={{ height: `${volume[0]}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume[0]}
                  onChange={e => setVolume([parseInt(e.target.value)])}
                  className="absolute left-1/2 -translate-x-1/2 w-24 h-2 opacity-0 cursor-pointer"
                  style={{ bottom: 0, transform: 'rotate(-90deg) translateX(50%)', position: 'absolute' }}
                  aria-label="Volume"
                />
                <div
                  className="absolute w-4 h-4 bg-white rounded-full border-2 border-[#3533CD] -left-1 transition-all duration-300 cursor-pointer hover:scale-110"
                  style={{ bottom: `${volume[0]}%`, transform: "translateY(50%)" }}
                />
              </div>
              <span className="text-white text-xs bg-[#3533CD]/20 px-2 py-1 rounded-full">{volume[0]}%</span>
            </div>
            
            {/* Mobile volume display */}
            <div className="lg:hidden flex items-center space-x-2">
              <input
                type="range"
                min={0}
                max={100}
                value={volume[0]}
                onChange={e => setVolume([parseInt(e.target.value)])}
                className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer slider-mobile"
                aria-label="Volume"
                style={{
                  background: `linear-gradient(to right, #3533CD 0%, #3533CD ${volume[0]}%, rgba(255,255,255,0.1) ${volume[0]}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <span className="text-white text-xs bg-[#3533CD]/20 px-2 py-1 rounded-full">{volume[0]}%</span>
            </div>
            
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 lg:w-10 lg:h-10 rounded-full">
              <Settings className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
          </div>
        </div>

        {/* AI Character Display - replaced with D-ID Embed */}
        <div className="w-full lg:flex-1 lg:w-[60%] xl:w-[65%] flex flex-col justify-center h-full">
          <div className="flex items-center justify-center w-full h-full">
            <div
              className={`relative rounded-2xl bg-gradient-to-br from-[#3533CD]/20 to-blue-400/20 border-2 md:border-4 border-[#3533CD]/30 shadow-2xl overflow-hidden w-full h-full flex items-center justify-center transition-all duration-500 ${!isConnected ? 'blur-sm' : 'blur-0'}`}
              style={{ 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {/* Target container for D-ID Agent embed */}
              <div id="did-agent-root" className="absolute inset-0 w-full h-full" />
              {/* Inject D-ID Agent script */}
              <Script
                src="https://agent.d-id.com/v2/index.js"
                type="module"
                strategy="afterInteractive"
                data-mode="full"
                data-client-key="YXV0aDB8Njg3N2FlY2I5ZGVmYjJmMDliODdjYzg3OmpTUE1Da09VRlliYV85WEdseEVqRw=="
                data-agent-id="v2_agt_M5hi32Ap"
                data-name="did-agent"
                data-monitor="true"
                data-target-id="did-agent-root"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Custom scrollbar and mobile slider styles + iOS video fix */}
      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #3533CD #18181b;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: #18181b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3533CD;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
        
        /* Mobile slider styles */
        .slider-mobile::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3533CD;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider-mobile::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3533CD;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        /* iOS Video Fix - Prevent floating/fullscreen */
        video {
          -webkit-playsinline: true !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
          pointer-events: none !important;
        }
        
        video::-webkit-media-controls {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-fullscreen-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-play-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-timeline {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-volume-slider {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-mute-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
        
        video::-webkit-media-controls-current-time-display {
          display: none !important;
        }
        
        video::-webkit-media-controls-time-remaining-display {
          display: none !important;
        }

        /* Prevent iOS safari zoom on double tap */
        * {
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        button, input, textarea {
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  )
} 