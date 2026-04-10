'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SendHorizonal, Camera, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
const SpeechRecognition: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined

interface ChatInputProps {
  onSend: (message: string) => void
  onImageSend?: (dataUrl: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onImageSend, disabled, placeholder = 'Type your message...' }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Speech recognition state
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [hasUsedShiftEnter, setHasUsedShiftEnter] = useState(false)
  const recognitionRef = useRef<any>(null)
  const hasSpeech = typeof SpeechRecognition !== 'undefined'

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey && !hasUsedShiftEnter) {
      setHasUsedShiftEnter(true)
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [value])

  // Camera: open file picker / camera
  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageSend) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onImageSend(dataUrl)
    }
    reader.readAsDataURL(file)

    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  // Microphone: speech recognition
  const prefixRef = useRef('')
  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) return

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // Capture whatever is already in the input so we can append to it
    prefixRef.current = value.trim()

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setValue(prefixRef.current ? prefixRef.current + ' ' + transcript : transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onerror = (e: any) => {
      console.warn('Speech recognition error:', e.error)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setSpeechError('Voice not available — try Safari on iOS')
        setTimeout(() => setSpeechError(null), 3000)
      }
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch (err) {
      console.warn('Speech recognition start failed:', err)
      recognitionRef.current = null
    }
  }, [isListening, value])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return (
    <div className="relative flex items-center gap-2 px-3 py-3 bg-white border-t border-[#F1F5F9]">
      {/* Hidden file input for camera / photo picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Camera button — orange-tinted circle */}
      <button
        type="button"
        onClick={handleCameraClick}
        disabled={disabled}
        className="flex items-center justify-center flex-shrink-0 touch-active"
        style={{ width: 36, height: 36, borderRadius: 15, background: '#FBE9DD' }}
      >
        <Camera size={18} className="text-[#F06F14]" />
      </button>

      {/* Shift+Enter hint */}
      {value.length > 0 && !hasUsedShiftEnter && !isListening && !speechError && (
        <div className="absolute bottom-full left-0 right-0 flex items-center justify-center pb-1 pointer-events-none">
          <span className="text-xs text-[#c2c6c0] bg-white px-2 py-0.5 rounded-full">
            Shift + Enter for new line
          </span>
        </div>
      )}

      {/* Input field */}
      <div className="flex-1 flex items-center px-3" style={{ height: 36, borderRadius: 10, background: '#F8FAFC' }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-[#314329] text-sm placeholder:text-[#c2c6c0] focus:outline-none resize-none leading-relaxed"
          style={{ maxHeight: '120px' }}
        />
      </div>

      {/* Microphone button — teal-tinted circle */}
      {hasSpeech && (
        <>
          {isListening && (
            <div className="absolute bottom-full left-0 right-0 flex items-center justify-center pb-1 animate-fade-in pointer-events-none">
              <span className="text-xs text-[#1a989e] font-semibold bg-white px-3 py-1 rounded-full shadow-sm border border-[#d2f2f4]">
                Listening... tap mic to stop
              </span>
            </div>
          )}
          {speechError && (
            <div className="absolute bottom-full left-0 right-0 flex items-center justify-center pb-1 animate-fade-in pointer-events-none">
              <span className="text-xs text-[#f06f14] font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-[#fbe9dd]">
                {speechError}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={cn(
              'flex items-center justify-center flex-shrink-0 transition-all touch-active',
              isListening && 'animate-pulse'
            )}
            style={{
              width: 36,
              height: 36,
              borderRadius: 15,
              background: isListening ? '#1a989e' : '#D2F2F4',
            }}
          >
            <Mic size={18} className={isListening ? 'text-white' : 'text-[#1a989e]'} />
          </button>
        </>
      )}

      {/* Send button — orange circle */}
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className={cn(
          'flex items-center justify-center flex-shrink-0 transition-all touch-active',
          value.trim() && !disabled ? 'text-white active:scale-95' : 'text-[#c2c6c0]'
        )}
        style={{
          width: 36,
          height: 36,
          borderRadius: 15,
          background: value.trim() && !disabled ? '#F06F14' : '#E5E5E5',
        }}
      >
        <SendHorizonal size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}
