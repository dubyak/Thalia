import type { TesterProfile } from './types'

// Default tester profiles (used before Supabase is wired up)
export const DEFAULT_TESTERS: TesterProfile[] = [
  {
    id: 'tester-01',
    code: 'TESTER01',
    name: 'María López',
    firstName: 'María',
    approvedAmount: 8000,
    maxAmount: 12000,
    interestRateDaily: 0.0083,
    processingFeeRate: 0.0299,
    businessType: 'Retail / Grocery store',
    locale: 'es-MX'
  },
  {
    id: 'tester-02',
    code: 'TESTER02',
    name: 'Carlos Ramírez',
    firstName: 'Carlos',
    approvedAmount: 6000,
    maxAmount: 9000,
    interestRateDaily: 0.0083,
    processingFeeRate: 0.0299,
    businessType: 'Food / Taco shop',
    locale: 'es-MX'
  },
  {
    id: 'tester-03',
    code: 'TESTER03',
    name: 'Ana García',
    firstName: 'Ana',
    approvedAmount: 10000,
    maxAmount: 15000,
    interestRateDaily: 0.0070,
    processingFeeRate: 0.0299,
    businessType: 'Services / Beauty salon',
    locale: 'es-MX'
  },
  // Demo tester — Spanish (default for MX testers)
  {
    id: 'demo',
    code: 'DEMO',
    name: 'Isabel Torres',
    firstName: 'Isabel',
    approvedAmount: 8000,
    maxAmount: 12000,
    interestRateDaily: 0.0083,
    processingFeeRate: 0.0299,
    businessType: 'Retail',
    locale: 'es-MX'
  },
  // Demo tester — English (for internal/English-language testing)
  {
    id: 'demo-en',
    code: 'DEMOEN',
    name: 'Isabel Torres',
    firstName: 'Isabel',
    approvedAmount: 8000,
    maxAmount: 12000,
    interestRateDaily: 0.0083,
    processingFeeRate: 0.0299,
    businessType: 'Retail',
    locale: 'en'
  }
]

// Mexican banks for cashout selection
export const MX_BANKS = [
  { id: 'bbva', name: 'BBVA', color: '#004481' },
  { id: 'banamex', name: 'Citibanamex', color: '#d4000e' },
  { id: 'santander', name: 'Santander', color: '#ec0000' },
  { id: 'banorte', name: 'Banorte', color: '#e2001a' },
  { id: 'hsbc', name: 'HSBC', color: '#db0011' },
  { id: 'scotiabank', name: 'Scotiabank', color: '#c8102e' },
  { id: 'inbursa', name: 'Inbursa', color: '#00537e' },
  { id: 'azteca', name: 'Banco Azteca', color: '#f7941d' },
  { id: 'nu', name: 'Nu', color: '#820ad1' },
  { id: 'other', name: 'Other bank', color: '#676d65' }
]

// ── Date helpers for MX installments flow ──

/** Get smart due-date options within 15-45 days from today (1st or 16th of month) */
export function getSmartDueDates(): { date: Date; recommended: boolean }[] {
  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + 15)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 45)

  const candidates: { date: Date; recommended: boolean }[] = []

  // Check 1st and 16th of each month in the window
  for (let m = minDate.getMonth(); m <= maxDate.getMonth() + (maxDate.getFullYear() > minDate.getFullYear() ? 12 : 0); m++) {
    const year = minDate.getFullYear() + Math.floor(m / 12)
    const month = m % 12
    for (const day of [1, 16]) {
      const d = new Date(year, month, day)
      if (d >= minDate && d <= maxDate) {
        candidates.push({ date: d, recommended: false })
      }
    }
  }

  // Mark the later date as recommended (more breathing room)
  if (candidates.length > 0) {
    candidates[candidates.length - 1].recommended = true
  }

  return candidates
}

/** Get second installment date: same day next month (with end-of-month fallback) */
export function getSecondInstallmentDate(firstDate: Date): Date {
  const next = new Date(firstDate)
  next.setMonth(next.getMonth() + 1)
  // End-of-month fallback: if the day doesn't exist (e.g. Jan 31 → Feb), roll to 1st of following month
  if (next.getDate() !== firstDate.getDate()) {
    next.setDate(1)
  }
  return next
}

/** Days between two dates */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/** Format a Date for display */
export function formatDate(date: Date, locale: string = 'es-MX'): string {
  const dateLocale = locale === 'es-MX' ? 'es-MX' : 'en-US'
  return date.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Format a Date as short display (e.g. "Apr 16") */
export function formatDateShort(date: Date, locale: string = 'es-MX'): string {
  const dateLocale = locale === 'es-MX' ? 'es-MX' : 'en-US'
  return date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
}

// Calculate loan details from config
export function calculateLoan(
  amount: number,
  installments: 1 | 2,
  interestRateDaily: number,
  processingFeeRate: number,
  locale: string = 'es-MX',
  firstDueDate?: Date
) {
  const today = new Date()
  const dateLocale = locale === 'es-MX' ? 'es-MX' : 'en-US'

  // Use provided first due date or default to 30 days from today
  const firstPayment = firstDueDate ?? new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const daysToFirst = daysBetween(today, firstPayment)

  let totalDays: number
  let secondPayment: Date | undefined
  if (installments === 2) {
    secondPayment = getSecondInstallmentDate(firstPayment)
    totalDays = daysBetween(today, secondPayment)
  } else {
    totalDays = daysToFirst
  }

  const interest = amount * interestRateDaily * totalDays
  const iva = interest * 0.16
  const processingFee = amount * processingFeeRate
  const feeIva = processingFee * 0.16
  const totalRepayment = amount + interest + iva + processingFee + feeIva
  const monthlyPayment = totalRepayment / installments

  const disbursementDate = today.toLocaleDateString(dateLocale, {
    month: 'long',
    day: 'numeric'
  })
  const firstPaymentDate = firstPayment.toLocaleDateString(dateLocale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  const secondPaymentDate = secondPayment?.toLocaleDateString(dateLocale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return {
    amount,
    installments,
    interestRateDaily,
    processingFee: processingFee + feeIva,
    iva,
    totalRepayment,
    monthlyPayment,
    disbursementDate,
    firstPaymentDate,
    secondPaymentDate,
    daysToFirst,
    totalDays,
    firstDueDate: firstPayment,
  }
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}
