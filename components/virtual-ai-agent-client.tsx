                                                  "use client"

import React, { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Send, Volume2, Settings, Menu, Share, Shuffle, Plus, Loader2, AlertCircle, Power, PowerOff, MessageSquare, VolumeX, Wifi, WifiOff } from "lucide-react"
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
  const [inputMode, setInputMode] = useState<'chat' | 'speak'>('chat') // Like index.html radio buttons
  const [isVoiceChatMode, setIsVoiceChatMode] = useState(false) // Continuous voice chat
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const [showThinking, setShowThinking] = useState(false)

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

  // Initialize connection on mount - only in browser
  useEffect(() => {
    if (isBrowser && !isInitialized) {
      connect().then(() => {
        setIsInitialized(true)
      })
    }
  }, [connect, isInitialized, isBrowser])

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, pendingUserMessage, showThinking])

  // Handle user input (text/voice) - show bubble immediately
  const handleAction = async () => {
    const message = inputMessage.trim()
    if (!message || !isConnected || videoState !== 'STOP') return
    setPendingUserMessage(message)
    setShowThinking(true)
    setInputMessage("")
    // Reset transcript when sending message
    resetTranscript()
    // Kirim ke agent
    if (inputMode === 'chat') {
      await chat(message)
    } else if (inputMode === 'speak') {
      await speak(message)
    }
    setPendingUserMessage(null)
    setShowThinking(false)
  }

  // Handle voice input - put transcript in input field without auto-send
  useEffect(() => {
    if (transcript && isConnected && videoState === 'STOP') {
      setInputMessage(transcript)
      // Don't reset transcript here to allow accumulation
    }
  }, [transcript, isConnected, videoState])

  const toggleRecording = () => {
    if (!speechSupported) {
      console.warn('Speech recognition not supported')
      return
    }
    
    toggleListening()
    setIsRecording(!isRecording)
  }

  // Handle voice toggle like in index.html
  const toggleVoiceChat = () => {
    setIsVoiceChatMode(!isVoiceChatMode)
    if (!isVoiceChatMode) {
      // Start continuous voice chat
      if (!isListening) {
        startListening()
      }
    } else {
      // Stop continuous voice chat
      if (isListening) {
        stopListening()
      }
    }
  }

  // Handle speech to text like webSpeechAPI.js
  const handleSpeechToText = () => {
    if (!speechSupported) {
      console.warn('Speech recognition not supported')
      return
    }
    
    if (isListening) {
      if (isPaused) {
        // Resume if paused
        resumeListening()
      } else {
        // Pause if currently listening
        pauseListening()
      }
    } else {
      // Clear input and reset transcript when starting new recording
      setInputMessage("")
      resetTranscript()
      startListening()
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

  // Handle keyboard shortcuts like main.js
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tab key to switch modes (like main.js)
      if (event.key === 'Tab') {
        event.preventDefault()
        setInputMode(prev => prev === 'chat' ? 'speak' : 'chat')
      }
      
      // Enter key to send message (like main.js) - only if character not talking
      if (event.key === 'Enter' && !event.shiftKey && videoState === 'STOP') {
        event.preventDefault()
        handleAction()
      }
      
      // ESC key to stop voice input
      if (event.key === 'Escape' && isListening) {
        event.preventDefault()
        stopListening()
      }
    }

    if (isConnected) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
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

        {/* Connection Status - Mobile responsive */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : 
            isConnecting ? 'bg-yellow-400 animate-pulse' : 
            'bg-red-400'
          }`} />
          <span className="text-white text-xs md:text-sm font-medium">
            {connectionLabel || (isConnected ? 'Online' : isConnecting ? 'Connecting..' : 'Disconnected')}
          </span>
          {agent?.preview_name && (
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

      <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-100px)] md:h-[calc(100vh-120px)] px-2 md:px-6 pb-3 md:pb-6 gap-2 md:gap-4">
        {/* Left Section: Sidebar + Chat Area - Mobile responsive */}
        <div className="flex flex-col lg:flex-row w-full lg:w-[40%] xl:w-[35%] gap-2 md:gap-4">
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
          
          
          {/* Chat Area - Mobile responsive */}
          <div className="flex-1 flex flex-col bg-black/30 rounded-2xl p-3 lg:p-4 shadow-lg min-h-[250px] md:min-h-[350px] lg:min-h-[500px] border border-white/10">
          {/* Error Display */}
          {error && (
            <Card className="p-4 mb-4 bg-red-500/20 border-red-500/30 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-200 text-sm flex-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="text-red-200 hover:bg-red-500/20"
                >
                  ✕
                </Button>
              </div>
            </Card>
          )}
          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 space-y-4 overflow-y-auto mb-6 px-2 md:px-4 py-4 custom-scrollbar"
            style={{ minHeight: 0, maxHeight: '60vh' }}
          >
            {/* Pending user message bubble (langsung muncul) */}
            {pendingUserMessage && (
              <div className="flex justify-end">
                <div className="flex items-start space-x-3 max-w-lg">
                  <div className="flex flex-col flex-1">
                    <Card className="p-4 mb-4 bg-gradient-to-r from-[#1e2761] to-[#3a8dde] rounded-2xl shadow-lg border-0">
                      <p className="text-white text-base leading-relaxed font-medium">{pendingUserMessage}</p>
                    </Card>
                  </div>
                  <Avatar className="w-8 h-8 flex-shrink-0 pointer-events-none select-none">
                    <AvatarFallback className="bg-purple-500 text-white pointer-events-none select-none">U</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            )}
            {/* All messages */}
            {messages.map((message, idx) => (
              <div key={message.id + idx} className={`flex ${message.role === 'user' ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'max-w-lg' : 'max-w-2xl'}`}>
                  {message.role !== 'user' && (
                    <Avatar className="w-8 h-8 flex-shrink-0 pointer-events-none select-none">
                      <AvatarImage 
                        src={agent?.presenter?.preview_url || "/images/veco-character.png"} 
                        className="pointer-events-none select-none"
                        draggable={false}
                      />
                      <AvatarFallback className="pointer-events-none select-none">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col flex-1">
                    <Card
                                            className={`${
                         message.role === 'user'
                           ? "p-4 mb-4 bg-gradient-to-r from-[#1e2761] to-[#3a8dde] rounded-2xl shadow-lg border-0"
                           : "p-4 bg-black/40 text-white border-white/20 text-base md:text-lg shadow-md rounded-xl"
                       }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-white text-base leading-relaxed font-medium">{message.content}</p>
                      ) : (
                        <MarkdownRenderer 
                          content={message.content} 
                          className="text-base md:text-lg"
                        />
                      )}
                    </Card>
                    {/* Rating buttons */}
                    {message.role === 'assistant' && (
                      <div className="flex space-x-2 mt-2 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rate(message.id, 1)}
                          className="text-white/60 hover:text-green-400 hover:bg-white/10"
                          title="Rate positive"
                        >
                          👍
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rate(message.id, -1)}
                          className="text-white/60 hover:text-red-400 hover:bg-white/10"
                          title="Rate negative"
                        >
                          👎
                        </Button>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8 flex-shrink-0 pointer-events-none select-none">
                      <AvatarFallback className="bg-purple-500 text-white pointer-events-none select-none">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            {/* AI thinking bubble */}
            {showThinking && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-2xl">
                  <Avatar className="w-8 h-8 flex-shrink-0 pointer-events-none select-none">
                    <AvatarImage 
                      src={agent?.presenter?.preview_url || "/images/veco-character.png"} 
                      className="pointer-events-none select-none"
                      draggable={false}
                    />
                    <AvatarFallback className="pointer-events-none select-none">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <Card className="p-4 bg-black/40 text-white border-white/20 text-base md:text-lg shadow-md flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>AI is thinking...</span>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Input Area - Mobile responsive */}
          <div className="mt-4 md:mt-8">
            {/* Input Area with Voice Controls - Mobile responsive */}
            <div className="flex items-center space-x-1 md:space-x-2">
              <div className="flex-1 relative">
                  <Input
                  value={inputMessage || interimTranscript}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    videoState !== 'STOP' ? "🎬 Character is speaking..." :
                    isListening && !isPaused ? "🎤 Listening..." :
                    isListening && isPaused ? "⏸️ Paused - Click mic to resume..." :
                    !speechSupported ? "Type your message..." :
                    isConnected ? `Type to ${inputMode === 'chat' ? 'chat' : 'speak'}...` : 
                    "Connect to agent first..."
                  }
                  disabled={!isConnected || isLoading || (isListening && !isPaused) || videoState !== 'STOP'}
                  className={`bg-black/40 border-[#3533CD]/30 text-white placeholder:text-white/60 pr-16 md:pr-24 text-sm md:text-base focus:border-[#3533CD] focus:ring-[#3533CD] disabled:opacity-50 ${
                    isListening && !isPaused ? 'border-green-400 shadow-green-400/20 shadow-lg' : 
                    isPaused ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg' : ''
                  } ${
                    interimTranscript ? 'text-yellow-300' : ''
                  }`}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleAction()}
                />                {/* Voice Controls - Mobile responsive */}
                <div className="absolute right-1 top-1 flex space-x-0.5 md:space-x-1">
                                    {/* Speech to Text Button */}
                  {speechSupported && (
                    <Button
                      onClick={handleSpeechToText}
                      size="icon"
                      disabled={!isConnected || videoState !== 'STOP'}
                      className={`h-6 w-6 md:h-8 md:w-8 ${
                        isListening && !isPaused ? 'bg-green-600 hover:bg-green-700 animate-pulse' :
                        isPaused ? 'bg-yellow-600 hover:bg-yellow-700' :
                        'bg-gray-600 hover:bg-gray-700'
                      } disabled:opacity-50`}
                      title={
                        videoState !== 'STOP' ? "Character is speaking, please wait" :
                        isListening && !isPaused ? "Click to PAUSE listening" :
                        isPaused ? "Click to RESUME listening" :
                        "Speech to Text (Manual send after speaking)"
                      }
                    >
                      {isListening && !isPaused ? (
                        <div className="relative">
                          <Mic className="h-3 w-3 md:h-4 md:w-4" />
                        </div>
                      ) : isPaused ? (
                        <div className="h-3 w-3 md:h-4 md:w-4 bg-white rounded-sm" />
                      ) : (
                        <Mic className="h-3 w-3 md:h-4 md:w-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* Send Button */}
                  <Button
                    onClick={handleAction}
                    size="icon"
                    disabled={!isConnected || isLoading || (!inputMessage.trim() && !transcript) || videoState !== 'STOP'}
                    className="h-6 w-6 md:h-8 md:w-8 bg-[#3533CD] hover:bg-[#3533CD]/80 disabled:opacity-50"
                    title={
                      videoState !== 'STOP' ? "Character is speaking, please wait" :
                      `Send ${inputMode === 'chat' ? 'Chat' : 'Speak'} Message`
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </Button>
                  
                  {/* Send Button */}
                  <Button
                    onClick={handleAction}
                    size="icon"
                    disabled={!isConnected || isLoading || (!inputMessage.trim() && !transcript) || videoState !== 'STOP'}
                    className="h-6 w-6 md:h-8 md:w-8 bg-[#3533CD] hover:bg-[#3533CD]/80 disabled:opacity-50"
                    title={
                      videoState !== 'STOP' ? "Character is speaking, please wait" :
                      `Send ${inputMode === 'chat' ? 'Chat' : 'Speak'} Message`
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Voice Status Indicator - Mobile responsive */}
            {speechSupported && (isListening || isPaused || speechError || videoState !== 'STOP') && (
              <div className="mt-2 text-center px-2">
                {videoState !== 'STOP' && (
                  <div className="flex items-center justify-center space-x-2 text-orange-400">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span className="text-xs md:text-sm">🎬 Character is speaking...</span>
                  </div>
                )}
                {isListening && !isPaused && videoState === 'STOP' && (
                  <div className="flex flex-col items-center justify-center space-y-1 md:space-y-2">
                    <div className="flex items-center space-x-2 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                      <span className="text-xs md:text-sm">🎤 Listening...</span>
                    </div>
                    <div className="text-[10px] md:text-xs text-white/60">
                      Click 🎤 button to pause or press ESC to stop
                    </div>
                  </div>
                )}
                {isPaused && videoState === 'STOP' && (
                  <div className="flex flex-col items-center justify-center space-y-1 md:space-y-2">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-xs md:text-sm">⏸️ Recording Paused</span>
                    </div>
                    <div className="text-[10px] md:text-xs text-white/60">
                      Click 🎤 button to resume recording
                    </div>
                  </div>
                )}
                {speechError && (
                  <div className="text-red-400 text-xs md:text-sm">
                    {speechError}
                  </div>
                )}
              </div>
            )}

            {/* Keyboard Shortcuts Info - Mobile responsive */}
            {isConnected && (
              <div className="mt-2 text-center text-[10px] md:text-xs text-white/40 px-2">
                <div className="hidden md:block">
                  Tab: Switch mode • {videoState === 'STOP' ? 'Enter: Send' : 'Enter: Disabled'} • 
                  {speechSupported ? (videoState === 'STOP' ? " Voice: Manual send" : " Voice: Disabled") : " Voice: Not supported"}
                  {isListening && " • ESC: Stop voice"}
                </div>
                <div className="md:hidden">
                  {videoState === 'STOP' ? 'Tap Send' : 'Character talking'} • 
                  {speechSupported ? (videoState === 'STOP' ? "Voice: Manual send" : "Voice: Disabled") : "Voice: Not supported"}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* AI Character Display - Mobile responsive */}
        <div className="w-full lg:flex-1 lg:w-[60%] xl:w-[65%] flex flex-col justify-center h-full">
          <div className="flex items-center justify-center w-full h-full">
            <div 
              className={`relative rounded-2xl bg-gradient-to-br from-[#3533CD]/20 to-blue-400/20 border-2 md:border-4 border-[#3533CD]/30 shadow-2xl overflow-hidden w-full h-[300px] md:h-[400px] lg:h-full flex items-center justify-center transition-all duration-500 ${!isConnected ? 'blur-sm' : 'blur-0'}`}
              style={{ 
                backgroundImage: agent?.presenter?.thumbnail ? `url(${agent.presenter.thumbnail})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                pointerEvents: 'none' // Disable all click events including iOS popup
              }}
            >
                {/* D-ID Streaming Video - object-cover for zoom in and fit with card */}
                <video
                  ref={streamVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-20 transition-opacity duration-300"
                  style={{ opacity: 0, pointerEvents: 'none' }}
                />
                {/* D-ID Idle Video - object-cover for zoom in and fit with card */}
                <video
                  ref={idleVideoRef}
                  autoPlay
                  loop
                  muted={false}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10 transition-opacity duration-300"
                  style={{ opacity: 0, pointerEvents: 'none' }}
                />
                {/* Background Image - object-cover for zoom in and fit with card */}
                <img
                  src={agent?.presenter?.thumbnail || agent?.presenter?.preview_url || "/images/veco-character.png"}
                  alt={agent?.preview_name || "AI Character"}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
                  style={{ pointerEvents: 'none' }}
                  onError={e => { e.currentTarget.src = "/images/veco-character.png" }}
                />
                {/* Zoom-style overlay gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-30" />
                
                {/* Video State Indicator - Zoom style */}
                {videoState !== 'STOP' && (
                  <div className="absolute top-4 left-4 bg-red-500/90 text-white text-xs py-1 px-3 rounded-lg shadow-lg z-40 flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-medium">LIVE</span>
                  </div>
                )}
                
                {/* Connection Status Indicator - Bottom left like Zoom */}
                <div className="absolute bottom-4 left-4 z-40">
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium shadow-lg backdrop-blur-sm ${
                    isConnected ? 'bg-green-500/80 text-white' : 
                    isConnecting ? 'bg-yellow-500/80 text-white' : 
                    'bg-red-500/80 text-white'
                  }`}>
                    {agent?.preview_name || 'AI AGENT'}
                  </div>
                </div>

                {/* Audio/Mic indicator - Bottom right like Zoom */}
                <div className="absolute bottom-4 right-4 z-40 flex space-x-2">
                  {isListening && (
                    <div className="bg-green-500/80 text-white p-2 rounded-lg shadow-lg">
                      <Mic className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`p-2 rounded-lg shadow-lg ${
                    volume[0] > 0 ? 'bg-blue-500/80 text-white' : 'bg-red-500/80 text-white'
                  }`}>
                    {volume[0] > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </div>
                </div>
              </div>
            </div>
            {/* Character Info and Status info removed as per user request */}
          </div>
        </div>

      {/* Custom scrollbar and mobile slider styles */}
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
      `}</style>
    </div>
  )
} 