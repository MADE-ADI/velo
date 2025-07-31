                                                  "use client"

import React, { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Send, Volume2, Settings, Menu, Share, Shuffle, Plus, Loader2, AlertCircle, Power, PowerOff, MessageSquare, VolumeX } from "lucide-react"
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
    isSupported: speechSupported,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript
  } = useSpeechRecognition()
  const [isInitialized, setIsInitialized] = useState(false)

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
    // Kirim ke agent
    if (inputMode === 'chat') {
      await chat(message)
    } else if (inputMode === 'speak') {
      await speak(message)
    }
    setPendingUserMessage(null)
    setShowThinking(false)
  }

  // Auto-handle voice input (langsung bubble user)
  useEffect(() => {
    if (transcript && isConnected && videoState === 'STOP') {
      setPendingUserMessage(transcript)
      setShowThinking(true)
      setInputMessage("")
      setTimeout(() => {
        if (inputMode === 'chat') {
          chat(transcript)
        } else {
          speak(transcript)
        }
        setPendingUserMessage(null)
        setShowThinking(false)
        resetTranscript()
      }, 500)
    }
  }, [transcript, isConnected, inputMode, chat, speak, resetTranscript, videoState])

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
      stopListening()
    } else {
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
    }

    if (isConnected) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isConnected, handleAction, videoState])

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
      <header className="relative z-10 flex items-center justify-between p-6">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Menu className="h-6 w-6" />
        </Button>

        {/* Connection Status - Matching main.js */}
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : 
            isConnecting ? 'bg-yellow-400 animate-pulse' : 
            'bg-red-400'
          }`} />
          <span className="text-white text-sm font-medium">
            {connectionLabel || (isConnected ? 'Online' : isConnecting ? 'Connecting..' : 'Disconnected')}
          </span>
          {agent?.preview_name && (
            <span className="text-white/70 text-sm">• {agent.preview_name}</span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={handleConnect}
            disabled={isConnecting}
            className="text-white hover:bg-white/10"
          >
            {isConnecting ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : isConnected ? (
              <PowerOff className="h-5 w-5 mr-2" />
            ) : (
              <Power className="h-5 w-5 mr-2" />
            )}
            {isConnecting ? 'Menghubungkan...' : isConnected ? 'Putuskan' : 'Hubungkan'}
          </Button>
          
          {/* Add Reconnect Button like in main.js */}
          {connectionState === "disconnected" && (
            <Button 
              variant="outline" 
              onClick={handleReconnect}
              className="text-white border-white/30 hover:bg-white/10 bg-transparent"
            >
              🔄 Reconnect
            </Button>
          )}
          
          <Button variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent">
            <Share className="h-4 w-4 mr-2" />
            SHARE
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-120px)] px-2 md:px-6 pb-6 gap-4">
        {/* Left Section: Sidebar + Chat Area - lebih kecil */}
        <div className="flex flex-col lg:flex-row lg:w-[40%] xl:w-[35%] gap-4">
          {/* Sidebar kiri (volume, dsb) */}
          <div className="w-full lg:w-20 flex flex-row lg:flex-col items-center space-x-4 lg:space-x-0 lg:space-y-6 bg-black/20 rounded-2xl p-2 lg:p-4 backdrop-blur-sm border border-white/10 min-h-[60px] lg:min-h-[400px]">
            <div className="flex items-center justify-center w-10 h-10 bg-[#3533CD]/20 rounded-full">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            {/* Volume slider */}
            <div className="flex flex-col items-center space-y-4 h-48">
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
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-10 h-10 rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {/* Chat Area - dibuat lebih compact */}
          <div className="flex-1 flex flex-col bg-black/30 rounded-2xl p-2 lg:p-4 shadow-lg min-h-[400px] lg:min-h-[600px] border border-white/10">
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
                    <Card className="p-4 bg-white text-black max-w-lg text-base md:text-lg shadow-md">
                      <p>{pendingUserMessage}</p>
                    </Card>
                  </div>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-purple-500 text-white">U</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            )}
            {/* All messages */}
            {messages.map((message, idx) => (
              <div key={message.id + idx} className={`flex ${message.role === 'user' ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'max-w-lg' : 'max-w-2xl'}`}>
                  {message.role !== 'user' && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={agent?.presenter?.preview_url || "/images/veco-character.png"} />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col flex-1">
                    <Card
                      className={`p-4 ${
                        message.role === 'user' ? "bg-white text-black max-w-lg text-base md:text-lg" : "bg-black/40 text-white border-white/20 text-base md:text-lg"
                      } shadow-md`}
                    >
                      {message.role === 'user' ? (
                        <p>{message.content}</p>
                      ) : (
                        <MarkdownRenderer 
                          content={message.content} 
                          className="text-base md:text-lg"
                        />
                      )}
                    </Card>
                    {/* Rating buttons tetap */}
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
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-purple-500 text-white">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            {/* AI sedang berpikir bubble */}
            {showThinking && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-2xl">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={agent?.presenter?.preview_url || "/images/veco-character.png"} />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <Card className="p-4 bg-black/40 text-white border-white/20 text-base md:text-lg shadow-md flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>AI sedang berpikir...</span>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Input Area - turunkan dengan margin-top lebih besar */}
          <div className="mt-8">
            {/* Input Mode Selection (Like index.html radio buttons) */}
            <div className="flex justify-center space-x-4 mb-4">
              <div className="flex items-center space-x-6 bg-black/40 rounded-full px-6 py-2 border border-[#3533CD]/30">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="chat"
                    checked={inputMode === 'chat'}
                    onChange={(e) => setInputMode(e.target.value as 'chat')}
                    className="sr-only"
                  />
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                    inputMode === 'chat' ? 'bg-[#3533CD] text-white' : 'text-white/60 hover:text-white'
                  }`}>
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Chat</span>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inputMode"
                    value="speak"
                    checked={inputMode === 'speak'}
                    onChange={(e) => setInputMode(e.target.value as 'speak')}
                    className="sr-only"
                  />
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                    inputMode === 'speak' ? 'bg-[#3533CD] text-white' : 'text-white/60 hover:text-white'
                  }`}>
                    <VolumeX className="h-4 w-4" />
                    <span className="text-sm font-medium">Speak</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Input Area with Voice Controls */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage || interimTranscript}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    videoState !== 'STOP' ? "🎬 Character sedang bicara... tunggu selesai" :
                    isListening ? "🎤 Sedang mendengarkan... (akan dikirim otomatis)" :
                    !speechSupported ? "Ketik pesan Anda..." :
                    isConnected ? `Ketik atau bicara untuk ${inputMode === 'chat' ? 'chat' : 'speak'} (voice auto-send)...` : 
                    "Hubungkan ke agent untuk mulai..."
                  }
                  disabled={!isConnected || isLoading || isListening || videoState !== 'STOP'}
                  className={`bg-black/40 border-[#3533CD]/30 text-white placeholder:text-white/60 pr-24 focus:border-[#3533CD] focus:ring-[#3533CD] disabled:opacity-50 ${
                    isListening ? 'border-green-400 shadow-green-400/20 shadow-lg' : ''
                  } ${
                    interimTranscript ? 'text-yellow-300' : ''
                  }`}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleAction()}
                />
                
                {/* Voice Controls */}
                <div className="absolute right-1 top-1 flex space-x-1">
                  {/* Speech to Text Button */}
                  {speechSupported && (
                    <Button
                      onClick={handleSpeechToText}
                      size="icon"
                      disabled={!isConnected || videoState !== 'STOP'}
                      className={`h-8 w-8 ${
                        isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
                        'bg-gray-600 hover:bg-gray-700'
                      } disabled:opacity-50`}
                      title={
                        videoState !== 'STOP' ? "Character sedang bicara, tunggu selesai" :
                        "Speech to Text (Auto-send setelah selesai bicara)"
                      }
                    >
                      {isListening ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* Voice Chat Toggle Button */}
                  {speechSupported && (
                    <Button
                      onClick={toggleVoiceChat}
                      size="icon"
                      disabled={!isConnected || videoState !== 'STOP'}
                      className={`h-8 w-8 ${
                        isVoiceChatMode ? 'bg-green-600 hover:bg-green-700' :
                        'bg-gray-600 hover:bg-gray-700'
                      } disabled:opacity-50`}
                      title={
                        videoState !== 'STOP' ? "Character sedang bicara, tunggu selesai" :
                        "Voice Chat Mode (Continuous Auto-send)"
                      }
                    >
                      <span className="text-xs">
                        {isVoiceChatMode ? '🎤' : '🎙️'}
                      </span>
                    </Button>
                  )}
                  
                  {/* Send Button */}
                  <Button
                    onClick={handleAction}
                    size="icon"
                    disabled={!isConnected || isLoading || (!inputMessage.trim() && !transcript) || videoState !== 'STOP'}
                    className="h-8 w-8 bg-[#3533CD] hover:bg-[#3533CD]/80 disabled:opacity-50"
                    title={
                      videoState !== 'STOP' ? "Character sedang bicara, tunggu selesai" :
                      `Send ${inputMode === 'chat' ? 'Chat' : 'Speak'} Message`
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Voice Status Indicator */}
            {speechSupported && (isListening || speechError || videoState !== 'STOP') && (
              <div className="mt-2 text-center">
                {videoState !== 'STOP' && (
                  <div className="flex items-center justify-center space-x-2 text-orange-400">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">🎬 Character sedang bicara... input dihentikan sementara</span>
                  </div>
                )}
                {isListening && videoState === 'STOP' && (
                  <div className="flex items-center justify-center space-x-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                    <span className="text-sm">Mendengarkan... (akan dikirim otomatis setelah selesai)</span>
                  </div>
                )}
                {speechError && (
                  <div className="text-red-400 text-sm">
                    {speechError}
                  </div>
                )}
              </div>
            )}

            {/* Keyboard Shortcuts Info */}
            {isConnected && (
              <div className="mt-2 text-center text-xs text-white/40">
                Tab: Switch mode • {videoState === 'STOP' ? 'Enter: Send' : 'Enter: Disabled (character talking)'} • 
                {speechSupported ? (videoState === 'STOP' ? " Voice: Auto-send setelah bicara" : " Voice: Disabled") : " Voice: Not supported"}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* AI Character Display - Area Besar di Kanan */}
        <div className="flex-1 lg:w-[60%] xl:w-[65%] flex flex-col items-center justify-start relative min-h-full pt-4">
          <div className="relative flex flex-col items-center justify-start w-full h-full">
            {/* Character Avatar - Full Size Rectangular Box */}
            <div className="flex items-center justify-center w-full h-auto">
              <div 
                className={`relative rounded-2xl bg-gradient-to-br from-[#3533CD]/20 to-blue-400/20 border-4 border-[#3533CD]/30 shadow-2xl overflow-hidden w-full h-[500px] lg:h-[550px] flex items-center justify-center transition-all duration-500 ${
                  !isConnected ? 'blur-sm' : 'blur-0'
                }`}
                style={{ 
                  backgroundImage: agent?.presenter?.thumbnail ? `url(${agent.presenter.thumbnail})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* D-ID Streaming Video - object-cover untuk zoom in dan pas dengan card */}
                <video
                  ref={streamVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-20 transition-opacity duration-300"
                  style={{ opacity: 0 }}
                />
                {/* D-ID Idle Video - object-cover untuk zoom in dan pas dengan card */}
                <video
                  ref={idleVideoRef}
                  autoPlay
                  loop
                  muted={false}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10 transition-opacity duration-300"
                  style={{ opacity: 0 }}
                />
                {/* Background Image - object-cover untuk zoom in dan pas dengan card */}
                <img
                  src={agent?.presenter?.thumbnail || agent?.presenter?.preview_url || "/images/veco-character.png"}
                  alt={agent?.preview_name || "AI Character"}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
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
            {/* Character Info dan Status info dihapus sesuai permintaan user */}
          </div>
        </div>
      </div>

      {/* Bottom Character Selection */}
      <div className="relative z-10 flex items-center justify-center space-x-4 pb-6">
        {characters.map((character) => (
          <Button
            key={character.id}
            variant="ghost"
            size="icon"
            onClick={() => setSelectedCharacter(character.id)}
            className={`w-12 h-12 rounded-full p-0 ${
              selectedCharacter === character.id ? "ring-2 ring-[#3533CD]" : ""
            }`}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={character.avatar || "/placeholder.svg"} />
              <AvatarFallback>{character.name[0]}</AvatarFallback>
            </Avatar>
          </Button>
        ))}

        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-[#3533CD] hover:bg-[#3533CD]/80">
          <Plus className="h-6 w-6 text-white" />
        </Button>

        <Button variant="outline" className="text-white border-[#3533CD]/30 hover:bg-[#3533CD]/10 ml-4 bg-transparent">
          <Shuffle className="h-4 w-4 mr-2" />
          SHUFFLE
        </Button>
      </div>
      {/* Custom scrollbar style */}
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
      `}</style>
    </div>
  )
} 