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
    interestRateDaily: 0.0028,
    processingFeeRate: 0.04,
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
    interestRateDaily: 0.0028,
    processingFeeRate: 0.04,
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
    interestRateDaily: 0.0025,
    processingFeeRate: 0.04,
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
    interestRateDaily: 0.0028,
    processingFeeRate: 0.04,
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
    interestRateDaily: 0.0028,
    processingFeeRate: 0.04,
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

// Calculate loan details from config
export function calculateLoan(
  amount: number,
  installments: 1 | 2,
  interestRateDaily: number,
  processingFeeRate: number,
  locale: string = 'es-MX'
) {
  const days = installments * 30
  const interest = amount * interestRateDaily * days
  const iva = interest * 0.16
  const processingFee = amount * processingFeeRate
  const feeIva = processingFee * 0.16
  const totalRepayment = amount + interest + iva + processingFee + feeIva
  const monthlyPayment = totalRepayment / installments

  const dateLocale = locale === 'es-MX' ? 'es-MX' : 'en-US'
  const today = new Date()
  const disbursementDate = today.toLocaleDateString(dateLocale, {
    month: 'long',
    day: 'numeric'
  })
  const firstPayment = new Date(today)
  firstPayment.setDate(firstPayment.getDate() + 30)
  const firstPaymentDate = firstPayment.toLocaleDateString(dateLocale, {
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
    firstPaymentDate
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
