'use client'

import { Camera, FileText, X } from 'lucide-react'

interface PhotoUploadPromptProps {
  onUpload: () => void
  onSkip: () => void
}

export function PhotoUploadPrompt({ onUpload, onSkip }: PhotoUploadPromptProps) {
  return (
    <div className="mx-4 mb-3 bg-white rounded-2xl border border-[#e5e5e5] p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-semibold text-[#1f1c2f]">Share evidence (optional)</p>
        <button onClick={onSkip} className="text-[#939490] touch-active">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={onUpload}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#d8d4c3] touch-active active:border-[#1a989e]"
        >
          <Camera size={24} className="text-[#1a989e]" />
          <span className="text-xs text-[#676d65] font-medium">Business photo</span>
        </button>
        <button
          onClick={onUpload}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#d8d4c3] touch-active active:border-[#1a989e]"
        >
          <FileText size={24} className="text-[#1a989e]" />
          <span className="text-xs text-[#676d65] font-medium">Document</span>
        </button>
      </div>

      <button
        onClick={onSkip}
        className="w-full text-sm text-[#939490] font-medium py-2 touch-active"
      >
        Skip this step →
      </button>
    </div>
  )
}
