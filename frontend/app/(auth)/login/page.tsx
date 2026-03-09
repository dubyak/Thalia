'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTester } from '@/contexts/TesterContext'
import { useFlow } from '@/contexts/FlowContext'
import { StatusBar } from '@/components/app-shell/StatusBar'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setTesterByCode } = useTester()
  const { flow } = useFlow()
  const router = useRouter()

  const handleLogin = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')

    await new Promise((r) => setTimeout(r, 600))

    const success = setTesterByCode(code.trim())
    if (success) {
      // Resume from where they left off
      if (flow.disbursementComplete) {
        router.replace('/home')
      } else if (flow.termsAccepted) {
        router.replace('/cashout')
      } else if (flow.onboardingComplete) {
        router.replace('/offer')
      } else if (flow.msmeOptIn) {
        router.replace('/onboarding')
      } else {
        router.replace('/survey')
      }
    } else {
      setError('Invalid code. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#083032]">
      <StatusBar dark />

      {/* Logo area */}
      <div className="flex flex-col items-center pt-16 pb-10">
        <div className="w-16 h-16 rounded-2xl bg-[#1a989e] flex items-center justify-center mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl tracking-tight">T</span>
        </div>
        <h1 className="text-white text-2xl font-semibold">Tala</h1>
        <p className="text-[#20bec6] text-sm mt-1 font-light">MSME Prototype · Mexico</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-[#f5f6f0] rounded-t-3xl px-6 pt-8">
        <h2 className="text-[#1f1c2f] text-xl font-semibold mb-1">Welcome</h2>
        <p className="text-[#676d65] text-sm mb-8 font-light">
          Enter your test code to get started.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              Access code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="e.g. TESTER01"
              className="w-full h-14 rounded-xl border-2 border-[#d8d4c3] bg-white px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <p className="text-[#ff2056] text-sm font-medium">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={!code.trim() || loading}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base disabled:opacity-40 active:opacity-80 transition-opacity shadow-md"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </div>

        <p className="text-[#939490] text-xs text-center mt-8 font-light">
          Try <span className="font-medium text-[#676d65]">DEMO</span> to see the complete flow
        </p>
      </div>
    </div>
  )
}
