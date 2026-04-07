import accessCodes from '../../shared/access-codes.json'

interface CodeEntry {
  firstName: string
  name?: string       // full name, if different from firstName
  initialOffer: number
  maxOffer: number
  signUpDate?: string
  loanNumber?: number
  gender?: 'male' | 'female' | 'neutral'
}

const table = accessCodes as unknown as Record<string, CodeEntry>

export function getOfferForCode(code: string): CodeEntry | null {
  return table[code.toUpperCase()] ?? null
}
