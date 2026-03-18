'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/contexts/CustomerContext'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function NamePage() {
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
        console.warn('Supabase insert failed:', data.error)
      }
      customerDispatch({
        type: 'SET_NAME',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customerId: data.customerId || undefined
      })
    } catch (err) {
      console.warn('Failed to create customer record:', err)
      customerDispatch({
        type: 'SET_NAME',
        firstName: firstName.trim(),
        lastName: lastName.trim()
      })
    }

    router.push('/survey')
  }

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0

  return (
    <div className="flex flex-col min-h-dvh bg-[#083032]">
      <StatusBar dark />

      {/* Logo area */}
      <div className="flex flex-col items-center pt-16 pb-10">
        <div className="w-16 h-16 rounded-2xl bg-[#1a989e] flex items-center justify-center mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl tracking-tight">T</span>
        </div>
        <h1 className="text-white text-2xl font-semibold">{t('login.brand')}</h1>
        <p className="text-[#20bec6] text-sm mt-1 font-light">{t('login.tagline')}</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-[#f5f6f0] rounded-t-3xl px-6 pt-8">
        <h2 className="text-[#1f1c2f] text-xl font-semibold mb-1">{t('login.welcome')}</h2>
        <p className="text-[#676d65] text-sm mb-8 font-light">
          {t('login.subtitle')}
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="first-name" className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('login.firstName')}
            </label>
            <input
              id="first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
              placeholder={t('login.firstNamePlaceholder')}
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="last-name" className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('login.lastName')}
            </label>
            <input
              id="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
              placeholder={t('login.lastNamePlaceholder')}
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base disabled:opacity-40 active:opacity-80 transition-opacity shadow-md"
          >
            {loading ? t('login.submitting') : t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
