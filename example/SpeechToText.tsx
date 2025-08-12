'use client';

import { useState, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function SpeechToText() {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'id-ID'; // Bahasa Indonesia

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setText(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };
    }

    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const clearText = useCallback(() => {
    setText('');
  }, []);

  if (!isSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">
          Speech Recognition tidak didukung oleh browser Anda. 
          Silakan gunakan browser yang mendukung seperti Chrome atau Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Speech to Text
        </h1>
        
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={startListening}
              disabled={isListening}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isListening
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isListening ? 'Sedang Mendengarkan...' : 'Mulai Rekam'}
            </button>
            
            <button
              onClick={stopListening}
              disabled={!isListening}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                !isListening
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Stop
            </button>
            
            <button
              onClick={clearText}
              className="px-6 py-3 rounded-lg font-semibold bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              Bersihkan
            </button>
          </div>

          {/* Status Indicator */}
          <div className="flex justify-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isListening 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isListening ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
              {isListening ? 'Aktif' : 'Tidak Aktif'}
            </div>
          </div>

          {/* Text Output */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Hasil Transkripsi:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Teks hasil speech-to-text akan muncul di sini..."
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Instruksi:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Klik &quot;Mulai Rekam&quot; untuk memulai pengenalan suara</li>
              <li>• Berbicara dengan jelas ke mikrofon</li>
              <li>• Klik &quot;Stop&quot; untuk berhenti merekam</li>
              <li>• Gunakan &quot;Bersihkan&quot; untuk menghapus teks</li>
              <li>• Browser akan meminta izin akses mikrofon</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
