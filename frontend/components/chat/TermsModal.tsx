'use client'

import { useState } from 'react'
import { CheckSquare, Square, Shield } from 'lucide-react'
import { useTester } from '@/contexts/TesterContext'
import { useLocale } from '@/contexts/LocaleContext'
import { calculateLoan, formatMXN, getSmartDueDates } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { LoanConfig } from '@/lib/types'

interface TermsModalProps {
  open: boolean
  amount: number
  installments: 1 | 2
  onClose: () => void
  onAccept: (loanConfig: LoanConfig) => void
}

const TERMS = [
  {
    id: 'credit-agreement',
    text: 'I accept the Simple Credit Agreement, including the loan amount, term, daily interest rate, applicable fees, and the established payment schedule.'
  },
  {
    id: 'privacy-policy',
    text: 'I accept the Privacy Policy and authorize Tala to send me notifications related to my account, payments, and available products through registered channels.'
  },
  {
    id: 'data-authorization',
    text: 'I expressly authorize TALA to discount, endorse, assign, or transfer the collection rights arising from this agreement, in accordance with applicable law.'
  }
]

const TERMS_ES = [
  {
    id: 'credit-agreement',
    text: 'Acepto el Contrato de Crédito Simple, incluyendo el monto del crédito, plazo, tasa de interés diaria, comisiones aplicables y el calendario de pagos establecido.'
  },
  {
    id: 'privacy-policy',
    text: 'Acepto el Aviso de Privacidad y autorizo a Tala a enviarme notificaciones relacionadas con mi cuenta, pagos y productos disponibles a través de los canales registrados.'
  },
  {
    id: 'data-authorization',
    text: 'Autorizo expresamente a TALA a descontar, endosar, ceder o transferir los derechos de cobro derivados de este contrato, de conformidad con la ley aplicable.'
  }
]

export function TermsModal({ open, amount, installments, onClose, onAccept }: TermsModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const { tester } = useTester()
  const { locale } = useLocale()
  const isEs = locale === 'es-MX'
  const terms = isEs ? TERMS_ES : TERMS

  if (!open) return null

  const allChecked = terms.every((t) => checked[t.id])

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const dueDateOptions = getSmartDueDates()
  const defaultDueDate = dueDateOptions.find(d => d.recommended)?.date ?? dueDateOptions[0]?.date

  const loan = calculateLoan(
    amount,
    installments,
    tester?.interestRateDaily ?? 0.0028,
    tester?.processingFeeRate ?? 0.04,
    locale,
    defaultDueDate
  )

  const handleAccept = async () => {
    if (!allChecked) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    onAccept(loan)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Full-viewport fixed wrapper that mirrors the app shell's centering */}
      <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
        <div
          className="bg-white flex flex-col overflow-hidden animate-slide-up rounded-t-3xl sm:rounded-3xl pointer-events-auto"
          style={{
            width: 'min(100vw, var(--app-max-width))',
            maxWidth: 'var(--app-max-width)',
            height: '85dvh',
          }}
        >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#e5e5e5]" />
        </div>

        <div className="flex-1 overflow-y-auto px-0">
          {/* Header */}
          <div className="px-5 pt-2 pb-4 border-b border-[#f0f0f0]">
            <h2 className="text-lg font-bold text-[#1f1c2f]">{isEs ? 'Términos y condiciones' : 'Terms and conditions'}</h2>
          </div>

          {/* Loan summary pill */}
          <div className="mx-4 mt-5 mb-4 bg-[#083032] rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1a989e]/30 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-[#20bec6]" />
            </div>
            <div>
              <p className="text-[#20bec6] text-xs font-semibold uppercase tracking-wider">
                {isEs ? 'Tu crédito' : 'Your loan'}
              </p>
              <p className="text-white font-bold text-xl">{formatMXN(amount)}</p>
              <p className="text-[#939490] text-xs font-light">
                {installments} {installments === 1 ? (isEs ? 'pago' : 'payment') : (isEs ? 'pagos' : 'payments')} · {isEs ? 'Primer pago' : 'First payment'}: {loan.firstPaymentDate}
              </p>
            </div>
          </div>

          {/* Terms list */}
          <div className="mx-4 space-y-3 mb-4">
            {terms.map((term) => {
              const isChecked = !!checked[term.id]
              return (
                <button
                  key={term.id}
                  onClick={() => toggle(term.id)}
                  className={cn(
                    'w-full flex items-start gap-3 bg-white rounded-2xl p-4 border-2 text-left transition-all touch-active',
                    isChecked ? 'border-[#1a989e]' : 'border-[#e5e5e5]'
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isChecked
                      ? <CheckSquare size={20} className="text-[#1a989e]" />
                      : <Square size={20} className="text-[#c2c6c0]" />
                    }
                  </div>
                  <p className="text-sm text-[#676d65] font-light leading-relaxed">{term.text}</p>
                </button>
              )
            })}
          </div>

          {/* Credit bureau notice */}
          <div className="mx-4 mb-6 bg-[#f8fafc] rounded-xl px-4 py-3 border border-[#e5e5e5]">
            <p className="text-xs text-[#939490] font-light leading-relaxed">
              {isEs
                ? 'Al aceptar, autorizo a Tala México S.A. de C.V. SOFOM E.N.R. a consultar y reportar mi historial crediticio ante la Sociedad de Información Crediticia (Buró de Crédito), de conformidad con la Ley para Regular las Sociedades de Información Crediticia.'
                : 'By accepting, I authorize Tala México S.A. de C.V. SOFOM E.N.R. to consult and report my credit history to the Credit Information Society (Buró de Crédito), in accordance with the Law to Regulate Credit Information Societies.'}
            </p>
          </div>

          <div className="px-4 pb-8">
            <button
              onClick={handleAccept}
              disabled={!allChecked || loading}
              className={cn(
                'w-full h-14 rounded-xl font-semibold text-base transition-all shadow-md',
                allChecked
                  ? 'bg-[#f06f14] text-white active:opacity-80 touch-active'
                  : 'bg-[#e5e5e5] text-[#c2c6c0]'
              )}
            >
              {loading ? (isEs ? 'Procesando...' : 'Processing...') : (isEs ? 'Aceptar y continuar' : 'Accept and continue')}
            </button>
            {!allChecked && (
              <p className="text-center text-xs text-[#939490] mt-2 font-light">
                {isEs ? 'Acepta todos los términos para continuar' : 'Accept all terms to continue'}
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
