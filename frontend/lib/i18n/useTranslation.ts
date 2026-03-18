import { useMemo } from 'react'
import { useTester } from '@/contexts/TesterContext'
import { createT, type TFunction } from './index'

/**
 * Returns { t, locale } based on the current tester's locale.
 * Falls back to 'en' if no tester is logged in.
 */
export function useTranslation(): { t: TFunction; locale: string } {
  const { tester } = useTester()
  const locale = tester?.locale ?? 'en'
  const t = useMemo(() => createT(locale), [locale])
  return { t, locale }
}
