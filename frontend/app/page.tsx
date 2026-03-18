'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/contexts/CustomerContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageToggle } from '@/components/app-shell/LanguageToggle'

export default function LandingPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const { dispatch: customerDispatch } = useCustomer()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) return

    setLoading(true)

    try {
      // Call Route Handler to insert Supabase customer record
      const response = await fetch('/api/customer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Graceful fallback: proceed even if Supabase insert fails
        console.warn('Supabase insert failed:', data.error)
      }

      // Store name in context (with or without customerId)
      customerDispatch({
        type: 'SET_NAME',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customerId: data.customerId || undefined
      })

      // Navigate to login
      router.push('/login')
    } catch (err) {
      // Graceful fallback on network error
      console.warn('Failed to create customer record:', err)
      customerDispatch({
        type: 'SET_NAME',
        firstName: firstName.trim(),
        lastName: lastName.trim()
      })
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0

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
            <label htmlFor="first-name" className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('landing.firstName')}
            </label>
            <input
              id="first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
              placeholder={t('landing.firstNamePlaceholder')}
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="last-name" className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('landing.lastName')}
            </label>
            <input
              id="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
              placeholder={t('landing.lastNamePlaceholder')}
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base disabled:opacity-40 active:opacity-80 transition-opacity shadow-md"
          >
            {loading ? t('landing.submitting') : t('landing.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
