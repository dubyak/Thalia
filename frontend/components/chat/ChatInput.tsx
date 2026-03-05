'use client'

import { useState, useRef, useEffect } from 'react'
import { SendHorizonal, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = 'Escribe tu mensaje...' }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="flex items-center gap-2 px-3 py-3 bg-white border-t border-[#F1F5F9]">
      {/* Camera button — orange-tinted circle */}
      <button
        type="button"
        className="flex items-center justify-center flex-shrink-0 touch-active"
        style={{ width: 36, height: 36, borderRadius: 15, background: '#FBE9DD' }}
      >
        <Camera size={18} className="text-[#F06F14]" />
      </button>

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
