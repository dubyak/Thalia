'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTester } from '@/contexts/TesterContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageToggle } from '@/components/app-shell/LanguageToggle'

export default function LandingPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setTesterByCode } = useTester()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSubmit = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')

    await new Promise((r) => setTimeout(r, 400))

    const success = setTesterByCode(code.trim())
    if (success) {
      router.push('/login')
    } else {
      setError(t('landing.invalidCode'))
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#083032]">
      {/* Language toggle — top right */}
      <div className="flex justify-end px-5 pt-3">
        <LanguageToggle dark />
      </div>

      {/* Logo area */}
      <div className="flex flex-col items-center pt-10 pb-10">
        <div className="w-16 h-16 rounded-2xl bg-[#1a989e] flex items-center justify-center mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl tracking-tight">T</span>
        </div>
        <h1 className="text-white text-2xl font-semibold">Tala</h1>
        <p className="text-[#20bec6] text-sm mt-1 font-light">{t('landing.tagline')}</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-[#f5f6f0] rounded-t-3xl px-6 pt-8">
        <h2 className="text-[#1f1c2f] text-xl font-semibold mb-1">{t('landing.title')}</h2>
        <p className="text-[#676d65] text-sm mb-8 font-light">
          {t('landing.subtitle')}
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="access-code" className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('landing.accessCode')}
            </label>
            <input
              id="access-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && code.trim() && handleSubmit()}
              placeholder={t('landing.placeholder')}
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-[#ff2056] text-sm font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base disabled:opacity-40 active:opacity-80 transition-opacity shadow-md"
          >
            {loading ? t('landing.verifying') : t('landing.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
