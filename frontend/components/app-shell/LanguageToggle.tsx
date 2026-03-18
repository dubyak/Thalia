'use client'

import { useLocale } from '@/contexts/LocaleContext'

interface LanguageToggleProps {
  dark?: boolean
}

export function LanguageToggle({ dark = false }: LanguageToggleProps) {
  const { locale, toggleLocale } = useLocale()

  const isEn = locale === 'en'

  return (
    <button
      onClick={toggleLocale}
      aria-label={isEn ? 'Switch to Spanish' : 'Cambiar a inglés'}
      className={`
        flex items-center h-8 rounded-full text-xs font-semibold tracking-wide transition-colors
        ${dark
          ? 'bg-white/10 text-white/90 active:bg-white/20'
          : 'bg-[#e8e8e6] text-[#1f1c2f] active:bg-[#d8d4c3]'
        }
      `}
    >
      <span
        className={`px-2.5 py-1 rounded-full transition-colors ${
          isEn
            ? dark ? 'bg-white/20 text-white' : 'bg-white text-[#1f1c2f] shadow-sm'
            : ''
        }`}
      >
        EN
      </span>
      <span
        className={`px-2.5 py-1 rounded-full transition-colors ${
          !isEn
            ? dark ? 'bg-white/20 text-white' : 'bg-white text-[#1f1c2f] shadow-sm'
            : ''
        }`}
      >
        ES
      </span>
    </button>
  )
}
