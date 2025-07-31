import { useState, useEffect, useRef, useCallback } from 'react'

// Extended SpeechRecognition interface for better browser support
interface ExtendedSpeechRecognition extends SpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
}

interface ExtendedWindow extends Window {
  webkitSpeechRecognition: any
  SpeechRecognition: any
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false)
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
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript.trim())
          setInterimTranscript('')
          console.log('Final transcript:', finalTranscript.trim())
        } else {
          setInterimTranscript(interimTranscript)
        }
        
        // Auto-stop after 2 seconds of silence for faster response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          if (recognition && isListening) {
            recognition.stop()
          }
        }, 2000) // Reduced from 3000ms to 2000ms for faster auto-send
      }
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        console.log('Speech recognition ended')
        setIsListening(false)
        setInterimTranscript('')
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
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
  }, [isListening])

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

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
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
    isSupported,
    transcript,
    interimTranscript,
    error,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    resetTranscript
  }
} 