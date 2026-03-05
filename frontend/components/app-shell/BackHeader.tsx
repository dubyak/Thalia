'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackHeaderProps {
  title?: string
  onBack?: () => void
  closeButton?: boolean
  dark?: boolean
  transparent?: boolean
}

export function BackHeader({
  title,
  onBack,
  closeButton = false,
  dark = false,
  transparent = false
}: BackHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center h-[56px] px-4 gap-3',
        transparent ? 'bg-transparent' : dark ? 'bg-[#083032]' : 'bg-white',
        !transparent && 'border-b',
        !transparent && !dark && 'border-[#e5e5e5]',
        !transparent && dark && 'border-[#1d6d70]'
      )}
    >
      <button
        onClick={handleBack}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-full touch-active',
          dark ? 'text-white hover:bg-white/10' : 'text-[#1f1c2f] hover:bg-[#f5f6f0]'
        )}
      >
        {closeButton ? <X size={22} /> : <ArrowLeft size={22} />}
      </button>
      {title && (
        <span
          className={cn(
            'font-semibold text-[16px] flex-1',
            dark ? 'text-white' : 'text-[#1f1c2f]'
          )}
        >
          {title}
        </span>
      )}
    </div>
  )
}
