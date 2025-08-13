import { useState, useEffect, useRef, useCallback } from 'react'

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

// Extended SpeechRecognition interface for better browser support
interface ExtendedSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: ExtendedSpeechRecognition, ev: Event) => void) | null
  onend: ((this: ExtendedSpeechRecognition, ev: Event) => void) | null
  onresult: ((this: ExtendedSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: ExtendedSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface ExtendedWindow extends Window {
  webkitSpeechRecognition: any
  SpeechRecognition: any
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<ExtendedSpeechRecognition | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const extWindow = window as ExtendedWindow
    const SpeechRecognition = extWindow.SpeechRecognition || extWindow.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      
      const recognition = new SpeechRecognition() as ExtendedSpeechRecognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'id-ID' // Indonesian, bisa diganti ke 'en-US' untuk English
      
      recognition.onstart = () => {
        console.log('Speech recognition started')
        setIsListening(true)
        setError(null)
      }
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Process all results like webSpeechAPI.js
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          }
        }
        
        if (finalTranscript) {
          // Append to existing transcript like webSpeechAPI.js
          setTranscript(prev => (prev + ' ' + finalTranscript).trim())
          console.log('Final transcript:', finalTranscript.trim())
        }
      }
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        console.log('Speech recognition ended')
        setIsListening(false)
        setIsPaused(false)
        setInterimTranscript('')
        
        // Clear timeout like webSpeechAPI.js reset function
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
      
      recognitionRef.current = recognition
    } else {
      setIsSupported(false)
      console.warn('Speech Recognition not supported in this browser')
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isListening, isPaused])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not supported')
      return
    }
    
    if (isListening) {
      console.log('Already listening...')
      return
    }
    
    try {
      setTranscript('')
      setInterimTranscript('')
      setError(null)
      setIsPaused(false)
      recognitionRef.current.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setError('Failed to start speech recognition')
    }
  }, [isSupported, isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const pauseListening = useCallback(() => {
    if (isListening) {
      setIsPaused(true)
      console.log('Speech recognition paused')
    }
  }, [isListening])

  const resumeListening = useCallback(() => {
    if (isListening && isPaused) {
      setIsPaused(false)
      console.log('Speech recognition resumed')
    }
  }, [isListening, isPaused])

  const toggleListening = useCallback(() => {
    if (isListening) {
      if (isPaused) {
        resumeListening()
      } else {
        pauseListening()
      }
    } else {
      startListening()
    }
  }, [isListening, isPaused, startListening, pauseListening, resumeListening])

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setIsPaused(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isListening])

  return {
    // State
    isListening,
    isPaused,
    isSupported,
    transcript,
    interimTranscript,
    error,
    
    // Actions
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    toggleListening,
    resetTranscript
  }
} 